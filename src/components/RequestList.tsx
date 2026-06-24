import { useMemo, useState } from 'react'
import type { NormalizedEntry } from '../types/har'
import { COLUMN_MAP, type ColumnDef, type ColumnKey } from './columns'
import './RequestList.css'

type SortDir = 'asc' | 'desc'

interface Props {
  entries: NormalizedEntry[]
  selectedId: number | null
  onSelect: (id: number) => void
  totalSpan: number
  columns: ColumnKey[]
}

export function RequestList({ entries, selectedId, onSelect, totalSpan, columns }: Props) {
  const [sortKey, setSortKey] = useState<ColumnKey>('start')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const cols: ColumnDef[] = useMemo(
    () => columns.map((k) => COLUMN_MAP[k]).filter(Boolean),
    [columns],
  )

  // Fall back to a visible column if the active sort column was hidden.
  const activeSortKey: ColumnKey = columns.includes(sortKey)
    ? sortKey
    : (columns.find((k) => COLUMN_MAP[k]?.sortable) ?? columns[0])

  const sorted = useMemo(() => {
    const def = COLUMN_MAP[activeSortKey]
    const getVal = def?.sortValue
    const arr = [...entries]
    if (getVal) {
      arr.sort((a, b) => {
        const av = getVal(a)
        const bv = getVal(b)
        let cmp = 0
        if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
        else cmp = String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return arr
  }, [entries, activeSortKey, sortDir])

  const toggleSort = (key: ColumnKey) => {
    const def = COLUMN_MAP[key]
    if (!def?.sortable) return
    if (key === activeSortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(typeof def.sortValue?.(entries[0] ?? ({} as NormalizedEntry)) === 'number' ? 'desc' : 'asc')
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
            {cols.map((c) => (
              <th
                key={c.key}
                className={`${c.className}${c.sortable ? ' sortable' : ''}${
                  activeSortKey === c.key ? ' active' : ''
                }`}
                onClick={() => toggleSort(c.key)}
              >
                <span className="th-inner">
                  {c.label}
                  {activeSortKey === c.key && (
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
              {cols.map((c) => (
                <td key={c.key} className={c.className}>
                  {c.render(e, { totalSpan })}
                </td>
              ))}
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
