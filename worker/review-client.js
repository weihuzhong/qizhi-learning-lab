import {extractTeachingFiles} from './document-review.js';
export const reviewClient='\n'+extractTeachingFiles.toString()+String.raw`
const documentTypes='.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.pdf,.png,.jpg,.jpeg,.zip';
const originalChunkBytes=900000;
S().documents ||= [];
let documentErrors=[],reviewBusy=false,documentIndex=0,documentDb;

function originalTransaction(mode,operation){
 documentDb ||= new Promise((resolve,reject)=>{
  const request=indexedDB.open('qizhi-teaching-originals',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('files');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
 return documentDb.then(db=>new Promise((resolve,reject)=>{
  const tx=db.transaction('files',mode),request=operation(tx.objectStore('files'));
  tx.oncomplete=()=>resolve(request.result);
  tx.onabort=tx.onerror=()=>reject(tx.error||Error('无法访问本机文件存储'));
 }));
}

function chunkBase64(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result).split(',')[1]);
  reader.onerror=()=>reject(Error('读取原文件失败'));
  reader.readAsDataURL(blob);
 });
}
async function shareDocument(id,document,file){
 const body={id,name:document.name,text:document.text,report:document.report||null};
 if(!file)return (await api('cloud/team/document',body)).team;
 const original={id:crypto.randomUUID().replaceAll('-',''),name:file.name||document.name,size:file.size};
 try{
  for(let index=0;index*originalChunkBytes<file.size;index++){
   const start=index*originalChunkBytes,data=await chunkBase64(file.slice(start,start+originalChunkBytes));
   await api('cloud/team/document/chunk',{id,original,index,data});
  }
  return (await api('cloud/team/document',{...body,original})).team;
 }catch(error){
  // A completed publication is kept even if its HTTP response was lost.
  await api('cloud/team/document/abort',{id,original}).catch(()=>{});
  throw error;
 }
}
async function sharedOriginal(team,document){
 const file=document.original;
 if(!file)throw Error('这条旧记录只保存了提取文字，请让上传者重新共享原文件');
 const parts=[];
 for(let index=0;index<file.chunks;index++){
  const query=new URLSearchParams({team,document:document.id,index});
  const response=await fetch('/api/cloud/team/document/file?'+query,{signal:AbortSignal.timeout(30000)});
  if(!response.ok){
   const data=await response.json().catch(()=>null);
   throw Error(data?.error||'原文件暂时无法下载（'+response.status+'）');
  }
  if(!response.headers.get('content-type')?.startsWith('application/octet-stream'))throw Error('服务器没有返回原文件');
  parts.push(await response.blob());
 }
 const result=new File(parts,file.name);
 if(result.size!==file.size)throw Error('下载不完整，请重试');
 return result;
}
async function saveLocalDocument(document,file){
 if(S().documents.length>=60)throw Error('本机最多保存60份文档，请先删除不需要的文件');
 const item={name:document.name,text:document.text,report:document.report||null,truncated:!!document.truncated};
 if(file){
  item.fileId=crypto.randomUUID();
  await originalTransaction('readwrite',store=>store.put(file,item.fileId));
 }
 S().documents.push(item);
 try{saveTeaching();}
 catch(error){
  S().documents.pop();
  if(item.fileId)await originalTransaction('readwrite',store=>store.delete(item.fileId)).catch(()=>{});
  throw Error('本机存储空间不足，请先删除旧文档');
 }
 documentIndex=S().documents.length-1;
}
function reportMarkup(r){
 if(!r)return '<p class="s2-muted">尚无教研分析。</p>';
 return '<h3>'+esc(r.topic)+'</h3><p>'+esc(r.summary)+'</p><h4>有依据的设计优点</h4>'+
 r.strengths.map(x=>'<p><strong>'+esc(x.point)+'</strong><br><q>'+esc(x.evidence)+'</q></p>').join('')+
 '<h4>可改进之处</h4>'+r.risks.map(x=>'<p><strong>'+esc(x.point)+'</strong><br><q>'+esc(x.evidence)+'</q><br>建议：'+esc(x.suggestion)+'</p>').join('')+
 '<h4>还需核对</h4><ul>'+r.nextSteps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
}
function extractedText(d){
 return d.text?'<details><summary>查看提取文字（'+d.text.length+'字）</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:350px;overflow:auto;font:inherit">'+esc(d.text)+'</pre></details>':
 '<p class="s2-muted">此文件没有可提取的正文，可下载原件查看。</p>';
}
function reviewDesk(){
 const d=S().documents[documentIndex];
 return head('文档导入与教研','上传教师自备的 Word、PPT 或表格，查看提取文字、做教研分析，或把原文件分享给组员。')+
 '<section class="s2-card"><label for="documentFiles">选择文件或 ZIP（最多20份，单文件30 MB，每批60 MB）</label><input type="file" id="documentFiles" accept="'+documentTypes+'" multiple>'+
 '<p class="s2-muted">原文件保存在当前浏览器。模型分析只使用提取的文字。扫描件、图片和旧版 Office 文件可保存与分享原件。</p>'+
 documentErrors.map(e=>'<p class="s2-error">'+esc(e)+'</p>').join('')+'</section>'+
 '<div class="s2-grid"><section class="s2-card"><h3>本机文档 · '+S().documents.length+'</h3>'+
 S().documents.map((x,i)=>'<div class="s2-memory"><span>'+esc(x.name)+'<br><small>'+x.text.length+'字 · '+(x.report?'已分析':'待分析')+'</small></span>'+
 '<div class="s2-toolbar"><button class="btn small" data-document="'+i+'">查看</button><button class="btn small" data-document-delete="'+i+'" '+(reviewBusy?'disabled':'')+'>删除</button></div></div>').join('')+
 '</section><section class="s2-card s2-discussion">'+(d?'<h3>'+esc(d.name)+'</h3>'+extractedText(d)+
 (d.truncated?'<p class="s2-muted">分析使用前 18,000 字，原文件完整保留。</p>':'')+
 '<div class="s2-toolbar"><button class="btn primary" id="analyzeDocument" '+(reviewBusy||!d.text?'disabled':'')+'>'+(reviewBusy?'正在处理…':d.report?'重新分析':'梳理主题与评议教案')+'</button>'+
 (d.fileId?'<button class="btn" id="downloadDocumentOriginal">下载原文件</button>':'')+
 (d.text?'<button class="btn" id="downloadReport">下载文字与分析</button>':'')+'</div>'+
 (d.error?'<p class="s2-error">'+esc(d.error)+'</p>':'')+(d.report?reportMarkup(d.report):'')+
 (cloud.teams.length?'<div class="s2-toolbar"><select class="input" id="documentTeam" aria-label="目标教研组">'+
 cloud.teams.map(w=>'<option value="'+w.id+'">'+esc(w.name)+'</option>').join('')+
 '</select><button class="btn" id="publishDocument" '+(reviewBusy?'disabled':'')+'>分享给教研组</button></div>':''):'<div class="s2-empty">先导入一份教师现有文档。</div>')+
 '</section></div>';
}
function reviewText(d){
 const r=d.report;
 return [d.name,'提取文字',d.text,...(r?[r.topic,r.summary,'优点',...r.strengths.map(x=>x.point+'\n引文：'+x.evidence),
  '改进',...r.risks.map(x=>x.point+'\n引文：'+x.evidence+'\n建议：'+x.suggestion),'下一步',...r.nextSteps]:[])].join('\n\n');
}
const docNav=nav;nav=function(){
 docNav();
 const b=document.createElement('button');
 b.className='nav '+(active==='review'?'active':'');
 b.innerHTML=uiIcon('book')+'<span>文档导入与教研</span>';
 b.onclick=()=>go('review');
 $('navigation').insertBefore(b,$('navigation').querySelector('.nav-more'));
 if(active==='review')$('crumb').textContent='文档导入与教研';
};
const docRender=render;render=function(){
 if(active==='review'){
  $('content').innerHTML=reviewDesk();
  const input=$('documentFiles');
  input.disabled=reviewBusy;
  input.onchange=async e=>{
   const files=e.target.files;
   if(!files?.length||reviewBusy)return;
   reviewBusy=true;input.disabled=true;documentErrors=[];
   try{
    const result=await extractTeachingFiles(files,window.fflate?.unzipSync,{keepOriginals:true});
    documentErrors=result.errors;
    for(const d of result.results){
     try{await saveLocalDocument(d,d.original);}
     catch(error){documentErrors.push(d.name+'：'+error.message);}
    }
   }catch(error){documentErrors.push(error.message);}
   finally{reviewBusy=false;if(active==='review')render();}
  };
  document.querySelectorAll('[data-document]').forEach(b=>b.onclick=()=>{documentIndex=Number(b.dataset.document);render();});
  document.querySelectorAll('[data-document-delete]').forEach(b=>b.onclick=async()=>{
   if(reviewBusy)return;
   const i=Number(b.dataset.documentDelete),d=S().documents[i];
   if(!d||!confirm('删除本机文档「'+d.name+'」？'))return;
   S().documents.splice(i,1);
   documentIndex=Math.max(0,Math.min(documentIndex-(i<documentIndex?1:0),S().documents.length-1));
   saveTeaching();render();
   if(d.fileId)await originalTransaction('readwrite',store=>store.delete(d.fileId)).catch(()=>{});
  });
  bindId('analyzeDocument',async()=>{
   const d=S().documents[documentIndex];
   if(reviewBusy||!d?.text)return;
   reviewBusy=true;d.error='';render();
   try{
    d.report=(await api('lesson/review',{brief:{topic:d.name.slice(0,160),subject:'待教师核对',grade:'待教师核对',minutes:40,prior:'文档中未明确的信息需核对',learners:'待教师确认',resources:'以原文为准，缺失条件须补充'},documentText:d.text})).result;
    saveTeaching();
   }catch(e){d.error=e.message;}
   finally{reviewBusy=false;if(active==='review')render();}
  });
  bindId('downloadDocumentOriginal',async()=>{
   const d=S().documents[documentIndex];
   try{
    const file=await originalTransaction('readonly',store=>store.get(d.fileId));
    if(!file)throw Error('本机原文件已清理，请重新导入');
    exportBlob(file,file.name||d.name);
   }catch(e){toast(e.message);}
  });
  bindId('downloadReport',()=>{
   const d=S().documents[documentIndex];
   exportBlob(new Blob([reviewText(d)],{type:'text/plain;charset=utf-8'}),safeName(d.name)+'_教研分析.txt');
  });
  bindId('publishDocument',async()=>{
   if(reviewBusy)return;
   const id=$('documentTeam').value,d=S().documents[documentIndex];
   if(!cloud.user||!id)return toast('请先登录并加入教研组');
   reviewBusy=true;render();
   try{
    const file=d.fileId?await originalTransaction('readonly',store=>store.get(d.fileId)):null;
    if(d.fileId&&!file)throw Error('本机原文件已清理，请重新导入');
    const team=await shareDocument(id,d,file);
    if(cloud.team?.id===id)cloud.team=team;
    toast('已分享到所选教研组');
   }catch(e){toast(e.message);}
   finally{reviewBusy=false;if(active==='review')render();}
  });
  return;
 }
 docRender();
 if(active!=='online'||!cloud.team)return;
 const team=cloud.team,canRemove=d=>team.owner===cloud.user.id||d.authorId===cloud.user.id;
 const section=document.createElement('section');
 section.className='s2-card';
 section.innerHTML='<h3>共享文档与教研分析 · '+(team.documents||[]).length+'</h3>'+
 (team.documents||[]).map(d=>'<details class="s2-file-row"><summary>'+esc(d.name)+' · '+esc(d.author)+'</summary>'+
 extractedText(d)+reportMarkup(d.report)+'<div class="s2-toolbar">'+
 (d.original?'<button class="btn small" data-shared-file="'+d.id+'">下载原文件</button>':
 '<small class="s2-muted">旧记录仅保存了提取文字。</small>')+
 '<button class="btn small" data-copy-review="'+d.id+'">导入到文档教研</button>'+
 (canRemove(d)?'<button class="btn small" data-remove-document="'+d.id+'">删除共享文件</button>':'')+
 '</div></details>').join('')+
 '<div class="s2-toolbar"><button class="btn" id="openDocumentDesk">导入教师现有文档</button></div>';
 $('content').appendChild(section);
 bindId('openDocumentDesk',()=>{go('review');$('documentFiles')?.click();});
 section.querySelectorAll('button[data-shared-file],button[data-copy-review]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.sharedFile||b.dataset.copyReview,d=team.documents.find(x=>x.id===id);
  b.disabled=true;
  try{
   const file=d.original?await sharedOriginal(team.id,d):null;
   if(b.dataset.sharedFile)exportBlob(file,file.name);
   else{await saveLocalDocument(d,file);go('review');toast('已导入到文档教研');}
  }catch(e){toast(e.message);}
  finally{b.disabled=false;}
 });
 section.querySelectorAll('[data-remove-document]').forEach(b=>b.onclick=()=>{
  const d=team.documents.find(x=>x.id===b.dataset.removeDocument);
  if(cloud.busy||!confirm('从教研组删除「'+d.name+'」？'))return;
  cloudAction(async()=>{cloud.team=(await api('cloud/team/document/remove',{id:team.id,documentId:d.id})).team;});
 });
 if(cloud.busy)section.querySelectorAll('button').forEach(b=>b.disabled=true);
};
`;
