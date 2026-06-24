import type { StatusClass } from '../types/har'
import { statusColorVar } from '../utils/format'
import { MultiSelect } from './MultiSelect'
import { ColumnPicker } from './ColumnPicker'
import type { ColumnKey } from './columns'
import './Toolbar.css'

export interface Filters {
  search: string
  methods: string[]
  statusClasses: StatusClass[]
  types: string[]
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  methods: [],
  statusClasses: [],
  types: [],
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
  methods: string[]
  types: string[]
  visibleCount: number
  totalCount: number
  columns: ColumnKey[]
  onColumnsChange: (cols: ColumnKey[]) => void
  onColumnsReset: () => void
}

const STATUS_OPTIONS: Array<{ value: StatusClass; label: string }> = [
  { value: '2xx', label: '2xx Success' },
  { value: '3xx', label: '3xx Redirect' },
  { value: '4xx', label: '4xx Client error' },
  { value: '5xx', label: '5xx Server error' },
  { value: 'pending', label: 'No status' },
]

export function Toolbar({
  filters,
  onChange,
  methods,
  types,
  visibleCount,
  totalCount,
  columns,
  onColumnsChange,
  onColumnsReset,
}: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const isFiltered =
    filters.search !== '' ||
    filters.methods.length > 0 ||
    filters.statusClasses.length > 0 ||
    filters.types.length > 0

  return (
    <div className="toolbar">
      <div className="search-box">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search everything — URL, headers, body, cookies…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        {filters.search && (
          <button className="clear-search" onClick={() => set({ search: '' })} aria-label="Clear search">
            &times;
          </button>
        )}
      </div>

      <MultiSelect
        label="Methods"
        options={methods.map((m) => ({ value: m, label: m }))}
        selected={filters.methods}
        onChange={(v) => set({ methods: v })}
      />

      <MultiSelect
        label="Status"
        options={STATUS_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          color: statusColorVar(o.value),
        }))}
        selected={filters.statusClasses}
        onChange={(v) => set({ statusClasses: v as StatusClass[] })}
      />

      <MultiSelect
        label="Types"
        options={types.map((t) => ({ value: t, label: t }))}
        selected={filters.types}
        onChange={(v) => set({ types: v })}
      />

      <div className="toolbar-spacer" />

      <span className="result-count">
        {visibleCount === totalCount ? (
          <>{totalCount} requests</>
        ) : (
          <>
            {visibleCount} of {totalCount}
          </>
        )}
      </span>

      {isFiltered && (
        <button className="reset-btn" onClick={() => onChange({ ...EMPTY_FILTERS })}>
          Reset
        </button>
      )}

      <ColumnPicker visible={columns} onChange={onColumnsChange} onReset={onColumnsReset} />
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
