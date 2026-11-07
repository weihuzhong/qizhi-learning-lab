const fields=['accept','cache-control','content-type','prefer','range','range-unit','x-metadata','x-upsert'];
export const maxBodyBytes=4000000;

export function storageHeaders(headers){
 return new Headers(fields.flatMap(name=>headers.has(name)?[[name,headers.get(name)]]:[]));
}

export async function signaturePayload(timestamp,method,resource,headers,body){
 const digest=await crypto.subtle.digest('SHA-256',body);
 return new TextEncoder().encode(JSON.stringify([
  timestamp,method,resource,[...storageHeaders(headers)],Array.from(new Uint8Array(digest)),
 ]));
}

export function allowedResource(method,url){
 const path=url.pathname;
 if(path==='/rest/v1/qizhi_records')return ['GET','POST','PATCH','DELETE'].includes(method);
 const bucket='qizhi-private-files';
 if(path==='/storage/v1/object/list/'+bucket)return method==='POST'&&!url.search;
 if(path==='/storage/v1/object/'+bucket)return method==='DELETE'&&!url.search;
 if(!/^\/storage\/v1\/object\/(?:info\/|authenticated\/)?qizhi-private-files\/(?:cloud\/team-originals\/|ppt\/files\/)[a-z0-9./-]+$/.test(path)||url.search){
  return false;
 }
 return method==='GET'||(method==='POST'&&path.startsWith('/storage/v1/object/'+bucket+'/'));
}
