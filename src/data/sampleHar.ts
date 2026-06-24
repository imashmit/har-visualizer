import type { HarFile } from '../types/har'

// A small, realistic synthetic capture used for the "Try a sample" button.
// Timings are illustrative; no real network data is included.
function entry(
  start: number,
  method: string,
  url: string,
  status: number,
  mimeType: string,
  resourceType: string,
  size: number,
  timings: { blocked: number; dns: number; connect: number; ssl: number; send: number; wait: number; receive: number },
  responseText?: string,
) {
  const time =
    timings.blocked + timings.dns + timings.connect + timings.send + timings.wait + timings.receive
  return {
    startedDateTime: new Date(1718800000000 + start).toISOString(),
    time,
    _resourceType: resourceType,
    request: {
      method,
      url,
      httpVersion: 'http/2.0',
      headers: [
        { name: ':authority', value: 'shop.example.com' },
        { name: 'accept', value: '*/*' },
        { name: 'user-agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      ],
      queryString:
        url.includes('?')
          ? url
              .split('?')[1]
              .split('&')
              .map((p) => ({ name: p.split('=')[0], value: p.split('=')[1] ?? '' }))
          : [],
      cookies: [{ name: 'session', value: 'a1b2c3d4e5', path: '/', domain: '.example.com', secure: true, httpOnly: true }],
      headersSize: 320,
      bodySize: method === 'POST' ? 84 : 0,
      ...(method === 'POST'
        ? { postData: { mimeType: 'application/json', text: '{"productId":42,"qty":1}' } }
        : {}),
    },
    response: {
      status,
      statusText:
        status === 200 ? 'OK' : status === 301 ? 'Moved Permanently' : status === 404 ? 'Not Found' : status === 500 ? 'Internal Server Error' : '',
      httpVersion: 'http/2.0',
      headers: [
        { name: 'content-type', value: mimeType },
        { name: 'content-length', value: String(size) },
        { name: 'cache-control', value: 'max-age=3600' },
      ],
      cookies: [],
      content: {
        size,
        mimeType,
        ...(responseText ? { text: responseText } : {}),
      },
      redirectURL: status === 301 ? 'https://shop.example.com/home' : '',
      headersSize: 240,
      bodySize: size,
      _transferSize: size + 240,
    },
    cache: {},
    timings,
    serverIPAddress: '93.184.216.34',
    connection: '443',
  }
}

export const sampleHar: HarFile = {
  log: {
    version: '1.2',
    creator: { name: 'HAR Viewer Sample', version: '1.0' },
    browser: { name: 'Chrome', version: '125.0' },
    pages: [],
    entries: [
      entry(0, 'GET', 'https://shop.example.com/', 200, 'text/html', 'document', 18240, { blocked: 2, dns: 12, connect: 30, ssl: 22, send: 1, wait: 120, receive: 18 }, '<!doctype html><html><head><title>Example Shop</title></head><body>...</body></html>'),
      entry(60, 'GET', 'https://shop.example.com/assets/app.css', 200, 'text/css', 'stylesheet', 42180, { blocked: 1, dns: 0, connect: 0, ssl: 0, send: 1, wait: 40, receive: 30 }),
      entry(70, 'GET', 'https://shop.example.com/assets/app.js', 200, 'application/javascript', 'script', 128400, { blocked: 1, dns: 0, connect: 0, ssl: 0, send: 1, wait: 55, receive: 90 }),
      entry(90, 'GET', 'https://cdn.example.com/fonts/inter.woff2', 200, 'font/woff2', 'font', 36120, { blocked: 3, dns: 18, connect: 28, ssl: 20, send: 1, wait: 35, receive: 22 }),
      entry(150, 'GET', 'https://cdn.example.com/img/hero.webp', 200, 'image/webp', 'image', 184300, { blocked: 2, dns: 0, connect: 0, ssl: 0, send: 1, wait: 48, receive: 140 }),
      entry(160, 'GET', 'https://api.example.com/v2/products?category=shoes&limit=20', 200, 'application/json', 'fetch', 8420, { blocked: 1, dns: 14, connect: 26, ssl: 18, send: 2, wait: 180, receive: 12 }, '{"products":[{"id":42,"name":"Runner Pro","price":129.99},{"id":43,"name":"Trail X","price":149.5}],"total":2}'),
      entry(360, 'POST', 'https://api.example.com/v2/cart', 200, 'application/json', 'xhr', 220, { blocked: 1, dns: 0, connect: 0, ssl: 0, send: 2, wait: 95, receive: 4 }, '{"ok":true,"cartId":"c_9981","items":1}'),
      entry(380, 'GET', 'https://api.example.com/v2/recommendations', 500, 'application/json', 'xhr', 512, { blocked: 1, dns: 0, connect: 0, ssl: 0, send: 1, wait: 240, receive: 3 }, '{"error":"recommendation service unavailable"}'),
      entry(400, 'GET', 'https://cdn.example.com/img/old-logo.png', 404, 'text/html', 'image', 564, { blocked: 1, dns: 0, connect: 0, ssl: 0, send: 1, wait: 60, receive: 5 }),
      entry(420, 'GET', 'https://shop.example.com/old-home', 301, 'text/html', 'document', 0, { blocked: 1, dns: 0, connect: 0, ssl: 0, send: 1, wait: 30, receive: 1 }),
      entry(440, 'GET', 'https://analytics.example.com/collect?v=2&t=pageview', 200, 'image/gif', 'image', 43, { blocked: 4, dns: 16, connect: 24, ssl: 19, send: 1, wait: 28, receive: 1 }),
      entry(600, 'GET', 'https://api.example.com/v2/inventory/42', 200, 'application/json', 'fetch', 1240, { blocked: 1, dns: 0, connect: 0, ssl: 0, send: 1, wait: 70, receive: 6 }, '{"productId":42,"inStock":true,"warehouses":["us-west","eu-central"]}'),
    ],
  },
}
