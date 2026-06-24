import type { StatusClass } from '../types/har'
import './Toolbar.css'

export interface Filters {
  search: string
  method: string
  statusClass: StatusClass | 'all'
  type: string
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
  methods: string[]
  types: string[]
  visibleCount: number
  totalCount: number
}

const STATUS_OPTIONS: Array<{ value: StatusClass | 'all'; label: string }> = [
  { value: 'all', label: 'All status' },
  { value: '2xx', label: '2xx Success' },
  { value: '3xx', label: '3xx Redirect' },
  { value: '4xx', label: '4xx Client error' },
  { value: '5xx', label: '5xx Server error' },
  { value: 'pending', label: 'No status' },
]

export function Toolbar({ filters, onChange, methods, types, visibleCount, totalCount }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const isFiltered =
    filters.search !== '' ||
    filters.method !== 'all' ||
    filters.statusClass !== 'all' ||
    filters.type !== 'all'

  return (
    <div className="toolbar">
      <div className="search-box">
        <SearchIcon />
        <input
          type="text"
          placeholder="Filter by URL or name…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        {filters.search && (
          <button className="clear-search" onClick={() => set({ search: '' })} aria-label="Clear search">
            &times;
          </button>
        )}
      </div>

      <select value={filters.method} onChange={(e) => set({ method: e.target.value })}>
        <option value="all">All methods</option>
        {methods.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={filters.statusClass}
        onChange={(e) => set({ statusClass: e.target.value as StatusClass | 'all' })}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select value={filters.type} onChange={(e) => set({ type: e.target.value })}>
        <option value="all">All types</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

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
        <button
          className="reset-btn"
          onClick={() => onChange({ search: '', method: 'all', statusClass: 'all', type: 'all' })}
        >
          Reset
        </button>
      )}
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
