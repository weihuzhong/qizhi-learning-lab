import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const table='qizhi_records';
const bucket='qizhi-private-files';
export const migrationKey='system/netlify-migration-v1';

export function isFileKey(namespace,key){
 return namespace==='cloud'?key.startsWith('team-originals/'):key.startsWith('files/');
}

function storageFailure(cause){
 return Object.assign(Error('云端存储暂不可用，请稍后重试',{cause}),{status:503});
}

function checked({data,error}){
 if(error)throw storageFailure(error);
 return data;
}

function missing(error){
 return Number(error?.status??error?.statusCode)===404;
}

export function createSupabaseStores({SUPABASE_URL:url,SUPABASE_SECRET_KEY:secret},fetcher=fetch){
 if(!url||!secret||!secret.startsWith('sb_secret_'))throw Error('需要配置 Supabase 项目网址和服务端密钥');
 const endpoint=new URL(url);
 if(endpoint.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(endpoint.hostname)||endpoint.origin!==url.replace(/\/$/,'')){
  throw Error('Supabase 项目网址无效');
 }
 const client=createClient(endpoint.origin,secret,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch:(input,options)=>fetcher(input,{...options,redirect:'error',signal:AbortSignal.timeout(30000)})},
 });
 const files=client.storage.from(bucket);
 function createStore(namespace){
  const isFile=key=>isFileKey(namespace,key);
  const filePath=key=>namespace+'/'+key;
  const byKey=(query,key)=>query.eq('namespace',namespace).eq('key',key);
  const select=(columns,key)=>byKey(client.from(table).select(columns),key).maybeSingle();
  async function getMetadata(key){
   if(!isFile(key))return checked(await select('etag,metadata',key));
   const result=await files.info(filePath(key));
   if(missing(result.error))return null;
   const data=checked(result);
   const encoded=data.userMetadata?.qizhiMetadata??data.metadata?.qizhiMetadata;
   return {etag:data.etag,metadata:encoded?JSON.parse(encoded):{}};
  }
  async function* listKeys(){
   const limit=100;
   let after;
   while(true){
    let query=client.from(table).select('key').eq('namespace',namespace).order('key').limit(limit);
    if(after!==undefined)query=query.gt('key',after);
    const rows=checked(await query);
    for(const row of rows)yield row.key;
    if(rows.length<limit)break;
    after=rows.at(-1).key;
   }
   async function* listFiles(folder){
    for(let offset=0;;offset+=limit){
     const entries=checked(await files.list(folder,{limit,offset,sortBy:{column:'name',order:'asc'}}));
     for(const entry of entries){
      const path=folder+'/'+entry.name;
      if(entry.id)yield path.slice(namespace.length+1);
      else yield* listFiles(path);
     }
     if(entries.length<limit)break;
    }
   }
   yield* listFiles(namespace);
  }
  return {
   listKeys,
   async get(key,{type='json'}={}){
    if(!isFile(key))return checked(await select('data',key))?.data??null;
    if(type!=='arrayBuffer')throw Error('原件须按二进制读取');
    const result=await files.download(filePath(key));
    if(missing(result.error))return null;
    return (await checked(result).arrayBuffer());
   },
   async getWithMetadata(key){
    if(isFile(key))throw Error('文件数据须分开读取');
    return checked(await select('data,etag,metadata',key));
   },
   getMetadata,
   async setJSON(key,data,{metadata={},onlyIfMatch,onlyIfNew=false}={}){
    if(isFile(key))throw Error('原件须按二进制写入');
    const value={data,metadata,etag:randomUUID()};
    const request=onlyIfMatch
     ?byKey(client.from(table).update(value),key).eq('etag',onlyIfMatch)
     :client.from(table).upsert({namespace,key,...value},{onConflict:'namespace,key',ignoreDuplicates:onlyIfNew});
    const rows=checked(await request.select('etag'));
    return {modified:rows.length===1,etag:rows[0]?.etag};
   },
   async set(key,bytes,{metadata={},onlyIfNew=false,onlyIfMatch}={}){
    if(!isFile(key)||onlyIfMatch)throw Error('文件不支持此写入条件');
    const result=await files.upload(filePath(key),bytes,{
     upsert:!onlyIfNew,contentType:'application/octet-stream',cacheControl:'0',metadata:{qizhiMetadata:JSON.stringify(metadata)},
    });
    if(onlyIfNew&&(Number(result.error?.status??result.error?.statusCode)===409||result.error?.error==='Duplicate'))return {modified:false};
    checked(result);
    return {modified:true};
   },
   async delete(key){
    if(isFile(key))checked(await files.remove([filePath(key)]));
    else checked(await byKey(client.from(table).delete(),key));
   },
  };
 }
 return {cloudStore:createStore('cloud'),pptStore:createStore('ppt')};
}
