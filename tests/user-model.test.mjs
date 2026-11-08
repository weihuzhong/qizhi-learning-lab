import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudApi} from '../server/cloud.js';
import {createUserModel} from '../server/user-model.js';
import {createAppApi} from '../server/app-api.js';
import {createPptService} from '../server/ppt-service.js';
import {templateCatalog,templateLesson} from '../worker/template-catalog.js';
import {generateKeyPairSync,sign} from 'node:crypto';
class Store{data=new Map();n=0;async get(k){return structuredClone(this.data.get(k)?.data??null)}async getWithMetadata(k){return structuredClone(this.data.get(k)??null)}async setJSON(k,data,o={}){const old=this.data.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};this.data.set(k,{data:structuredClone(data),etag:String(++this.n)});return {modified:true}}async delete(k){this.data.delete(k)}}
const request=(path,body,cookie='',extra={})=>new Request('https://qizhi.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{origin:'https://qizhi.test',cookie,'content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
const run=async(api,path,body,cookie,extra)=>{const r=await api(request(path,body,cookie,extra));return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
const register=(api,name)=>run(api,'cloud/register',{username:name,password:'only-test-password-123'});
const vaultSecret='test-only-vault-secret-with-at-least-32-characters';
const keyA='sk-'+ 'a'.repeat(32),keyB='sk-'+'b'.repeat(32);
const balanceFetcher=async(url,options)=>{assert.equal(url,'https://api.deepseek.com/user/balance');assert([keyA,keyB].some(k=>options.headers.authorization==='Bearer '+k));return Response.json({is_available:true,balance_infos:[{currency:'CNY',total_balance:'12.34'}]});};
test('two user keys are encrypted, never returned or shared, removable, and session protected',async()=>{
 const store=new Store(),cloud=createCloudApi(store),a=await register(cloud,'alice'),b=await register(cloud,'bob');
 const model=createUserModel(store,{vaultSecret,fetcher:balanceFetcher});
 assert.equal((await run(model.handle,'cloud/model',{apiKey:keyA})).status,401);
 await assert.rejects(()=>model.forRequest(request('chat',{},a.cookie)),e=>e.status===428);
 assert.equal((await run(model.handle,'cloud/model',{apiKey:keyA},a.cookie,{origin:'https://evil.test'})).status,403);
 const savedA=await run(model.handle,'cloud/model',{apiKey:keyA},a.cookie),savedB=await run(model.handle,'cloud/model',{apiKey:keyB},b.cookie);
 assert.equal(savedA.status,200);assert.equal(savedB.status,200);assert(!JSON.stringify(savedA.data).includes(keyA));assert(!JSON.stringify([...store.data]).includes(keyA));
 assert.equal((await model.forRequest(request('chat',{},a.cookie))).env.LLM_API_KEY,keyA);assert.equal((await model.forRequest(request('chat',{},b.cookie))).env.LLM_API_KEY,keyB);
 const before=await model.status(request('status',undefined,a.cookie));assert.equal(before.configured,true);
 // Copying another user's encrypted envelope cannot cross its cryptographic account binding.
 const idA=a.data.user.id,idB=b.data.user.id,recordA=await store.get('model-credentials/'+idA),recordB=await store.get('model-credentials/'+idB);
 await store.setJSON('model-credentials/'+idB,recordA);await assert.rejects(()=>model.forUser(idB),e=>e.status===428);await store.setJSON('model-credentials/'+idB,recordB);
 assert.equal((await run(model.handle,'cloud/model/remove',{},a.cookie)).status,200);await assert.rejects(()=>model.forUser(idA),e=>e.status===428);assert.equal((await model.forUser(idB)).LLM_API_KEY,keyB);
 await run(cloud,'cloud/logout',{},b.cookie);await assert.rejects(()=>model.forRequest(request('chat',{},b.cookie)),e=>e.status===401);
});
test('all paid API routes reject guests/unbound users without invoking upstream; bound chat uses only its user key',async()=>{
 const cloudStore=new Store(),pptStore=new Store(),api=createAppApi({cloudStore,pptStore,vaultSecret,fetcher:balanceFetcher});
 const a=await register(api,'routealice'),b=await register(api,'routebob');
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async(url,opts)=>{calls++;assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(opts.headers.authorization,'Bearer '+keyA);return Response.json({choices:[{message:{content:'测试回复'}}]});};
 try{
  for(const path of ['chat','lesson','lesson/outline','lesson/phase','lesson/finish','lesson/preferences','lesson/review','ppt/jobs']){
   assert.equal((await run(api,path,{})).status,401,path);assert.equal((await run(api,path,{},a.cookie)).status,428,path);
  }
  assert.equal(calls,0);
  assert.equal((await run(api,'cloud/model',{apiKey:keyA},a.cookie)).status,200);
  const status=await run(api,'status',undefined,a.cookie);assert.equal(status.data.configured,true);assert.equal(status.data.billingMode,'personal-key');
  assert.equal((await run(api,'status')).data.configured,false);assert.equal((await run(api,'status',undefined,b.cookie)).data.configured,false);
  const chat=await run(api,'chat',{mode:'prep',messages:[{role:'user',content:'测试'}]},a.cookie);assert.equal(chat.status,200);assert.equal(calls,1);
  await run(api,'cloud/model/remove',{},a.cookie);assert.equal((await run(api,'chat',{mode:'prep',messages:[]},a.cookie)).status,428);assert.equal(calls,1);
 }finally{globalThis.fetch=previous;}
});
test('the DeepSeek deck experiment authenticates and uses only the signed-in account',async()=>{
 const cloudStore=new Store(),pptStore=new Store();
 const plan={palette:{background:'FFF6EA',foreground:'213235',accent:'206D60'},
  pages:Array.from({length:8},(_,i)=>({title:'教学问题 '+(i+1),purpose:'判断课堂情境',visual:'留白和对比'}))};
 const scene={background:'FFF6EA',elements:[
  {type:'text',role:'title',x:1,y:.7,w:11,h:1,size:40,color:'213235',text:'遇到陌生请求'},
  {type:'text',role:'body',x:1,y:3,w:11,h:1,size:30,color:'213235',text:'你会向谁求助？'},
 ],notes:'请学生结合情境回答。'};
 let calls=0;
 const fetcher=async(url,options)=>{
  if(url==='https://api.deepseek.com/user/balance')return balanceFetcher(url,options);
  assert.equal(url,'https://api.deepseek.com/chat/completions');
  assert.equal(options.headers.authorization,'Bearer '+keyA);
  return Response.json({choices:[{message:{content:JSON.stringify(calls++===0?plan:scene)}}]});
 };
 const api=createAppApi({cloudStore,pptStore,vaultSecret,fetcher});
 const a=await register(api,'experimenter'),lesson=templateLesson(templateCatalog[0]);
 const planRoute='deck/experiment/plan';
 assert.equal((await run(api,planRoute,{lesson,count:8})).status,401);
 assert.equal((await run(api,planRoute,{lesson,count:8},a.cookie)).status,428);
 assert.equal(calls,0);
 assert.equal((await run(api,'cloud/model',{apiKey:keyA},a.cookie)).status,200);
 assert.equal((await run(api,planRoute,{lesson,count:7.5},a.cookie)).status,400);
 const first=await run(api,planRoute,{lesson,count:8},a.cookie);
 assert.equal(first.status,200);
 assert.deepEqual(first.data.result,plan);
 const second=await run(api,'deck/experiment/slide',{lesson,plan,index:0},a.cookie);
 assert.equal(second.status,200);
 assert.deepEqual(second.data.result,scene);
 assert.equal(calls,2);
 assert.equal(pptStore.data.size,0);
 assert.equal((await run(api,'deck/plan',{lesson,count:8},a.cookie)).status,410);
});
test('PPT submission pins account billing; worker model and review use that key, never a deployment fallback',async()=>{
 const cloudStore=new Store(),store=new Store(),cloud=createCloudApi(cloudStore),a=await register(cloud,'pptalice'),b=await register(cloud,'pptbob'),billing=createUserModel(cloudStore,{vaultSecret,fetcher:balanceFetcher});
 await run(billing.handle,'cloud/model',{apiKey:keyA},a.cookie);await run(billing.handle,'cloud/model',{apiKey:keyB},b.cookie);
 const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 const now=Math.floor(Date.now()/1000),h=Buffer.from('{"alg":"RS256"}').toString('base64url'),p=Buffer.from(JSON.stringify({aud:'qizhi-pptmaster-worker-v1',sub:'pptmaster-executor',iat:now,exp:now+90})).toString('base64url'),token='Bearer '+h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),keys.privateKey).toString('base64url'),auth={authorization:token};
 const api=createPptService(store,{LLM_API_KEY:'NEVER-USE-OWNER-KEY'},{runnerURL:'',workerKey:keys.publicKey,billing});
 const source={lesson:templateLesson(templateCatalog[2]),count:4},job=await run(api,'ppt/jobs',source,a.cookie);assert.equal(job.status,202);
 const claim=await run(api,'ppt/worker/claim',{},'',auth);assert.equal(claim.data.job.billingUserId,a.data.user.id);assert(!JSON.stringify(claim.data).includes(keyA));
 const workerBody={id:job.data.job.id,runId:claim.data.job.runId},visitor=job.cookie;
 assert.equal((await run(api,'ppt/jobs/'+job.data.job.id,undefined,b.cookie+'; '+visitor)).status,403);
 const old=globalThis.fetch;let calls=0;globalThis.fetch=async(url,opts)=>{calls++;assert.equal(opts.headers.authorization,'Bearer '+keyA);return Response.json({choices:[{message:{content:opts.body.includes('response_format')?'{"issues":[]}':'测试'}}]});};
 try{
  assert.equal((await run(api,'ppt/worker/model',{...workerBody,messages:[],tools:[]},'',auth)).status,200);
  assert.equal((await run(api,'ppt/worker/review',{...workerBody,slides:Array.from({length:4},(_,i)=>({number:i+1,text:'课堂步骤'}))},'',auth)).status,200);assert.equal(calls,2);
  await run(billing.handle,'cloud/model/remove',{},a.cookie);
  assert.equal((await run(api,'ppt/worker/model',{...workerBody,messages:[],tools:[]},'',auth)).status,428);assert.equal(calls,2);
 }finally{globalThis.fetch=old;}
});
test('invalid key is not saved and failed rebind preserves the previous key',async()=>{
 const store=new Store(),cloud=createCloudApi(store),a=await register(cloud,'validation'),model=createUserModel(store,{vaultSecret,fetcher:balanceFetcher});await run(model.handle,'cloud/model',{apiKey:keyA},a.cookie);
 const rejected=createUserModel(store,{vaultSecret,fetcher:async()=>Response.json({}, {status:401})});assert.equal((await run(rejected.handle,'cloud/model',{apiKey:keyB},a.cookie)).status,400);assert.equal((await rejected.forUser(a.data.user.id)).LLM_API_KEY,keyA);
 const wrongVault=createUserModel(store,{vaultSecret:'a-completely-different-test-vault-secret'});await assert.rejects(()=>wrongVault.forUser(a.data.user.id),e=>e.status===428);
});
test('upstream invalid credentials and exhausted balance never trigger owner-key retries',async()=>{
 const cloudStore=new Store(),pptStore=new Store(),api=createAppApi({cloudStore,pptStore,vaultSecret,fetcher:balanceFetcher}),a=await register(api,'upstreamerrors');
 await run(api,'cloud/model',{apiKey:keyA},a.cookie);
 const previous=globalThis.fetch;let calls=0;
 try{for(const status of [401,402]){globalThis.fetch=async(url,opts)=>{calls++;assert.equal(opts.headers.authorization,'Bearer '+keyA);return Response.json({error:{code:'upstream_error'}},{status})};const r=await run(api,'chat',{mode:'prep',messages:[{role:'user',content:'test'}]},a.cookie);assert.equal(r.status,502);assert.equal(r.data.upstream_status,status);assert(r.data.error.includes('你的DeepSeek'));}assert.equal(calls,2);}finally{globalThis.fetch=previous;}
});

test('an imported binding with an unavailable vault key preserves login and requests a new binding',async()=>{
 const store=new Store();
 const cloud=createCloudApi(store);
 const account=await register(cloud,'migrationuser');
 const original=createUserModel(store,{vaultSecret,fetcher:balanceFetcher});
 assert.equal((await run(original.handle,'cloud/model',{apiKey:keyA},account.cookie)).status,200);
 const migrated=createUserModel(store,{vaultSecret:vaultSecret+'-rotated',fetcher:balanceFetcher});
 const status=await migrated.status(request('status',undefined,account.cookie));
 assert.equal(status.authenticated,true);
 assert.equal(status.configured,false);
 const model=await run(migrated.handle,'cloud/model',undefined,account.cookie);
 assert.equal(model.data.bound,false);
 assert.equal(model.data.rebindRequired,true);
 await assert.rejects(migrated.forRequest(request('chat',{},account.cookie)),{code:'MODEL_REBIND_REQUIRED'});
 assert.equal((await run(migrated.handle,'cloud/model',{apiKey:keyB},account.cookie)).status,200);
 assert.equal((await migrated.status(request('status',undefined,account.cookie))).configured,true);
});
