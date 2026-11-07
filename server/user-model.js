import {randomBytes,createCipheriv,createDecipheriv,hkdfSync} from 'node:crypto';
import {readCloudSession} from './cloud.js';
import {modelOptions,modelError,modelFetch} from '../worker/model-provider.js';
const fail=(error,status=400,code='MODEL_BINDING_REQUIRED')=>{throw Object.assign(Error(error),{status,code})};
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const credentialPath=id=>'model-credentials/'+id;
const requireUserId=id=>{if(!/^[a-f0-9]{64}$/.test(id||''))fail('请先登录网站，再绑定自己的DeepSeek API密钥',401,'LOGIN_REQUIRED');return id;};
export function createUserModel(store,{vaultSecret,model='deepseek-flash',fetcher=fetch}={}){
 function encryptionKey(id){if(!vaultSecret||vaultSecret.length<24)fail('个人密钥保险箱尚未就绪，请联系维护者',503,'VAULT_UNAVAILABLE');return Buffer.from(hkdfSync('sha256',vaultSecret,'qizhi-user-model-v1',requireUserId(id),32));}
 function seal(key,id){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(id),iv);cipher.setAAD(Buffer.from(id));const data=Buffer.concat([cipher.update(key,'utf8'),cipher.final()]);return {version:1,iv:iv.toString('base64'),data:data.toString('base64'),tag:cipher.getAuthTag().toString('base64')};}
 function unseal(record,id){try{if(record.version!==1)throw Error();const decipher=createDecipheriv('aes-256-gcm',encryptionKey(id),Buffer.from(record.iv,'base64'));decipher.setAAD(Buffer.from(id));decipher.setAuthTag(Buffer.from(record.tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(record.data,'base64')),decipher.final()]).toString('utf8');}catch(e){if(e.code==='VAULT_UNAVAILABLE')throw e;fail('个人密钥无法解密，请重新绑定；不会使用维护者额度',428,'MODEL_REBIND_REQUIRED');}}
 async function user(req){const s=await readCloudSession(store,req);if(!s)fail('请先登录网站，再绑定自己的DeepSeek API密钥',401,'LOGIN_REQUIRED');return s.user;}
 async function forUser(id){requireUserId(id);const record=await store.get(credentialPath(id),{type:'json'});if(!record)fail('请先在账号页绑定自己的DeepSeek API密钥；不会使用维护者额度',428);return {LLM_API_KEY:unseal(record.sealed,id),LLM_BASE_URL:'https://api.deepseek.com',LLM_MODEL:model,USER_AUTHENTICATED:true};}
 async function forRequest(req){const u=await user(req);return {userId:u.id,env:await forUser(u.id)};}
 const summary=r=>({provider:'deepseek',bound:!!r,maskedKey:r?'••••'+r.last4:null,verifiedAt:r?.verifiedAt||null,balance:r?.balance||null,billingMode:'personal-key'});
 async function binding(id){
  const record=await store.get(credentialPath(id),{type:'json'});
  if(!record)return summary(null);
  try{unseal(record.sealed,id);return summary(record);}
  catch(error){
   if(error.code!=='MODEL_REBIND_REQUIRED')throw error;
   return {...summary(record),bound:false,balance:null,rebindRequired:true};
  }
 }
 async function status(req){const s=await readCloudSession(store,req);if(!s)return {authenticated:false,configured:false,billingMode:'personal-key'};return {authenticated:true,configured:(await binding(s.user.id)).bound,billingMode:'personal-key'};}
 async function checkBalance(key){let response;try{response=await fetcher('https://api.deepseek.com/user/balance',{headers:{authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(12000)});}catch{fail('DeepSeek密钥验证暂未完成，请稍后重试；尚未保存新密钥',502);}
  if(response.status===401||response.status===403)fail('DeepSeek API密钥无效或不可用，请核对后重试',400);
  if(!response.ok)fail('DeepSeek余额查询暂不可用，请稍后重试',502);
  let d;try{d=await response.json()}catch{fail('DeepSeek余额响应无效，请稍后重试',502);}
  if(typeof d.is_available!=='boolean'||!Array.isArray(d.balance_infos))fail('DeepSeek余额响应无效，请稍后重试',502);
  return {available:d.is_available,items:d.balance_infos.filter(x=>['CNY','USD'].includes(x.currency)).map(x=>({currency:x.currency,total:String(x.total_balance).slice(0,40)})).slice(0,2),checkedAt:new Date().toISOString()};
 }
 async function limit(id){const path='rate/model-binding/'+id+'/'+Math.floor(Date.now()/600000);for(let n=0;n<5;n++){const old=await store.getWithMetadata(path,{type:'json'});if((old?.data?.count||0)>=20)fail('操作频繁，请10分钟后再试',429);const r=await store.setJSON(path,{count:(old?.data?.count||0)+1},old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(r.modified)return;}fail('请求冲突，请稍后重试',409);}
 async function handle(req){try{const url=new URL(req.url);if(req.method==='POST'&&req.headers.get('origin')!==url.origin)fail('来源不匹配',403);const u=await user(req),path=url.pathname;
  if(path==='/api/cloud/model'&&req.method==='GET')return json(await binding(u.id));
  if(req.method!=='POST')fail('请使用POST',405);await limit(u.id);
  if(path==='/api/cloud/model/remove'){await store.delete(credentialPath(u.id));return json(summary(null));}
  if(path==='/api/cloud/model/balance'){const env=await forUser(u.id);return json({balance:await checkBalance(env.LLM_API_KEY)});}
  if(path==='/api/cloud/model/test'){
   const env=await forUser(u.id);
   let response;
   try{
    response=await modelFetch(env.LLM_BASE_URL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+env.LLM_API_KEY,'content-type':'application/json'},
     body:JSON.stringify({model:env.LLM_MODEL,messages:[{role:'user',content:'请只回复：连接正常。'}],...modelOptions(env,24)})},16000,fetcher);
   }catch(error){
    return json({error:error.name==='TimeoutError'?'DeepSeek 连接超时，请稍后重新测试。':'暂时无法连接 DeepSeek，请稍后重新测试。',code:'MODEL_CONNECTION_FAILED'},502);
   }
   if(!response.ok)return json(await modelError(response),502);
   const result=await response.json().catch(()=>null),answer=result?.choices?.[0]?.message?.content;
   if(typeof answer!=='string'||!answer.trim())return json({error:'DeepSeek 未返回可用文本，请重新测试。',code:'EMPTY_MODEL_REPLY'},502);
   return json({ok:true,model:env.LLM_MODEL,answer:answer.trim().slice(0,100)});
  }
  if(path!=='/api/cloud/model')fail('接口不存在',404);
  const b=await req.json(),key=String(b.apiKey||'').trim();if(!/^sk-[A-Za-z0-9_-]{20,253}$/.test(key))fail('请填写完整的DeepSeek API密钥，以sk-开头');
  const sealed=seal(key,u.id),balance=await checkBalance(key),record={sealed,last4:key.slice(-4),verifiedAt:new Date().toISOString(),balance};await store.setJSON(credentialPath(u.id),record);return json(summary(record));
 }catch(e){return json({error:e.status?e.message:'个人模型设置暂不可用，请稍后重试',code:e.code||'MODEL_SETTINGS_UNAVAILABLE'},e.status||503);}}
 return {forRequest,forUser,status,handle,user};
}
