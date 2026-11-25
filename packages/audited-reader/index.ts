import fs from "node:fs"
import path from "node:path"

export type DocType =
  | "sec_filing"
  | "excel_workbook"
  | "pdf_document"
  | "html_document"
  | "structured_data"
  | "other"

export interface KgDocumentSummary {
  readonly doc_id: string
  readonly file_path: string
  readonly sha256: string
  readonly doc_type: DocType
  readonly size_bytes: number
  readonly title: string | null
  readonly report_date: string | null
  readonly filing_date: string | null
  readonly schedule_ids: readonly string[]
  readonly has_restatement: boolean
}

export type AccountingBasis =
  | "gaap"
  | "ifrs"
  | "local_gaap"
  | "non_gaap"
  | "statutory"
  | "cash"
  | "mgmt"
  | "qoe"
  | "covenant"
  | "pro_forma"
  | "run_rate"
  | "budget"
  | "forecast"
  | "consensus"
  | "market"
  | "tax"
  | "unadjusted"

export type RestatementKind =
  | "error_correction"
  | "reclassification"
  | "discontinued_operations"
  | "accounting_standard"
  | "stock_split"
  | "preliminary_to_audited"
  | "data_revision"
  | "estimate_revision"
  | "amendment"

export type ColumnDataType = "number" | "text" | "date"

export type ExtractionOrigin =
  | "excel_slice"
  | "html_table"
  | "ixbrl_fact"
  | "structured_data"
  | "pdf_table"
  | "prose"

export type ChecksumExemption =
  | "non_additive_metric"
  | "standalone_disclosure"
  | "partial_extract"
  | "source_footing_error"

export type ResolutionStatus = "primary" | "corroborating" | "superseded"

export type ObservationUnitKind =
  | "currency"
  | "per_share"
  | "shares"
  | "ratio"
  | "multiple"
  | "index"
  | "duration"
  | "count"
  | "physical"
  | "custom"

export type UnitDisplayDivisors = Readonly<
  Partial<Record<ObservationUnitKind, number>>
>

export interface ExcelLocator {
  readonly locator_type: "excel_range"
  readonly sheet: string
  readonly cell_range: string
}

export interface PdfLocator {
  readonly locator_type: "pdf_page"
  readonly page: number
  readonly end_page: number | null
}

export interface HtmlLocator {
  readonly locator_type: "html_xpath"
  readonly xpath: string
  readonly table_index: number | null
}

export interface TextLocator {
  readonly locator_type: "text_line"
  readonly line_start: number
  readonly line_end: number | null
}

export type SpanLocator = ExcelLocator | PdfLocator | HtmlLocator | TextLocator

export interface DocScopeOptions {
  readonly doc_id?: string | undefined
  readonly entity?: string | null | undefined
}

export interface ValQueryOptions {
  readonly entity?: string | null | undefined
  readonly dimension?: string | null | undefined
  readonly basis?: AccountingBasis | readonly AccountingBasis[] | undefined
  readonly unit?: string | undefined
  readonly divisors?: UnitDisplayDivisors | undefined
}

export interface SeriesQueryOptions extends ValQueryOptions {
  readonly periods?: readonly string[] | undefined
}

export interface RowQueryOptions extends DocScopeOptions {
  readonly cols?: readonly string[] | undefined
}

export interface CitationQueryOptions {
  readonly period_key?: string | undefined
  readonly col_id?: string | undefined
  readonly doc_id?: string | undefined
  readonly entity?: string | null | undefined
  readonly dimension?: string | null | undefined
  readonly basis?: AccountingBasis | readonly AccountingBasis[] | undefined
  readonly unit?: string | undefined
}

export type BreakdownAxis = "dimension" | "entity" | "basis"

export interface PanelQueryOptions {
  readonly rows?: readonly string[] | undefined
  readonly periods?: readonly string[] | undefined
  readonly basis?: AccountingBasis | readonly AccountingBasis[] | undefined
  readonly entity?: string | null | undefined
  readonly dimension?: string | null | undefined
  readonly unit?: string | undefined
  readonly divisors?: UnitDisplayDivisors | undefined
}

export interface BreakdownQueryOptions {
  readonly by: BreakdownAxis
  readonly periods?: readonly string[] | undefined
  readonly basis?: AccountingBasis | readonly AccountingBasis[] | undefined
  readonly unit?: string | undefined
  readonly entity?: string | null | undefined
  readonly dimension?: string | null | undefined
  readonly divisors?: UnitDisplayDivisors | undefined
}

export interface CellsQueryOptions {
  readonly schedule_id?: string | undefined
  readonly doc_id?: string | undefined
  readonly period_key?: string | undefined
  readonly entity?: string | null | undefined
  readonly basis?: AccountingBasis | undefined
  readonly unit?: string | undefined
  readonly dimension?: string | null | undefined
  readonly data_type?: ColumnDataType | undefined
  readonly status?: ResolutionStatus | "all" | undefined
}

export interface ScheduleRowSummary {
  readonly row_id: string
  readonly label: string
  readonly raw_label: string | null
  readonly category: string | null
  readonly cells: Readonly<Record<string, number | string | null>>
}

export interface PanelCellProvenance {
  readonly doc_id: string
  readonly col_id: string
  readonly basis: AccountingBasis
  readonly citation: string
  readonly note: string | null
  readonly origin: ExtractionOrigin
  readonly exemption: ChecksumExemption | null
  readonly restatement: RestatementKind | null
}

export interface PanelRow {
  readonly row_id: string
  readonly label: string
  readonly raw_label: string | null
  readonly category: string | null
  readonly is_subtotal: boolean
  readonly unit: string | null
  readonly unit_kind: ObservationUnitKind | null
  readonly dimension: string | null
  readonly entity: string | null
  readonly values: Readonly<Record<string, number | null>>
  readonly cells: Readonly<Record<string, PanelCellProvenance | null>>
}

export interface SchedulePanel {
  readonly schedule_id: string
  readonly title: string
  readonly periods: readonly string[]
  readonly rows: readonly PanelRow[]
}

export interface BreakdownGroup {
  readonly key: string | null
  readonly unit: string
  readonly unit_kind: ObservationUnitKind
  readonly dimension: string | null
  readonly entity: string | null
  readonly values: Readonly<Record<string, number | null>>
  readonly cells: Readonly<Record<string, PanelCellProvenance | null>>
}

export interface RowBreakdown {
  readonly schedule_id: string
  readonly row_id: string
  readonly label: string
  readonly by: BreakdownAxis
  readonly periods: readonly string[]
  readonly groups: readonly BreakdownGroup[]
}

export interface ScheduleCellRecord {
  readonly seq: number
  readonly doc_id: string
  readonly schedule_id: string
  readonly table_title: string
  readonly locator: SpanLocator
  readonly row_id: string
  readonly row_label: string
  readonly raw_row_label: string | null
  readonly row_category: string | null
  readonly row_index: number
  readonly col_id: string
  readonly col_label: string
  readonly raw_col_label: string | null
  readonly col_index: number
  readonly data_type: ColumnDataType
  readonly dimension: string | null
  readonly entity: string | null
  readonly period_key: string | null
  readonly basis: AccountingBasis | null
  readonly unit: string | null
  readonly scale: number | null
  readonly as_of_date: string | null
  readonly value_num: number | null
  readonly value_str: string | null
  readonly normalized_num: number | null
  readonly raw_text: string | null
  readonly note: string | null
  readonly origin: ExtractionOrigin
  readonly exemption: ChecksumExemption | null
  readonly restatement: RestatementKind | null
  readonly status: ResolutionStatus
  readonly superseded_by_seq: number | null
}

