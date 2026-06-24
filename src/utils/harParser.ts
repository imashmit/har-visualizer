import type {
  HarEntry,
  HarFile,
  HarSummary,
  NormalizedEntry,
  ResourceType,
  StatusClass,
} from '../types/har'
import { statusClassOf } from './format'

export class HarParseError extends Error {}

export function parseHar(text: string): HarFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new HarParseError(
      "This doesn't look like valid JSON. HAR files are JSON \u2014 make sure the file isn't corrupted.",
    )
  }

  if (
    !data ||
    typeof data !== 'object' ||
    !('log' in data) ||
    typeof (data as HarFile).log !== 'object'
  ) {
    throw new HarParseError(
      "Missing the top-level \u201clog\u201d object. This file doesn't appear to be a HAR capture.",
    )
  }

  const log = (data as HarFile).log
  if (!Array.isArray(log.entries)) {
    throw new HarParseError('The HAR log has no \u201centries\u201d array to display.')
  }

  return data as HarFile
}

function deriveType(entry: HarEntry): ResourceType {
  const hinted = entry._resourceType?.toLowerCase()
  if (hinted) {
    if (hinted === 'document' || hinted === 'doc') return 'document'
    if (hinted === 'stylesheet' || hinted === 'css') return 'stylesheet'
    if (hinted === 'script' || hinted === 'js') return 'script'
    if (hinted === 'image' || hinted === 'img') return 'image'
    if (hinted === 'font') return 'font'
    if (hinted === 'xhr') return 'xhr'
    if (hinted === 'fetch') return 'fetch'
    if (hinted === 'media') return 'media'
    if (hinted === 'websocket' || hinted === 'ws') return 'websocket'
    if (hinted === 'manifest') return 'manifest'
  }

  const mime = entry.response?.content?.mimeType?.toLowerCase() ?? ''
  const url = entry.request?.url?.toLowerCase() ?? ''

  if (mime.includes('html')) return 'document'
  if (mime.includes('css')) return 'stylesheet'
  if (mime.includes('javascript') || mime.includes('ecmascript')) return 'script'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('font/') || mime.includes('font') || /\.(woff2?|ttf|otf|eot)(\?|$)/.test(url))
    return 'font'
  if (mime.startsWith('audio/') || mime.startsWith('video/')) return 'media'
  if (mime.includes('json')) return 'fetch'
  if (mime.includes('manifest')) return 'manifest'

  if (/\.css(\?|$)/.test(url)) return 'stylesheet'
  if (/\.js(\?|$)/.test(url)) return 'script'
  if (/\.(png|jpe?g|gif|svg|webp|avif|ico|bmp)(\?|$)/.test(url)) return 'image'

  return 'other'
}

function deriveName(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname
    const last = path.split('/').filter(Boolean).pop()
    if (last) return last + (u.search ? u.search : '')
    return u.hostname + (u.search ? u.search : '/')
  } catch {
    return url
  }
}

function deriveDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function transferSize(entry: HarEntry): number {
  const t = entry.response?._transferSize
  if (typeof t === 'number' && t >= 0) return t
  const headers = entry.response?.headersSize
  const body = entry.response?.bodySize
  const h = typeof headers === 'number' && headers > 0 ? headers : 0
  const b = typeof body === 'number' && body > 0 ? body : 0
  if (h + b > 0) return h + b
  return entry.response?.content?.size ?? 0
}

function buildSearchText(entry: HarEntry): string {
  const parts: string[] = []
  const req = entry.request
  const res = entry.response

  parts.push(req?.method ?? '', req?.url ?? '', req?.httpVersion ?? '')
  parts.push(String(res?.status ?? ''), res?.statusText ?? '', res?.httpVersion ?? '')
  parts.push(res?.content?.mimeType ?? '')
  if (entry.serverIPAddress) parts.push(entry.serverIPAddress)

  for (const h of req?.headers ?? []) parts.push(h.name, h.value)
  for (const h of res?.headers ?? []) parts.push(h.name, h.value)
  for (const q of req?.queryString ?? []) parts.push(q.name, q.value)
  for (const c of req?.cookies ?? []) parts.push(c.name, c.value)
  for (const c of res?.cookies ?? []) parts.push(c.name, c.value)

  if (req?.postData?.text) parts.push(req.postData.text)
  if (req?.postData?.mimeType) parts.push(req.postData.mimeType)
  // Skip base64-encoded binary bodies; include text bodies for deep search.
  if (res?.content?.text && res.content.encoding !== 'base64') {
    parts.push(res.content.text)
  }

  return parts.join(' \u0001 ').toLowerCase()
}

export function normalizeEntries(har: HarFile): NormalizedEntry[] {
  const entries = har.log.entries
  const starts = entries.map((e) => new Date(e.startedDateTime).getTime())
  const firstStart = Math.min(...starts.filter((n) => Number.isFinite(n)))

  return entries.map((entry, i) => {
    const started = starts[i]
    const status = entry.response?.status ?? 0
    const url = entry.request?.url ?? ''
    const resourceSize = entry.response?.content?.size ?? 0
    return {
      id: i,
      method: entry.request?.method ?? 'GET',
      url,
      name: deriveName(url),
      domain: deriveDomain(url),
      status,
      statusText: entry.response?.statusText ?? '',
      statusClass: statusClassOf(status),
      type: deriveType(entry),
      mimeType: entry.response?.content?.mimeType ?? '',
      protocol: entry.response?.httpVersion || entry.request?.httpVersion || '',
      size: transferSize(entry),
      resourceSize: resourceSize > 0 ? resourceSize : 0,
      time: entry.time ?? 0,
      startOffset: Number.isFinite(started) ? started - firstStart : 0,
      startedDateTime: Number.isFinite(started) ? started : firstStart,
      searchText: buildSearchText(entry),
      raw: entry,
    }
  })
}

export function summarize(entries: NormalizedEntry[], creator: string): HarSummary {
  const statusCounts: Record<StatusClass, number> = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    pending: 0,
  }
  const typeCounts: Record<string, number> = {}
  let totalTransferSize = 0
  let totalResourceSize = 0
  let firstStart = Infinity
  let lastEnd = -Infinity

  for (const e of entries) {
    statusCounts[e.statusClass]++
    typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1
    totalTransferSize += e.size
    totalResourceSize += e.resourceSize
    firstStart = Math.min(firstStart, e.startedDateTime)
    lastEnd = Math.max(lastEnd, e.startedDateTime + e.time)
  }

  const totalTime = entries.length ? Math.max(0, lastEnd - firstStart) : 0

  return {
    totalRequests: entries.length,
    totalTransferSize,
    totalResourceSize,
    totalTime,
    statusCounts,
    typeCounts,
    creator,
    firstStart: entries.length ? firstStart : 0,
    lastEnd: entries.length ? lastEnd : 0,
  }
}
