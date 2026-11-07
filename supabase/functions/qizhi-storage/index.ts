import {allowedResource,maxBodyBytes,signaturePayload,storageHeaders} from './protocol.js';

// Populated at deployment with this installation's public verification key.
const publicJwk={"kty":"OKP","crv":"Ed25519","x":"E0P_ySDFXfZpOtGO4Ib18RNTYrRM39EQuFAvGnm-EcY"};
const publicKey=await crypto.subtle.importKey('jwk',publicJwk,'Ed25519',false,['verify']);
const project=new URL(Deno.env.get('SUPABASE_URL')!).origin;
const secret=Deno.env.get('SUPABASE_SECRET_KEYS')
 ? JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!).default
 : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function readLimited(req:Request){
 const reader=req.body?.getReader();
 if(!reader)return new Uint8Array();
 const parts:Uint8Array[]=[];
 let size=0;
 while(true){
  const {value,done}=await reader.read();
  if(done)break;
  size+=value.byteLength;
  if(size>maxBodyBytes){await reader.cancel();return null;}
  parts.push(value);
 }
 const body=new Uint8Array(size);
 let offset=0;
 for(const part of parts){body.set(part,offset);offset+=part.byteLength;}
 return body;
}

Deno.serve(async req=>{
 const deny=()=>Response.json({error:'Forbidden'},{status:403});
 if(req.method!=='POST'||!secret)return deny();
 const signed=/^Qizhi (\d{13})\.([\w-]{86})$/.exec(req.headers.get('authorization')||'');
 const method=req.headers.get('x-qizhi-method')||'';
 const resource=req.headers.get('x-qizhi-resource')||'';
 if(!signed||Math.abs(Date.now()-Number(signed[1]))>30000||!resource.startsWith('/'))return deny();
 let target;
 try{target=new URL(resource,project);}catch{return deny();}
 if(target.origin!==project||target.pathname+target.search!==resource||!allowedResource(method,target))return deny();
 if(Number(req.headers.get('content-length'))>maxBodyBytes)return new Response(null,{status:413});
 const body=await readLimited(req);
 if(!body)return new Response(null,{status:413});
 const headers=storageHeaders(req.headers);
 const raw=atob(signed[2].replaceAll('-','+').replaceAll('_','/')+'==');
 const signature=Uint8Array.from(raw,c=>c.charCodeAt(0));
 const verified=await crypto.subtle.verify('Ed25519',publicKey,signature,
  await signaturePayload(signed[1],method,resource,headers,body));
 if(!verified)return deny();
 headers.set('apikey',secret);
 if(!secret.startsWith('sb_secret_'))headers.set('authorization','Bearer '+secret);
 try{
  const response=await fetch(target,{method,headers,body:method==='GET'?undefined:body,redirect:'error',signal:AbortSignal.timeout(26000)});
  const output=new Headers();
  for(const name of ['content-type','content-range','preference-applied','etag']){
   const value=response.headers.get(name);
   if(value!==null)output.set(name,value);
  }
  return new Response(response.body,{status:response.status,headers:output});
 }catch{return Response.json({error:'Storage unavailable'},{status:502});}
});
