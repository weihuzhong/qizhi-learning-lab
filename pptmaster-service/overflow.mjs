import {randomBytes,createHash} from 'node:crypto';
import {mkdir,copyFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';

const ttl=24*60*60*1000;
const files=/^(?:deck\.pptx|page-\d{2}\.png|audit\.json)$/;
const reject=(message,status)=>{throw Object.assign(Error(message),{status});};
const digest=value=>createHash('sha256').update(value).digest('hex');
const cleanJson=text=>JSON.parse(text.trim().replace(/^\x60{3}(?:json)?\s*|\s*\x60{3}$/gi,''));

export function createOverflow({base,origin,directory}){
 const jobs=new Map();
 function publicJob(j){
  const {id,title,count,style,status,progress,createdAt,updatedAt,error,result}=j;
  return {id,title,count,style,status,progress,createdAt,updatedAt,error,result};
 }
 async function backend(route,cookie,body,signal){
  const response=await fetch(base+route,{
   method:body===undefined?'GET':'POST',
   headers:{cookie,...(body===undefined?{}:{origin:new URL(base).origin,'content-type':'application/json'})},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',
   signal:signal??AbortSignal.timeout(body===undefined?10000:55000),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(Error(data.error||'账号或模型服务暂不可用'),{
   status:response.status,providerStatus:data.upstream_status,
  });
  return data;
 }
 async function getAccount(req){
  const session=(req.headers.cookie||'').match(/(?:^|;\s*)(qizhi_session=[a-f0-9]{64})(?:;|$)/)?.[1];
  if(!session)reject('请先登录后再生成课件',401);
  const {user}=await backend('/api/cloud/me',session);
  if(!/^[a-f0-9]{64}$/.test(user?.id||''))reject('登录已过期，请重新登录',401);
  return {session,userId:user.id};
 }
 function patch(j,values){Object.assign(j,values,{updatedAt:Date.now()});}
 async function clearExpired(){
  const now=Date.now();
  for(const [id,j] of jobs){
   if(['queued','running'].includes(j.status)||now-j.updatedAt<ttl)continue;
   jobs.delete(id);
   await rm(path.join(directory,id),{recursive:true,force:true});
  }
 }
 async function submit(req,account){
  const parts=[];
  let size=0;
  for await(const chunk of req.iterator({destroyOnReturn:false})){
   size+=chunk.length;
   if(size>180000){req.resume();reject('教案过长，请精简后制作',413);}
   parts.push(chunk);
  }
  let input;
  try{input=JSON.parse(Buffer.concat(parts));}catch{reject('请求格式无效',400);}
  const {lesson,brief={}}=input||{},mode=input?.mode==='basic'?'basic':'direct';
  const count=Number(input?.count),style=String(input?.style||'现代课堂演示，清晰、图解优先').slice(0,1500);
  if(!lesson||typeof lesson.title!=='string'||!lesson.title.trim()||lesson.title.length>160||
    !Array.isArray(lesson.phases)||lesson.phases.length<2||lesson.phases.length>10||
    JSON.stringify(lesson).length>45000)reject('教案格式无效或过长',400);
  const list=value=>Array.isArray(value)&&value.length<=20&&value.every(item=>typeof item==='string'&&item.length<=1800);
  const fields=['objectives','preparation','assessment','differentiation','board','homework','reflection','sources'];
  const optional=['keypoints','difficulties'];
  if(fields.some(key=>!list(lesson[key]))||optional.some(key=>lesson[key]!==undefined&&!list(lesson[key]))||
    lesson.phases.some(phase=>!Number.isInteger(phase?.minutes)||phase.minutes<1||phase.minutes>120||
     ['name','teacher','student','check'].some(key=>typeof phase[key]!=='string'||phase[key].length>2000))||
    lesson.phases.reduce((sum,phase)=>sum+phase.minutes,0)>120)reject('教案字段或课时分配无效',400);
  if(!Number.isInteger(count)||count<4||count>20)reject('课件页数须为4至20',400);
  const fingerprint=digest(JSON.stringify({lesson,brief,count,style,mode}));
  if(mode==='direct'){
   const {configured}=await backend('/api/status',account.session);
   if(!configured)reject('AI 精细设计需绑定个人 DeepSeek 密钥，也可以选择课堂初稿',428);
  }
  await clearExpired();
  const active=[...jobs.values()].filter(j=>['queued','running'].includes(j.status));
  const sameAccount=active.find(j=>j.userId===account.userId);
  if(sameAccount){
   if(sameAccount.fingerprint===fingerprint)return publicJob(sameAccount);
   reject('这个账号已有一份课件在制作，请等待它结束',409);
  }
  if(active.length>=8)reject('备用队列暂满，请稍后再试',503);
  const now=Date.now();
  const id='r-'+randomBytes(16).toString('hex');
  const job={...account,id,runId:randomBytes(12).toString('hex'),lesson,brief,count,style,mode,
   title:lesson.title,fingerprint,createdAt:now,updatedAt:now,status:'queued',error:null,result:null,calls:0,
   progress:{phase:'queued',pages:0,message:'已提交，等待 PPTMaster 后台接单'}};
  jobs.set(id,job);
  return publicJob(job);
 }

 async function handle(req,res,wake){
  const create=req.method==='POST'&&req.url==='/api/ppt/overflow/jobs';
  const match=req.url?.match(/^\/api\/ppt\/jobs\/(r-[a-f0-9]{32})(?:\/(cancel|wake|file)(?:\/([^/]+))?)?$/);
  if(!create&&!match)return false;
  const respond=(status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'});res.end(JSON.stringify(data));};
  try{
   if(req.method==='POST'&&req.headers.origin!==origin)reject('来源不匹配',403);
   const account=await getAccount(req);
   if(create){
    const job=await submit(req,account);
    respond(202,{job});
    wake();
    return true;
   }
   const [,id,action,name]=match;
   const j=jobs.get(id);
   if(!j||(!['queued','running'].includes(j.status)&&Date.now()-j.updatedAt>=ttl))reject('课件任务已过期或后台已重启，教案仍保留',404);
   if(j.userId!==account.userId)reject('该课件仅对创建者可见',403);
   if(req.method==='GET'&&!action)respond(200,{job:publicJob(j)});
   else if(req.method==='POST'&&action==='wake'&&!name){respond(200,{job:publicJob(j)});wake();}
   else if(req.method==='POST'&&action==='cancel'&&!name){
    if(!['queued','running'].includes(j.status))reject('任务已结束',409);
    j.controller?.abort();delete j.session;
    patch(j,{status:'cancelled',progress:{...j.progress,phase:'cancelled',message:'任务已停止'}});
    respond(200,{job:publicJob(j)});
   }else if(req.method==='GET'&&action==='file'&&files.test(name||'')){
    if(!['complete','draft'].includes(j.status))reject('课件文件尚未就绪',409);
    const bytes=await readFile(path.join(directory,id,name)).catch(()=>reject('课件文件已过期',404));
    const type=name==='deck.pptx'?'application/vnd.openxmlformats-officedocument.presentationml.presentation':
     name.endsWith('.png')?'image/png':'application/json; charset=utf-8';
    const headers={'content-type':type,'cache-control':'private, no-store','x-content-type-options':'nosniff'};
    if(name==='deck.pptx')headers['content-disposition']="attachment; filename*=UTF-8''"+
     encodeURIComponent(j.title+(j.status==='draft'?'_待复核初稿':'')+'.pptx');
    res.writeHead(200,headers);res.end(bytes);
   }else reject('未知课件请求',404);
  }catch(error){respond(error.status||502,{error:error.status?error.message:'备用课件服务暂不可用'});}
  return true;
 }

 function claim(){
  const j=[...jobs.values()].find(job=>job.status==='queued');
  if(!j)return null;
  patch(j,{status:'running',controller:new AbortController(),
   progress:{phase:'preparing',pages:0,message:'已接单，正在加载PPTMaster'}});
  return j;
 }
 async function chat(j,instruction,messages){
  if(++j.calls>120)reject('本次制作达到模型调用上限',429);
  const data=await backend('/api/chat',j.session,{
   mode:'prep',context:instruction.slice(0,18000),messages,
  },AbortSignal.any([j.controller.signal,AbortSignal.timeout(55000)]));
  if(typeof data.answer!=='string'||!data.answer.trim())reject('模型未返回可用结果',502);
  return data.answer;
 }
 function chunkText(text,maxLength){
  const result=[];
  for(let i=0;i<text.length;i+=maxLength)result.push({role:'user',content:text.slice(i,i+maxLength)});
  return result;
 }
 async function call(j,route,body){
  if(j.status!=='running')reject('任务已停止',409);
  if(route==='progress'){patch(j,{progress:{phase:body.phase,pages:body.pages,message:body.message}});return {};}
  if(route==='fail'){delete j.session;patch(j,{status:'failed',error:body.error});return {};}
  if(route==='model'){
   const tool=body.tools[0].function;
   const request=body.messages.slice(1).at(-1).content;
   const material=body.messages.slice(1,-1).map(m=>m.content).join('\n');
   const schema=JSON.stringify(tool.parameters);
   const prompt='依据上面的教案和版式要求完成下面的任务。只返回可被 JSON.parse 读取的完整对象，符合此JSON结构：'+schema+
    '。不要Markdown，不要解释。SVG以一行字符串返回，简化装饰，保留可编辑图形和教师备注。';
   const context=tool.name==='submit_plan'?request.slice(0,42000):material.slice(0,28500)+'\n'+request.slice(0,13000);
   const content=await chat(j,body.messages[0].content,[
    ...chunkText(context,9000),{role:'user',content:prompt},
   ]);
   return {message:{content}};
  }
  if(route==='review'){
   const material=JSON.stringify({lesson:j.lesson,slides:body.slides}).slice(0,45500);
   const content=await chat(j,'核对课件中的事实、课堂时间、实验变量和步骤编号。只报告有证据的内容矛盾。',[
    ...chunkText(material,9000),{role:'user',content:'按上面的材料给出最多8条逐页核对建议，只输出 JSON 对象 {"issues":[{"slide":1,"reason":"具体矛盾","correction":"具体改法"}]}。没有明确问题就输出 {"issues":[]}。每条尽量简短。'},
   ]);
   let value;
   try{value=cleanJson(content);}catch{reject('复核暂未返回有效结果',502);}
   if(!Array.isArray(value?.issues)||value.issues.length>10||value.issues.some(x=>!Number.isInteger(x?.slide)||
    x.slide<1||x.slide>j.count||typeof x.reason!=='string'||!x.reason.trim()||typeof x.correction!=='string'||!x.correction.trim())){
    reject('复核暂未返回有效结果',502);
   }
   const issues=value.issues.map(x=>({slide:x.slide,reason:x.reason.slice(0,350),correction:x.correction.slice(0,350)}));
   return {passed:!issues.length,issues};
  }
  reject('未知课件处理步骤',400);
 }
 async function publish(j,result,deliverables){
  const dest=path.join(directory,j.id);
  try{
   await mkdir(dest,{recursive:true,mode:0o700});
   await Promise.all(deliverables.map(([name,file])=>copyFile(file,path.join(dest,name))));
   if(j.status!=='running')reject('任务已停止',409);
   const status=result.quality==='draft'?'draft':'complete';
   patch(j,{status,result:{...result,delivery:'temporary'},
    progress:{phase:status,pages:result.actualCount,message:result.summary}});
   delete j.session;
  }catch(error){await rm(dest,{recursive:true,force:true});throw error;}
 }
 return {handle,claim,call,publish};
}
