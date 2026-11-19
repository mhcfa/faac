import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type AccountingBasis =
  | "gaap"
  | "non_gaap"
  | "ifrs"
  | "qoe"
  | "tax"
  | "stat"
  | "management"
  | "consensus"
  | "market"

export interface UnitDisplayDivisors {
  readonly currency?: number
  readonly shares?: number
  readonly count?: number
}

export interface ValQueryOptions {
  readonly entity?: string
  readonly dimension?: string
  readonly basis?: AccountingBasis | readonly AccountingBasis[]
  readonly unit?: string
  readonly divisors?: UnitDisplayDivisors
}

export interface ScheduleRowSummary {
  readonly row_id: string
  readonly label: string
  readonly raw_label: string | null
  readonly category: string | null
  readonly cells: Readonly<Record<string, number | string | null>>
}

interface SpanLocator {
  readonly locator_type: "pdf_page" | "excel_range" | "html_xpath" | "text_line"
  readonly page?: number | null
  readonly end_page?: number | null
  readonly sheet?: string | null
  readonly cell_range?: string | null
  readonly xpath?: string | null
  readonly table_index?: number | null
  readonly line_start?: number | null
  readonly line_end?: number | null
}

interface RawCell {
  readonly value: number | string
  readonly raw_text?: string | null
  readonly note?: string | null
  readonly is_restatement?: boolean
  readonly scale?: number | null
  readonly unit?: string | null
  readonly period_key?: string | null
  readonly dimension?: string | null
  readonly basis?: AccountingBasis | null
  readonly as_of_date?: string | null
  readonly entity?: string | null
  readonly locator?: SpanLocator | null
}

interface RawColumn {
  readonly id: string
  readonly label: string
  readonly raw_label?: string | null
  readonly data_type?: "number" | "string" | "date"
  readonly scale?: number | null
  readonly unit?: string | null
  readonly period_key?: string | null
  readonly dimension?: string | null
  readonly basis?: AccountingBasis | null
  readonly as_of_date?: string | null
  readonly entity?: string | null
  readonly locator?: SpanLocator | null
  readonly is_restatement?: boolean
}

interface RawRow {
  readonly id: string
  readonly label: string
  readonly raw_label?: string | null
  readonly category?: string | null
  readonly scale?: number | null
  readonly unit?: string | null
  readonly period_key?: string | null
  readonly dimension?: string | null
  readonly basis?: AccountingBasis | null
  readonly as_of_date?: string | null
  readonly entity?: string | null
  readonly locator?: SpanLocator | null
  readonly is_restatement?: boolean
  readonly cells: Readonly<Record<string, RawCell | undefined>>
}

interface RawTable {
  readonly table_id: string
  readonly title: string
  readonly is_restatement?: boolean
  readonly source: {
    readonly doc_id: string
    readonly entity?: string | null
    readonly dimension?: string | null
    readonly basis?: AccountingBasis | null
    readonly period_key?: string | null
    readonly as_of_date?: string | null
    readonly locator?: SpanLocator | null
    readonly is_restatement?: boolean
  }
  readonly columns: readonly RawColumn[]
  readonly rows: readonly RawRow[]
}

interface RawBundle {
  readonly document: {
    readonly doc_id: string
    readonly title?: string | null
    readonly report_date?: string | null
    readonly filing_date?: string | null
  }
  readonly tables: readonly RawTable[]
}

interface ResolvedCellRecord {
  readonly docId: string
  readonly docSortKey: string
  readonly scheduleId: string
  readonly rowId: string
  readonly rowIndex: number
  readonly colId: string
  readonly colIndex: number
  readonly isNumeric: boolean
  readonly value: number | string
  readonly normalizedNum: number | null
  readonly unit: string | null
  readonly basis: AccountingBasis | null
  readonly periodKey: string | null
  readonly periodSortKey: string
  readonly entity: string | null
  readonly dimension: string | null
  readonly locator: SpanLocator
  readonly isRestatement: boolean
}

interface StoredRowMeta {
  readonly docId: string
  readonly docSortKey: string
  readonly scheduleId: string
  readonly rowId: string
  readonly rowIndex: number
  readonly label: string
  readonly rawLabel: string | null
  readonly category: string | null
  readonly entity: string | null
}

interface StoredTableMeta {
  readonly docId: string
  readonly docSortKey: string
  readonly scheduleId: string
  readonly entity: string | null
  readonly tablePeriodSortKey: string
  readonly locator: SpanLocator | null
}

