import { useMemo, useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { SummaryBar } from './components/SummaryBar'
import { Toolbar, type Filters } from './components/Toolbar'
import { RequestList } from './components/RequestList'
import { DetailPanel } from './components/DetailPanel'
import { WaterfallLegend } from './components/WaterfallChart'
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

const EMPTY_FILTERS: Filters = {
  search: '',
  method: 'all',
  statusClass: 'all',
  type: 'all',
}

export default function App() {
  const [loaded, setLoaded] = useState<LoadedHar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<number | null>(null)

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
        ? [...new Set(loaded.entries.map((e) => e.type))].map((t) => typeLabel(t)).sort()
        : [],
    [loaded],
  )

  const filtered = useMemo(() => {
    if (!loaded) return []
    const q = filters.search.trim().toLowerCase()
    return loaded.entries.filter((e) => {
      if (q && !e.url.toLowerCase().includes(q) && !e.name.toLowerCase().includes(q)) return false
      if (filters.method !== 'all' && e.method !== filters.method) return false
      if (filters.statusClass !== 'all' && e.statusClass !== filters.statusClass) return false
      if (filters.type !== 'all' && typeLabel(e.type) !== filters.type) return false
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
            <span className="bar b1" />
            <span className="bar b2" />
            <span className="bar b3" />
          </span>
          <span className="brand-name">HAR Viewer</span>
        </button>
        <span className="file-chip" title={loaded.fileName}>
          {loaded.fileName}
        </span>
        <div className="header-spacer" />
        <button className="new-file-btn" onClick={reset}>
          Open another file
        </button>
      </header>

      <SummaryBar summary={summary} />

      <Toolbar
        filters={filters}
        onChange={setFilters}
        methods={methods}
        types={types}
        visibleCount={filtered.length}
        totalCount={loaded.entries.length}
      />

      <div className={`app-main${selectedEntry ? ' with-detail' : ''}`}>
        <div className="list-pane">
          <RequestList
            entries={filtered}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
            totalSpan={totalSpan}
          />
          <WaterfallLegend />
        </div>
        {selectedEntry && (
          <div className="detail-pane">
            <DetailPanel entry={selectedEntry} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
