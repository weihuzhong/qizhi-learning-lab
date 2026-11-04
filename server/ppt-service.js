import {randomBytes,createHash,verify,createPublicKey} from 'node:crypto';
import {validateLesson} from '../worker/teaching-api.js';
import {modelOptions,modelError} from '../worker/model-provider.js';
import {pptWorkerPublicKey,pptRunnerURL} from './ppt-config.js';
const digest=x=>createHash('sha256').update(x).digest('hex');
const reject=(message,status=400)=>{throw Object.assign(Error(message),{status})};
const json=(d,status=200,headers={})=>Response.json(d,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
export function verifyPptWorker(header,publicKey=pptWorkerPublicKey){
 try{const token=(header||'').replace(/^Bearer /,''),[h,p,s]=token.split('.');if(!h||!p||!s)return false;const head=JSON.parse(Buffer.from(h,'base64url')),data=JSON.parse(Buffer.from(p,'base64url'));const now=Math.floor(Date.now()/1000);
 return head.alg==='RS256'&&data.aud==='qizhi-pptmaster-worker-v1'&&data.sub==='pptmaster-executor'&&Number.isInteger(data.exp)&&data.exp>now&&data.exp<now+125&&data.iat<=now+10&&data.iat>now-125&&verify('RSA-SHA256',Buffer.from(h+'.'+p),publicKey,Buffer.from(s,'base64url'));
 }catch{return false;}
}
const workerKeyCache=new Map();
// The signing private key is born inside the executor and never leaves it.
// Read only its public key from the fixed, TLS-authenticated executor origin.
export async function resolvePptWorkerKey(runnerURL,header,fetcher=fetch){
 const endpoint=new URL(runnerURL);if(endpoint.protocol!=='https:')reject('后台必须使用HTTPS',503);
 let kid;try{kid=JSON.parse(Buffer.from(String(header||'').replace(/^Bearer /,'').split('.')[0],'base64url')).kid;}catch{reject('执行服务认证失败',403)}
 if(!/^[a-f0-9]{64}$/.test(kid||''))reject('执行服务认证失败',403);
 const cached=workerKeyCache.get(endpoint.origin),now=Date.now();
 if(cached&&cached.keyId===kid&&cached.expires>now)return cached.publicKey;
 if(cached&&now-cached.fetched<5000)return cached.publicKey;
 const response=await fetcher(endpoint.origin+'/health',{redirect:'error',signal:AbortSignal.timeout(4000)});
 if(!response.ok)reject('后台身份检查暂不可用',503);const identity=await response.json();
 if(identity.engine!=='ppt-master'||identity.integrity!==true||identity.sourceCommit!=='3c956467cd053fec36816cb7d2ca973729a5d4d1'||typeof identity.publicKey!=='string')reject('后台身份不匹配',503);
 let key;try{key=createPublicKey(identity.publicKey);}catch{reject('后台公钥无效',503)}
 if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<2048||digest(identity.publicKey)!==identity.keyId)reject('后台公钥无效',503);
 workerKeyCache.set(endpoint.origin,{publicKey:identity.publicKey,keyId:identity.keyId,fetched:now,expires:now+300000});return identity.publicKey;
}
export function createPptService(store,env,{runnerURL=pptRunnerURL,workerKey=pptWorkerPublicKey}={}){
 const get=key=>store.get(key,{type:'json'});
 const update=async(key,fn)=>{for(let i=0;i<7;i++){const old=await store.getWithMetadata(key,{type:'json'}),next=await fn(old?.data??null);const r=await store.setJSON(key,next,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(r.modified)return next;}reject('请求冲突，请重试',409)};
 const throttle=async(key,max,ms)=>update('limits/'+key+'/'+Math.floor(Date.now()/ms),x=>{if((x?.n||0)>=max)reject('任务较多，请稍后再试',429);return {n:(x?.n||0)+1}});
 const jobId=id=>{if(!/^[a-f0-9]{32}$/.test(id||''))reject('任务编号无效');return id};
 async function job(id){const j=await get('jobs/'+jobId(id));if(!j||j.expiresAt<Date.now())reject('任务不存在或已过期',404);return j;}
 const publicJob=j=>({id:j.id,title:j.lesson.title,count:j.count,style:j.style,status:j.status,progress:j.progress||{phase:'queued',message:'等待后台制作',pages:0},createdAt:j.createdAt,updatedAt:j.updatedAt,error:j.error||null,result:j.result||null});
 async function wake(){if(!runnerURL)return;const u=new URL(runnerURL);if(u.protocol!=='https:')throw Error('执行服务必须使用HTTPS');try{await fetch(u.origin+'/v1/wake',{method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(4500)});}catch{/* Cold starts are retried through the job's wake endpoint. */}}
 return async req=>{
  try{
   const url=new URL(req.url),path=url.pathname,internal=path.startsWith('/api/ppt/worker/');
   if(!['GET','POST'].includes(req.method))reject('仅支持GET或POST',405);
   if(internal){const header=req.headers.get('authorization'),key=runnerURL?await resolvePptWorkerKey(runnerURL,header):workerKey;if(!verifyPptWorker(header,key))reject('执行服务认证失败',403);}
   else if(req.method==='POST'&&req.headers.get('origin')!==url.origin)reject('来源不匹配',403);
   const b=req.method==='POST'?await req.json():{};
   if(path==='/api/ppt/config')return json({engine:'ppt-master',automaticExecution:!!runnerURL,connected:!!runnerURL,maxPages:20,mode:runnerURL?'server-execution':'deployment-pending'});
   if(internal){
    if(req.method!=='POST')reject('请使用POST',405);
    if(path==='/api/ppt/worker/claim'){
     const queue=await get('queue')||[];
     for(const id of queue){let claimed=null;try{await update('jobs/'+id,j=>{if(!j||j.status!=='queued'||j.expiresAt<Date.now())reject('skip',409);claimed={...j,status:'running',runId:randomBytes(12).toString('hex'),updatedAt:Date.now(),progress:{phase:'preparing',pages:0,message:'后台正在加载PPTMaster'}};return claimed;});}catch(e){if(e.status===409)continue;throw e;}if(claimed)return json({job:claimed});}
     return json({job:null});
    }
    const j=await job(b.id);if(j.status!=='running'||j.runId!==b.runId)reject('执行权已失效',409);
    if(path==='/api/ppt/worker/progress'){
     const phases=['preparing','designing','checking','exporting','rendering'];if(!phases.includes(b.phase))reject('进度无效');
     const next=await update('jobs/'+j.id,x=>{if(x.runId!==j.runId||x.status!=='running')reject('任务已停止',409);return {...x,updatedAt:Date.now(),progress:{phase:b.phase,pages:Math.min(x.count,Math.max(0,Number(b.pages)||0)),message:String(b.message||'后台制作中').slice(0,180)}}});return json({job:publicJob(next)});
    }
    if(path==='/api/ppt/worker/model'){
     if(!env.LLM_API_KEY)reject('作品维护者尚未配置模型',503);
     if(!Array.isArray(b.messages)||b.messages.length>600||JSON.stringify(b.messages).length>1800000||!Array.isArray(b.tools)||b.tools.length>12)reject('模型上下文过大');
     await update('jobs/'+j.id,x=>{if((x.calls||0)>=120)reject('本次制作达到调用上限，请缩短内容后重试',429);return {...x,calls:(x.calls||0)+1,updatedAt:Date.now()}});
     const upstream=await fetch((env.LLM_BASE_URL||'https://api.deepseek.com').replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+env.LLM_API_KEY,'content-type':'application/json'},body:JSON.stringify({model:env.LLM_MODEL||'deepseek-flash',messages:b.messages,tools:b.tools,tool_choice:'auto',...modelOptions(env,10500)}),signal:AbortSignal.timeout(45000)});
     if(!upstream.ok)return json(await modelError(upstream),502);const d=await upstream.json(),m=d.choices?.[0]?.message;if(!m)reject('模型未返回有效内容',502);return json({message:m,usage:d.usage,finishReason:d.choices[0].finish_reason});
    }
    if(path==='/api/ppt/worker/upload'){
     if(!/^(?:deck\.pptx|page-\d{2}\.png|audit\.json)$/.test(b.name||''))reject('文件名称无效');
     const bytes=Buffer.from(String(b.data||''),'base64');if(bytes.length>3500000||!bytes.length)reject('文件大小超过交付限制');
     await store.set('files/'+j.id+'/'+b.name,bytes);return json({ok:true,size:bytes.length,sha256:digest(bytes)});
    }
    if(path==='/api/ppt/worker/complete'){
     if(b.result?.pages?.length!==j.count||b.result?.actualCount!==j.count||b.result?.engine!=='ppt-master'||b.result?.sourceCommit!=='3c956467cd053fec36816cb7d2ca973729a5d4d1')reject('整稿验证不通过');
     for(const name of ['deck.pptx','audit.json',...b.result.pages.map((_,i)=>'page-'+String(i+1).padStart(2,'0')+'.png')])if(!await store.getMetadata('files/'+j.id+'/'+name))reject('交付文件缺失：'+name);
     const next=await update('jobs/'+j.id,x=>({...x,status:'complete',updatedAt:Date.now(),progress:{phase:'complete',pages:j.count,message:'整稿制作完成，可逐页检查并下载'},result:b.result}));return json({job:publicJob(next)});
    }
    if(path==='/api/ppt/worker/fail'){const next=await update('jobs/'+j.id,x=>({...x,status:'failed',updatedAt:Date.now(),error:String(b.error||'后台制作未完成').slice(0,500)}));return json({job:publicJob(next)});}
    reject('未知执行请求',404);
   }
   let visitor=req.headers.get('cookie')?.match(/(?:^|;\s*)qizhi_ppt_visitor=([a-f0-9]{64})(?:;|$)/)?.[1];
   if(path==='/api/ppt/jobs'&&req.method==='POST'){
    const ip=req.headers.get('x-nf-client-connection-ip')||'unknown';await throttle('create-ip/'+digest(ip),12,86400000);
    validateLesson(b.lesson);const count=Number(b.count);if(!Number.isInteger(count)||count<4||count>20)reject('课件页数须为4至20');if(JSON.stringify(b.lesson).length>45000)reject('教案过长，请精简后制作');
    visitor ||= randomBytes(32).toString('hex');const owner=digest(visitor);await throttle('create-visitor/'+owner,6,86400000);
    const id=randomBytes(16).toString('hex'),now=Date.now();const j={id,owner,lesson:b.lesson,brief:b.brief||{},count,style:String(b.style||'清晰、现代、图解优先的课堂演示').slice(0,1500),mode:'direct',status:'queued',createdAt:now,updatedAt:now,expiresAt:now+7*86400000,calls:0};
    await store.setJSON('jobs/'+id,j,{onlyIfNew:true});await update('queue',async q=>{const records=await Promise.all((q||[]).map(async key=>({key,value:await get('jobs/'+key)})));const active=records.filter(x=>x.value&&['queued','running'].includes(x.value.status)&&x.value.expiresAt>Date.now()).map(x=>x.key);if(active.length>=30)reject('当前排队较多，请稍后提交；已有任务会继续制作',503);return [...active,id];});await wake();
    return json({job:publicJob(j)},202,{'set-cookie':'qizhi_ppt_visitor='+visitor+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'});
   }
   const m=path.match(/^\/api\/ppt\/jobs\/([a-f0-9]{32})(?:\/(wake|cancel|file)(?:\/([a-z0-9.-]+))?)?$/);if(!m)reject('未知课件请求',404);
   const j=await job(m[1]);if(!visitor||digest(visitor)!==j.owner)reject('没有此课件的访问权限，请使用创建任务的浏览器',403);
   if(m[2]==='cancel'&&req.method==='POST'){if(!['queued','running'].includes(j.status))reject('任务已结束',409);const next=await update('jobs/'+j.id,x=>({...x,status:'cancelled',updatedAt:Date.now()}));return json({job:publicJob(next)});}
   if(m[2]==='wake'&&req.method==='POST'){await throttle('wake/'+j.id,1,30000);await wake();return json({job:publicJob(j)});}
   if(m[2]==='file'&&req.method==='GET'){
    if(j.status!=='complete'||!/^deck\.pptx$|^page-\d{2}\.png$|^audit\.json$/.test(m[3]||''))reject('文件尚未就绪',409);
    const bytes=await store.get('files/'+j.id+'/'+m[3],{type:'arrayBuffer'});if(!bytes)reject('文件不存在',404);
    const type=m[3].endsWith('.png')?'image/png':m[3].endsWith('.pptx')?'application/vnd.openxmlformats-officedocument.presentationml.presentation':'application/json';
    return new Response(bytes,{headers:{'content-type':type,'cache-control':'private, no-store','x-content-type-options':'nosniff',...(m[3]==='deck.pptx'?{'content-disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(j.lesson.title+'.pptx')}:{})}});
   }
   if(req.method!=='GET'||m[2])reject('请求方法无效',405);
   if(j.status==='running'&&Date.now()-j.updatedAt>25*60000){j.status='failed';j.error='后台执行中断。请重新发起制作；原教案仍保留。';}
   return json({job:publicJob(j)});
  }catch(e){return json({error:e.message||'课件服务暂不可用'},e.status||500);}
 };
}
