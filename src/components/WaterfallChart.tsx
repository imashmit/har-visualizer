import type { HarTimings } from '../types/har'
import './WaterfallChart.css'

interface Props {
  /** ms offset of this request's start from the timeline origin. */
  startOffset: number
  /** total time of the request in ms. */
  time: number
  timings: HarTimings
  /** total span of the whole capture in ms (timeline width). */
  totalSpan: number
}

interface Segment {
  key: string
  label: string
  value: number
  color: string
}

function buildSegments(timings: HarTimings): Segment[] {
  const order: Array<{ key: keyof HarTimings; label: string; color: string }> = [
    { key: 'blocked', label: 'Blocked', color: 'var(--t-blocked)' },
    { key: 'dns', label: 'DNS', color: 'var(--t-dns)' },
    { key: 'connect', label: 'Connect', color: 'var(--t-connect)' },
    { key: 'ssl', label: 'SSL', color: 'var(--t-ssl)' },
    { key: 'send', label: 'Send', color: 'var(--t-send)' },
    { key: 'wait', label: 'Waiting (TTFB)', color: 'var(--t-wait)' },
    { key: 'receive', label: 'Receive', color: 'var(--t-receive)' },
  ]
  return order
    .map(({ key, label, color }) => ({ key, label, color, value: timings[key] ?? -1 }))
    .filter((s) => s.value > 0)
    .map((s) => ({ key: s.key, label: s.label, value: s.value, color: s.color }))
}

export function WaterfallBar({ startOffset, time, timings, totalSpan }: Props) {
  const span = totalSpan > 0 ? totalSpan : 1
  const leftPct = (startOffset / span) * 100
  const segments = buildSegments(timings)
  const sumKnown = segments.reduce((a, s) => a + s.value, 0)
  // Fall back to a single bar when timings are missing/incomplete.
  const useSegments = sumKnown > 0

  return (
    <div className="wf-track">
      <div
        className="wf-bar"
        style={{ left: `${leftPct}%`, width: `${Math.max((time / span) * 100, 0.4)}%` }}
        title={`Start +${startOffset.toFixed(0)} ms \u00b7 ${time.toFixed(0)} ms total`}
      >
        {useSegments ? (
          segments.map((s) => (
            <span
              key={s.key}
              className="wf-seg"
              style={{ width: `${(s.value / sumKnown) * 100}%`, background: s.color }}
              title={`${s.label}: ${s.value.toFixed(1)} ms`}
            />
          ))
        ) : (
          <span className="wf-seg" style={{ width: '100%', background: 'var(--t-wait)' }} />
        )}
      </div>
    </div>
  )
}

export function WaterfallLegend() {
  const items = [
    { label: 'Blocked', color: 'var(--t-blocked)' },
    { label: 'DNS', color: 'var(--t-dns)' },
    { label: 'Connect', color: 'var(--t-connect)' },
    { label: 'SSL', color: 'var(--t-ssl)' },
    { label: 'Send', color: 'var(--t-send)' },
    { label: 'Wait', color: 'var(--t-wait)' },
    { label: 'Receive', color: 'var(--t-receive)' },
  ]
  return (
    <div className="wf-legend">
      {items.map((i) => (
        <span key={i.label} className="wf-legend-item">
          <span className="wf-legend-dot" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}
