import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { assertLessonTopic, lessonGenerationRoute, prepareLessonRequest } from '../worker/lesson-topic.js';
import { createAppApi } from './app-api.js';
import { createSupabaseStores, migrationKey } from './supabase-store.js';

const legacyBackend = 'https://qizhi-wuhaozhe.netlify.app';
const databaseEnabled = process.env.QIZHI_DATA_BACKEND === 'supabase';
const readOnly = process.env.QIZHI_MIGRATION_READ_ONLY === '1';
let localApi;
if (databaseEnabled) {
  const vaultSecret = process.env.USER_MODEL_VAULT_SECRET;
  if (!vaultSecret || vaultSecret.length < 24) throw Error('缺少个人密钥保险箱配置');
  const stores = createSupabaseStores(process.env);
  const migration = await stores.cloudStore.get(migrationKey);
  if (migration?.verified !== true || !/^[a-f0-9]{64}$/.test(migration.manifest)) throw Error('旧数据导入尚未验证，拒绝切换正式接口');
  localApi = createAppApi({ ...stores, vaultSecret, model: process.env.LLM_MODEL || 'deepseek-flash' });
}
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
  ['/design-preview', ['design-preview.html', 'text/html; charset=utf-8']],
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
  if (path.startsWith('/api/ppt/worker/')) return 5200000;
  if (path.startsWith('/api/cloud/')) return 1500000;
  if (path.startsWith('/api/ppt/')) return 180000;
  return 90000;
}

async function forwardApi(req, res, url) {
  const overflowJob = /^\/api\/ppt\/jobs\/r-[a-f0-9]{32}(?:\/(?:cancel|wake|file\/(?:deck\.pptx|page-\d{2}\.png|audit\.json)))?$/.test(url.pathname);
  const headers = new Headers();
  for (const name of ['content-type', 'accept']) {
    if (typeof req.headers[name] === 'string') headers.set(name, req.headers[name]);
  }
  const session = req.headers.cookie?.split(';')
    .map(part => part.trim()).filter(part => /^qizhi_session=[a-f0-9]{64}$/.test(part) ||
      (url.pathname.startsWith('/api/ppt/') && /^qizhi_ppt_visitor=[a-f0-9]{64}$/.test(part)));
  if (session?.length) headers.set('cookie', session.join('; '));
  const worker = url.pathname.startsWith('/api/ppt/worker/');
  const clientIp = String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim();
  if (localApi && isIP(clientIp)) headers.set('x-nf-client-connection-ip', clientIp);
  if (worker && typeof req.headers.authorization === 'string') headers.set('authorization', req.headers.authorization);
  let body, lessonRequest;
  if (req.method === 'POST') {
    if (!worker && req.headers.origin !== origin) return json(res, 403, { error: '来源不匹配' });
    if (readOnly && url.pathname !== '/api/cloud/team/get') return json(res, 503, { error: '正在迁移数据，请稍后重试' });
    if (!worker) headers.set('origin', overflowJob || localApi ? origin : legacyBackend);
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
    if (lessonGenerationRoute.test(url.pathname)) {
      try {
        lessonRequest = prepareLessonRequest(JSON.parse(body));
        if (lessonRequest.outline) assertLessonTopic(lessonRequest.outline, lessonRequest.brief);
        if (lessonRequest.previous) assertLessonTopic(lessonRequest.previous, lessonRequest.brief);
        body = JSON.stringify(lessonRequest);
      } catch (error) {
        return json(res, 400, { error: error instanceof SyntaxError ? '备课请求格式无效' : error.message });
      }
    }
  }

  if (!readOnly && url.pathname === '/api/ppt/config' && session?.some(cookie => cookie.startsWith('qizhi_session='))) warmPptRunner();
  const draftFile = req.method === 'GET' && /^\/api\/ppt\/drafts\/[a-f0-9]{32}\/(?:deck\.pptx|page-\d{2}\.png|audit\.json)$/.test(url.pathname);
  let basicJob=false;
  if(req.method==='POST'&&url.pathname==='/api/ppt/jobs'){
    try{basicJob=JSON.parse(body)?.mode==='basic';}catch{}
  }
  if(basicJob)headers.set('origin',origin);
  const runnerRequest = basicJob || draftFile || overflowJob;
  const target = basicJob ? pptRunner + '/api/ppt/overflow/jobs' : (runnerRequest ? pptRunner : legacyBackend) + url.pathname + url.search;
  let response = localApi && !runnerRequest
    ? await localApi(new Request(url, { method: req.method, headers, body }))
    : await fetch(target, { method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  if (!basicJob && req.method === 'POST' && url.pathname === '/api/ppt/jobs' && response.status === 429) {
    const oldLimit = await response.clone().json().catch(() => null);
    if (oldLimit?.error === '任务较多，请稍后再试') {
      headers.set('origin', origin);
      response = await fetch(pptRunner + '/api/ppt/overflow/jobs', {
        method: 'POST', headers, body, redirect: 'error', signal: AbortSignal.timeout(90000),
      });
    }
  }
  if (response.status >= 300 && response.status < 400) {
    return json(res, 502, { error: '后端暂不可用，请稍后重试' });
  }
  if (response.ok && lessonRequest) {
    const data = await response.json();
    try {
      assertLessonTopic(data.lesson ?? data.result, lessonRequest.brief, {
        checkTitle: url.pathname === '/api/lesson' || url.pathname === '/api/lesson/outline',
      });
    } catch (error) {
      return json(res, 502, { error: error.message });
    }
    return json(res, response.status, data);
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
  const output = { 'cache-control': draftFile || overflowJob ? 'private, no-store' : 'no-store', 'x-content-type-options': 'nosniff' };
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
    const worker = url.pathname.startsWith('/api/ppt/worker/');
    if (apiRoute.test(url.pathname) && (!worker || (localApi && req.method === 'POST'))) {
      return await forwardApi(req, res, url);
    }
    const asset = assets.get(url.pathname);
    if (!asset || req.method === 'POST') return json(res, 404, { error: '页面不存在' });
    res.writeHead(200, {
      'content-type': asset[1],
      'content-length': asset[0].length,
      'cache-control': asset[1].startsWith('text/html') ? 'no-cache' : 'public, max-age=300',
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
