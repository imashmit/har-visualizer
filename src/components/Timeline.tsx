import { useMemo, useState } from 'react'
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

const LANE_HEIGHT = 16
const MAX_LANES = 8

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

  const { placed, laneCount } = useMemo(() => {
    const span = totalSpan > 0 ? totalSpan : 1
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
        widthPct: Math.max((Math.max(entry.time, 0) / span) * 100, 0.5),
      })
    }
    return { placed: result, laneCount: Math.max(laneEnds.length, 1) }
  }, [entries, totalSpan])

  const ticks = useMemo(() => tickValues(totalSpan > 0 ? totalSpan : 1), [totalSpan])
  const span = totalSpan > 0 ? totalSpan : 1
  const hovered = placed.find((p) => p.entry.id === hoveredId) ?? null
  const plotHeight = laneCount * LANE_HEIGHT + (laneCount - 1) * 3

  return (
    <div className="timeline">
      <div className="timeline-head">
        <span className="timeline-title">
          Request timeline
          <span className="timeline-sub">{entries.length} shown · in time sequence</span>
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
        <div className="timeline-plot" style={{ height: plotHeight }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="grid-line"
              style={{ left: `${(t / span) * 100}%` }}
              aria-hidden
            />
          ))}

          {placed.map((p) => {
            const selected = p.entry.id === selectedId
            const isHover = p.entry.id === hoveredId
            return (
              <button
                key={p.entry.id}
                className={`tl-bar${selected ? ' selected' : ''}${isHover ? ' hover' : ''}`}
                style={{
                  left: `${p.leftPct}%`,
                  width: `${p.widthPct}%`,
                  top: p.lane * (LANE_HEIGHT + 3),
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
              top: hovered.lane * (LANE_HEIGHT + 3) + LANE_HEIGHT + 6,
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
