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
 const download='team/document/file?team='+id+'&document='+document.id+'&view=';
 assert.equal((await call(download+'download',undefined,outsider)).status,403);
 const full=await call(download+'download',undefined,reader);
 assert.equal(full.status,200);
 assert.equal(full.headers.get('content-length'),String(bytes.length));
 assert.equal(full.headers.get('content-disposition'),"attachment; filename*=UTF-8''"+encodeURIComponent(original.name));
 assert.deepEqual(Buffer.from(await full.arrayBuffer()),bytes);
 assert.equal((await call(download+'preview',undefined,reader)).status,415);
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

test('a group leader can attach a missing original without replacing the old review',async()=>{
 const store=new Store(),cloud=createCloudApi(store),origin='https://qizhi.test';
 async function call(path,body,cookie=''){
  return cloud(new Request(origin+'/api/cloud/'+path,{method:body===undefined?'GET':'POST',
   headers:{origin,cookie,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));
 }
 async function register(username){
  const response=await call('register',{username,password:'test-password-12345'});
  return response.headers.get('set-cookie').split(';')[0];
 }
 const owner=await register('attachowner'),author=await register('attachauthor'),reader=await register('attachreader');
 const {team,invite}=await (await call('team/create',{name:'原件补传验证组'},owner)).json();
 const id=team.id;
 for(const member of [author,reader])assert.equal((await call('team/join',{code:invite},member)).status,200);
 const name='讲义.pdf',text='示例提取文字';
 const report={topic:name,summary:'已有教研分析',strengths:[],risks:[],nextSteps:[]};
 const shared=await (await call('team/document',{id,name,text,report},author)).json();
 const legacy=shared.team.documents[0];
 const bytes=Buffer.from('%PDF-1.4\nShared original\n%%EOF\n');
 const original={id:'b'.repeat(32),name,size:bytes.length};
 const attachment={id,documentId:legacy.id,original};
 const url='team/document/file?team='+id+'&document='+legacy.id+'&view=';
 assert.equal((await call(url+'download',undefined,reader)).status,404);
 assert.equal((await call('team/document/attach',attachment,reader)).status,403);
 assert.equal((await call('team/document/attach',{...attachment,original:{...original,name:'其他.pdf'}},owner)).status,400);
 assert.equal((await call('team/document/attach',attachment,owner)).status,409);
 assert.equal((await call('team/document/chunk',{id,original,index:0,data:bytes.toString('base64')},owner)).status,200);
 const updated=await call('team/document/attach',attachment,owner);
 assert.equal(updated.status,200);
 const record=(await updated.json()).team.documents[0];
 assert.deepEqual({...record,original:null},legacy);
 assert.equal(record.original.uploadedBy,team.owner);
 assert.equal((await call('team/document/attach',attachment,owner)).status,200);
 assert.equal((await call('team/document/abort',{id,original},owner)).status,200);
 assert.equal((await call('team/document/attach',{...attachment,original:{...original,id:'c'.repeat(32)}},author)).status,409);
 const preview=await call(url+'preview',undefined,reader);
 assert.equal(preview.status,200);
 assert.equal(preview.headers.get('content-type'),'application/pdf');
 assert.match(preview.headers.get('content-disposition'),/^inline;/);
 assert.deepEqual(Buffer.from(await preview.arrayBuffer()),bytes);
 assert.equal((await call('team/document/remove',{id,documentId:legacy.id},author)).status,200);
 assert.equal([...store.data.keys()].filter(key=>key.startsWith('team-originals/')).length,0);
});
