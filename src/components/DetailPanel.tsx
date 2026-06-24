import { useEffect, useMemo, useRef, useState } from 'react'
import type { HarNameValue, NormalizedEntry } from '../types/har'
import {
  formatBytes,
  formatDuration,
  methodColorVar,
  statusColorVar,
} from '../utils/format'
import './DetailPanel.css'

interface Props {
  entry: NormalizedEntry
  onClose: () => void
}

type Tab = 'headers' | 'payload' | 'cookies' | 'response' | 'timing'

export function DetailPanel({ entry, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('headers')
  const { raw } = entry

  const hasPayload =
    (raw.request.queryString?.length ?? 0) > 0 || Boolean(raw.request.postData)
  const hasCookies =
    (raw.request.cookies?.length ?? 0) > 0 || (raw.response.cookies?.length ?? 0) > 0

  const allTabs: Array<{ id: Tab; label: string; show: boolean }> = [
    { id: 'headers', label: 'Headers', show: true },
    { id: 'payload', label: 'Payload', show: hasPayload },
    { id: 'cookies', label: 'Cookies', show: hasCookies },
    { id: 'response', label: 'Response', show: true },
    { id: 'timing', label: 'Timing', show: true },
  ]
  const tabs = allTabs.filter((t) => t.show)

  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'headers'

  return (
    <aside className="detail-panel">
      <header className="detail-header">
        <div className="detail-title">
          <span className="detail-method" style={{ color: methodColorVar(entry.method) }}>
            {entry.method}
          </span>
          <span
            className="detail-status"
            style={{ background: statusColorVar(entry.statusClass) }}
          >
            {entry.status > 0 ? entry.status : '—'} {entry.statusText}
          </span>
        </div>
        <button className="detail-close" onClick={onClose} aria-label="Close details">
          &times;
        </button>
      </header>

      <div className="detail-url" title={entry.url}>
        {entry.url}
      </div>

      <nav className="detail-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={activeTab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="detail-body">
        {activeTab === 'headers' && (
          <>
            <Section title="General">
              <KeyValue
                rows={[
                  { name: 'Request URL', value: entry.url },
                  { name: 'Request Method', value: entry.method },
                  {
                    name: 'Status Code',
                    value: `${entry.status} ${entry.statusText}`,
                  },
                  ...(raw.serverIPAddress
                    ? [{ name: 'Remote Address', value: raw.serverIPAddress }]
                    : []),
                ]}
              />
            </Section>
            <Section title={`Response Headers (${raw.response.headers.length})`}>
              <HeaderTable headers={raw.response.headers} />
            </Section>
            <Section title={`Request Headers (${raw.request.headers.length})`}>
              <HeaderTable headers={raw.request.headers} />
            </Section>
          </>
        )}

        {activeTab === 'payload' && (
          <>
            {raw.request.queryString.length > 0 && (
              <Section title={`Query String (${raw.request.queryString.length})`}>
                <HeaderTable headers={raw.request.queryString} />
              </Section>
            )}
            {raw.request.postData && (
              <Section title="Request Payload">
                <BodyView
                  text={raw.request.postData.text ?? ''}
                  mimeType={raw.request.postData.mimeType}
                />
              </Section>
            )}
          </>
        )}

        {activeTab === 'cookies' && (
          <>
            {raw.request.cookies.length > 0 && (
              <Section title={`Request Cookies (${raw.request.cookies.length})`}>
                <CookieTable cookies={raw.request.cookies} />
              </Section>
            )}
            {raw.response.cookies.length > 0 && (
              <Section title={`Response Cookies (${raw.response.cookies.length})`}>
                <CookieTable cookies={raw.response.cookies} />
              </Section>
            )}
          </>
        )}

        {activeTab === 'response' && (
          <>
            <Section title="Summary">
              <KeyValue
                rows={[
                  { name: 'Content-Type', value: entry.mimeType || '—' },
                  { name: 'Resource Size', value: formatBytes(entry.resourceSize) },
                  { name: 'Transfer Size', value: formatBytes(entry.size) },
                ]}
              />
            </Section>
            <Section title="Response Body">
              <BodyView
                text={raw.response.content.text ?? ''}
                mimeType={entry.mimeType}
                encoding={raw.response.content.encoding}
              />
            </Section>
          </>
        )}

        {activeTab === 'timing' && <TimingView entry={entry} />}
      </div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h4>{title}</h4>
      {children}
    </section>
  )
}

function KeyValue({ rows }: { rows: Array<{ name: string; value: string }> }) {
  return (
    <dl className="kv-list">
      {rows.map((r, i) => (
        <div className="kv-row" key={i}>
          <dt>{r.name}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function HeaderTable({ headers }: { headers: HarNameValue[] }) {
  if (headers.length === 0) return <p className="detail-empty">None</p>
  return (
    <dl className="kv-list">
      {headers.map((h, i) => (
        <div className="kv-row" key={i}>
          <dt>{h.name}</dt>
          <dd className="mono">{h.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function CookieTable({ cookies }: { cookies: NormalizedEntry['raw']['request']['cookies'] }) {
  return (
    <div className="cookie-table">
      {cookies.map((c, i) => (
        <div className="cookie-row" key={i}>
          <div className="cookie-name">{c.name}</div>
          <div className="cookie-value mono">{c.value}</div>
          <div className="cookie-meta">
            {c.domain && <span>{c.domain}</span>}
            {c.path && <span>{c.path}</span>}
            {c.secure && <span className="flag">Secure</span>}
            {c.httpOnly && <span className="flag">HttpOnly</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function tryParse(
  text: string,
  mimeType: string,
): { isJson: boolean; value: unknown; content: string } {
  const looksJson = mimeType.includes('json') || /^\s*[[{]/.test(text)
  if (looksJson) {
    try {
      const value = JSON.parse(text)
      return { isJson: true, value, content: JSON.stringify(value, null, 2) }
    } catch {
      /* fall through */
    }
  }
  return { isJson: false, value: null, content: text }
}

function BodyView({
  text,
  mimeType,
  encoding,
}: {
  text: string
  mimeType: string
  encoding?: string
}) {
  if (!text) {
    return <p className="detail-empty">No body content available in this capture.</p>
  }
  if (encoding === 'base64') {
    return (
      <p className="detail-empty">
        Body is base64-encoded binary content ({formatBytes(text.length)}). Preview not shown.
      </p>
    )
  }
  const parsed = tryParse(text, mimeType)
  if (parsed.isJson) {
    return <JsonViewer value={parsed.value} />
  }
  return <TextViewer content={parsed.content} />
}

/* ------------------------------ search bar ------------------------------ */

function SearchBar({
  query,
  onQuery,
  count,
  active,
  onPrev,
  onNext,
  children,
}: {
  query: string
  onQuery: (v: string) => void
  count: number
  active: number
  onPrev: () => void
  onNext: () => void
  children?: React.ReactNode
}) {
  const has = query.trim().length > 0
  return (
    <div className="bv-search">
      <span className="bv-search-icon" aria-hidden>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search this section…"
        spellCheck={false}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.shiftKey ? onPrev() : onNext()
          }
        }}
      />
      {has && <span className="bv-count">{count ? `${active + 1}/${count}` : '0/0'}</span>}
      <button className="bv-nav" onClick={onPrev} disabled={!count} aria-label="Previous match">
        ↑
      </button>
      <button className="bv-nav" onClick={onNext} disabled={!count} aria-label="Next match">
        ↓
      </button>
      {children}
    </div>
  )
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const lower = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let i = 0
  while (i < text.length) {
    const idx = lower.indexOf(q, i)
    if (idx === -1) {
      parts.push(text.slice(i))
      break
    }
    if (idx > i) parts.push(text.slice(i, idx))
    parts.push(
      <mark key={idx} className="bv-hl">
        {text.slice(idx, idx + q.length)}
      </mark>,
    )
    i = idx + q.length
  }
  return <>{parts}</>
}

/* ------------------------------ JSON viewer ------------------------------ */

interface JsonCtx {
  q: string
  activeId: string | null
  isOpen: (id: string, depth: number) => boolean
  toggle: (id: string, depth: number) => void
}

function ancestorsOf(id: string): string[] {
  const res: string[] = []
  let cur = '$'
  let i = 1
  while (i < id.length) {
    if (id[i] === '.') {
      let j = i + 1
      while (j < id.length && id[j] !== '.' && id[j] !== '[') j++
      cur += id.slice(i, j)
      res.push(cur)
      i = j
    } else if (id[i] === '[') {
      const j = id.indexOf(']', i)
      cur += id.slice(i, j + 1)
      res.push(cur)
      i = j + 1
    } else {
      i++
    }
  }
  res.pop() // drop self, keep ancestors only
  return res
}

function walkMatches(
  keyName: string | null,
  isIndex: boolean,
  value: unknown,
  id: string,
  q: string,
  out: string[],
) {
  let matched = false
  if (keyName != null && !isIndex && keyName.toLowerCase().includes(q)) matched = true
  const isObj = value !== null && typeof value === 'object'
  if (!isObj && String(value).toLowerCase().includes(q)) matched = true
  if (matched) out.push(id)
  if (isObj) {
    const arr = Array.isArray(value)
    const entries = arr
      ? (value as unknown[]).map((v, idx) => [String(idx), v] as const)
      : Object.entries(value as Record<string, unknown>)
    for (const [k, v] of entries) {
      const cid = arr ? `${id}[${k}]` : `${id}.${k}`
      walkMatches(String(k), arr, v, cid, q, out)
    }
  }
}

function JsonViewer({ value }: { value: unknown }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [userToggled, setUserToggled] = useState<Map<string, boolean>>(new Map())
  const [allMode, setAllMode] = useState<'expand' | 'collapse' | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const q = query.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!q) return []
    const out: string[] = []
    walkMatches(null, false, value, '$', q, out)
    return out
  }, [q, value])

  const forcedOpen = useMemo(() => {
    const s = new Set<string>()
    for (const id of matches) for (const a of ancestorsOf(id)) s.add(a)
    return s
  }, [matches])

  useEffect(() => {
    setActive(0)
  }, [q])

  useEffect(() => {
    if (!matches.length) return
    const id = matches[Math.min(active, matches.length - 1)]
    const el = containerRef.current?.querySelector(`[data-jid="${CSS.escape(id)}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, matches])

  const isOpen = (id: string, depth: number) => {
    if (forcedOpen.has(id)) return true
    const u = userToggled.get(id)
    if (u !== undefined) return u
    if (allMode === 'expand') return true
    if (allMode === 'collapse') return false
    return depth <= 1
  }

  const toggle = (id: string, depth: number) => {
    const cur = isOpen(id, depth)
    setUserToggled((prev) => {
      const next = new Map(prev)
      next.set(id, !cur)
      return next
    })
  }

  const activeId = matches.length ? matches[Math.min(active, matches.length - 1)] : null
  const ctx: JsonCtx = { q, activeId, isOpen, toggle }

  return (
    <div className="bv-wrap">
      <SearchBar
        query={query}
        onQuery={setQuery}
        count={matches.length}
        active={Math.min(active, Math.max(matches.length - 1, 0))}
        onPrev={() => setActive((a) => (matches.length ? (a - 1 + matches.length) % matches.length : 0))}
        onNext={() => setActive((a) => (matches.length ? (a + 1) % matches.length : 0))}
      >
        <span className="bv-divider" />
        <button
          className="bv-tool"
          onClick={() => {
            setUserToggled(new Map())
            setAllMode('expand')
          }}
        >
          Expand all
        </button>
        <button
          className="bv-tool"
          onClick={() => {
            setUserToggled(new Map())
            setAllMode('collapse')
          }}
        >
          Collapse all
        </button>
      </SearchBar>
      <div className="jv-tree" ref={containerRef}>
        <JsonNode keyName={null} isIndex={false} value={value} id="$" depth={0} ctx={ctx} />
      </div>
    </div>
  )
}

function KeyLabel({ keyName, isIndex, q }: { keyName: string; isIndex: boolean; q: string }) {
  return (
    <span className={`jv-key${isIndex ? ' jv-index' : ''}`}>
      {isIndex ? keyName : <Highlight text={keyName} q={q} />}
      <span className="jv-colon">:</span>
    </span>
  )
}

function ValueLabel({ value, q }: { value: unknown; q: string }) {
  if (value === null) return <span className="jv-val jv-null">null</span>
  const t = typeof value
  if (t === 'string') {
    return (
      <span className="jv-val jv-string">
        {'"'}
        <Highlight text={value as string} q={q} />
        {'"'}
      </span>
    )
  }
  if (t === 'number') {
    return (
      <span className="jv-val jv-number">
        <Highlight text={String(value)} q={q} />
      </span>
    )
  }
  if (t === 'boolean') {
    return (
      <span className="jv-val jv-boolean">
        <Highlight text={String(value)} q={q} />
      </span>
    )
  }
  return (
    <span className="jv-val">
      <Highlight text={String(value)} q={q} />
    </span>
  )
}

function JsonNode({
  keyName,
  isIndex,
  value,
  id,
  depth,
  ctx,
}: {
  keyName: string | null
  isIndex: boolean
  value: unknown
  id: string
  depth: number
  ctx: JsonCtx
}) {
  const isObj = value !== null && typeof value === 'object'
  const indent = { paddingLeft: depth * 14 + 8 }
  const rowClass = `jv-row${id === ctx.activeId ? ' jv-active' : ''}`

  if (!isObj) {
    return (
      <div className={rowClass} data-jid={id} style={indent}>
        <span className="jv-spacer" />
        {keyName != null && <KeyLabel keyName={keyName} isIndex={isIndex} q={ctx.q} />}
        <ValueLabel value={value} q={ctx.q} />
      </div>
    )
  }

  const arr = Array.isArray(value)
  const entries = arr
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>)
  const open = ctx.isOpen(id, depth)
  const openB = arr ? '[' : '{'
  const closeB = arr ? ']' : '}'

  return (
    <>
      <div className={rowClass} data-jid={id} style={indent}>
        <button
          className="jv-toggle"
          onClick={() => ctx.toggle(id, depth)}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? '▾' : '▸'}
        </button>
        {keyName != null && <KeyLabel keyName={keyName} isIndex={isIndex} q={ctx.q} />}
        <span className="jv-bracket">{openB}</span>
        {!open && (
          <span className="jv-preview">
            {' '}
            <span className="jv-count">
              {entries.length} {arr ? (entries.length === 1 ? 'item' : 'items') : entries.length === 1 ? 'key' : 'keys'}
            </span>{' '}
            <span className="jv-bracket">{closeB}</span>
          </span>
        )}
      </div>
      {open &&
        entries.map(([k, v]) => (
          <JsonNode
            key={k}
            keyName={k}
            isIndex={arr}
            value={v}
            id={arr ? `${id}[${k}]` : `${id}.${k}`}
            depth={depth + 1}
            ctx={ctx}
          />
        ))}
      {open && (
        <div className="jv-row jv-closing" style={indent}>
          <span className="jv-spacer" />
          <span className="jv-bracket">{closeB}</span>
        </div>
      )}
    </>
  )
}

/* ------------------------------ text viewer ------------------------------ */

function TextViewer({ content }: { content: string }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLPreElement | null>(null)
  const q = query.trim().toLowerCase()

  const count = useMemo(() => {
    if (!q) return 0
    let n = 0
    let i = 0
    const lower = content.toLowerCase()
    while ((i = lower.indexOf(q, i)) !== -1) {
      n++
      i += q.length
    }
    return n
  }, [q, content])

  useEffect(() => {
    setActive(0)
  }, [q])

  useEffect(() => {
    if (!count) return
    const el = containerRef.current?.querySelector(`[data-midx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, count])

  const nodes = useMemo(() => {
    if (!q) return content
    const lower = content.toLowerCase()
    const out: React.ReactNode[] = []
    let i = 0
    let n = 0
    while (i < content.length) {
      const idx = lower.indexOf(q, i)
      if (idx === -1) {
        out.push(content.slice(i))
        break
      }
      if (idx > i) out.push(content.slice(i, idx))
      const mi = n
      out.push(
        <mark key={idx} data-midx={mi} className={`bv-hl${mi === active ? ' active' : ''}`}>
          {content.slice(idx, idx + q.length)}
        </mark>,
      )
      n++
      i = idx + q.length
    }
    return out
  }, [q, content, active])

  return (
    <div className="bv-wrap">
      <SearchBar
        query={query}
        onQuery={setQuery}
        count={count}
        active={count ? active : 0}
        onPrev={() => setActive((a) => (count ? (a - 1 + count) % count : 0))}
        onNext={() => setActive((a) => (count ? (a + 1) % count : 0))}
      />
      <pre className="body-view" ref={containerRef}>
        <code>{nodes}</code>
      </pre>
    </div>
  )
}

function TimingView({ entry }: { entry: NormalizedEntry }) {
  const t = entry.raw.timings
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: 'Blocked', value: t.blocked ?? -1, color: 'var(--t-blocked)' },
    { label: 'DNS Lookup', value: t.dns ?? -1, color: 'var(--t-dns)' },
    { label: 'Connecting', value: t.connect ?? -1, color: 'var(--t-connect)' },
    { label: 'SSL', value: t.ssl ?? -1, color: 'var(--t-ssl)' },
    { label: 'Sending', value: t.send ?? -1, color: 'var(--t-send)' },
    { label: 'Waiting (TTFB)', value: t.wait ?? -1, color: 'var(--t-wait)' },
    { label: 'Receiving', value: t.receive ?? -1, color: 'var(--t-receive)' },
  ].filter((r) => r.value >= 0)
  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <Section title={`Timing — ${formatDuration(entry.time)} total`}>
      <div className="timing-list">
        {rows.map((r) => (
          <div className="timing-row" key={r.label}>
            <span className="timing-label">{r.label}</span>
            <span className="timing-track">
              <span
                className="timing-fill"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
              />
            </span>
            <span className="timing-value">{formatDuration(r.value)}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}
