import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { SummaryBar } from './components/SummaryBar'
import { Toolbar, EMPTY_FILTERS, type Filters } from './components/Toolbar'
import { Timeline } from './components/Timeline'
import { RequestList } from './components/RequestList'
import { DetailPanel } from './components/DetailPanel'
import { WaterfallLegend } from './components/WaterfallChart'
import { ThemeToggle } from './components/ThemeToggle'
import { DEFAULT_COLUMNS, type ColumnKey } from './components/columns'
import { HarParseError, normalizeEntries, parseHar, summarize } from './utils/harParser'
import { typeLabel } from './utils/format'
import type { NormalizedEntry } from './types/har'
import { sampleHar } from './data/sampleHar'
import './App.css'

interface LoadedHar {
  fileName: string
  entries: NormalizedEntry[]
  creator: string
}

export default function App() {
  const [loaded, setLoaded] = useState<LoadedHar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [columns, setColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS)

  const DETAIL_MIN = 380
  const [detailWidth, setDetailWidth] = useState<number>(() => {
    const stored = Number(localStorage.getItem('har-detail-width'))
    return stored >= DETAIL_MIN ? stored : 560
  })
  const resizingRef = useRef(false)

  const onDetailResizeMove = useCallback((ev: MouseEvent) => {
    if (!resizingRef.current) return
    const max = window.innerWidth - 360
    const next = Math.min(max, Math.max(DETAIL_MIN, window.innerWidth - ev.clientX))
    setDetailWidth(next)
  }, [])

  const onDetailResizeEnd = useCallback(() => {
    resizingRef.current = false
    document.removeEventListener('mousemove', onDetailResizeMove)
    document.removeEventListener('mouseup', onDetailResizeEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [onDetailResizeMove])

  const onDetailResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      resizingRef.current = true
      document.addEventListener('mousemove', onDetailResizeMove)
      document.addEventListener('mouseup', onDetailResizeEnd)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [onDetailResizeMove, onDetailResizeEnd],
  )

  useEffect(() => {
    localStorage.setItem('har-detail-width', String(detailWidth))
  }, [detailWidth])

  useEffect(() => () => onDetailResizeEnd(), [onDetailResizeEnd])


  const loadFromText = (text: string, fileName: string) => {
    try {
      const har = parseHar(text)
      const entries = normalizeEntries(har)
      setLoaded({ fileName, entries, creator: har.log.creator?.name ?? 'Unknown' })
      setFilters(EMPTY_FILTERS)
      setSelectedId(null)
      setError(null)
    } catch (e) {
      setError(
        e instanceof HarParseError
          ? e.message
          : 'Something went wrong while reading this file. Please try a different HAR file.',
      )
    }
  }

  const loadSample = () => {
    const entries = normalizeEntries(sampleHar)
    setLoaded({ fileName: 'sample-capture.har', entries, creator: sampleHar.log.creator.name })
    setFilters(EMPTY_FILTERS)
    setSelectedId(null)
    setError(null)
  }

  const reset = () => {
    setLoaded(null)
    setSelectedId(null)
    setError(null)
  }

  const summary = useMemo(
    () => (loaded ? summarize(loaded.entries, loaded.creator) : null),
    [loaded],
  )

  const methods = useMemo(
    () => (loaded ? [...new Set(loaded.entries.map((e) => e.method))].sort() : []),
    [loaded],
  )
  const types = useMemo(
    () =>
      loaded
        ? [...new Set(loaded.entries.map((e) => typeLabel(e.type)))].sort()
        : [],
    [loaded],
  )

  const filtered = useMemo(() => {
    if (!loaded) return []
    const terms = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return loaded.entries.filter((e) => {
      // Deep search: every term must appear somewhere in the entry.
      if (terms.length && !terms.every((t) => e.searchText.includes(t))) return false
      if (filters.methods.length && !filters.methods.includes(e.method)) return false
      if (filters.statusClasses.length && !filters.statusClasses.includes(e.statusClass)) return false
      if (filters.types.length && !filters.types.includes(typeLabel(e.type))) return false
      return true
    })
  }, [loaded, filters])

  const totalSpan = useMemo(() => {
    if (!loaded || loaded.entries.length === 0) return 1
    return Math.max(
      ...loaded.entries.map((e) => e.startOffset + e.time),
      1,
    )
  }, [loaded])

  const selectedEntry = useMemo(
    () => loaded?.entries.find((e) => e.id === selectedId) ?? null,
    [loaded, selectedId],
  )

  if (!loaded || !summary) {
    return <FileUpload onFile={loadFromText} onLoadSample={loadSample} error={error} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="brand" onClick={reset} title="Load a different file">
          <span className="brand-logo" aria-hidden>
            <svg width="30" height="30" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="7" fill="#0f1730" />
              <path
                d="M4 17 H11 L14 11 L18 22 L20.5 17 H23"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="25" cy="17" r="2.6" fill="#34d399" />
            </svg>
          </span>
          <span className="brand-name">HAR Visualizer</span>
        </button>
        <span className="file-chip" title={loaded.fileName}>
          {loaded.fileName}
        </span>
        <div className="header-spacer" />
        <ThemeToggle />
        <button className="new-file-btn" onClick={reset}>
          Open another file
        </button>
      </header>

      <SummaryBar summary={summary} />

      <Timeline
        entries={filtered}
        totalSpan={totalSpan}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
      />

      <Toolbar
        filters={filters}
        onChange={setFilters}
        methods={methods}
        types={types}
        visibleCount={filtered.length}
        totalCount={loaded.entries.length}
        columns={columns}
        onColumnsChange={setColumns}
        onColumnsReset={() => setColumns(DEFAULT_COLUMNS)}
      />

      <div
        className={`app-main${selectedEntry ? ' with-detail' : ''}`}
        style={
          selectedEntry
            ? { gridTemplateColumns: `minmax(0, 1fr) 6px ${detailWidth}px` }
            : undefined
        }
      >
        <div className="list-pane">
          <RequestList
            entries={filtered}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
            totalSpan={totalSpan}
            columns={columns}
          />
          <WaterfallLegend />
        </div>
        {selectedEntry && (
          <>
            <div
              className="pane-resizer"
              onMouseDown={onDetailResizeStart}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize details panel"
            />
            <div className="detail-pane">
              <DetailPanel entry={selectedEntry} onClose={() => setSelectedId(null)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