interface RawSpanLocator {
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
  readonly origin?: ExtractionOrigin | null
  readonly exemption?: ChecksumExemption | null
  readonly restatement?: RestatementKind | null
  readonly scale?: number | null
  readonly unit?: string | null
  readonly period_key?: string | null
  readonly dimension?: string | null
  readonly basis?: AccountingBasis | null
  readonly as_of_date?: string | null
  readonly entity?: string | null
  readonly locator?: RawSpanLocator | null
}

interface RawColumn {
  readonly id: string
  readonly label: string
  readonly raw_label?: string | null
  readonly data_type?: ColumnDataType | "string"
  readonly origin?: ExtractionOrigin | null
  readonly exemption?: ChecksumExemption | null
  readonly scale?: number | null
  readonly unit?: string | null
  readonly period_key?: string | null
  readonly dimension?: string | null
  readonly basis?: AccountingBasis | null
  readonly as_of_date?: string | null
  readonly entity?: string | null
  readonly locator?: RawSpanLocator | null
  readonly restatement?: RestatementKind | null
}

interface RawRow {
  readonly id: string
  readonly label: string
  readonly raw_label?: string | null
  readonly category?: string | null
  readonly origin?: ExtractionOrigin | null
  readonly exemption?: ChecksumExemption | null
  readonly scale?: number | null
  readonly unit?: string | null
  readonly period_key?: string | null
  readonly dimension?: string | null
  readonly basis?: AccountingBasis | null
  readonly as_of_date?: string | null
  readonly entity?: string | null
  readonly locator?: RawSpanLocator | null
  readonly restatement?: RestatementKind | null
  readonly cells: Readonly<Record<string, RawCell | undefined>>
}

interface RawTableChecksum {
  readonly axis: "row" | "column"
  readonly target_id: string
}

interface RawTable {
  readonly table_id: string
  readonly title: string
  readonly source: {
    readonly doc_id: string
    readonly origin?: ExtractionOrigin | null
    readonly exemption?: ChecksumExemption | null
    readonly entity?: string | null
    readonly dimension?: string | null
    readonly basis?: AccountingBasis | null
    readonly period_key?: string | null
    readonly as_of_date?: string | null
    readonly locator?: RawSpanLocator | null
  }
  readonly columns: readonly RawColumn[]
  readonly rows: readonly RawRow[]
  readonly checksums?: readonly RawTableChecksum[]
}

interface RawBundle {
  readonly document: {
    readonly doc_id: string
    readonly file_path?: string | null
    readonly sha256?: string | null
    readonly doc_type?: DocType | null
    readonly size_bytes?: number | null
    readonly title?: string | null
    readonly report_date?: string | null
    readonly filing_date?: string | null
  }
  readonly tables: readonly RawTable[]
}

interface ResolvedCellRecord {
  readonly seq: number
  readonly docId: string
  readonly docSortKey: string
  readonly scheduleId: string
  readonly tableTitle: string
  readonly rowId: string
  readonly rowLabel: string
  readonly rawRowLabel: string | null
  readonly rowCategory: string | null
  readonly rowIndex: number
  readonly colId: string
  readonly colLabel: string
  readonly rawColLabel: string | null
  readonly colIndex: number
  readonly dataType: ColumnDataType
  readonly isNumeric: boolean
  readonly valueNum: number | null
  readonly valueStr: string | null
  readonly normalizedNum: number | null
  readonly rawText: string | null
  readonly note: string | null
  readonly origin: ExtractionOrigin
  readonly exemption: ChecksumExemption | null
  readonly unit: string | null
  readonly scale: number | null
  readonly asOfDate: string | null
  readonly basis: AccountingBasis | null
  readonly periodKey: string | null
  readonly periodSortKey: string
  readonly entity: string | null
  readonly dimension: string | null
  readonly locator: SpanLocator
  readonly restatement: RestatementKind | null
  status: ResolutionStatus
  supersededBySeq: number | null
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
  readonly title: string
  readonly entity: string | null
  readonly tablePeriodSortKey: string
  readonly locator: SpanLocator | null
  readonly subtotalRowIds: ReadonlySet<string>
}

const CURRENCY_UNITS: ReadonlySet<string> = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "CAD",
  "AUD",
  "CHF",
  "HKD",
  "SGD",
  "MYR",
  "IDR",
  "THB",
  "PHP",
  "VND",
  "AED",
  "SAR",
  "PLN",
  "NOK",
  "DKK",
  "TRY",
  "ILS",
  "CLP",
  "COP",
  "PEN",
  "NZD",
  "KRW",
  "INR",
  "BRL",
  "TWD",
  "SEK",
  "MXN",
  "ZAR",
  "CZK",
  "HUF",
])

const DURATION_UNITS: ReadonlySet<string> = new Set([
  "days",
  "months",
  "years",
  "hours",
])

const PHYSICAL_UNITS: ReadonlySet<string> = new Set([
  "sqft",
  "sqm",
  "mw",
  "mwh",
  "boe",
  "bbl",
  "tons",
])

const REL_TOL = 1e-6

