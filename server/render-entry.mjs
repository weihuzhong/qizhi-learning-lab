import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const backend = 'https://qizhi-wuhaozhe.netlify.app';
const pptRunner = 'https://qizhi-pptmaster.onrender.com';
const draftMarker = '初稿已生成，请从参赛网站下载并查看逐页复核建议。';
let lastRunnerWake = 0;
let wakingRunner = false;

function warmPptRunner() {
  if (wakingRunner || Date.now() - lastRunnerWake < 15000) return;
  wakingRunner = true;
  lastRunnerWake = Date.now();
  // Keep the wake request alive through Render's cold start, outside the user's request.
  void fetch(pptRunner + '/v1/wake', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(70000),
  }).then(response => response.body?.cancel()).catch(() => {}).finally(() => {
    wakingRunner = false;
  });
}
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
    .map(part => part.trim()).filter(part => /^qizhi_session=[a-f0-9]{64}$/.test(part) ||
      (url.pathname.startsWith('/api/ppt/') && /^qizhi_ppt_visitor=[a-f0-9]{64}$/.test(part)));
  if (session?.length) headers.set('cookie', session.join('; '));
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

  if (url.pathname === '/api/ppt/config' && session?.some(cookie => cookie.startsWith('qizhi_session='))) warmPptRunner();
  const draftFile = req.method === 'GET' && /^\/api\/ppt\/drafts\/[a-f0-9]{32}\/(?:deck\.pptx|page-\d{2}\.png|audit\.json)$/.test(url.pathname);
  const response = await fetch((draftFile ? pptRunner : backend) + url.pathname + url.search, {
    method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(90000),
  });
  if (response.status >= 300 && response.status < 400) {
    return json(res, 502, { error: '后端暂不可用，请稍后重试' });
  }
  if (response.ok && req.method === 'POST' &&
      (url.pathname === '/api/ppt/jobs' || /^\/api\/ppt\/jobs\/[a-f0-9]{32}\/wake$/.test(url.pathname))) warmPptRunner();
  if (response.ok && req.method === 'GET' && /^\/api\/ppt\/jobs\/[a-f0-9]{32}$/.test(url.pathname)) {
    const data = await response.json();
    const job = data.job;
    if (job?.status === 'failed' && job.error === draftMarker) {
      const draft = await fetch(pptRunner + '/api/ppt/drafts/' + job.id, {
        headers, redirect: 'error', signal: AbortSignal.timeout(65000),
      }).catch(() => null);
      if (draft?.ok) {
        const {result, expiresAt} = await draft.json();
        job.status = 'draft';
        job.error = null;
        job.progress = {phase: 'draft', pages: result.actualCount, message: '初稿已生成，请查看复核意见并下载修改'};
        job.result = {...result, delivery: 'temporary', expiresAt};
      } else if (draft?.status === 410) {
        job.error = '临时初稿已过期或后台已重启，教案已保留';
      } else return json(res, 503, {error: '临时初稿暂时无法读取，正在重试'});
    }
    return json(res, response.status, data);
  }
  const output = { 'cache-control': draftFile ? 'private, no-store' : 'no-store', 'x-content-type-options': 'nosniff' };
  for (const name of ['content-type', 'content-disposition']) {
    const value = response.headers.get(name);
    if (value) output[name] = value;
  }
  const cookies = response.headers.getSetCookie()
    .filter(cookie => (cookie.startsWith('qizhi_session=') ||
      (url.pathname === '/api/ppt/jobs' && /^qizhi_ppt_visitor=[a-f0-9]{64}(?:;|$)/.test(cookie))) &&
      !/(?:^|;)\s*domain=/i.test(cookie));
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
