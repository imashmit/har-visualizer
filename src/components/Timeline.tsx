import { useMemo, useRef, useState } from 'react'
import type { NormalizedEntry } from '../types/har'
import { formatDuration, methodColorVar, statusColorVar } from '../utils/format'
import './Timeline.css'

interface Props {
  /** Filtered entries to plot. */
  entries: NormalizedEntry[]
  /** Total span of the whole capture (ms) for a stable x-axis. */
  totalSpan: number
  selectedId: number | null
  onSelect: (id: number) => void
}

interface Placed {
  entry: NormalizedEntry
  lane: number
  leftPct: number
  widthPct: number
}

const BAR_HEIGHT = 7
const LANE_GAP = 4
const LANE_PITCH = BAR_HEIGHT + LANE_GAP
const MAX_LANES = 10

function tickValues(span: number): number[] {
  const target = 5
  const rawStep = span / target
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
  const norm = rawStep / mag
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag
  const ticks: number[] = []
  for (let t = 0; t <= span + 0.001; t += step) ticks.push(t)
  return ticks
}

export function Timeline({ entries, totalSpan, selectedId, onSelect }: Props) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [crosshair, setCrosshair] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement | null>(null)

  const span = totalSpan > 0 ? totalSpan : 1

  const { placed, laneCount } = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.startOffset - b.startOffset)
    const laneEnds: number[] = []
    const result: Placed[] = []

    for (const entry of sorted) {
      const start = entry.startOffset
      const end = start + Math.max(entry.time, 0)
      let lane = laneEnds.findIndex((laneEnd) => start >= laneEnd)
      if (lane === -1) {
        lane = laneEnds.length < MAX_LANES ? laneEnds.length : laneEnds.length % MAX_LANES
        if (laneEnds.length < MAX_LANES) laneEnds.push(end)
        else laneEnds[lane] = end
      } else {
        laneEnds[lane] = end
      }
      result.push({
        entry,
        lane,
        leftPct: (start / span) * 100,
        widthPct: Math.max((Math.max(entry.time, 0) / span) * 100, 0.4),
      })
    }
    return { placed: result, laneCount: Math.max(laneEnds.length, 1) }
  }, [entries, span])

  // Sampled "requests in flight" curve — reveals bursts of concurrency.
  const concurrency = useMemo(() => {
    const N = 180
    const ranges = entries.map(
      (e) => [e.startOffset, e.startOffset + Math.max(e.time, 0)] as const,
    )
    let maxC = 1
    const ys: number[] = []
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * span
      let c = 0
      for (const [s, e] of ranges) if (t >= s && t < e) c++
      ys.push(c)
      if (c > maxC) maxC = c
    }
    const path = ys
      .map((c, i) => `${(i / N) * 100},${(1 - c / maxC).toFixed(4)}`)
      .join(' L ')
    return { d: `M 0,1 L ${path} L 100,1 Z`, maxC }
  }, [entries, span])

  const ticks = useMemo(() => tickValues(span), [span])
  const hovered = placed.find((p) => p.entry.id === hoveredId) ?? null
  const plotHeight = laneCount * BAR_HEIGHT + (laneCount - 1) * LANE_GAP

  const onPlotMove = (e: React.MouseEvent) => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    setCrosshair(pct)
  }

  return (
    <div className="timeline">
      <div className="timeline-head">
        <span className="timeline-title">
          Request timeline
          <span className="timeline-sub">
            {entries.length} shown
            {concurrency.maxC > 1 && ` · peak ${concurrency.maxC} in flight`}
          </span>
        </span>
        <div className="timeline-axis-top">
          {ticks.map((t) => (
            <span key={t} className="axis-tick" style={{ left: `${(t / span) * 100}%` }}>
              {formatDuration(t)}
            </span>
          ))}
        </div>
      </div>

      <div className="timeline-plot-wrap">
        <div
          ref={plotRef}
          className="timeline-plot"
          style={{ height: plotHeight }}
          onMouseMove={onPlotMove}
          onMouseLeave={() => setCrosshair(null)}
        >
          <svg
            className="tl-concurrency"
            viewBox="0 0 100 1"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="tlConcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={concurrency.d} fill="url(#tlConcFill)" />
          </svg>

          {ticks.map((t) => (
            <span
              key={t}
              className="grid-line"
              style={{ left: `${(t / span) * 100}%` }}
              aria-hidden
            />
          ))}

          {crosshair !== null && (
            <span className="tl-crosshair" style={{ left: `${crosshair * 100}%` }} aria-hidden>
              <span className="tl-crosshair-label">{formatDuration(crosshair * span)}</span>
            </span>
          )}

          {placed.map((p) => {
            const selected = p.entry.id === selectedId
            const isHover = p.entry.id === hoveredId
            const isError = p.entry.statusClass === '5xx' || p.entry.statusClass === '4xx'
            return (
              <button
                key={p.entry.id}
                className={`tl-bar${selected ? ' selected' : ''}${isHover ? ' hover' : ''}${
                  isError ? ' error' : ''
                }`}
                style={{
                  left: `${p.leftPct}%`,
                  width: `${p.widthPct}%`,
                  top: p.lane * LANE_PITCH,
                  background: statusColorVar(p.entry.statusClass),
                }}
                onMouseEnter={() => setHoveredId(p.entry.id)}
                onMouseLeave={() => setHoveredId((cur) => (cur === p.entry.id ? null : cur))}
                onClick={() => onSelect(p.entry.id)}
                aria-label={`${p.entry.method} ${p.entry.name}`}
              />
            )
          })}
        </div>

        {hovered && (
          <div
            className="tl-tooltip"
            style={{
              left: `${Math.min(Math.max(hovered.leftPct, 0), 100)}%`,
              top: hovered.lane * LANE_PITCH + BAR_HEIGHT + 8,
            }}
          >
            <div className="tl-tip-row">
              <span className="tl-tip-method" style={{ color: methodColorVar(hovered.entry.method) }}>
                {hovered.entry.method}
              </span>
              <span className="tl-tip-status" style={{ color: statusColorVar(hovered.entry.statusClass) }}>
                {hovered.entry.status > 0 ? hovered.entry.status : '—'}
              </span>
            </div>
            <div className="tl-tip-name">{hovered.entry.name}</div>
            <div className="tl-tip-meta">
              start +{formatDuration(hovered.entry.startOffset)} · {formatDuration(hovered.entry.time)}
            </div>
          </div>
        )}

        {placed.length === 0 && (
          <div className="timeline-empty">No requests match the current filters.</div>
        )}
      </div>
    </div>
  )
}
