// Subset of the HAR 1.2 spec relevant to this viewer.
// http://www.softwareishard.com/blog/har-12-spec/

export interface HarNameValue {
  name: string
  value: string
  comment?: string
}

export interface HarCookie {
  name: string
  value: string
  path?: string
  domain?: string
  expires?: string | null
  httpOnly?: boolean
  secure?: boolean
}

export interface HarPostData {
  mimeType: string
  text?: string
  params?: Array<{ name: string; value?: string; fileName?: string; contentType?: string }>
}

export interface HarRequest {
  method: string
  url: string
  httpVersion: string
  headers: HarNameValue[]
  queryString: HarNameValue[]
  cookies: HarCookie[]
  headersSize: number
  bodySize: number
  postData?: HarPostData
}

export interface HarContent {
  size: number
  compression?: number
  mimeType: string
  text?: string
  encoding?: string
}

export interface HarResponse {
  status: number
  statusText: string
  httpVersion: string
  headers: HarNameValue[]
  cookies: HarCookie[]
  content: HarContent
  redirectURL: string
  headersSize: number
  bodySize: number
  _transferSize?: number
}

export interface HarTimings {
  blocked?: number
  dns?: number
  connect?: number
  send: number
  wait: number
  receive: number
  ssl?: number
}

export interface HarEntry {
  startedDateTime: string
  time: number
  request: HarRequest
  response: HarResponse
  cache?: Record<string, unknown>
  timings: HarTimings
  serverIPAddress?: string
  connection?: string
  _resourceType?: string
}

export interface HarLog {
  version: string
  creator: { name: string; version: string }
  browser?: { name: string; version: string }
  pages?: Array<Record<string, unknown>>
  entries: HarEntry[]
}

export interface HarFile {
  log: HarLog
}

// ---- Normalized, view-ready model ----

export type ResourceType =
  | 'document'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'xhr'
  | 'fetch'
  | 'media'
  | 'websocket'
  | 'manifest'
  | 'other'

export type StatusClass = '2xx' | '3xx' | '4xx' | '5xx' | 'pending'

export interface NormalizedEntry {
  id: number
  method: string
  url: string
  name: string
  domain: string
  status: number
  statusText: string
  statusClass: StatusClass
  type: ResourceType
  mimeType: string
  /** Transfer size in bytes (over the wire when available). */
  size: number
  /** Uncompressed resource/content size in bytes. */
  resourceSize: number
  /** Total time in ms. */
  time: number
  /** ms offset from the first request's start. */
  startOffset: number
  startedDateTime: number
  raw: HarEntry
}

export interface HarSummary {
  totalRequests: number
  totalTransferSize: number
  totalResourceSize: number
  totalTime: number
  statusCounts: Record<StatusClass, number>
  typeCounts: Record<string, number>
  creator: string
  firstStart: number
  lastEnd: number
}
