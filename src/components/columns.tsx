import type { ReactNode } from 'react'
import type { NormalizedEntry } from '../types/har'
import {
  formatBytes,
  formatDuration,
  methodColorVar,
  statusColorVar,
  typeLabel,
} from '../utils/format'
import { WaterfallBar } from './WaterfallChart'

export type ColumnKey =
  | 'name'
  | 'method'
  | 'status'
  | 'type'
  | 'domain'
  | 'protocol'
  | 'size'
  | 'time'
  | 'start'
  | 'waterfall'

export interface ColumnContext {
  totalSpan: number
}

export interface ColumnDef {
  key: ColumnKey
  label: string
  className: string
  sortable: boolean
  /** Value used for sorting; strings sort alphabetically, numbers numerically. */
  sortValue?: (e: NormalizedEntry) => string | number
  render: (e: NormalizedEntry, ctx: ColumnContext) => ReactNode
}

export const ALL_COLUMNS: ColumnDef[] = [
  {
    key: 'name',
    label: 'Name',
    className: 'col-name',
    sortable: true,
    sortValue: (e) => e.name.toLowerCase(),
    render: (e) => (
      <div className="name-cell">
        <span className="name-main" title={e.url}>
          {e.name}
        </span>
        <span className="name-domain">{e.domain}</span>
      </div>
    ),
  },
  {
    key: 'method',
    label: 'Method',
    className: 'col-method',
    sortable: true,
    sortValue: (e) => e.method,
    render: (e) => (
      <span className="method-badge" style={{ color: methodColorVar(e.method) }}>
        {e.method}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    className: 'col-status',
    sortable: true,
    sortValue: (e) => e.status,
    render: (e) => (
      <span className="status-cell">
        <span className="status-dot" style={{ background: statusColorVar(e.statusClass) }} />
        <span className="status-code" style={{ color: statusColorVar(e.statusClass) }}>
          {e.status > 0 ? e.status : '\u2014'}
        </span>
      </span>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    className: 'col-type',
    sortable: true,
    sortValue: (e) => e.type,
    render: (e) => typeLabel(e.type),
  },
  {
    key: 'domain',
    label: 'Domain',
    className: 'col-domain',
    sortable: true,
    sortValue: (e) => e.domain,
    render: (e) => (
      <span className="domain-cell" title={e.domain}>
        {e.domain || '\u2014'}
      </span>
    ),
  },
  {
    key: 'protocol',
    label: 'Protocol',
    className: 'col-protocol',
    sortable: true,
    sortValue: (e) => e.protocol,
    render: (e) => e.protocol || '\u2014',
  },
  {
    key: 'size',
    label: 'Size',
    className: 'col-size',
    sortable: true,
    sortValue: (e) => e.size,
    render: (e) => formatBytes(e.size),
  },
  {
    key: 'time',
    label: 'Time',
    className: 'col-time',
    sortable: true,
    sortValue: (e) => e.time,
    render: (e) => formatDuration(e.time),
  },
  {
    key: 'start',
    label: 'Start',
    className: 'col-start',
    sortable: true,
    sortValue: (e) => e.startOffset,
    render: (e) => `+${formatDuration(e.startOffset)}`,
  },
  {
    key: 'waterfall',
    label: 'Waterfall',
    className: 'col-wf',
    sortable: true,
    sortValue: (e) => e.startOffset,
    render: (e, ctx) => (
      <WaterfallBar
        startOffset={e.startOffset}
        time={e.time}
        timings={e.raw.timings}
        totalSpan={ctx.totalSpan}
      />
    ),
  },
]

export const COLUMN_MAP: Record<ColumnKey, ColumnDef> = Object.fromEntries(
  ALL_COLUMNS.map((c) => [c.key, c]),
) as Record<ColumnKey, ColumnDef>

export const DEFAULT_COLUMNS: ColumnKey[] = [
  'name',
  'method',
  'status',
  'type',
  'size',
  'time',
  'waterfall',
]

/** Name is always shown and cannot be removed. */
export const REQUIRED_COLUMN: ColumnKey = 'name'