function isClose(a: number, b: number): boolean {
  return (
    Math.abs(a - b) <=
    Math.max(REL_TOL * Math.max(Math.abs(a), Math.abs(b)), 1e-9)
  )
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function normalizeLocator(raw: RawSpanLocator): SpanLocator {
  switch (raw.locator_type) {
    case "excel_range":
      return Object.freeze({
        locator_type: "excel_range" as const,
        sheet: raw.sheet ?? "",
        cell_range: raw.cell_range ?? "",
      })
    case "pdf_page":
      return Object.freeze({
        locator_type: "pdf_page" as const,
        page: raw.page ?? 1,
        end_page: raw.end_page ?? null,
      })
    case "html_xpath":
      return Object.freeze({
        locator_type: "html_xpath" as const,
        xpath: raw.xpath ?? "",
        table_index: raw.table_index ?? null,
      })
    case "text_line":
      return Object.freeze({
        locator_type: "text_line" as const,
        line_start: raw.line_start ?? 1,
        line_end: raw.line_end ?? null,
      })
  }
}

function normalizeColumnDataType(
  raw: ColumnDataType | "string" | undefined
): ColumnDataType {
  if (raw === undefined || raw === "number") return "number"
  if (raw === "date") return "date"
  return "text"
}

function classifyUnitKind(unit: string): ObservationUnitKind | null {
  if (CURRENCY_UNITS.has(unit)) return "currency"
  if (unit.endsWith("_per_share")) {
    const prefix = unit.slice(0, -"_per_share".length)
    if (CURRENCY_UNITS.has(prefix)) return "per_share"
  }
  if (unit === "shares") return "shares"
  if (unit === "ratio") return "ratio"
  if (unit === "multiple") return "multiple"
  if (unit === "index") return "index"
  if (DURATION_UNITS.has(unit)) return "duration"
  if (unit === "count") return "count"
  if (PHYSICAL_UNITS.has(unit)) return "physical"
  if (unit.startsWith("custom:")) return "custom"
  return null
}

const VALID_BREAKDOWN_AXES: readonly BreakdownAxis[] = [
  "dimension",
  "entity",
  "basis",
]

function isBreakdownAxis(value: unknown): value is BreakdownAxis {
  return value === "dimension" || value === "entity" || value === "basis"
}

function formatGrainVal(val: string | null | undefined): string {
  if (val === null || val === undefined) {
    return "null"
  }
  return `'${val}'`
}

function validateDivisors(divisors: UnitDisplayDivisors | undefined): void {
  if (divisors === undefined) return
  for (const [kind, value] of Object.entries<unknown>(divisors)) {
    if (value === undefined) continue
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Invalid display divisor for '${kind}': expected a positive finite number, got ${JSON.stringify(value)}`
      )
    }
  }
}

function scaleValue(
  normNum: number,
  unit: string | null,
  divisors?: UnitDisplayDivisors
): number {
  validateDivisors(divisors)
  if (!divisors || !unit) return normNum
  const kind = classifyUnitKind(unit)
  if (!kind) return normNum
  const divisor = divisors[kind] ?? 1
  const result = normNum / divisor
  return Object.is(result, -0) ? 0 : result
}

function formatPeriodKeySort(
  year: number,
  month: number,
  day: number,
  rank: number,
  pk: string
): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}-${String(rank).padStart(3, "0")}-${pk.padEnd(16, " ")}`
}

function periodKeySortString(pk: string | null | undefined): string {
  if (!pk) return formatPeriodKeySort(0, 0, 0, 0, "")
  const mFy = /^(\d{4})-FY$/.exec(pk)
  if (mFy?.[1]) return formatPeriodKeySort(Number(mFy[1]), 12, 31, 10, pk)
  const mStub = /^(\d{4})-P([1-9]|1[013-9]|[2-9]\d)M$/.exec(pk)
  if (mStub?.[1] && mStub[2]) {
    return formatPeriodKeySort(
      Number(mStub[1]),
      12,
      31,
      10 + Number(mStub[2]),
      pk
    )
  }
  const mLtm = /^(\d{4})-LTM$/.exec(pk)
  if (mLtm?.[1]) return formatPeriodKeySort(Number(mLtm[1]), 12, 31, 9, pk)
  const mYtd = /^(\d{4})-YTD$/.exec(pk)
  if (mYtd?.[1]) return formatPeriodKeySort(Number(mYtd[1]), 12, 31, 8, pk)
  const mH = /^(\d{4})-H([12])$/.exec(pk)
  if (mH?.[1] && mH[2]) {
    return formatPeriodKeySort(Number(mH[1]), Number(mH[2]) * 6, 31, 7, pk)
  }
  const mQ = /^(\d{4})-Q([1-4])(?:-(LTM|YTD))?$/.exec(pk)
  if (mQ?.[1] && mQ[2]) {
    const rank = mQ[3] === "LTM" ? 6 : mQ[3] === "YTD" ? 5 : 4
    return formatPeriodKeySort(Number(mQ[1]), Number(mQ[2]) * 3, 31, rank, pk)
  }
  const mM = /^(\d{4})-M(0[1-9]|1[0-2])(?:-(LTM|YTD))?$/.exec(pk)
  if (mM?.[1] && mM[2]) {
    const rank = mM[3] === "LTM" ? 3 : mM[3] === "YTD" ? 2 : 1
    return formatPeriodKeySort(Number(mM[1]), Number(mM[2]), 31, rank, pk)
  }
  const mDate = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(pk)
  if (mDate?.[1] && mDate[2] && mDate[3]) {
    return formatPeriodKeySort(
      Number(mDate[1]),
      Number(mDate[2]),
      Number(mDate[3]),
      0,
      pk
    )
  }
  const yearPrefix = /^(\d{4})-/.exec(pk)
  return formatPeriodKeySort(
    yearPrefix?.[1] ? Number(yearPrefix[1]) : 0,
    0,
    0,
    0,
    pk
  )
}

function computeBundleSortKey(bundle: RawBundle): string {
  const repDate = bundle.document.report_date ?? "0000-00-00"
  let hasRestatement = 0
  let maxPkSort = formatPeriodKeySort(0, 0, 0, 0, "")
  let maxAsOf = "0000-00-00"

  for (const t of bundle.tables) {
    for (const c of t.columns) {
      if (c.restatement != null) hasRestatement = 1
    }
    for (const r of t.rows) {
      if (r.restatement != null) hasRestatement = 1
      for (const col of t.columns) {
        const cell = Object.hasOwn(r.cells, col.id)
          ? r.cells[col.id]
          : undefined
        if (!cell) continue
        if (cell.restatement != null) hasRestatement = 1
        const pk =
          cell.period_key ??
          r.period_key ??
          col.period_key ??
          t.source.period_key
        if (pk) {
          const pks = periodKeySortString(pk)
          if (pks > maxPkSort) maxPkSort = pks
        }
        const asOf =
          cell.as_of_date ??
          r.as_of_date ??
          col.as_of_date ??
          t.source.as_of_date
        if (asOf && asOf > maxAsOf) maxAsOf = asOf
      }
    }
  }
  const primaryDate =
    bundle.document.filing_date ??
    bundle.document.report_date ??
    maxPkSort.slice(0, 10)
  return `${primaryDate}:${String(hasRestatement)}:${repDate}:${maxPkSort}:${maxAsOf}:${bundle.document.doc_id}`
}

function formatLocatorCitation(locator: SpanLocator): string {
  switch (locator.locator_type) {
    case "pdf_page":
      if (locator.end_page !== null && locator.end_page !== locator.page) {
        return `pp. ${String(locator.page)}-${String(locator.end_page)}`
      }
      return `p. ${String(locator.page)}`
    case "excel_range":
      return `Sheet '${locator.sheet}'!${locator.cell_range}`
    case "html_xpath":
      if (locator.table_index !== null) {
        return `table ${String(locator.table_index)}`
      }
      return `xpath ${locator.xpath}`
    case "text_line":
      if (
        locator.line_end !== null &&
        locator.line_end !== locator.line_start
      ) {
        return `lines ${String(locator.line_start)}-${String(locator.line_end)}`
      }
      return `line ${String(locator.line_start)}`
  }
}

function serializeLocatorKey(locator: SpanLocator): string {
  switch (locator.locator_type) {
    case "excel_range":
      return `excel_range\0${locator.sheet}\0${locator.cell_range}`
    case "pdf_page":
      return `pdf_page\0${String(locator.page)}\0${locator.end_page !== null ? String(locator.end_page) : ""}`
    case "html_xpath":
      return `html_xpath\0${locator.xpath}\0${locator.table_index !== null ? String(locator.table_index) : ""}`
    case "text_line":
      return `text_line\0${String(locator.line_start)}\0${locator.line_end !== null ? String(locator.line_end) : ""}`
  }
}

function resolveScheduleLocator(locators: readonly SpanLocator[]): SpanLocator {
  const first = locators.at(0)
  if (first === undefined) {
    throw new Error("Cannot resolve schedule citation from empty locator list")
  }
  const freq = new Map<string, { readonly loc: SpanLocator; count: number }>()
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
  if (freq.size === 1) {
    return first
  }
  if (locators.every((loc) => loc.locator_type === "pdf_page")) {
    const pages = new Set<number>()
    for (const loc of locators) {
      pages.add(loc.page)
      if (loc.end_page !== null) {
        pages.add(loc.end_page)
      }
    }
    const uniquePages = [...pages].sort((a, b) => a - b)
    const minPage = uniquePages[0] ?? 1
    const maxPage = uniquePages[uniquePages.length - 1] ?? minPage
    const isContiguous = maxPage - minPage + 1 === uniquePages.length
    if (isContiguous && uniquePages.length > 1) {
      return Object.freeze({
        locator_type: "pdf_page" as const,
        page: minPage,
        end_page: maxPage,
      })
    }
    if (topCount / locators.length > 0.5) {
      return topLoc
    }
    return Object.freeze({
      locator_type: "pdf_page" as const,
      page: minPage,
      end_page: maxPage,
    })
  }
  return topLoc
}

function toScheduleCellRecord(c: ResolvedCellRecord): ScheduleCellRecord {
  return Object.freeze({
    seq: c.seq,
    doc_id: c.docId,
    schedule_id: c.scheduleId,
    table_title: c.tableTitle,
    locator: c.locator,
    row_id: c.rowId,
    row_label: c.rowLabel,
    raw_row_label: c.rawRowLabel,
    row_category: c.rowCategory,
    row_index: c.rowIndex,
    col_id: c.colId,
    col_label: c.colLabel,
    raw_col_label: c.rawColLabel,
    col_index: c.colIndex,
    data_type: c.dataType,
    dimension: c.dimension,
    entity: c.entity,
    period_key: c.periodKey,
    basis: c.basis,
    unit: c.unit,
    scale: c.scale,
    as_of_date: c.asOfDate,
    value_num: c.valueNum,
    value_str: c.valueStr,
    normalized_num: c.normalizedNum,
    raw_text: c.rawText,
    note: c.note,
    origin: c.origin,
    exemption: c.exemption,
    restatement: c.restatement,
    status: c.status,
    superseded_by_seq: c.supersededBySeq,
  })
}

export class KgRegistry {
  readonly #docTitles = new Map<string, string>()
  readonly #documents: KgDocumentSummary[] = []
  readonly #allCells: ResolvedCellRecord[] = []
  readonly #primaryCells: ResolvedCellRecord[] = []
  readonly #rowsMeta: StoredRowMeta[] = []
  readonly #tablesMeta: StoredTableMeta[] = []

  constructor(bundles: readonly RawBundle[]) {
    const decorated = bundles
      .map((bundle) => ({
        bundle,
        sortKey: computeBundleSortKey(bundle),
      }))
      .sort((a, b) => {
        const keyCmp = compareStrings(a.sortKey, b.sortKey)
        if (keyCmp !== 0) return keyCmp
        return compareStrings(
          a.bundle.document.doc_id,
          b.bundle.document.doc_id
        )
      })

    const activeNumeric = new Map<
      string,
      {
        readonly primary: ResolvedCellRecord
        readonly corroborating: ResolvedCellRecord[]
      }
    >()
    const activeStatic = new Map<
      string,
      {
        readonly primary: ResolvedCellRecord
        readonly corroborating: ResolvedCellRecord[]
      }
    >()

    let nextSeq = 1

    for (const { bundle, sortKey } of decorated) {
      const docId = bundle.document.doc_id
      const title = bundle.document.title?.trim()
      this.#docTitles.set(docId, title && title.length > 0 ? title : docId)
      const docScheduleIds: string[] = []
      let docHasRestatement = false

      for (const table of bundle.tables) {
        const scheduleId = table.table_id
        docScheduleIds.push(scheduleId)
        for (const col of table.columns) {
          if (col.restatement != null) docHasRestatement = true
        }
        const subtotalRowIds = new Set<string>()
        for (const chk of table.checksums ?? []) {
          if (chk.axis === "row") {
            subtotalRowIds.add(chk.target_id)
          }
        }
        this.#tablesMeta.push({
          docId,
          docSortKey: sortKey,
          scheduleId,
          title: table.title,
          entity: table.source.entity ?? null,
          tablePeriodSortKey: periodKeySortString(table.source.period_key),
          locator: table.source.locator
            ? normalizeLocator(table.source.locator)
            : null,
          subtotalRowIds,
        })

        for (const [rIdx, row] of table.rows.entries()) {
          if (row.restatement != null) docHasRestatement = true
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

          for (const [cIdx, col] of table.columns.entries()) {
            const cell = Object.hasOwn(row.cells, col.id)
              ? row.cells[col.id]
              : undefined
            if (!cell) continue
            if (cell.restatement != null) docHasRestatement = true

            const dataType = normalizeColumnDataType(col.data_type)
            const isNumeric = dataType === "number"
            const scale = isNumeric
              ? (cell.scale ?? row.scale ?? col.scale ?? null)
              : null
            const unit = isNumeric
              ? (cell.unit ?? row.unit ?? col.unit ?? null)
              : null
            const periodKey = isNumeric
              ? (cell.period_key ??
                row.period_key ??
                col.period_key ??
                table.source.period_key ??
                null)
              : null
            const dimension = isNumeric
              ? (cell.dimension ??
                row.dimension ??
                col.dimension ??
                table.source.dimension ??
                null)
              : null
            const basis = isNumeric
              ? (cell.basis ??
                row.basis ??
                col.basis ??
                table.source.basis ??
                null)
              : null
            const entity =
              cell.entity ??
              row.entity ??
              col.entity ??
              table.source.entity ??
              null
            const asOfDate =
              cell.as_of_date ??
              row.as_of_date ??
              col.as_of_date ??
              table.source.as_of_date ??
              null
            const rawLocator =
              cell.locator ?? row.locator ?? col.locator ?? table.source.locator
            if (!rawLocator) {
              throw new Error(
                `Missing locator for ${scheduleId}.${row.id}.${col.id}`
              )
            }
            const locator = normalizeLocator(rawLocator)
            const origin: ExtractionOrigin =
              cell.origin ??
              row.origin ??
              col.origin ??
              table.source.origin ??
              "structured_data"
            const exemption: ChecksumExemption | null = isNumeric
              ? (cell.exemption ??
                row.exemption ??
                col.exemption ??
                table.source.exemption ??
                null)
              : null
            const restatement =
              cell.restatement ?? row.restatement ?? col.restatement ?? null

            const valueNum =
              isNumeric && typeof cell.value === "number" ? cell.value : null
            const valueStr = isNumeric ? null : String(cell.value)
            const normalizedNum =
              valueNum !== null ? valueNum * (scale ?? 1) : null

            const rec: ResolvedCellRecord = {
              seq: nextSeq++,
              docId,
              docSortKey: sortKey,
              scheduleId,
              tableTitle: table.title,
              rowId: row.id,
              rowLabel: row.label,
              rawRowLabel: row.raw_label ?? null,
              rowCategory: row.category ?? null,
              rowIndex: rIdx,
              colId: col.id,
              colLabel: col.label,
              rawColLabel: col.raw_label ?? null,
              colIndex: cIdx,
              dataType,
              isNumeric,
              valueNum,
              valueStr,
              normalizedNum,
              rawText: cell.raw_text ?? null,
              note: cell.note ?? null,
              origin,
              exemption,
              unit,
              scale,
              asOfDate,
              basis,
              periodKey,
              periodSortKey: periodKeySortString(periodKey),
              entity,
              dimension,
              locator,
              restatement,
              status: "primary",
              supersededBySeq: null,
            }

            if (isNumeric) {
              const grainKey = JSON.stringify([
                scheduleId,
                row.id,
                dimension ?? "",
                entity ?? "",
                periodKey ?? "",
                basis ?? "",
                unit ?? "",
              ])
              const existing = activeNumeric.get(grainKey)
              if (existing === undefined) {
                activeNumeric.set(grainKey, {
                  primary: rec,
                  corroborating: [],
                })
              } else if (
                existing.primary.normalizedNum !== null &&
                rec.normalizedNum !== null &&
                isClose(existing.primary.normalizedNum, rec.normalizedNum)
              ) {
                rec.status = "corroborating"
                existing.corroborating.push(rec)
              } else if (restatement !== null) {
                existing.primary.status = "superseded"
                existing.primary.supersededBySeq = rec.seq
                for (const corr of existing.corroborating) {
                  corr.status = "superseded"
                  corr.supersededBySeq = rec.seq
                }
                activeNumeric.set(grainKey, {
                  primary: rec,
                  corroborating: [],
                })
              } else {
                throw new Error(
                  `Value conflict on numeric grain (${scheduleId}, ${row.id}, ${col.id}): ${String(rec.normalizedNum)} from '${docId}' vs ${String(existing.primary.normalizedNum)} from '${existing.primary.docId}'`
                )
              }
            } else {
              const grainKey = JSON.stringify([
                scheduleId,
                row.id,
                col.id,
                entity ?? "",
              ])
              const existing = activeStatic.get(grainKey)
              if (existing === undefined) {
                activeStatic.set(grainKey, { primary: rec, corroborating: [] })
              } else if (existing.primary.valueStr === rec.valueStr) {
                rec.status = "corroborating"
                existing.corroborating.push(rec)
              } else if (restatement !== null) {
                existing.primary.status = "superseded"
                existing.primary.supersededBySeq = rec.seq
                for (const corr of existing.corroborating) {
                  corr.status = "superseded"
                  corr.supersededBySeq = rec.seq
                }
                activeStatic.set(grainKey, { primary: rec, corroborating: [] })
              } else {
                throw new Error(
                  `Value conflict on static grain (${scheduleId}, ${row.id}, ${col.id}): '${String(rec.valueStr)}' from '${docId}' vs '${String(existing.primary.valueStr)}' from '${existing.primary.docId}'`
                )
              }
            }

            this.#allCells.push(rec)
          }
        }
      }

      docScheduleIds.sort(compareStrings)
      this.#documents.push(
        Object.freeze({
          doc_id: docId,
          file_path: bundle.document.file_path ?? "",
          sha256: bundle.document.sha256 ?? "",
          doc_type: bundle.document.doc_type ?? "other",
          size_bytes: bundle.document.size_bytes ?? 0,
          title: bundle.document.title ?? null,
          report_date: bundle.document.report_date ?? null,
          filing_date: bundle.document.filing_date ?? null,
          schedule_ids: Object.freeze(docScheduleIds),
          has_restatement: docHasRestatement,
        })
      )
    }

    for (const rec of this.#allCells) {
      if (rec.status === "primary") {
        this.#primaryCells.push(rec)
      }
    }
  }

  documents(): KgDocumentSummary[] {
    return [...this.#documents]
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
    if (basisFilter && basisFilter.length > 1) {
      matches.sort(
        (a, b) =>
          (a.basis !== null ? basisFilter.indexOf(a.basis) : 999) -
          (b.basis !== null ? basisFilter.indexOf(b.basis) : 999)
      )
    }
    const winner = matches.at(0)
    const normNum = winner?.normalizedNum
    if (winner === undefined || normNum === undefined || normNum === null) {
      return null
    }
    return scaleValue(normNum, winner.unit, options?.divisors)
  }

  series(
    scheduleId: string,
    rowId: string,
    options?: SeriesQueryOptions
  ): Record<string, number | null> {
    const out: Record<string, number | null> = {}
    if (options?.periods) {
      for (const pk of options.periods) {
        const cleanPk = pk.trim()
        out[cleanPk] = this.val(scheduleId, rowId, cleanPk, options)
      }
      return out
    }

    const periods = new Set<string>()
    for (const c of this.#primaryCells) {
      if (
        c.isNumeric &&
        c.scheduleId === scheduleId &&
        c.rowId === rowId &&
        c.periodKey !== null
      ) {
        periods.add(c.periodKey)
      }
    }
    const sortedPeriods = [...periods].sort((a, b) =>
      compareStrings(periodKeySortString(a), periodKeySortString(b))
    )
    for (const pk of sortedPeriods) {
      const v = this.val(scheduleId, rowId, pk, options)
      if (v !== null) {
        out[pk] = v
      }
    }
    return out
  }

  panel(scheduleId: string, options?: PanelQueryOptions): SchedulePanel {
    const basisFilter = options?.basis
      ? Array.isArray(options.basis)
        ? options.basis
        : [options.basis]
      : null
    const requestedRows = options?.rows ? [...options.rows] : null
    const requestedPeriods = options?.periods
      ? options.periods.map((p) => p.trim())
      : null
    const requestedPeriodSet = requestedPeriods
      ? new Set(requestedPeriods)
      : null

    const tablesForSchedule = this.#tablesMeta
      .filter((t) => t.scheduleId === scheduleId)
      .sort((a, b) => compareStrings(b.docSortKey, a.docSortKey))
    if (tablesForSchedule.length === 0) {
      throw new Error(`Unknown schedule '${scheduleId}'`)
    }
    const title = tablesForSchedule[0]?.title ?? scheduleId
    const subtotalRowIds = new Set<string>()
    for (const t of tablesForSchedule) {
      for (const id of t.subtotalRowIds) {
        subtotalRowIds.add(id)
      }
    }

    const rowMetaById = new Map<string, StoredRowMeta>()
    const sortedRowsMeta = this.#rowsMeta
      .filter((r) => {
        if (r.scheduleId !== scheduleId) return false
        if (options?.entity !== undefined && r.entity !== options.entity) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const docCmp = compareStrings(b.docSortKey, a.docSortKey)
        if (docCmp !== 0) return docCmp
        if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex
        return compareStrings(a.rowId, b.rowId)
      })
    for (const r of sortedRowsMeta) {
      if (!rowMetaById.has(r.rowId)) {
        rowMetaById.set(r.rowId, r)
      }
    }
    if (rowMetaById.size === 0) {
      const fallbackRows = this.#rowsMeta
        .filter((r) => r.scheduleId === scheduleId)
        .sort((a, b) => {
          const docCmp = compareStrings(b.docSortKey, a.docSortKey)
          if (docCmp !== 0) return docCmp
          return a.rowIndex - b.rowIndex
        })
      for (const r of fallbackRows) {
        if (!rowMetaById.has(r.rowId)) {
          rowMetaById.set(r.rowId, r)
        }
      }
    }

    const matchingByRow = new Map<string, ResolvedCellRecord[]>()
    for (const c of this.#primaryCells) {
      if (!c.isNumeric || c.normalizedNum === null || c.periodKey === null) {
        continue
      }
      if (c.scheduleId !== scheduleId) continue
      if (options?.entity !== undefined && c.entity !== options.entity) {
        continue
      }
      if (
        options?.dimension !== undefined &&
        c.dimension !== options.dimension
      ) {
        continue
      }
      if (options?.unit !== undefined && c.unit !== options.unit) continue
      if (
        basisFilter !== null &&
        (c.basis === null || !basisFilter.includes(c.basis))
      ) {
        continue
      }
      let list = matchingByRow.get(c.rowId)
      if (!list) {
        list = []
        matchingByRow.set(c.rowId, list)
      }
      list.push(c)
    }

    const orderedRowIds = [...rowMetaById.values()]
      .sort((a, b) => {
        if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex
        const docCmp = compareStrings(b.docSortKey, a.docSortKey)
        if (docCmp !== 0) return docCmp
        return compareStrings(a.rowId, b.rowId)
      })
      .map((r) => r.rowId)

    const hasCellFilter =
      options?.unit !== undefined ||
      options?.dimension !== undefined ||
      basisFilter !== null ||
      options?.entity !== undefined

    const targetRowIds =
      requestedRows ??
      (hasCellFilter
        ? orderedRowIds.filter(
            (rId) => (matchingByRow.get(rId)?.length ?? 0) > 0
          )
        : orderedRowIds)

    const unionPeriods = new Set<string>()
    const resolvedRows: {
      readonly rowId: string
      readonly winnersByPeriod: ReadonlyMap<string, ResolvedCellRecord>
      readonly refCand: ResolvedCellRecord | null
    }[] = []

    for (const rowId of targetRowIds) {
      const cands = matchingByRow.get(rowId) ?? []
      const byPeriod = new Map<string, ResolvedCellRecord[]>()
      for (const c of cands) {
        if (c.periodKey === null) continue
        if (
          requestedPeriodSet !== null &&
          !requestedPeriodSet.has(c.periodKey)
        ) {
          continue
        }
        let list = byPeriod.get(c.periodKey)
        if (!list) {
          list = []
          byPeriod.set(c.periodKey, list)
        }
        list.push(c)
      }

      const winnersByPeriod = new Map<string, ResolvedCellRecord>()
      let refCand: ResolvedCellRecord | null = null
      for (const [pk, list] of byPeriod.entries()) {
        if (basisFilter && basisFilter.length > 1) {
          list.sort(
            (a, b) =>
              (a.basis !== null ? basisFilter.indexOf(a.basis) : 999) -
              (b.basis !== null ? basisFilter.indexOf(b.basis) : 999)
          )
        }
        const winner = list.at(0)
        if (winner !== undefined) {
          winnersByPeriod.set(pk, winner)
          unionPeriods.add(pk)
          refCand ??= winner
        }
      }

      resolvedRows.push({ rowId, winnersByPeriod, refCand })
    }

    const periods: readonly string[] =
      requestedPeriods !== null
        ? Object.freeze(requestedPeriods)
        : Object.freeze(
            [...unionPeriods].sort((a, b) =>
              compareStrings(periodKeySortString(a), periodKeySortString(b))
            )
          )

    const panelRows: PanelRow[] = resolvedRows.map((item) => {
      const meta = rowMetaById.get(item.rowId)
      const valuesObj: Record<string, number | null> = {}
      const cellsObj: Record<string, PanelCellProvenance | null> = {}
      for (const pk of periods) {
        const win = item.winnersByPeriod.get(pk)
        if (win !== undefined && win.normalizedNum !== null) {
          valuesObj[pk] = scaleValue(
            win.normalizedNum,
            win.unit,
            options?.divisors
          )
          cellsObj[pk] = this.#toPanelCellProvenance(win)
        } else {
          valuesObj[pk] = null
          cellsObj[pk] = null
        }
      }
      const rowUnit = item.refCand?.unit ?? null
      return Object.freeze({
        row_id: item.rowId,
        label: meta?.label ?? item.rowId,
        raw_label: meta?.rawLabel ?? null,
        category: meta?.category ?? null,
        is_subtotal: subtotalRowIds.has(item.rowId),
        unit: rowUnit,
        unit_kind: rowUnit !== null ? classifyUnitKind(rowUnit) : null,
        dimension: item.refCand?.dimension ?? null,
        entity: item.refCand?.entity ?? null,
        values: Object.freeze(valuesObj),
        cells: Object.freeze(cellsObj),
      })
    })

    return Object.freeze({
      schedule_id: scheduleId,
      title,
      periods,
      rows: Object.freeze(panelRows),
    })
  }

  #toPanelCellProvenance(win: ResolvedCellRecord): PanelCellProvenance {
    const docTitle = this.#docTitles.get(win.docId) ?? win.docId
    return Object.freeze({
      doc_id: win.docId,
      col_id: win.colId,
      basis: win.basis ?? "unadjusted",
      citation: `${docTitle}, ${formatLocatorCitation(win.locator)}`,
      note: win.note,
      origin: win.origin,
      exemption: win.exemption,
      restatement: win.restatement,
    })
  }

  breakdown(
    scheduleId: string,
    rowId: string,
    options: BreakdownQueryOptions
  ): RowBreakdown {
    const cleanScheduleId = scheduleId.trim()
    if (cleanScheduleId.length === 0) {
      throw new Error("breakdown() requires a non-empty schedule_id")
    }
    const cleanRowId = rowId.trim()
    if (cleanRowId.length === 0) {
      throw new Error("breakdown() requires a non-empty row_id")
    }
    const rawOptions: unknown = options
    if (
      rawOptions === null ||
      rawOptions === undefined ||
      typeof rawOptions !== "object"
    ) {
      throw new Error("breakdown() requires an options object with 'by'")
    }
    if (!isBreakdownAxis(options.by)) {
      throw new Error(
        `Invalid breakdown axis ${JSON.stringify(options.by)}; expected one of (${VALID_BREAKDOWN_AXES.join(", ")})`
      )
    }
    const by: BreakdownAxis = options.by
    validateDivisors(options.divisors)

    const hasSchedule = this.#tablesMeta.some(
      (t) => t.scheduleId === cleanScheduleId
    )
    if (!hasSchedule) {
      throw new Error(`Unknown schedule '${cleanScheduleId}'`)
    }
    const matchingRowMeta = this.#rowsMeta.filter(
      (r) => r.scheduleId === cleanScheduleId && r.rowId === cleanRowId
    )
    if (matchingRowMeta.length === 0) {
      throw new Error(
        `Unknown row_id '${cleanRowId}' in schedule '${cleanScheduleId}'`
      )
    }

    const docsWithEntityCell =
      options.entity !== undefined
        ? new Set(
            this.#allCells
              .filter(
                (c) =>
                  c.scheduleId === cleanScheduleId &&
                  c.rowId === cleanRowId &&
                  c.entity === options.entity
              )
              .map((c) => c.docId)
          )
        : null

    const sortedRowMeta = [...matchingRowMeta].sort((a, b) => {
      if (options.entity !== undefined && docsWithEntityCell !== null) {
        const aMatch =
          a.entity === options.entity || docsWithEntityCell.has(a.docId) ? 0 : 1
        const bMatch =
          b.entity === options.entity || docsWithEntityCell.has(b.docId) ? 0 : 1
        if (aMatch !== bMatch) return aMatch - bMatch
      }
      return compareStrings(b.docSortKey, a.docSortKey)
    })
    const rowLabel = sortedRowMeta[0]?.label ?? cleanRowId

    const requestedPeriods = options.periods
      ? options.periods.map((p) => p.trim())
      : null
    const requestedPeriodSet =
      requestedPeriods !== null ? new Set(requestedPeriods) : null
    const basisList: readonly AccountingBasis[] | null =
      options.basis !== undefined
        ? Array.isArray(options.basis)
          ? options.basis
          : [options.basis]
        : null
    const basisRankMap: ReadonlyMap<string, number> | null =
      basisList !== null
        ? new Map<string, number>(
            basisList.map((b, idx): [string, number] => [b, idx])
          )
        : null

    interface RankedBreakdownCandidate {
      readonly cell: ResolvedCellRecord
      readonly rank: number
    }

    const matchingCells = this.#primaryCells
      .filter((c) => {
        if (!c.isNumeric || c.normalizedNum === null || c.periodKey === null) {
          return false
        }
        if (c.scheduleId !== cleanScheduleId || c.rowId !== cleanRowId) {
          return false
        }
        if (
          requestedPeriodSet !== null &&
          !requestedPeriodSet.has(c.periodKey)
        ) {
          return false
        }
        if (options.entity !== undefined && c.entity !== options.entity) {
          return false
        }
        if (
          options.dimension !== undefined &&
          c.dimension !== options.dimension
        ) {
          return false
        }
        if (options.unit !== undefined && c.unit !== options.unit) {
          return false
        }
        if (
          basisRankMap !== null &&
          (c.basis === null || !basisRankMap.has(c.basis))
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const pCmp = compareStrings(a.periodSortKey, b.periodSortKey)
        if (pCmp !== 0) return pCmp
        return a.seq - b.seq
      })

    const groupsMap = new Map<
      string | null,
      Map<string, RankedBreakdownCandidate[]>
    >()

    for (const cell of matchingCells) {
      if (cell.periodKey === null) continue
      let groupKey: string | null
      switch (by) {
        case "dimension":
          groupKey = cell.dimension
          break
        case "entity":
          groupKey = cell.entity
          break
        case "basis":
          groupKey = cell.basis
          break
      }
      const rank =
        by === "basis" || basisRankMap === null
          ? 0
          : cell.basis !== null
            ? (basisRankMap.get(cell.basis) ?? Number.POSITIVE_INFINITY)
            : Number.POSITIVE_INFINITY

      let periodMap = groupsMap.get(groupKey)
      if (periodMap === undefined) {
        periodMap = new Map<string, RankedBreakdownCandidate[]>()
        groupsMap.set(groupKey, periodMap)
      }
      let list = periodMap.get(cell.periodKey)
      if (list === undefined) {
        list = []
        periodMap.set(cell.periodKey, list)
      }
      list.push({ cell, rank })
    }

    const orderedGroupKeys = [...groupsMap.keys()].sort((a, b) => {
      if (
        by === "basis" &&
        Array.isArray(options.basis) &&
        basisRankMap !== null
      ) {
        const rA =
          a !== null
            ? (basisRankMap.get(a) ?? Number.POSITIVE_INFINITY)
            : Number.POSITIVE_INFINITY
        const rB =
          b !== null
            ? (basisRankMap.get(b) ?? Number.POSITIVE_INFINITY)
            : Number.POSITIVE_INFINITY
        if (rA !== rB) {
          return rA - rB
        }
      }
      if (a === null && b === null) return 0
      if (a === null) return 1
      if (b === null) return -1
      return compareStrings(a, b)
    })

    const unionPeriods = new Set<string>()
    const requireUniformBasis = by !== "basis" && basisList === null

    const resolvedGroups: {
      readonly key: string | null
      readonly winnersByPeriod: ReadonlyMap<string, ResolvedCellRecord>
      readonly refCell: ResolvedCellRecord
    }[] = []

    for (const groupKey of orderedGroupKeys) {
      const periodMap = groupsMap.get(groupKey)
      if (periodMap === undefined) continue

      const scopeContext = `'${cleanScheduleId}', '${cleanRowId}', ${by}=${formatGrainVal(groupKey)}`
      const checkGrainMatch = (
        ref: ResolvedCellRecord,
        cur: ResolvedCellRecord,
        periodScope: string
      ): void => {
        if (ref.dimension !== cur.dimension) {
          throw new Error(
            `Multiple dimensions (${formatGrainVal(ref.dimension)}, ${formatGrainVal(cur.dimension)}) found for (${scopeContext}, ${periodScope}). Specify dimension=... explicitly.`
          )
        }
        if (requireUniformBasis && ref.basis !== cur.basis) {
          throw new Error(
            `Multiple bases (${formatGrainVal(ref.basis)}, ${formatGrainVal(cur.basis)}) found for (${scopeContext}, ${periodScope}). Specify basis=... explicitly.`
          )
        }
        if (ref.unit !== cur.unit) {
          throw new Error(
            `Multiple units (${formatGrainVal(ref.unit)}, ${formatGrainVal(cur.unit)}) found for (${scopeContext}, ${periodScope}). Specify unit=... explicitly.`
          )
        }
        if (ref.entity !== cur.entity) {
          throw new Error(
            `Multiple entities (${formatGrainVal(ref.entity)}, ${formatGrainVal(cur.entity)}) found for (${scopeContext}, ${periodScope}). Specify entity=... explicitly.`
          )
        }
      }

      const winnersByPeriod = new Map<string, ResolvedCellRecord>()
      let resolvedRef: {
        readonly pk: string
        readonly cell: ResolvedCellRecord
      } | null = null

      for (const [pk, candidates] of periodMap.entries()) {
        let bestRank = Number.POSITIVE_INFINITY
        for (const c of candidates) {
          if (c.rank < bestRank) {
            bestRank = c.rank
          }
        }
        const winners = candidates.filter((c) => c.rank === bestRank)
        const firstWin = winners[0]?.cell
        if (firstWin === undefined) continue

        for (let i = 1; i < winners.length; i += 1) {
          const other = winners[i]?.cell
          if (other !== undefined) {
            checkGrainMatch(firstWin, other, `period='${pk}'`)
          }
        }

        if (resolvedRef !== null) {
          checkGrainMatch(
            resolvedRef.cell,
            firstWin,
            `periods '${resolvedRef.pk}' and '${pk}'`
          )
        } else {
          resolvedRef = { pk, cell: firstWin }
        }

        winnersByPeriod.set(pk, firstWin)
        unionPeriods.add(pk)
      }

      if (resolvedRef !== null) {
        resolvedGroups.push({
          key: groupKey,
          winnersByPeriod,
          refCell: resolvedRef.cell,
        })
      }
    }

    const periods: readonly string[] =
      requestedPeriods !== null
        ? Object.freeze([...requestedPeriods])
        : Object.freeze(
            [...unionPeriods].sort((a, b) =>
              compareStrings(periodKeySortString(a), periodKeySortString(b))
            )
          )

    const groups: BreakdownGroup[] = resolvedGroups.map((item) => {
      const unit = item.refCell.unit
      if (unit === null) {
        throw new Error(
          `Missing observation unit for breakdown group (${cleanScheduleId}, ${cleanRowId}, ${by}=${formatGrainVal(item.key)})`
        )
      }
      const unitKind = classifyUnitKind(unit)
      if (unitKind === null) {
        throw new Error(
          `Unknown observation unit '${unit}' for breakdown group (${cleanScheduleId}, ${cleanRowId}, ${by}=${formatGrainVal(item.key)})`
        )
      }
      const valuesObj: Record<string, number | null> = {}
      const cellsObj: Record<string, PanelCellProvenance | null> = {}
      for (const pk of periods) {
        const win = item.winnersByPeriod.get(pk)
        if (win !== undefined && win.normalizedNum !== null) {
          valuesObj[pk] = scaleValue(
            win.normalizedNum,
            win.unit,
            options.divisors
          )
          cellsObj[pk] = this.#toPanelCellProvenance(win)
        } else {
          valuesObj[pk] = null
          cellsObj[pk] = null
        }
      }
      return Object.freeze({
        key: item.key,
        unit,
        unit_kind: unitKind,
        dimension: item.refCell.dimension,
        entity: item.refCell.entity,
        values: Object.freeze(valuesObj),
        cells: Object.freeze(cellsObj),
      })
    })

    return Object.freeze({
      schedule_id: cleanScheduleId,
      row_id: cleanRowId,
      label: rowLabel,
      by,
      periods,
      groups: Object.freeze(groups),
    })
  }

  cells(options?: CellsQueryOptions): ScheduleCellRecord[] {
    const statusFilter = options?.status ?? "primary"
    const source =
      statusFilter === "primary" ? this.#primaryCells : this.#allCells

    return source
      .filter((c) => {
        if (
          options?.schedule_id !== undefined &&
          c.scheduleId !== options.schedule_id
        ) {
          return false
        }
        if (options?.doc_id !== undefined && c.docId !== options.doc_id) {
          return false
        }
        if (
          options?.period_key !== undefined &&
          c.periodKey !== options.period_key.trim()
        ) {
          return false
        }
        if (options?.entity !== undefined && c.entity !== options.entity) {
          return false
        }
        if (options?.basis !== undefined && c.basis !== options.basis) {
          return false
        }
        if (options?.unit !== undefined && c.unit !== options.unit) {
          return false
        }
        if (
          options?.dimension !== undefined &&
          c.dimension !== options.dimension
        ) {
          return false
        }
        if (
          options?.data_type !== undefined &&
          c.dataType !== options.data_type
        ) {
          return false
        }
        if (statusFilter !== "all" && c.status !== statusFilter) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const schedCmp = compareStrings(a.scheduleId, b.scheduleId)
        if (schedCmp !== 0) return schedCmp
        if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex
        if (a.colIndex !== b.colIndex) return a.colIndex - b.colIndex
        const docCmp = compareStrings(a.docId, b.docId)
        if (docCmp !== 0) return docCmp
        const rowCmp = compareStrings(a.rowId, b.rowId)
        if (rowCmp !== 0) return rowCmp
        return compareStrings(a.colId, b.colId)
      })
      .map(toScheduleCellRecord)
  }

  row(
    scheduleId: string,
    rowId: string,
    options?: RowQueryOptions
  ): Record<string, number | string | null> {
    const source = options?.doc_id ? this.#allCells : this.#primaryCells
    const cells = source.filter((c) => {
      if (c.scheduleId !== scheduleId || c.rowId !== rowId) return false
      if (options?.doc_id && c.docId !== options.doc_id) return false
      if (options?.entity !== undefined && c.entity !== options.entity) {
        return false
      }
      return true
    })
    const out: Record<string, number | string | null> = {}
    if (options?.cols) {
      for (const colId of options.cols) {
        out[colId] = null
      }
    }
    for (const c of cells) {
      if (options?.cols && !options.cols.includes(c.colId)) continue
      out[c.colId] = c.isNumeric ? c.normalizedNum : c.valueStr
    }
    return out
  }

  rows(
    scheduleId: string,
    options?: DocScopeOptions
  ): readonly ScheduleRowSummary[] {
    const filtered = this.#rowsMeta
      .filter((r) => {
        if (r.scheduleId !== scheduleId) return false
        if (options?.doc_id && r.docId !== options.doc_id) return false
        if (options?.entity !== undefined && r.entity !== options.entity) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const docCmp = compareStrings(b.docSortKey, a.docSortKey)
        if (docCmp !== 0) return docCmp
        return a.rowIndex - b.rowIndex
      })

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
          cells: Object.freeze(this.row(scheduleId, r.rowId, options)),
        })
      )
  }

  citation(
    scheduleId: string,
    rowId: string,
    options: CitationQueryOptions
  ): string {
    const basisFilter = options.basis
      ? Array.isArray(options.basis)
        ? options.basis
        : [options.basis]
      : null

    const source = options.doc_id ? this.#allCells : this.#primaryCells
    const matches = source.filter((c) => {
      if (c.scheduleId !== scheduleId || c.rowId !== rowId) return false
      if (options.doc_id && c.docId !== options.doc_id) return false
      if (options.period_key && c.periodKey !== options.period_key.trim()) {
        return false
      }
      if (options.col_id && c.colId !== options.col_id) return false
      if (options.entity !== undefined && c.entity !== options.entity) {
        return false
      }
      if (
        options.dimension !== undefined &&
        c.dimension !== options.dimension
      ) {
        return false
      }
      if (options.unit !== undefined && c.unit !== options.unit) return false
      if (
        basisFilter !== null &&
        (c.basis === null || !basisFilter.includes(c.basis))
      ) {
        return false
      }
      return true
    })

    if (matches.length === 0) {
      throw new Error(
        `No primary cell found for citation (${scheduleId}, ${rowId})`
      )
    }
    if (basisFilter && basisFilter.length > 1) {
      matches.sort(
        (a, b) =>
          (a.basis !== null ? basisFilter.indexOf(a.basis) : 999) -
          (b.basis !== null ? basisFilter.indexOf(b.basis) : 999)
      )
    }
    const winner = matches.at(0)
    if (winner === undefined) {
      throw new Error(
        `No primary cell found for citation (${scheduleId}, ${rowId})`
      )
    }
    const docTitle = this.#docTitles.get(winner.docId) ?? winner.docId
    return `${docTitle}, ${formatLocatorCitation(winner.locator)}`
  }

  scheduleCitation(scheduleId: string, options?: DocScopeOptions): string {
    const source = options?.doc_id ? this.#allCells : this.#primaryCells
    const scopedCells = source
      .filter((c) => {
        if (c.scheduleId !== scheduleId) return false
        if (options?.doc_id && c.docId !== options.doc_id) return false
        if (options?.entity !== undefined && c.entity !== options.entity) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const docCmp = compareStrings(a.docSortKey, b.docSortKey)
        if (docCmp !== 0) return docCmp
        if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex
        return a.colIndex - b.colIndex
      })

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

    if (!options?.doc_id) {
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
    }

    const docCells = cellsByDoc.get(bestDocId) ?? []
    const locators = docCells.map((c) => c.locator)
    const resolvedLocator = resolveScheduleLocator(locators)
    const docTitle = this.#docTitles.get(bestDocId) ?? bestDocId
    return `${docTitle}, ${formatLocatorCitation(resolvedLocator)}`
  }

  close(): void {
    // No-op for pure in-memory reader
  }

  [Symbol.dispose](): void {
    this.close()
  }
}

export function compileKgFromDir(dirPath = "data/audited"): KgRegistry {
  const resolvedDir = path.resolve(process.cwd(), dirPath)
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
