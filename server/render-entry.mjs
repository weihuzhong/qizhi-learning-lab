import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const backend = 'https://qizhi-wuhaozhe.netlify.app';
const port = Number(process.env.PORT || 10000);
const origin = new URL(process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + port).origin;
const apiRoute = /^\/api\/(?:status$|chat$|lesson(?:\/|$)|cloud\/|deck\/|ppt\/)/;
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/vendor/pptx.js', ['vendor/pptx.js', 'text/javascript; charset=utf-8']],
  ['/vendor/docx.js', ['vendor/docx.js', 'text/javascript; charset=utf-8']],
  ['/vendor/zip.js', ['vendor/zip.js', 'text/javascript; charset=utf-8']],
  ['/media/classroom-cover.jpg', ['media/classroom-cover.jpg', 'image/jpeg']],
  ['/media/paper-bridge.jpg', ['media/paper-bridge.jpg', 'image/jpeg']],
]);
for (const [path, [file, type]] of assets) {
  assets.set(path, [await readFile(new URL('../public/' + file, import.meta.url)), type]);
}

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

function bodyLimit(path) {
  if (path.startsWith('/api/cloud/')) return 1500000;
  if (path.startsWith('/api/ppt/')) return 180000;
  return 90000;
}

async function forwardApi(req, res, url) {
  const headers = new Headers();
  for (const name of ['content-type', 'accept']) {
    if (typeof req.headers[name] === 'string') headers.set(name, req.headers[name]);
  }
  const session = req.headers.cookie?.split(';')
    .map(part => part.trim()).find(part => /^qizhi_session=[a-f0-9]{64}$/.test(part));
  if (session) headers.set('cookie', session);
  let body;
  if (req.method === 'POST') {
    if (req.headers.origin !== origin) return json(res, 403, { error: '来源不匹配' });
    headers.set('origin', backend);
    const limit = bodyLimit(url.pathname);
    const chunks = [];
    let size = 0;
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > limit) {
        req.resume();
        return json(res, 413, { error: '输入过长' });
      }
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks, size);
  }

  const response = await fetch(backend + url.pathname + url.search, {
    method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(90000),
  });
  if (response.status >= 300 && response.status < 400) {
    return json(res, 502, { error: '后端暂不可用，请稍后重试' });
  }
  const output = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  for (const name of ['content-type', 'content-disposition']) {
    const value = response.headers.get(name);
    if (value) output[name] = value;
  }
  const cookies = response.headers.getSetCookie()
    .filter(cookie => cookie.startsWith('qizhi_session=') && !/(?:^|;)\s*domain=/i.test(cookie));
  if (cookies.length) output['set-cookie'] = cookies;
  res.writeHead(response.status, output);
  if (response.body) await pipeline(Readable.fromWeb(response.body), res);
  else res.end();
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.origin !== origin) return json(res, 400, { error: '请求地址无效' });
    if (!['GET', 'HEAD', 'POST'].includes(req.method)) return json(res, 405, { error: '不支持的请求方法' });
    if (req.method === 'GET' && url.pathname === '/healthz') return json(res, 200, { ok: true });
    if (apiRoute.test(url.pathname) && !url.pathname.startsWith('/api/ppt/worker/')) {
      return await forwardApi(req, res, url);
    }
    const asset = assets.get(url.pathname);
    if (!asset || req.method === 'POST') return json(res, 404, { error: '页面不存在' });
    res.writeHead(200, {
      'content-type': asset[1],
      'content-length': asset[0].length,
      'cache-control': url.pathname === '/' ? 'no-cache' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
      'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    });
    res.end(req.method === 'HEAD' ? undefined : asset[0]);
  } catch {
    if (!res.headersSent) json(res, 502, { error: '后端暂不可用，请稍后重试' });
    else res.destroy();
  }
}).listen(port, '0.0.0.0');
