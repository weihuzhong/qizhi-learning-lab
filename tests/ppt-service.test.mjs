import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {createPptService,verifyPptWorker,resolvePptWorkerKey} from '../server/ppt-service.js';
import {templateCatalog,templateLesson} from '../worker/template-catalog.js';
import {pptOnlineClient} from '../worker/ppt-online-client.js';
class Store{data=new Map();n=0;async get(k){return structuredClone(this.data.get(k)?.data??null)}async getWithMetadata(k){return structuredClone(this.data.get(k)??null)}async getMetadata(k){return this.data.has(k)?{etag:this.data.get(k).etag}:null}async set(k,data){this.data.set(k,{data,etag:String(++this.n)})}async setJSON(k,data,o={}){const old=this.data.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};this.data.set(k,{data:structuredClone(data),etag:String(++this.n)});return {modified:true}}}
const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
function jwt(exp=90){const t=Math.floor(Date.now()/1000),h=Buffer.from('{"alg":"RS256"}').toString('base64url'),p=Buffer.from(JSON.stringify({aud:'qizhi-pptmaster-worker-v1',sub:'pptmaster-executor',iat:t,exp:t+exp})).toString('base64url');return 'Bearer '+h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),keys.privateKey).toString('base64url')}
async function call(api,path,body,cookie='',worker=false,origin='https://qizhi.test'){const r=await api(new Request('https://qizhi.test/api/ppt/'+path,{method:body===undefined?'GET':'POST',headers:{origin,cookie,'content-type':'application/json',...(worker?{authorization:jwt()}:{}),'x-nf-client-connection-ip':'test'},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
const source={lesson:templateLesson(templateCatalog[2]),count:8,brief:{subject:'科学',grade:'五年级'}};
test('only a short-lived valid worker signature can claim or invoke model tasks',()=>{assert(verifyPptWorker(jwt(),keys.publicKey));assert(!verifyPptWorker(jwt(-1),keys.publicKey));assert(!verifyPptWorker(jwt(300),keys.publicKey));assert(!verifyPptWorker('Bearer fake',keys.publicKey));assert(!verifyPptWorker(jwt().slice(0,-8)+'garbage',keys.publicKey));});
test('public visitors create isolated tasks; worker identity and actual files gate completion',async()=>{
 const api=createPptService(new Store(),{},{workerKey:keys.publicKey,runnerURL:""});
 assert.equal((await call(api,'jobs',source,'',false,'https://evil.test')).status,403);
 const a=await call(api,'jobs',source);assert.equal(a.status,202);assert(a.cookie);assert.equal(a.data.job.status,'queued');assert(!JSON.stringify(a.data).includes('owner'));
 const id=a.data.job.id;assert.equal((await call(api,'jobs/'+id)).status,403);assert.equal((await call(api,'worker/claim',{})).status,403);
 const claim=await call(api,'worker/claim',{},'',true);assert.equal(claim.data.job.id,id);assert.equal((await call(api,'worker/claim',{},'',true)).data.job,null);
 const auth={id,runId:claim.data.job.runId};const bad=await call(api,'worker/complete',{...auth,result:{engine:'ppt-master',actualCount:1,pages:[{}]}},'',true);assert.equal(bad.status,400);
 const result={engine:'ppt-master',sourceCommit:'3c956467cd053fec36816cb7d2ca973729a5d4d1',actualCount:8,pages:Array.from({length:8},(_,i)=>({number:i+1,preview:'page-'+String(i+1).padStart(2,'0')+'.png'}))};
 assert.equal((await call(api,'worker/complete',{...auth,result},'',true)).status,400);
 for(const name of ['deck.pptx','audit.json',...result.pages.map(p=>p.preview)])assert.equal((await call(api,'worker/upload',{...auth,name,data:Buffer.from('test fixture').toString('base64')},'',true)).status,200);
 assert.equal((await call(api,'worker/complete',{...auth,result},'',true)).status,200);assert.equal((await call(api,'jobs/'+id,undefined,a.cookie)).data.job.result.actualCount,8);
});
test('model credentials stay server-side and cancellation invalidates worker writes',async()=>{
 const api=createPptService(new Store(),{LLM_API_KEY:'only-in-test-proxy',LLM_MODEL:'deepseek-flash',LLM_BASE_URL:'https://api.deepseek.com'},{workerKey:keys.publicKey,runnerURL:""});
 const a=await call(api,'jobs',source),id=a.data.job.id,claim=await call(api,'worker/claim',{},'',true),auth={id,runId:claim.data.job.runId};
 const old=globalThis.fetch;let calls=0;globalThis.fetch=async(url,opts)=>{calls++;assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(opts.headers.authorization,'Bearer only-in-test-proxy');return Response.json({choices:[{message:{role:'assistant',content:'test'}}]})};
 try{const r=await call(api,'worker/model',{...auth,messages:[{role:'user',content:'lesson fixture'}],tools:[]},'',true);assert.equal(r.status,200);assert.equal(calls,1);assert(!JSON.stringify(r.data).includes('only-in-test-proxy'));}finally{globalThis.fetch=old;}
 assert.equal((await call(api,'jobs/'+id+'/cancel',{},a.cookie)).data.job.status,'cancelled');assert.equal((await call(api,'worker/progress',{...auth,phase:'designing'},'',true)).status,409);
});
test('automatic frontend submits a background job and downloads originals without handoff',()=>{new Function(pptOnlineClient);assert(pptOnlineClient.includes("api('ppt/jobs'"));assert(pptOnlineClient.includes('直接生成整份 PPT'));assert(!pptOnlineClient.includes('pmCopy'));assert(!pptOnlineClient.includes('new window.PptxGenJS'));});

test('completed history cannot push an older waiting task out of the queue',async()=>{const store=new Store(),api=createPptService(store,{},{workerKey:keys.publicKey,runnerURL:""});const oldest=await call(api,'jobs',source);const queue=[oldest.data.job.id];for(let n=0;n<90;n++){const id=n.toString(16).padStart(32,'0');queue.push(id);await store.setJSON('jobs/'+id,{id,status:'complete',expiresAt:Date.now()+100000});}await store.setJSON('queue',queue);const newer=await call(api,'jobs',source);assert.equal(newer.status,202);const claim=await call(api,'worker/claim',{},'',true);assert.equal(claim.data.job.id,oldest.data.job.id);assert.equal((await store.get('queue')).length,2);});

test('executor identity loads only a public key from its fixed HTTPS origin',async()=>{const publicKey=keys.publicKey,keyId=createHash('sha256').update(publicKey).digest('hex'),header='Bearer '+Buffer.from(JSON.stringify({alg:'RS256',kid:keyId})).toString('base64url')+'.payload.signature';let calls=0;const loader=async url=>{calls++;assert.equal(url,'https://executor-identity.test/health');return Response.json({engine:'ppt-master',integrity:true,sourceCommit:'3c956467cd053fec36816cb7d2ca973729a5d4d1',publicKey,keyId})};assert.equal(await resolvePptWorkerKey('https://executor-identity.test',header,loader),publicKey);assert.equal(await resolvePptWorkerKey('https://executor-identity.test',header,loader),publicKey);assert.equal(calls,1);await assert.rejects(()=>resolvePptWorkerKey('http://unsafe.test',header,loader));await assert.rejects(()=>resolvePptWorkerKey('https://executor-identity.test','Bearer invalid',loader));});
