import worker from '../../worker/index.js';
export default async function(request){
 const url=new URL(request.url);
 if(!['/api/status','/api/chat','/api/lesson'].includes(url.pathname))return new Response('Not found',{status:404});
 if(!['GET','POST'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin)return Response.json({error:'来源不匹配'},{status:403});
  const reader=request.body?.getReader();let size=0;const chunks=[];
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>90000){await reader.cancel();return Response.json({error:'输入过长'},{status:413});}chunks.push(value);}}
  request=new Request(url,{method:request.method,headers:request.headers,body:Buffer.concat(chunks.map(x=>Buffer.from(x)))});
 }
 return worker.fetch(request,{LLM_API_KEY:process.env.LLM_API_KEY,LLM_BASE_URL:process.env.LLM_BASE_URL||'https://api.deepseek.com',LLM_MODEL:process.env.LLM_MODEL||'deepseek-flash'});
}
export const config={path:'/api/*'};
