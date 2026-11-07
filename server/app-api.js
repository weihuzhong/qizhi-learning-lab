import worker from '../worker/index.js';
import {createCloudApi} from './cloud.js';
import {createPptService} from './ppt-service.js';
import {createUserModel} from './user-model.js';
// The deployment key is used solely to derive the credential-vault encryption key.
// Only a signed-in user's decrypted key is ever passed to model-request code.
export function createAppApi({cloudStore,pptStore,vaultSecret,model='deepseek-flash',fetcher=fetch}){
 const billing=createUserModel(cloudStore,{vaultSecret,model,fetcher});
 const ppt=createPptService(pptStore,{LLM_MODEL:model},{billing});
 const cloud=createCloudApi(cloudStore);
 return async req=>{try{const path=new URL(req.url).pathname;
  if(path==='/api/status'){const state=await billing.status(req);return worker.fetch(req,{LLM_MODEL:model,USER_AUTHENTICATED:state.authenticated,USER_MODEL_CONFIGURED:state.configured,USER_ORIGINAL_FILES:true});}
  if(path==='/api/cloud/model'||path.startsWith('/api/cloud/model/'))return billing.handle(req);
  if(path.startsWith('/api/cloud/'))return cloud(req);
  if(path.startsWith('/api/ppt/'))return ppt(req);
  if(path==='/api/chat'||path==='/api/lesson'||path.startsWith('/api/lesson/')){const account=await billing.forRequest(req);return worker.fetch(req,account.env);}
  return worker.fetch(req,{});
 }catch(e){return Response.json({error:e.status?e.message:'服务暂不可用，请稍后重试',code:e.code||'SERVICE_UNAVAILABLE'},{status:e.status||503,headers:{'cache-control':'no-store'}});}};
}
