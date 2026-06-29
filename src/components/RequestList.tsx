import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NormalizedEntry } from '../types/har'
import { COLUMN_MAP, type ColumnDef, type ColumnKey } from './columns'
import './RequestList.css'

type SortDir = 'asc' | 'desc'

const WIDTHS_STORAGE_KEY = 'har-col-widths'
const MIN_COL_WIDTH = 56

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  name: 260,
  method: 80,
  status: 86,
  type: 100,
  domain: 160,
  protocol: 90,
  size: 90,
  time: 90,
  start: 96,
  waterfall: 240,
}

function loadWidths(): Record<ColumnKey, number> {
  if (typeof window === 'undefined') return { ...DEFAULT_WIDTHS }
  try {
    const stored = JSON.parse(window.localStorage.getItem(WIDTHS_STORAGE_KEY) ?? '{}')
    return { ...DEFAULT_WIDTHS, ...stored }
  } catch {
    return { ...DEFAULT_WIDTHS }
  }
}

interface Props {
  entries: NormalizedEntry[]
  selectedId: number | null
  onSelect: (id: number) => void
  totalSpan: number
  columns: ColumnKey[]
}

export function RequestList({ entries, selectedId, onSelect, totalSpan, columns }: Props) {
  const [sortKey, setSortKey] = useState<ColumnKey>('waterfall')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(loadWidths)
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null)
  const resizingRef = useRef<{ key: ColumnKey; startX: number; startW: number } | null>(null)

  // Bring the selected row into view (e.g. when picked from the timeline).
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  // Persist column widths.
  useEffect(() => {
    window.localStorage.setItem(WIDTHS_STORAGE_KEY, JSON.stringify(widths))
  }, [widths])

  const onResizeMove = useCallback((ev: MouseEvent) => {
    const r = resizingRef.current
    if (!r) return
    const next = Math.max(MIN_COL_WIDTH, r.startW + (ev.clientX - r.startX))
    setWidths((w) => ({ ...w, [r.key]: next }))
  }, [])

  const onResizeEnd = useCallback(() => {
    resizingRef.current = null
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [onResizeMove])

  const onResizeStart = useCallback(
    (e: React.MouseEvent, key: ColumnKey) => {
      e.preventDefault()
      e.stopPropagation()
      resizingRef.current = { key, startX: e.clientX, startW: widths[key] ?? DEFAULT_WIDTHS[key] }
      document.addEventListener('mousemove', onResizeMove)
      document.addEventListener('mouseup', onResizeEnd)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [widths, onResizeMove, onResizeEnd],
  )

  useEffect(() => () => onResizeEnd(), [onResizeEnd])

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
        <colgroup>
          {cols.map((c) => (
            <col key={c.key} style={{ width: widths[c.key] ?? DEFAULT_WIDTHS[c.key] }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {cols.map((c, i) => (
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
                {i < cols.length - 1 && (
                  <span
                    className="col-resizer"
                    onMouseDown={(e) => onResizeStart(e, c.key)}
                    onClick={(e) => e.stopPropagation()}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${c.label} column`}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
            <tr
              key={e.id}
              ref={selectedId === e.id ? selectedRowRef : undefined}
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
