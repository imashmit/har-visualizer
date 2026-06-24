import { useEffect, useRef, useState } from 'react'
import { ALL_COLUMNS, REQUIRED_COLUMN, type ColumnKey } from './columns'
import './ColumnPicker.css'

interface Props {
  visible: ColumnKey[]
  onChange: (visible: ColumnKey[]) => void
  onReset: () => void
}

export function ColumnPicker({ visible, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (key: ColumnKey) => {
    if (key === REQUIRED_COLUMN) return
    // Preserve the canonical column order from ALL_COLUMNS.
    const next = visible.includes(key)
      ? visible.filter((k) => k !== key)
      : ALL_COLUMNS.map((c) => c.key).filter((k) => k === key || visible.includes(k))
    onChange(next)
  }

  return (
    <div className={`colpicker${open ? ' open' : ''}`} ref={ref}>
      <button className="colpicker-trigger" onClick={() => setOpen((o) => !o)} title="Configure columns">
        <ColumnsIcon />
        <span>Columns</span>
      </button>

      {open && (
        <div className="colpicker-menu">
          <div className="colpicker-head">
            <span>Columns</span>
            <button className="colpicker-reset" onClick={onReset}>
              Reset
            </button>
          </div>
          <div className="colpicker-options">
            {ALL_COLUMNS.map((c) => {
              const checked = visible.includes(c.key)
              const required = c.key === REQUIRED_COLUMN
              return (
                <button
                  key={c.key}
                  className={`colpicker-option${checked ? ' checked' : ''}${required ? ' required' : ''}`}
                  onClick={() => toggle(c.key)}
                  disabled={required}
                >
                  <span className="colpicker-check" aria-hidden>
                    {checked && <CheckIcon />}
                  </span>
                  <span className="colpicker-label">{c.label}</span>
                  {required && <span className="colpicker-tag">always</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ColumnsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 4v16M15 4v16" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
