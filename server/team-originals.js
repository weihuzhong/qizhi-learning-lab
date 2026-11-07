const chunkBytes=900000;
const maxBytes=30*1024*1024;
const idPattern=/^[a-f0-9]{32}$/;
const allowed=/\.(?:docx?|pptx?|xlsx?|csv|txt|md|pdf|png|jpe?g)$/i;
const previewTypes={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};

export function originalInfo(value){
 const id=value?.id,name=typeof value?.name==='string'?value.name.trim().split(/[\\/]/).pop():'',size=value?.size;
 if(!idPattern.test(id||'')||!allowed.test(name)||name.length>200||/[\x00-\x1f\x7f]/.test(name)||
    !Number.isSafeInteger(size)||size<1||size>maxBytes)fail('原文件格式无效或超过30 MB');
 return {id,name,size,chunks:Math.ceil(size/chunkBytes)};
}

const key=(team,author,id,index)=>'team-originals/'+team+'/'+author+'/'+id+'/'+index;
const indices=file=>Array.from({length:file.chunks},(_,index)=>index);
export const originalUploader=item=>item.original?.uploadedBy||item.authorId;

export function createTeamOriginals(store){
 async function put(team,author,body){
  const file=originalInfo(body.original),i=body.index;
  if(!Number.isInteger(i)||i<0||i>=file.chunks||typeof body.data!=='string'||body.data.length>1200000||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(body.data))fail('文件分段无效');
  const bytes=Buffer.from(body.data,'base64'),expected=Math.min(chunkBytes,file.size-i*chunkBytes);
  if(bytes.length!==expected)fail('文件分段不完整，请重新上传');
  await store.set(key(team,author,file.id,i),Uint8Array.from(bytes).buffer,{onlyIfNew:true,metadata:{size:file.size}});
 }
 async function complete(team,author,value){
  const file=originalInfo(value);
  const meta=await Promise.all(indices(file).map(i=>store.getMetadata(key(team,author,file.id,i))));
  if(meta.some(part=>part?.metadata?.size!==file.size))fail('原文件未上传完整，请重试',409);
  return file;
 }
 async function readPart(team,item,index){
  const file=item.original;
  if(!file||!Number.isInteger(index)||index<0||index>=file.chunks)fail('找不到原文件分段',404);
  const bytes=await store.get(key(team,originalUploader(item),file.id,index),{type:'arrayBuffer'});
  if(!bytes||bytes.byteLength!==Math.min(chunkBytes,file.size-index*chunkBytes))fail('原文件分段缺失，请联系分享者重新上传',410);
  return bytes;
 }
 async function read(team,item,index){
  return new Response(await readPart(team,item,index),{headers:{'content-type':'application/octet-stream','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }
 async function open(team,item,view){
  const file=item.original;
  if(!file)fail('这条记录未保存原件，请联系上传者或组长补传',404);
  const preview=view==='preview';
  const type=preview?previewTypes[file.name.split('.').at(-1).toLowerCase()]:'application/octet-stream';
  if(!type)fail('此格式请下载原件后打开',415);
  const first=await readPart(team,item,0);
  let index=1;
  const stream=new ReadableStream({
   start(controller){
    controller.enqueue(new Uint8Array(first));
    if(index===file.chunks)controller.close();
   },
   async pull(controller){
    controller.enqueue(new Uint8Array(await readPart(team,item,index++)));
    if(index===file.chunks)controller.close();
   },
  });
  const filename=encodeURIComponent(file.name.toWellFormed()).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16));
  return new Response(stream,{headers:{
   'content-type':type,'content-length':String(file.size),'cache-control':'private, no-store',
   'x-content-type-options':'nosniff','content-disposition':(preview?'inline':'attachment')+"; filename*=UTF-8''"+filename,
  }});
 }
 async function remove(team,author,file){
  if(file)await Promise.allSettled(indices(file).map(i=>store.delete(key(team,author,file.id,i))));
 }
 return {put,complete,read,open,remove};
}
