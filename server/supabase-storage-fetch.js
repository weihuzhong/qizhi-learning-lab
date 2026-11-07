import {createPrivateKey,sign} from 'node:crypto';
import {allowedResource,maxBodyBytes,signaturePayload,storageHeaders} from '../supabase/functions/qizhi-storage/protocol.js';

export function createStorageFetch(endpoint,privateKey,fetcher){
 const key=createPrivateKey({key:Buffer.from(privateKey,'base64'),format:'der',type:'pkcs8'});
 if(key.asymmetricKeyType!=='ed25519')throw Error('存储签名密钥无效');
 const functionUrl=new URL('/functions/v1/qizhi-storage',endpoint);
 return async(input,options)=>{
  const request=new Request(input,options),url=new URL(request.url);
  if(url.origin!==endpoint.origin||!allowedResource(request.method,url))throw Error('此操作不在存储授权范围内');
  const resource=url.pathname+url.search;
  const body=await request.arrayBuffer();
  if(body.byteLength>maxBodyBytes)throw Error('上传数据超过存储请求上限');
  const headers=storageHeaders(request.headers);
  if(!headers.has('accept'))headers.set('accept','*/*');
  const timestamp=String(Date.now());
  const signature=sign(null,await signaturePayload(timestamp,request.method,resource,headers,body),key).toString('base64url');
  headers.set('authorization','Qizhi '+timestamp+'.'+signature);
  headers.set('x-qizhi-method',request.method);
  headers.set('x-qizhi-resource',resource);
  return fetcher(functionUrl,{method:'POST',headers,body,redirect:'error',signal:request.signal});
 };
}