function periodKeySortString(pk: string | null | undefined): string {
  if (!pk) return "0000-00-00-000-                "
  const mFy = /^(\d{4})-FY$/.exec(pk)
  if (mFy?.[1]) return `${mFy[1]}-12-31-360-${pk.padEnd(16, " ")}`
  const mH = /^(\d{4})-H([12])$/.exec(pk)
  if (mH?.[1] && mH[2]) {
    const month = mH[2] === "1" ? "06" : "12"
    const day = mH[2] === "1" ? "30" : "31"
    return `${mH[1]}-${month}-${day}-180-${pk.padEnd(16, " ")}`
  }
  const mQ = /^(\d{4})-Q([1-4])$/.exec(pk)
  if (mQ?.[1] && mQ[2]) {
    const q = Number(mQ[2])
    const month = String(q * 3).padStart(2, "0")
    const day = q === 1 || q === 4 ? "31" : "30"
    return `${mQ[1]}-${month}-${day}-090-${pk.padEnd(16, " ")}`
  }
  const mDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pk)
  if (mDate?.[1] && mDate[2] && mDate[3]) {
    return `${mDate[1]}-${mDate[2]}-${mDate[3]}-001-${pk.padEnd(16, " ")}`
  }
  return `0000-00-00-000-${pk.padEnd(16, " ")}`
}

function computeBundleSortKey(bundle: RawBundle): string {
  const repDate = bundle.document.report_date ?? "0000-00-00"
  const filDate = bundle.document.filing_date ?? "0000-00-00"
  const primaryDate =
    bundle.document.report_date ?? bundle.document.filing_date ?? "0000-00-00"
  let hasRestatement = 0
  let maxPkSort = "0000-00-00-000-                "
  let maxAsOf = "0000-00-00"

  for (const t of bundle.tables) {
    if (t.is_restatement || t.source.is_restatement) hasRestatement = 1
    for (const c of t.columns) {
      if (c.is_restatement) hasRestatement = 1
    }
    for (const r of t.rows) {
      if (r.is_restatement) hasRestatement = 1
      for (const col of t.columns) {
        const cell = r.cells[col.id]
        if (!cell) continue
        if (cell.is_restatement) hasRestatement = 1
        const pk =
          cell.period_key ?? r.period_key ?? col.period_key ?? t.source.period_key
        if (pk) {
          const pks = periodKeySortString(pk)
          if (pks > maxPkSort) maxPkSort = pks
        }
        const asOf =
          cell.as_of_date ?? r.as_of_date ?? col.as_of_date ?? t.source.as_of_date
        if (asOf && asOf > maxAsOf) maxAsOf = asOf
      }
    }
  }
  return `${primaryDate}:${hasRestatement}:${filDate}:${maxPkSort}:${repDate}:${maxAsOf}:${bundle.document.doc_id}`
}

function formatLocatorCitation(locator: SpanLocator): string {
  switch (locator.locator_type) {
    case "pdf_page":
      if (locator.end_page != null && locator.end_page !== locator.page) {
        return `pp. ${locator.page}-${locator.end_page}`
      }
      return `p. ${locator.page}`
    case "excel_range":
      return `Sheet '${locator.sheet}'!${locator.cell_range}`
    case "html_xpath":
      if (locator.table_index != null) {
        return `table ${locator.table_index}`
      }
      return `xpath ${locator.xpath}`
    case "text_line":
      if (locator.line_end != null && locator.line_end !== locator.line_start) {
        return `lines ${locator.line_start}-${locator.line_end}`
      }
      return `line ${locator.line_start}`
  }
}

function serializeLocatorKey(locator: SpanLocator): string {
  switch (locator.locator_type) {
    case "excel_range":
      return `excel_range\0${locator.sheet ?? ""}\0${locator.cell_range ?? ""}`
    case "pdf_page":
      return `pdf_page\0${locator.page ?? ""}\0${locator.end_page ?? ""}`
    case "html_xpath":
      return `html_xpath\0${locator.xpath ?? ""}\0${locator.table_index ?? ""}`
    case "text_line":
      return `text_line\0${locator.line_start ?? ""}\0${locator.line_end ?? ""}`
  }
}

function resolveScheduleLocator(locators: readonly SpanLocator[]): SpanLocator {
  const first = locators[0]
  if (!first) {
    throw new Error("Cannot resolve schedule citation from empty locator list")
  }
  const freq = new Map<string, { loc: SpanLocator; count: number }>()
  for (const loc of locators) {
    const k = serializeLocatorKey(loc)
    const entry = freq.get(k)
    if (!entry) {
      freq.set(k, { loc, count: 1 })
    } else {
      entry.count += 1
    }
  }
  let topLoc = first
  let topCount = 0
  for (const entry of freq.values()) {
    if (entry.count > topCount) {
      topCount = entry.count
      topLoc = entry.loc
    }
  }
  return topLoc
}

function scaleValue(
  normNum: number,
  unit: string | null,
  divisors?: UnitDisplayDivisors
): number {
  if (!divisors || !unit) return normNum
  if (/^[A-Z]{3}$/.test(unit)) {
    return normNum / (divisors.currency ?? 1)
  }
  if (unit === "shares") {
    return normNum / (divisors.shares ?? 1)
  }
  if (unit === "count" || unit === "sqft" || unit.startsWith("custom:")) {
    return normNum / (divisors.count ?? 1)
  }
  return normNum
}

