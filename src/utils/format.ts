import type { ResourceType, StatusClass } from '../types/har'

export function formatBytes(bytes: number): string {
  if (bytes < 0 || !Number.isFinite(bytes)) return '\u2014'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  const decimals = i === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(decimals)} ${units[i]}`
}

export function formatDuration(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return '\u2014'
  if (ms < 1) return '<1 ms'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`
  const m = Math.floor(ms / 60000)
  const s = ((ms % 60000) / 1000).toFixed(0)
  return `${m}m ${s}s`
}

export function statusClassOf(status: number): StatusClass {
  if (status <= 0) return 'pending'
  if (status < 300) return '2xx'
  if (status < 400) return '3xx'
  if (status < 500) return '4xx'
  return '5xx'
}

export function statusColorVar(statusClass: StatusClass): string {
  switch (statusClass) {
    case '2xx':
      return 'var(--c-2xx)'
    case '3xx':
      return 'var(--c-3xx)'
    case '4xx':
      return 'var(--c-4xx)'
    case '5xx':
      return 'var(--c-5xx)'
    default:
      return 'var(--c-pending)'
  }
}

export function methodColorVar(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'var(--m-get)'
    case 'POST':
      return 'var(--m-post)'
    case 'PUT':
      return 'var(--m-put)'
    case 'DELETE':
      return 'var(--m-delete)'
    case 'PATCH':
      return 'var(--m-patch)'
    default:
      return 'var(--m-other)'
  }
}

const TYPE_LABELS: Record<ResourceType, string> = {
  document: 'Document',
  stylesheet: 'Stylesheet',
  script: 'Script',
  image: 'Image',
  font: 'Font',
  xhr: 'XHR',
  fetch: 'Fetch',
  media: 'Media',
  websocket: 'WebSocket',
  manifest: 'Manifest',
  other: 'Other',
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type as ResourceType] ?? 'Other'
}
