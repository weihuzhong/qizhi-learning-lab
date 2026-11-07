import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudApi} from '../server/cloud.js';

class Store {
 data=new Map();next=0;
 async get(key){return structuredClone(this.data.get(key)?.data??null);}
 async getWithMetadata(key){return structuredClone(this.data.get(key)??null);}
 async getMetadata(key){const old=this.data.get(key);return old?{etag:old.etag,metadata:old.metadata}:null;}
 async set(key,data,options={}){
  const old=this.data.get(key);
  if((options.onlyIfNew&&old)||(options.onlyIfMatch&&old?.etag!==options.onlyIfMatch))return {modified:false};
  this.data.set(key,{data:structuredClone(data),metadata:options.metadata,etag:String(++this.next)});
  return {modified:true};
 }
 setJSON(key,data,options){return this.set(key,data,options);}
 async delete(key){this.data.delete(key);}
}

test('team original attachments round trip, authorize members and remove bytes with the document',async()=>{
 const store=new Store(),cloud=createCloudApi(store),origin='https://qizhi.test';
 async function call(path,body,cookie='',ip='127.0.0.1'){
  return cloud(new Request(origin+'/api/cloud/'+path,{method:body===undefined?'GET':'POST',
   headers:{origin,cookie,'x-nf-client-connection-ip':ip,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));
 }
 async function register(username){
  const result=await call('register',{username,password:'test-password-12345'});
  assert.equal(result.status,200);
  return result.headers.get('set-cookie').split(';')[0];
 }
 const owner=await register('fileowner'),author=await register('fileauthor'),reader=await register('filereader'),outsider=await register('fileoutsider');
 const {team,invite}=await (await call('team/create',{name:'验证组'},owner)).json();
 assert.equal((await call('team/join',{code:invite},author)).status,200);
 assert.equal((await call('team/join',{code:invite},reader)).status,200);
 const bytes=Buffer.alloc(900012,17);
 bytes.write('Original office bytes');
 const original={id:'a'.repeat(32),name:'课堂练习.pptx',size:bytes.length},id=team.id;
 const publish={id,original,name:original.name,text:'提取文字'};
 assert.equal((await call('team/document',publish,author)).status,409);
 assert.equal((await call('team/document/chunk',{id,original,index:0,data:'bad'},author)).status,400);
 for(let i=0;i<2;i++){
  const data=bytes.subarray(i*900000,(i+1)*900000).toString('base64');
  assert.equal((await call('team/document/chunk',{id,original,index:i,data},author)).status,200);
 }
 const {team:shared}=await (await call('team/document',publish,author)).json();
 const [document]=shared.documents;
 assert.equal(document.original.chunks,2);
 assert.equal(document.report,null);
 assert.equal((await call('team/document',publish,author).then(r=>r.json())).team.documents.length,1);
 const url='team/document/file?team='+id+'&document='+document.id+'&index=';
 assert.equal((await call(url+0,undefined,outsider)).status,403);
 const result=[];
 for(let i=0;i<2;i++){
  const r=await call(url+i,undefined,reader);
  assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/octet-stream');
  result.push(Buffer.from(await r.arrayBuffer()));
 }
 assert.deepEqual(Buffer.concat(result),bytes);
 assert.equal((await call('team/document/remove',{id,documentId:document.id},reader)).status,403);
 assert.equal((await call('team/document/remove',{id,documentId:document.id},owner)).status,200);
 assert.equal((await call(url+0,undefined,author)).status,404);
 assert.equal([...store.data.keys()].filter(k=>k.startsWith('team-originals/')).length,0);
});