export class KgRegistry {
  readonly #docTitles = new Map<string, string>()
  readonly #primaryCells: ResolvedCellRecord[] = []
  readonly #rowsMeta: StoredRowMeta[] = []
  readonly #tablesMeta: StoredTableMeta[] = []

  constructor(bundles: readonly RawBundle[]) {
    const decorated = bundles
      .map((bundle) => ({
        bundle,
        sortKey: computeBundleSortKey(bundle),
      }))
      .sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))

    // Keyed by numeric/static grain so newer filings or restatements supersede older ones
    const activeByGrain = new Map<string, ResolvedCellRecord>()

    for (const { bundle, sortKey } of decorated) {
      const docId = bundle.document.doc_id
      const title = bundle.document.title?.trim()
      this.#docTitles.set(docId, title && title.length > 0 ? title : docId)

      for (const table of bundle.tables) {
        const scheduleId = table.table_id
        this.#tablesMeta.push({
          docId,
          docSortKey: sortKey,
          scheduleId,
          entity: table.source.entity ?? null,
          tablePeriodSortKey: periodKeySortString(table.source.period_key),
          locator: table.source.locator ?? null,
        })

        for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
          const row = table.rows[rIdx]
          if (!row) continue
          const rowEntity = row.entity ?? table.source.entity ?? null
          this.#rowsMeta.push({
            docId,
            docSortKey: sortKey,
            scheduleId,
            rowId: row.id,
            rowIndex: rIdx,
            label: row.label,
            rawLabel: row.raw_label ?? null,
            category: row.category ?? null,
            entity: rowEntity,
          })

          for (let cIdx = 0; cIdx < table.columns.length; cIdx++) {
            const col = table.columns[cIdx]
            if (!col) continue
            const cell = row.cells[col.id]
            if (!cell) continue

            const isNumeric = (col.data_type ?? "number") === "number"
            const scale = cell.scale ?? row.scale ?? col.scale ?? null
            const unit = cell.unit ?? row.unit ?? col.unit ?? null
            const periodKey =
              cell.period_key ??
              row.period_key ??
              col.period_key ??
              table.source.period_key ??
              null
            const dimension =
              cell.dimension ??
              row.dimension ??
              col.dimension ??
              table.source.dimension ??
              null
            const basis =
              cell.basis ??
              row.basis ??
              col.basis ??
              table.source.basis ??
              null
            const entity =
              cell.entity ??
              row.entity ??
              col.entity ??
              table.source.entity ??
              null
            const locator =
              cell.locator ??
              row.locator ??
              col.locator ??
              table.source.locator
            if (!locator) {
              throw new Error(
                `Missing locator for ${scheduleId}.${row.id}.${col.id}`
              )
            }
            const isRestatement = Boolean(
              cell.is_restatement ||
                row.is_restatement ||
                col.is_restatement ||
                table.source.is_restatement ||
                table.is_restatement
            )

            const normalizedNum =
              isNumeric && typeof cell.value === "number"
                ? cell.value * (scale ?? 1)
                : null

            const rec: ResolvedCellRecord = {
              docId,
              docSortKey: sortKey,
              scheduleId,
              rowId: row.id,
              rowIndex: rIdx,
              colId: col.id,
              colIndex: cIdx,
              isNumeric,
              value: cell.value,
              normalizedNum,
              unit,
              basis,
              periodKey,
              periodSortKey: periodKeySortString(periodKey),
              entity,
              dimension,
              locator,
              isRestatement,
            }

            const grainKey = isNumeric
              ? `N|${scheduleId}|${row.id}|${dimension ?? ""}|${entity ?? ""}|${periodKey ?? ""}|${basis ?? ""}|${unit ?? ""}`
              : `S|${scheduleId}|${row.id}|${col.id}|${entity ?? ""}`

            activeByGrain.set(grainKey, rec)
          }
        }
      }
    }

    this.#primaryCells = [...activeByGrain.values()]
  }

  val(
    scheduleId: string,
    rowId: string,
    periodKey: string,
    options?: ValQueryOptions
  ): number | null {
    const cleanPk = periodKey.trim()
    const basisFilter = options?.basis
      ? Array.isArray(options.basis)
        ? options.basis
        : [options.basis]
      : null

    const matches = this.#primaryCells.filter((c) => {
      if (!c.isNumeric || c.normalizedNum === null) return false
      if (c.scheduleId !== scheduleId || c.rowId !== rowId) return false
      if (c.periodKey !== cleanPk) return false
      if (options?.entity !== undefined && c.entity !== options.entity) {
        return false
      }
      if (
        options?.dimension !== undefined &&
        c.dimension !== options.dimension
      ) {
        return false
      }
      if (options?.unit !== undefined && c.unit !== options.unit) {
        return false
      }
      if (
        basisFilter !== null &&
        (c.basis === null || !basisFilter.includes(c.basis))
      ) {
        return false
      }
      return true
    })

    if (matches.length === 0) return null
    let winner = matches[0]!
    if (basisFilter && basisFilter.length > 1) {
      matches.sort(
        (a, b) =>
          basisFilter.indexOf(a.basis!) - basisFilter.indexOf(b.basis!)
      )
      winner = matches[0]!
    }
    return scaleValue(winner.normalizedNum!, winner.unit, options?.divisors)
  }

  rows(
    scheduleId: string,
    options?: { readonly doc_id?: string; readonly entity?: string }
  ): readonly ScheduleRowSummary[] {
    const filtered = this.#rowsMeta
      .filter((r) => {
        if (r.scheduleId !== scheduleId) return false
        if (options?.doc_id && r.docId !== options.doc_id) return false
        if (options?.entity && r.entity !== options.entity) return false
        return true
      })
      .sort((a, b) =>
        a.docSortKey > b.docSortKey
          ? -1
          : a.docSortKey < b.docSortKey
            ? 1
            : a.rowIndex - b.rowIndex
      )

    const byId = new Map<string, StoredRowMeta>()
    for (const r of filtered) {
      if (!byId.has(r.rowId)) {
        byId.set(r.rowId, r)
      }
    }

    return [...byId.values()]
      .sort((a, b) => a.rowIndex - b.rowIndex)
      .map((r) =>
        Object.freeze({
          row_id: r.rowId,
          label: r.label,
          raw_label: r.rawLabel,
          category: r.category,
          cells: Object.freeze({}),
        })
      )
  }

  scheduleCitation(
    scheduleId: string,
    options?: { readonly doc_id?: string; readonly entity?: string }
  ): string {
    const scopedCells = this.#primaryCells
      .filter((c) => {
        if (c.scheduleId !== scheduleId) return false
        if (options?.doc_id && c.docId !== options.doc_id) return false
        if (options?.entity && c.entity !== options.entity) return false
        return true
      })
      .sort((a, b) =>
        a.rowIndex !== b.rowIndex
          ? a.rowIndex - b.rowIndex
          : a.colIndex - b.colIndex
      )

    const cellsByDoc = new Map<string, ResolvedCellRecord[]>()
    const maxPskByDoc = new Map<string, string>()
    for (const cell of scopedCells) {
      let list = cellsByDoc.get(cell.docId)
      if (!list) {
        list = []
        cellsByDoc.set(cell.docId, list)
      }
      list.push(cell)
      const prevMax = maxPskByDoc.get(cell.docId) ?? ""
      if (cell.periodSortKey > prevMax) {
        maxPskByDoc.set(cell.docId, cell.periodSortKey)
      }
    }

    const candidateTables = this.#tablesMeta.filter((t) => {
      if (t.scheduleId !== scheduleId) return false
      if (options?.doc_id && t.docId !== options.doc_id) return false
      return cellsByDoc.has(t.docId)
    })

    let bestDocId = options?.doc_id ?? ""
    let bestEffectivePsk = ""
    let bestDocSortKey = ""

    for (const t of candidateTables) {
      const effPsk =
        t.tablePeriodSortKey > (maxPskByDoc.get(t.docId) ?? "")
          ? t.tablePeriodSortKey
          : (maxPskByDoc.get(t.docId) ?? "")
      if (
        bestDocId === "" ||
        effPsk > bestEffectivePsk ||
        (effPsk === bestEffectivePsk && t.docSortKey > bestDocSortKey)
      ) {
        bestDocId = t.docId
        bestEffectivePsk = effPsk
        bestDocSortKey = t.docSortKey
      }
    }

    const docCells = cellsByDoc.get(bestDocId) ?? []
    const locators = docCells.map((c) => c.locator)
    const resolvedLocator = resolveScheduleLocator(locators)
    const docTitle = this.#docTitles.get(bestDocId) ?? bestDocId
    return `${docTitle}, ${formatLocatorCitation(resolvedLocator)}`
  }

  [Symbol.dispose](): void {
    // No-op for pure in-memory reader
  }
}

export function compileKgFromDir(dirPath: string): KgRegistry {
  let resolvedDir = path.resolve(process.cwd(), dirPath)
  if (!fs.existsSync(resolvedDir)) {
    const pkgRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      ".."
    )
    resolvedDir = path.resolve(pkgRoot, dirPath)
  }
  const files = fs
    .readdirSync(resolvedDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
  const bundles: RawBundle[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(resolvedDir, file), "utf8")
    return JSON.parse(raw) as RawBundle
  })
  return new KgRegistry(bundles)
}
