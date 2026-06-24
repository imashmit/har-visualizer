import { useEffect, useRef, useState } from 'react'
import './MultiSelect.css'

export interface Option {
  value: string
  label: string
  /** Optional color swatch shown next to the label. */
  color?: string
}

interface Props {
  /** Short label shown when nothing is selected, e.g. "Methods". */
  label: string
  options: Option[]
  /** Selected values. Empty array means "all" (no filter). */
  selected: string[]
  onChange: (selected: string[]) => void
}

export function MultiSelect({ label, options, selected, onChange }: Props) {
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

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    )
  }

  const allSelected = selected.length === 0
  const summary = allSelected
    ? `All ${label.toLowerCase()}`
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} ${label.toLowerCase()}`

  return (
    <div className={`multiselect${open ? ' open' : ''}`} ref={ref}>
      <button className="ms-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={`ms-summary${allSelected ? ' all' : ''}`}>{summary}</span>
        {!allSelected && <span className="ms-count">{selected.length}</span>}
        <ChevronIcon />
      </button>

      {open && (
        <div className="ms-menu" role="listbox">
          <div className="ms-menu-head">
            <span>{label}</span>
            {!allSelected && (
              <button className="ms-clear" onClick={() => onChange([])}>
                Clear
              </button>
            )}
          </div>
          <div className="ms-options">
            {options.map((o) => {
              const checked = selected.includes(o.value)
              return (
                <button
                  key={o.value}
                  className={`ms-option${checked ? ' checked' : ''}`}
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(o.value)}
                >
                  <span className="ms-check" aria-hidden>
                    {checked && <CheckIcon />}
                  </span>
                  {o.color && <span className="ms-swatch" style={{ background: o.color }} />}
                  <span className="ms-label">{o.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="ms-chevron">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
