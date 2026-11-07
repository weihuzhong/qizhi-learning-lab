import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {getStore} from '@netlify/blobs';
import {createSupabaseStores,isFileKey,migrationKey} from '../server/supabase-store.js';

const config=[
 {namespace:'cloud',name:'qizhi-studio-v2',target:'cloudStore'},
 {namespace:'ppt',name:'qizhi-pptmaster-v1',target:'pptStore'},
];

async function snapshot(store){
 const records=new Map();
 for await(const {blobs} of store.list({paginate:true})){
  for(const {key,etag} of blobs){
   if(!etag||records.has(key))throw Error('旧存储清单不完整，请重试');
   records.set(key,etag);
  }
 }
 return new Map([...records].sort(([a],[b])=>a.localeCompare(b)));
}

async function migrate(namespace,source,target,records){
 for(const [key,etag] of records){
  const file=isFileKey(namespace,key);
  const previous=await source.getWithMetadata(key,{type:file?'arrayBuffer':'json'});
  if(!previous||previous.etag!==etag)throw Error('读取期间旧数据发生变化，请重新核对');
  if(namespace==='ppt'&&key.startsWith('jobs/')&&
     ['queued','running'].includes(previous.data.status)&&previous.data.expiresAt>Date.now()){
   throw Error('旧站仍有正在排队或生成的 PPT，请待任务结束后迁移');
  }
  const options={onlyIfNew:true,metadata:previous.metadata??{}};
  if(file){
   const bytes=Buffer.from(previous.data);
   await target.set(key,bytes,options);
   const copied=await target.get(key,{type:'arrayBuffer'});
   const current=await target.getMetadata(key);
   if(!copied||!bytes.equals(Buffer.from(copied))||!isDeepStrictEqual(options.metadata,current?.metadata)){
    throw Error('新旧文件校验不一致，停止切换');
   }
  }else{
   await target.setJSON(key,previous.data,options);
   const copied=await target.getWithMetadata(key);
   if(!isDeepStrictEqual(previous.data,copied?.data)||!isDeepStrictEqual(options.metadata,copied?.metadata)){
    throw Error('新旧记录校验不一致，停止切换');
   }
  }
 }
 const actual=new Set();
 for await(const key of target.listKeys())actual.add(key);
 if(!isDeepStrictEqual(actual,new Set(records.keys())))throw Error('新存储存在额外或缺失的记录，停止切换');
}

async function run(){
 const mode=process.argv[2];
 if(!['--inspect','--copy'].includes(mode))throw Error('请指定 --inspect 或 --copy');
 const {NETLIFY_SITE_ID:siteID,NETLIFY_AUTH_TOKEN:token}=process.env;
 if(!siteID||!token)throw Error('请在本机配置 NETLIFY_SITE_ID 和 NETLIFY_AUTH_TOKEN');
 const targets=mode==='--copy'?createSupabaseStores(process.env):null;
 if(targets&&await targets.cloudStore.get(migrationKey))throw Error('此项目已经完成导入核验');
 const stores=[];
 for(const {namespace,name,target} of config){
  const source=getStore({name,siteID,token,consistency:'strong'});
  const records=await snapshot(source);
  const counts=Object.create(null);
  for(const key of records.keys()){
   const prefix=key.split('/')[0];
   counts[prefix]=(counts[prefix]||0)+1;
  }
  console.log(namespace,JSON.stringify(counts));
  stores.push({namespace,source,records,target:targets?.[target]});
 }
 if(!targets)return;
 const digest=createHash('sha256');
 for(const {namespace,source,records,target} of stores)await migrate(namespace,source,target,records);
 for(const {namespace,source,records} of stores){
  if(!isDeepStrictEqual(records,await snapshot(source)))throw Error('迁移期间旧数据发生变化，请核对后再切换');
  digest.update(JSON.stringify([namespace,[...records]]));
 }
 const manifest=digest.digest('hex');
 const {modified}=await targets.cloudStore.setJSON(migrationKey,{verified:true,manifest,verifiedAt:new Date().toISOString()},{onlyIfNew:true});
 if(!modified)throw Error('另一项导入已经完成，请核对迁移状态');
 console.log('导入校验通过',manifest);
}

run().catch(error=>{
 const expected=error.constructor===Error&&error.message.length<=150&&/^[\p{Script=Han}]/u.test(error.message);
 console.error(expected?error.message:'迁移访问失败，请核对项目权限、网络和免费存储额度');
 process.exitCode=1;
});
