import { useState } from 'react'
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

function tryPretty(text: string, mimeType: string): { content: string; isJson: boolean } {
  const looksJson =
    mimeType.includes('json') || /^\s*[[{]/.test(text)
  if (looksJson) {
    try {
      return { content: JSON.stringify(JSON.parse(text), null, 2), isJson: true }
    } catch {
      /* fall through */
    }
  }
  return { content: text, isJson: false }
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
  const { content, isJson } = tryPretty(text, mimeType)
  return (
    <pre className={`body-view${isJson ? ' json' : ''}`}>
      <code>{content}</code>
    </pre>
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
