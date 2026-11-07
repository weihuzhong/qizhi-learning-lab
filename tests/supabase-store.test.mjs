import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseStores} from '../server/supabase-store.js';
import {createTeamOriginals} from '../server/team-originals.js';

const project='https://fixture.supabase.co';
const secret='sb_secret_local_test_only';

function fixture(handler){
 return createSupabaseStores({SUPABASE_URL:project,SUPABASE_SECRET_KEY:secret},async (input,options)=>{
  const req=new Request(input,options);
  assert.equal(new URL(req.url).origin,project);
  assert.equal(req.headers.get('apikey'),secret);
  return handler(req,new URL(req.url));
 });
}

test('Supabase adapter preserves conditional writes and separates the two namespaces',async()=>{
 const records=new Map();
 const {cloudStore,pptStore}=fixture(async (req,url)=>{
  assert.equal(url.pathname,'/rest/v1/qizhi_records');
  const p=url.searchParams;
  const filter=key=>p.get(key)?.slice(3);
  const recordKey=filter('namespace')+'/'+filter('key');
  const old=records.get(recordKey);
  if(req.method==='GET')return Response.json(old?[old]:[]);
  const value=await req.json();
  if(req.method==='PATCH'){
   if(old?.etag!==filter('etag'))return Response.json([]);
   records.set(recordKey,{...old,...value});
  }else{
   const key=value.namespace+'/'+value.key;
   if(req.headers.get('prefer').includes('resolution=ignore-duplicates')&&records.has(key))return Response.json([]);
   records.set(key,value);
  }
  return Response.json([{etag:value.etag}]);
 });
 const key='shared/key';
 assert.equal(await cloudStore.get(key),null);
 const created=await cloudStore.setJSON(key,{version:1},{onlyIfNew:true});
 assert.equal(created.modified,true);
 assert.equal((await cloudStore.setJSON(key,{version:2},{onlyIfNew:true})).modified,false);
 const modified=await cloudStore.setJSON(key,{version:2},{onlyIfMatch:created.etag});
 assert.equal(modified.modified,true);
 assert.notEqual(modified.etag,created.etag);
 assert.equal((await cloudStore.setJSON(key,{version:3},{onlyIfMatch:created.etag})).modified,false);
 await pptStore.setJSON(key,{version:3});
 assert.deepEqual(await cloudStore.get(key),{version:2});
 assert.deepEqual(await pptStore.get(key),{version:3});
});

test('original attachments use the private bucket and preserve bytes and declared size',async()=>{
 const prefix='/storage/v1/object/',bucket='qizhi-private-files';
 const objects=new Map();
 const {cloudStore}=fixture(async (req,url)=>{
  const path=url.pathname;
  assert.ok(path.startsWith(prefix));
  if(req.method==='POST'){
   assert.equal(req.headers.get('x-upsert'),'false');
   assert.ok(path.startsWith(prefix+bucket+'/cloud/team-originals/'));
   if(objects.has(path))return Response.json({error:'Duplicate',message:'Exists'},{status:409});
   const metadata=JSON.parse(Buffer.from(req.headers.get('x-metadata'),'base64').toString());
   objects.set(path,{bytes:await req.arrayBuffer(),metadata});
   return Response.json({Key:path});
  }
  if(req.method==='DELETE'){
   for(const path of (await req.json()).prefixes)objects.delete(prefix+bucket+'/'+path);
   return Response.json([]);
  }
  const stored=objects.get(path.replace(/\/(info|authenticated)\//,'/'));
  if(!stored)return Response.json({message:'Object not found'},{status:404});
  if(path.includes('/info/'))return Response.json({metadata:{size:stored.bytes.byteLength},user_metadata:stored.metadata});
  return new Response(stored.bytes);
 });
 const originals=createTeamOriginals(cloudStore);
 const bytes=Buffer.from('original ppt bytes'),team='t',author='a',original={id:'a'.repeat(32),name:'测试.pptx',size:bytes.length};
 await assert.rejects(()=>originals.complete(team,author,original),{status:409});
 await originals.put(team,author,{original,index:0,data:bytes.toString('base64')});
 await originals.put(team,author,{original,index:0,data:Buffer.alloc(bytes.length).toString('base64')});
 const descriptor=await originals.complete(team,author,original);
 const result=await originals.read(team,{authorId:author,original:descriptor},0);
 assert.deepEqual(Buffer.from(await result.arrayBuffer()),bytes);
 await originals.remove(team,author,descriptor);
 assert.equal(objects.size,0);
});

test('signed storage requests bind the operation and body and reject other project resources',async()=>{
 const {generateKeyPairSync}=await import('node:crypto');
 const {createStorageFetch}=await import('../server/supabase-storage-fetch.js');
 const {signaturePayload,storageHeaders}=await import('../supabase/functions/qizhi-storage/protocol.js');
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const secret=privateKey.export({format:'der',type:'pkcs8'}).toString('base64');
 const publicVerification=await crypto.subtle.importKey('jwk',publicKey.export({format:'jwk'}),'Ed25519',false,['verify']);
 const fetcher=createStorageFetch(new URL(project),secret,async(url,options)=>{
  assert.equal(url.pathname,'/functions/v1/qizhi-storage');
  const req=new Request(url,options),method=req.headers.get('x-qizhi-method'),resource=req.headers.get('x-qizhi-resource');
  const [,timestamp,encoded]=/^Qizhi (\d+)\.([\w-]+)$/.exec(req.headers.get('authorization'));
  const signature=Buffer.from(encoded,'base64url'),headers=storageHeaders(req.headers);
  const body=await req.arrayBuffer();
  assert.equal(method,'PATCH');
  assert.equal(req.headers.get('apikey'),null);
  const payload=await signaturePayload(timestamp,method,resource,headers,body);
  assert.equal(await crypto.subtle.verify('Ed25519',publicVerification,signature,payload),true);
  const modified=await signaturePayload(timestamp,method,resource,headers,new Uint8Array([0]));
  assert.equal(await crypto.subtle.verify('Ed25519',publicVerification,signature,modified),false);
  return Response.json([]);
 });
 await assert.rejects(fetcher(project+'/rest/v1/other_table'),/授权范围/);
 await assert.rejects(fetcher('https://outside.test/rest/v1/qizhi_records'),/授权范围/);
 await assert.rejects(fetcher(project+'/storage/v1/object/another-bucket/cloud/team-originals/a'),/授权范围/);
 const result=await fetcher(project+'/rest/v1/qizhi_records?key=eq.test',{method:'PATCH',body:'{"test":true}'});
 assert.equal(result.status,200);
});
