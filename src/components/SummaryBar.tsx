import type { HarSummary, StatusClass } from '../types/har'
import { formatBytes, formatDuration, statusColorVar } from '../utils/format'
import './SummaryBar.css'

interface Props {
  summary: HarSummary
}

const STATUS_ORDER: StatusClass[] = ['2xx', '3xx', '4xx', '5xx', 'pending']
const STATUS_LABEL: Record<StatusClass, string> = {
  '2xx': '2xx',
  '3xx': '3xx',
  '4xx': '4xx',
  '5xx': '5xx',
  pending: 'pending',
}

export function SummaryBar({ summary }: Props) {
  return (
    <div className="summary-bar">
      <Stat label="Requests" value={String(summary.totalRequests)} accent="var(--accent)" />
      <Divider />
      <Stat label="Transferred" value={formatBytes(summary.totalTransferSize)} accent="var(--m-get)" />
      <Stat label="Resources" value={formatBytes(summary.totalResourceSize)} accent="var(--m-patch)" />
      <Divider />
      <Stat label="Load time" value={formatDuration(summary.totalTime)} accent="var(--c-2xx)" />
      <Divider />
      <div className="status-chips">
        {STATUS_ORDER.filter((s) => summary.statusCounts[s] > 0).map((s) => (
          <span className="status-chip" key={s} style={{ ['--chip' as string]: statusColorVar(s) }}>
            <span className="dot" />
            {summary.statusCounts[s]} {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="summary-stat">
      <span className="stat-value" style={{ color: accent }}>
        {value}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function Divider() {
  return <span className="summary-divider" aria-hidden />
}
