import { useMemo, useState } from 'react'
import type { NormalizedEntry } from '../types/har'
import {
  formatBytes,
  formatDuration,
  methodColorVar,
  statusColorVar,
  typeLabel,
} from '../utils/format'
import { WaterfallBar } from './WaterfallChart'
import './RequestList.css'

type SortKey = 'name' | 'status' | 'method' | 'type' | 'size' | 'time' | 'start'
type SortDir = 'asc' | 'desc'

interface Props {
  entries: NormalizedEntry[]
  selectedId: number | null
  onSelect: (id: number) => void
  totalSpan: number
}

const COLUMNS: Array<{ key: SortKey; label: string; className: string; sortable: boolean }> = [
  { key: 'name', label: 'Name', className: 'col-name', sortable: true },
  { key: 'method', label: 'Method', className: 'col-method', sortable: true },
  { key: 'status', label: 'Status', className: 'col-status', sortable: true },
  { key: 'type', label: 'Type', className: 'col-type', sortable: true },
  { key: 'size', label: 'Size', className: 'col-size', sortable: true },
  { key: 'time', label: 'Time', className: 'col-time', sortable: true },
  { key: 'start', label: 'Waterfall', className: 'col-wf', sortable: true },
]

export function RequestList({ entries, selectedId, onSelect, totalSpan }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('start')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    const arr = [...entries]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'method':
          cmp = a.method.localeCompare(b.method)
          break
        case 'status':
          cmp = a.status - b.status
          break
        case 'type':
          cmp = a.type.localeCompare(b.type)
          break
        case 'size':
          cmp = a.size - b.size
          break
        case 'time':
          cmp = a.time - b.time
          break
        case 'start':
          cmp = a.startOffset - b.startOffset
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [entries, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' || key === 'method' || key === 'type' ? 'asc' : 'desc')
    }
  }

  if (entries.length === 0) {
    return (
      <div className="request-empty">
        <EmptyIcon />
        <p>No requests match your filters.</p>
        <span>Try adjusting the search or filter options above.</span>
      </div>
    )
  }

  return (
    <div className="request-list">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={`${c.className}${c.sortable ? ' sortable' : ''}${
                  sortKey === c.key ? ' active' : ''
                }`}
                onClick={() => c.sortable && toggleSort(c.key)}
              >
                <span className="th-inner">
                  {c.label}
                  {sortKey === c.key && (
                    <span className="sort-arrow">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
            <tr
              key={e.id}
              className={selectedId === e.id ? 'selected' : ''}
              onClick={() => onSelect(e.id)}
            >
              <td className="col-name">
                <div className="name-cell">
                  <span className="name-main" title={e.url}>
                    {e.name}
                  </span>
                  <span className="name-domain">{e.domain}</span>
                </div>
              </td>
              <td className="col-method">
                <span className="method-badge" style={{ color: methodColorVar(e.method) }}>
                  {e.method}
                </span>
              </td>
              <td className="col-status">
                <span className="status-cell">
                  <span className="status-dot" style={{ background: statusColorVar(e.statusClass) }} />
                  <span className="status-code" style={{ color: statusColorVar(e.statusClass) }}>
                    {e.status > 0 ? e.status : '\u2014'}
                  </span>
                </span>
              </td>
              <td className="col-type">{typeLabel(e.type)}</td>
              <td className="col-size">{formatBytes(e.size)}</td>
              <td className="col-time">{formatDuration(e.time)}</td>
              <td className="col-wf">
                <WaterfallBar
                  startOffset={e.startOffset}
                  time={e.time}
                  timings={e.raw.timings}
                  totalSpan={totalSpan}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
