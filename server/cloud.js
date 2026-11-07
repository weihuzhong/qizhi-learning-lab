import {validateDeckPlan,validateScene} from '../worker/ai-deck.js';
import {validateDocumentReview} from '../worker/document-review.js';
import {randomBytes,scrypt as rawScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {validateOutline,validatePhase} from '../worker/staged-api.js';
import {validateLesson} from '../worker/teaching-api.js';
import {createTeamOriginals,originalInfo,originalUploader} from './team-originals.js';
const scrypt=promisify(rawScrypt),hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const str=(s,n=300)=>String(s??'').trim().slice(0,n);
const validateInput=fn=>{try{return fn()}catch(e){fail(e.message,400)}};
const cleanUser=u=>({id:u.id,name:u.name,username:u.username});
export async function readCloudSession(store,req){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)qizhi_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;const s=await store.get('sessions/'+hash(token),{type:'json'});if(!s||s.expires<Date.now())return null;const user=await store.get('users/'+s.userId,{type:'json'});return user?{user,token}:null;}
export function createCloudApi(store){
 const get=key=>store.get(key,{type:'json'});
 const originals=createTeamOriginals(store);
 async function update(key,fn){for(let n=0;n<5;n++){const old=await store.getWithMetadata(key,{type:'json'});const data=await fn(old?.data??null);const r=await store.setJSON(key,data,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(r.modified)return data;}fail('多人同时操作，请刷新后重试',409);}
 async function throttle(ip,kind,limit){const key='rate/'+kind+'/'+hash(ip).slice(0,32)+'/'+Math.floor(Date.now()/600000);await update(key,old=>{if((old?.count||0)>=limit)fail('请求频繁，请10分钟后再试',429);return {count:(old?.count||0)+1};});}
 const session=req=>readCloudSession(store,req);
 const profileKey=id=>'profiles/'+id;
 async function links(id,workspace){return update('links/'+id,old=>[...new Set([...(old||[]),workspace])].slice(-15));}
 async function workspace(id,u){if(!/^[a-f0-9]{24}$/.test(id||''))fail('工作组编号无效');const w=await get('teams/'+id);if(!w||!w.members.some(m=>m.id===u.id))fail('没有此工作组的访问权限',403);return w;}
 function documentToAttach(w,id,u,original){
  if(!w?.members.some(m=>m.id===u.id))fail('没有此工作组的访问权限',403);
  const item=(w.documents||[]).find(d=>d.id===id);
  if(!item)fail('共享文档不存在',404);
  if(item.authorId!==u.id&&w.owner!==u.id)fail('仅上传者或组长可补传原件',403);
  if(item.original&&(item.original.id!==original.id||originalUploader(item)!==u.id))fail('这条记录已有原件，请刷新后下载',409);
  if(item.name.normalize('NFC').toLowerCase()!==original.name.normalize('NFC').toLowerCase())fail('请选择与共享记录同名的原件');
  if(w.documents.some(d=>d.id!==id&&d.original?.id===original.id&&originalUploader(d)===u.id))fail('该附件已用于另一条记录',409);
  return item;
 }
 const publicTeam=(w,u)=>{const {inviteHash,...rest}=w;return {...rest,role:w.owner===u.id?'leader':'teacher'};};
 return async(req)=>{
 const reply=(data,status=200,extra={})=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
 try{
 const url=new URL(req.url),path=url.pathname,ip=req.headers.get('x-nf-client-connection-ip')||'unknown';
 if(req.method==='POST'&&req.headers.get('origin')!==new URL(req.url).origin)fail('来源不匹配',403);
 const b=req.method==='POST'?await req.json():{};
 if(path==='/api/cloud/register'||path==='/api/cloud/login'){
 await throttle(ip,'auth',25);const username=str(b.username,40).toLowerCase(),password=String(b.password||'');if(!/^[a-z0-9_-]{3,32}$/.test(username)||password.length<12||password.length>128)fail('账号为3至32位字母、数字、下划线或短横线；密码须为12至128位');
 const id=hash(username);let user=await get('users/'+id);
 if(path.endsWith('register')){await throttle(ip,'register',8);if(user)fail('该账号已存在');const salt=randomBytes(16).toString('hex');const derived=await scrypt(password,salt,64);user={id,username,name:str(b.name,40)||username,salt,password:derived.toString('hex'),createdAt:new Date().toISOString()};const created=await store.setJSON('users/'+id,user,{onlyIfNew:true});if(!created.modified)fail('该账号已存在');}
 else {const derived=await scrypt(password,user?.salt||'unregistered-account-salt',64);if(!user||!timingSafeEqual(derived,Buffer.from(user.password,'hex')))fail('账号或密码错误',401);}
 const token=randomBytes(32).toString('hex');await store.setJSON('sessions/'+hash(token),{userId:id,expires:Date.now()+7*86400000});return reply({user:cleanUser(user)},200,{'set-cookie':'qizhi_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'});
 }
 const s=await session(req);
 if(path==='/api/cloud/me')return reply({user:s?cleanUser(s.user):null});
 if(!s)fail('请先登录后使用云端同步与团队协作',401);const u=s.user;
 if(path==='/api/cloud/logout'){if(req.method!=='POST')fail('请使用POST',405);await store.delete('sessions/'+hash(s.token));return reply({ok:true},200,{'set-cookie':'qizhi_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});}
 if(path==='/api/cloud/profile'){
 if(req.method==='GET'){const p=await get(profileKey(u.id));return reply({profile:p||{version:0,lessons:[],preferences:[],schedule:[]}});}
 await throttle(ip,'write',120);const data=b.profile;if(!data||JSON.stringify(data).length>1200000)fail('个人资料超过1.2MB限制，请先导出归档');if(!Array.isArray(data.lessons)||data.lessons.length>30||!Array.isArray(data.preferences)||data.preferences.length>20||!Array.isArray(data.schedule)||data.schedule.length>150)fail('个人资料格式或数量超限');for(const x of data.lessons)validateInput(()=>validateLesson(x.lesson));for(const x of data.preferences)if(typeof x!=='string'||x.length>300)fail('偏好过长');
 if(data.workspace){const d=data.workspace;if(!d.brief||JSON.stringify(d).length>180000)fail('备课进度格式错误或过大');if(d.aiDeck){if(!Array.isArray(d.aiDeck.pages)||d.aiDeck.pages.length>18)fail('AI课件结构无效');if(d.aiDeck.plan)validateInput(()=>validateDeckPlan(d.aiDeck.plan));d.aiDeck.pages.forEach(p=>{if(p)validateInput(()=>validateScene(p));});}if(d.lesson)validateInput(()=>validateLesson(d.lesson));if(d.job){if(!d.job.brief||!Array.isArray(d.job.phases))fail('分步进度格式错误');if(d.job.outline&&d.job.confirmed){validateInput(()=>validateOutline(d.job.outline,d.job.brief.minutes));d.job.phases.forEach((p,i)=>{if(p)validateInput(()=>validatePhase(p,d.job.outline,i));});}}}
 const p=await update(profileKey(u.id),old=>{if((old?.version||0)!==b.version)fail('云端已有新版本。请先载入云端内容，避免覆盖其他设备的修改。',409);return {version:(old?.version||0)+1,lessons:data.lessons,preferences:data.preferences,schedule:data.schedule,workspace:data.workspace||null,updatedAt:new Date().toISOString()};});return reply({profile:p});
 }
 if(path==='/api/cloud/teams'){const ids=await get('links/'+u.id)||[];const teams=[];for(const id of ids){const w=await get('teams/'+id);if(w?.members.some(m=>m.id===u.id))teams.push({id:w.id,name:w.name,role:w.owner===u.id?'leader':'teacher'});}return reply({teams});}
 if(path==='/api/cloud/team/document/file'&&req.method==='GET'){
  const w=await workspace(url.searchParams.get('team'),u);
  const item=(w.documents||[]).find(d=>d.id===url.searchParams.get('document'));
  if(!item)fail('共享文档不存在',404);
  const view=url.searchParams.get('view');
  if(view==='download'||view==='preview')return await originals.open(w.id,item,view);
  const index=url.searchParams.get('index');
  if(!/^\d{1,2}$/.test(index||''))fail('文件分段编号无效');
  return await originals.read(w.id,item,Number(index));
 }
 if(req.method!=='POST')fail('请使用POST',405);await throttle(ip,'write',120);
 if(path==='/api/cloud/team/create'){
 const ids=await get('links/'+u.id)||[];if(ids.length>=15)fail('最多加入15个工作组');const id=randomBytes(12).toString('hex'),secret=randomBytes(16).toString('hex');const w={id,name:str(b.name,80)||'协同教研组',owner:u.id,members:[{id:u.id,name:u.name}],lessons:[],messages:[],inviteHash:hash(secret),updatedAt:new Date().toISOString()};await store.setJSON('teams/'+id,w,{onlyIfNew:true});await links(u.id,id);return reply({team:publicTeam(w,u),invite:id+'.'+secret});
 }
 if(path==='/api/cloud/team/join'){
 const [id,secret]=str(b.code,80).split('.');if(!/^[a-f0-9]{24}$/.test(id||'')||!/^[a-f0-9]{32}$/.test(secret||''))fail('邀请码格式无效');const w=await update('teams/'+id,w=>{if(!w||hash(secret)!==w.inviteHash)fail('邀请码无效',403);if(w.members.some(m=>m.id===u.id))return w;if(w.members.length>=30)fail('工作组最多30人');w.members.push({id:u.id,name:u.name});return w;});await links(u.id,id);return reply({team:publicTeam(w,u)});
 }
 if(path==='/api/cloud/team/get'){const w=await workspace(b.id,u);return reply({team:publicTeam(w,u)});}
 if(path==='/api/cloud/team/invite'){const old=await workspace(b.id,u);if(old.owner!==u.id)fail('仅组长可更新邀请码',403);const secret=randomBytes(16).toString('hex');await update('teams/'+b.id,w=>({...w,inviteHash:hash(secret)}));return reply({invite:b.id+'.'+secret});}
 if(path==='/api/cloud/team/document/chunk'||path==='/api/cloud/team/document/abort'){
  const w=await workspace(b.id,u);
  if(path.endsWith('/chunk'))await originals.put(w.id,u.id,b);
  else{
   const file=originalInfo(b.original);
   if(!(w.documents||[]).some(d=>d.original?.id===file.id&&originalUploader(d)===u.id))await originals.remove(w.id,u.id,file);
  }
  return reply({ok:true});
 }
 if(path==='/api/cloud/team/document/attach'){
  const current=await workspace(b.id,u),descriptor=originalInfo(b.original);
  const item=documentToAttach(current,b.documentId,u,descriptor);
  if(item.original)return reply({team:publicTeam(current,u)});
  const original=await originals.complete(current.id,u.id,descriptor);
  const w=await update('teams/'+current.id,w=>{
   const item=documentToAttach(w,b.documentId,u,original);
   if(!item.original){
    item.original={...original,uploadedBy:u.id};
    w.updatedAt=new Date().toISOString();
   }
   return w;
  });
  return reply({team:publicTeam(w,u)});
 }
 if(['/api/cloud/team/publish','/api/cloud/team/message','/api/cloud/team/remove','/api/cloud/team/document','/api/cloud/team/document/remove'].includes(path)){
 await workspace(b.id,u);
 const original=path==='/api/cloud/team/document'&&b.original?await originals.complete(b.id,u.id,b.original):null;
 let removed;
 const w=await update('teams/'+b.id,w=>{
 if(!w?.members.some(m=>m.id===u.id))fail('无访问权限',403);
 if(path==='/api/cloud/team/document/remove'){
  removed=(w.documents||[]).find(d=>d.id===b.documentId);
  if(!removed)fail('共享文档不存在',404);
  if(removed.authorId!==u.id&&w.owner!==u.id)fail('仅上传者或组长可删除共享文档',403);
  w.documents=w.documents.filter(d=>d.id!==removed.id);
 }
 else if(path.endsWith('document')){
  if(typeof b.text!=='string'||(!original&&!b.text.trim())||b.text.length>18000)fail('文档正文无效');
  if(b.report)validateInput(()=>validateDocumentReview(b.report,b.text));
  w.documents ||= [];
  if(original&&w.documents.some(d=>d.original?.id===original.id&&originalUploader(d)===u.id))return w;
  if(w.documents.length>=30)fail('最多保存30份教研文档');
  w.documents.unshift({id:randomBytes(12).toString('hex'),name:original?.name||str(b.name,160),text:b.text,report:b.report||null,original,author:u.name,authorId:u.id,createdAt:new Date().toISOString()});
 }
 else if(path.endsWith('publish')){
 const items=b.items;if(!Array.isArray(items)||!items.length||items.length>20||w.lessons.length+items.length>40)fail('一次可提交1至20份，组内最多40份教案，请归档后再上传');
 for(const item of items){validateInput(()=>validateLesson(item.lesson));if(JSON.stringify(item).length>70000)fail('单份备课包过大');const brief=Object.fromEntries(['topic','grade','subject','minutes','prior','resources','learners','context','requirements'].map(k=>[k,k==='minutes'?Number(item.brief?.[k])||40:str(item.brief?.[k],1800)]));w.lessons.unshift({id:randomBytes(12).toString('hex'),authorId:u.id,author:u.name,lesson:item.lesson,brief,createdAt:new Date().toISOString(),source:str(item.source,120)});}
 }else if(path.endsWith('remove')){const item=w.lessons.find(x=>x.id===b.lessonId);if(!item)fail('教案不存在',404);if(item.authorId!==u.id&&w.owner!==u.id)fail('仅作者或组长可移除教案',403);w.lessons=w.lessons.filter(x=>x.id!==b.lessonId);}
 else {const text=str(b.text,1500);if(!text)fail('讨论内容不能为空');if(b.lessonId&&!w.lessons.some(x=>x.id===b.lessonId))fail('关联教案不存在');w.messages.push({id:randomBytes(12).toString('hex'),author:u.name,authorId:u.id,text,lessonId:str(b.lessonId,24),createdAt:new Date().toISOString()});w.messages=w.messages.slice(-150);}
 w.updatedAt=new Date().toISOString();if(JSON.stringify(w).length>2800000)fail('工作组容量已满，请删除旧文档或教案');return w;});
 if(removed)await originals.remove(w.id,originalUploader(removed),removed.original);
 return reply({team:publicTeam(w,u)});
 }
 fail('接口不存在',404);
 }catch(e){return reply({error:e.status?e.message:'云端服务暂不可用，当前浏览器内容仍保留。请稍后重试。'},e.status||503);}
 };
}
