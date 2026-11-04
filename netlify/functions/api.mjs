import {getStore} from '@netlify/blobs';
import {createCloudApi} from '../../server/cloud.js';
import worker from '../../worker/index.js';
import {createPptService} from '../../server/ppt-service.js';
export default async function(request){
 const url=new URL(request.url);
 if(!['/api/status','/api/chat','/api/lesson'].includes(url.pathname)&&!url.pathname.startsWith('/api/lesson/')&&!url.pathname.startsWith('/api/cloud/')&&!url.pathname.startsWith('/api/deck/')&&!url.pathname.startsWith('/api/ppt/'))return new Response('Not found',{status:404});
 if(!['GET','POST'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(request.method==='POST'){
  if(!url.pathname.startsWith('/api/ppt/worker/')&&request.headers.get('origin')!==url.origin)return Response.json({error:'来源不匹配'},{status:403});
  const reader=request.body?.getReader();let size=0;const chunks=[];
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>(url.pathname.startsWith('/api/ppt/worker/')?5200000:url.pathname.startsWith('/api/ppt/')?180000:url.pathname.startsWith('/api/cloud/')?1500000:90000)){await reader.cancel();return Response.json({error:'输入过长'},{status:413});}chunks.push(value);}}
  request=new Request(url,{method:request.method,headers:request.headers,body:Buffer.concat(chunks.map(x=>Buffer.from(x)))});
 }
 if(url.pathname.startsWith('/api/ppt/'))return createPptService(getStore({name:'qizhi-pptmaster-v1',consistency:'strong'}),{LLM_API_KEY:process.env.LLM_API_KEY,LLM_BASE_URL:process.env.LLM_BASE_URL||'https://api.deepseek.com',LLM_MODEL:process.env.LLM_MODEL||'deepseek-flash'})(request);
 if(url.pathname.startsWith('/api/cloud/')){try{return await createCloudApi(getStore({name:'qizhi-studio-v2',consistency:'strong'}))(request)}catch{return Response.json({error:'云端存储尚未就绪，请稍后再试。'},{status:503})}}
 return worker.fetch(request,{LLM_API_KEY:process.env.LLM_API_KEY,LLM_BASE_URL:process.env.LLM_BASE_URL||'https://api.deepseek.com',LLM_MODEL:process.env.LLM_MODEL||'deepseek-flash'});
}
export const config={path:'/api/*'};
