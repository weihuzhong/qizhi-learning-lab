export const pptOnlineClient=String.raw`
let pptServiceConfig=null,pptSubmitting=false,pptOnlineError='',pptPollTimer=null,pptPolling=false,pptAccessLost='';
let pptPreview=null,pptPreviewBackup='';
const pptPhases={queued:'等待后台接单',running:'制作中',preparing:'加载PPTMaster',designing:'设计页面',checking:'整稿检查',exporting:'导出PPTX',rendering:'渲染预览',complete:'整稿完成',draft:'待复核初稿',failed:'制作未完成',cancelled:'已停止'};
function onlinePptScope(){return lessonScope(T().lessonBrief||T().brief);}
function onlinePptJob(){
 const {job,scope}=T().pptOnline||{},lesson=lessonForBrief();
 return job&&lesson&&job.title===lesson.title&&(!scope||scope===onlinePptScope())?job:null;
}
function onlinePptFile(id,name,delivery=onlinePptJob()?.result?.delivery){
 const prefix=delivery==='temporary'&&!id.startsWith('r-')?'/api/ppt/drafts/':'/api/ppt/jobs/';
 return prefix+encodeURIComponent(id)+(prefix.endsWith('jobs/')?'/file/':'/')+encodeURIComponent(name);
}
function pptPreviewBackupUrl(job,owner,url){
 const expires=Number(job.result.expiresAt)||Number(job.updatedAt)+86400000;
 if(job.result.delivery!=='temporary'||!owner||!Number.isFinite(expires)||expires<=Date.now())return '';
 const key=new URL(url,location.origin);
 key.searchParams.set('owner',owner);
 key.searchParams.set('expires',expires);
 return key.href;
}
async function pptPreviewCache(){
 try{return await globalThis.caches?.open('qizhi-ppt-preview-v1');}
 catch{return null;}
}
async function readPptPreview(job,file,owner,signal){
 const url=onlinePptFile(job.id,file,job.result.delivery);
 const key=pptPreviewBackupUrl(job,owner,url);
 const cache=key?await pptPreviewCache():null;
 const backup=await cache?.match(key).catch(()=>null);
 if(backup)return {file:await backup.blob(),cache,key};
 const response=await fetch(url,{signal});
 if(!response.ok)throw Object.assign(Error(),{status:response.status});
 const image=await response.blob();
 if(image.type!=='image/png'||!image.size)throw Error('服务器没有返回有效的预览图。');
 if(cache)void cache.put(key,new Response(image)).catch(()=>{});
 return {file:image,cache,key};
}
async function backupPptPreviews(job,first,owner,cache){
 const jobKey=owner+':'+job.id;
 if(!cache||pptPreviewBackup===jobKey)return;
 pptPreviewBackup=jobKey;
 try{
  const keys=await cache.keys();
  await Promise.all(keys.filter(key=>Number(new URL(key.url).searchParams.get('expires'))<=Date.now())
   .map(key=>cache.delete(key)));
 }catch{}
 for(const page of job.result.pages||[]){
  if(cloud.user?.id!==owner||onlinePptJob()?.id!==job.id)return;
  if(!page.preview||page.preview===first)continue;
  try{await readPptPreview(job,page.preview,owner,AbortSignal.timeout(30000));}
  catch{if(pptPreviewBackup===jobKey)pptPreviewBackup='';return;}
 }
}
function pptPreviewError(error){
 if(error.status===401||error.status===403)return '请在创建课件的浏览器中用原账号登录，再重试预览。';
 if(error.status===404||error.status===410)return '原预览图已过期或丢失。可以先试着下载 PPTX；如果原文件也已失效，请用保留的教案重新制作。';
 if(error.name==='TimeoutError')return '后台响应超时，请重试预览。';
 return '暂时读不到预览图，请重试，或下载 PPTX 查看。';
}
function paintPptPreview(){
 const panel=$('pptPreviewPanel'),preview=pptPreview;
 if(!panel||!preview)return;
 if(preview.src){
  const image=document.createElement('img');
  image.className='pm-online-preview';
  image.alt='第'+preview.number+'页完整设计预览';
  image.onerror=()=>{
   if(pptPreview!==preview||$('pptPreviewPanel')!==panel)return;
   const {cache,key}=preview;
   if(cache)void cache.delete(key).catch(()=>{});
   preview.src='';
   preview.error='此页图片无法显示。请重试预览，或下载 PPTX 查看。';
   paintPptPreview();
  };
  image.src=preview.src;
  panel.replaceChildren(image);
 }else if(preview.error){
  panel.innerHTML='<div class="s2-warn" role="status">'+esc(preview.error)+
   ' <button type="button" class="btn small" id="pptRetryPreview">重试预览</button></div>';
  bindId('pptRetryPreview',()=>refreshPptPreview(true));
 }else{
  panel.innerHTML='<p class="s2-muted" role="status">正在加载第 '+preview.number+' 页预览…</p>';
 }
}
function refreshPptPreview(retry=false){
 const panel=$('pptPreviewPanel'),job=onlinePptJob();
 if(!panel||!job){pptPreview?.controller.abort();pptPreview=null;return;}
 const owner=cloud.user?.id||'',file=panel.dataset.previewFile;
 if(retry||pptPreview?.jobId!==job.id||pptPreview.file!==file||pptPreview.owner!==owner){
  pptPreview?.controller.abort();
  const preview={jobId:job.id,file,owner,number:Number(panel.dataset.previewNumber),controller:new AbortController()};
  pptPreview=preview;
  void (async()=>{
   try{
    const signal=AbortSignal.any([preview.controller.signal,AbortSignal.timeout(65000)]);
    const image=await readPptPreview(job,file,owner,signal);
    preview.cache=image.cache;preview.key=image.key;
    preview.src=await new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(reader.result);
     reader.onerror=reject;
     reader.readAsDataURL(image.file);
    });
    if(pptPreview===preview)void backupPptPreviews(job,file,owner,image.cache);
   }catch(error){preview.error=pptPreviewError(error||{});}
   if(pptPreview===preview)paintPptPreview();
  })();
 }
 paintPptPreview();
}
function pptReviewHtml(job){
 if(job.status!=='draft')return '';
 const review=job.result?.review;
 const issues=review?.issues||[];
 if(!issues.length)return '<section class="notice" role="status"><strong>内容复核暂未完成</strong><p>可先下载可编辑初稿，请对照教案核对教学步骤、时间分配和实验条件后再使用。</p></section>';
 const ordered=issues.slice().sort((a,b)=>a.slide-b.slide);
 return '<section class="notice pm-draft-review"><strong>逐页复核建议</strong><p>以下是待核对的疑点。请对照原教案确认后，在 PowerPoint 中修改。</p><ol>'+ordered.map(issue=>'<li><button class="btn small" type="button" data-ppt-online-page="'+(Number(issue.slide)-1)+'">查看第 '+esc(issue.slide)+' 页</button><p><strong>待核对</strong> '+esc(issue.reason)+'</p><p><strong>怎么改</strong> '+esc(issue.correction)+'</p></li>').join('')+'</ol></section>';
}
const pptAudienceOptions=[['auto','按教案年级自动匹配'],['young','幼儿园与小学低年级 · 大字和插画'],['primary','小学中高年级 · 插图与活动'],['middle','初中 · 概念与实验图解'],['senior','高中及以上 · 证据与推理']];
slidesHtml=function(){const j=onlinePptJob(),draft=T().pptOnlineDraft?.scope===onlinePptScope()?T().pptOnlineDraft:null,lost=j&&pptAccessLost===j.id,running=j&&!lost&&['queued','running'].includes(j.status),done=['complete','draft'].includes(j?.status),selected=T().pptOnline?.selected||0;const page=j?.result?.pages?.[selected],mode=draft?.mode||(ready?'direct':'basic');return '<section class="s2-card pm-hero"><h3>制作课堂课件</h3><p>用当前教案生成可编辑的 PPTX，包含教师备注。PPTMaster 由网站后台运行。可以用个人 DeepSeek 密钥做 AI 精细设计，也可以直接生成课堂初稿。</p><div class="pm-steps"><div><b>01</b><strong>设置页数与风格</strong><span>选择页数，填写课堂和版式要求</span></div><div><b>02</b><strong>生成整份课件</strong><span>后台逐页设计，完成后提供预览</span></div><div><b>03</b><strong>复核并下载</strong><span>核对课件内容，下载后可继续编辑</span></div></div></section><section class="s2-card pm-online-settings"><h3>课件设置</h3><label for="pptOnlineCount">整稿页数（含封面与结尾）</label><input id="pptOnlineCount" class="input" type="number" min="4" max="20" step="1" value="'+(draft?.count||(j&&T().pptOnline.count)||8)+'" '+(running?'disabled':'')+'><label for="pptOnlineAudience">面向哪一年龄段</label><select id="pptOnlineAudience" class="input" '+(running?'disabled':'')+'>'+pptAudienceOptions.map(([value,label])=>'<option value="'+value+'" '+((draft?.audience||'auto')===value?'selected':'')+'>'+label+'</option>').join('')+'</select><label for="pptOnlineMode">制作方式</label><select id="pptOnlineMode" class="input" '+(running?'disabled':'')+'><option value="basic" '+(mode==='basic'?'selected':'')+'>课堂初稿 · 使用教案与适龄图解</option><option value="direct" '+(mode==='direct'?'selected':'')+'>AI 精细设计 · 使用我的 DeepSeek 额度</option></select><label for="pptOnlineStyle">AI 视觉方向与教学要求</label><textarea id="pptOnlineStyle" class="input" maxlength="1500" '+(running?'disabled':'')+' placeholder="例如：用对照或流程图说明本课关键知识，每页突出一个要点。">'+esc(draft?.style??(j?T().pptOnline.style:undefined)??'围绕本课目标组织内容，选用贴合课题的例子、活动与版式。文字简洁，关键内容清晰。')+'</textarea><div class="s2-toolbar"><button class="btn primary" id="pptOnlineCreate" '+(running||pptSubmitting||!pptServiceConfig?.connected?'disabled':'')+'>'+(pptSubmitting?'正在提交…':'直接生成整份 PPT')+'</button>'+(running?'<button class="btn" id="pptOnlineCancel">停止这次制作</button>':'')+'</div><p class="s2-muted">提交后由后台制作，通常需要数分钟。刷新页面后可继续查看进度。</p>'+(!pptServiceConfig||pptServiceConfig.loading?'<div class="notice" role="status">正在检查后台执行服务…</div>':!pptServiceConfig.connected?'<div class="s2-warn" role="alert">'+esc(pptServiceConfig.message||'后台执行服务暂时无法连接。')+' <button class="btn small" id="pptRetryConfig">重新连接</button></div>':'')+(!ready?'<div class="s2-warn">课堂初稿登录后即可使用。AI 精细设计需绑定个人 DeepSeek 密钥。<button class="btn" id="pptBillingAccount">前往登录与绑定</button></div>':'')+(pptOnlineError?'<div class="s2-warn" role="alert">'+esc(pptOnlineError)+(lost?'<div class="s2-toolbar"><button class="btn" id="pptDiscardUnavailable">关闭旧任务记录</button></div>':'')+'</div>':'')+'</section>'+(j?'<section class="s2-card pm-online-result"><span class="tag">'+esc(pptPhases[j.status]||j.status)+'</span><h3>'+esc(j.title)+'</h3><div class="s2-profile-status" role="status">'+esc(lost?'无法读取此任务状态':j.status==='queued'?'已提交，后台正在启动或等待空闲':j.error||j.progress?.message||'后台正在处理')+'</div><p class="s2-muted">'+Math.min(j.count,j.progress?.pages||0)+' / '+j.count+' 页 · '+esc(pptPhases[j.progress?.phase]||pptPhases[j.status])+'</p>'+(done?'<div class="s2-toolbar"><a class="btn primary" href="'+onlinePptFile(j.id,'deck.pptx')+'" download>'+(j.status==='draft'?'下载可编辑初稿':'下载完整可编辑 PPTX')+'（'+j.result.actualCount+'页）</a><a class="btn" href="'+onlinePptFile(j.id,'audit.json')+'" download>查看制作检查记录</a></div>'+(j.result.summary?'<p>'+esc(j.result.summary)+'</p>':'')+pptReviewHtml(j)+'<div class="slidethumbs">'+j.result.pages.map((p,i)=>'<button data-ppt-online-page="'+i+'" class="'+(selected===i?'active':'')+'">'+(i+1)+' '+esc(p.title)+'</button>').join('')+'</div>'+(page?.preview?'<div id="pptPreviewPanel" data-preview-file="'+esc(page.preview)+'" data-preview-number="'+(selected+1)+'"></div>':'<p class="s2-muted">这一页没有可用的预览图，可下载 PPTX 查看。</p>')+'<p class="s2-muted">预览来自PPTMaster用于导出的同一份SVG设计稿。请教师核对本课内容、课堂活动与最终PowerPoint显示效果。'+(j.result.delivery==='temporary'?'初稿暂存在后台，最长保留24小时，后台重启可能提前清除，请及时下载。':'文件在当前浏览器可访问7天，请及时下载。')+'</p>':'')+'</section>':'');};
exportPpt=async function(styleKey){
 if(styleKey&&styles[styleKey]){
  const scope=onlinePptScope(),theme=styles[styleKey];
  const draft=T().pptOnlineDraft?.scope===scope?T().pptOnlineDraft:{scope};
  T().pptOnlineDraft={...draft,style:theme.name+'。'+theme.description};
  T().style=styleKey;saveTeaching();
 }
 prepTab='slides';go('prep');
 if(!lessonForBrief())toast('先生成或载入教案，再制作这节课的 PPT');
};
async function pollOnlinePpt(id){
 if(pptPolling||pptAccessLost===id)return;
 if(pptPollTimer)clearTimeout(pptPollTimer);
 pptPollTimer=null;
 pptPolling=true;
 try{
  const {job}=await api('ppt/jobs/'+id);
  if(onlinePptJob()?.id!==id)return;
  T().pptOnline.job=job;
  pptOnlineError='';
  saveTeaching();
  if(active==='prep'&&prepTab==='slides')render();
  if(!['queued','running'].includes(job.status))return;
  if(job.status==='queued'&&Date.now()-(T().pptOnline.lastWake||0)>32000){
   T().pptOnline.lastWake=Date.now();
   api('ppt/jobs/'+id+'/wake',{}).catch(()=>{});
  }
  pptPollTimer=setTimeout(()=>pollOnlinePpt(id),job.status==='queued'?3000:4500);
 }catch(error){
  if(onlinePptJob()?.id!==id)return;
  pptOnlineError=error.message;
  if(error.status===403||error.status===404){
   pptAccessLost=id;
   pptOnlineError='无法读取旧任务。若它是在修复前提交，请关闭旧记录后重新提交；原教案仍然保留。';
  }else if(error.status!==401){
   pptPollTimer=setTimeout(()=>pollOnlinePpt(id),10000);
  }
  if(active==='prep'&&prepTab==='slides')render();
 }finally{pptPolling=false;}
}

const pptOnlineRender=render;render=function(){pptOnlineRender();refreshPptPreview();if(active!=='prep'||prepTab!=='slides')return;if(pptServiceConfig===null){pptServiceConfig={loading:true};api('ppt/config').then(x=>{pptServiceConfig=x;render();}).catch(e=>{pptServiceConfig={connected:false,message:e.message};render();});}for(const [id,key]of [['pptOnlineCount','count'],['pptOnlineStyle','style'],['pptOnlineAudience','audience'],['pptOnlineMode','mode']]){const field=$(id);if(field)field.oninput=()=>{const scope=onlinePptScope();if(T().pptOnlineDraft?.scope!==scope)T().pptOnlineDraft={scope};T().pptOnlineDraft[key]=field.value;saveTeaching();};}bindId('pptBillingAccount',()=>go('account'));bindId('pptRetryConfig',()=>{pptServiceConfig=null;render();});bindId('pptDiscardUnavailable',()=>{T().pptOnline.job=null;pptAccessLost='';pptOnlineError='';saveTeaching();render();});bindId('pptOnlineCreate',async()=>{if(pptSubmitting)return;const mode=$('pptOnlineMode').value;if(!cloud.user||(mode==='direct'&&!ready)){go('account');return toast(mode==='direct'?'请登录并绑定自己的 DeepSeek 密钥':'请先登录后制作课件');}try{const count=Number($('pptOnlineCount').value),style=$('pptOnlineStyle').value.trim();if(!Number.isInteger(count)||count<4||count>20)throw Error('页数须为4至20的整数');const lesson=lessonForBrief();if(!lesson)throw Error('请先生成或载入当前课题的教案');const brief=clone(T().lessonBrief||T().brief),guidedStyle=pptReferenceStyle(style,brief);brief.audience=$('pptOnlineAudience').value;pptSubmitting=true;pptOnlineError='';render();const {job}=await api('ppt/jobs',{lesson:clone(lesson),brief,count,style:guidedStyle,mode});T().pptOnline={count,style,job,scope:lessonScope(brief),selected:0,lastWake:Date.now()};saveTeaching();pollOnlinePpt(job.id);}catch(e){pptOnlineError=e.message;}finally{pptSubmitting=false;render();}});bindId('pptOnlineCancel',async()=>{try{const {job}=await api('ppt/jobs/'+onlinePptJob().id+'/cancel',{});T().pptOnline.job=job;saveTeaching();render();}catch(e){toast(e.message)}});document.querySelectorAll('[data-ppt-online-page]').forEach(el=>el.onclick=()=>{T().pptOnline.selected=Number(el.dataset.pptOnlinePage);saveTeaching();render();});if(onlinePptJob()&&['queued','running'].includes(onlinePptJob().status)&&pptAccessLost!==onlinePptJob().id&&!pptPollTimer&&!pptPolling)pptPollTimer=setTimeout(()=>pollOnlinePpt(onlinePptJob().id),1000);};
`;
export const pptOnlineStyles=String.raw`<style>.pm-online-preview{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;background:#f4f4f6;border-radius:14px;border:1px solid #e2e8f0;margin-top:20px}.pm-hero .pm-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:24px}.pm-hero .pm-steps>div{display:flex;flex-direction:column;gap:8px;padding:18px;background:#ffffffa8;border:1px solid #e2e8f0;border-radius:12px}.pm-steps b{font-size:24px;color:#0f766e}.pm-steps span{font-size:12px;color:#64748b}@media(max-width:700px){.pm-hero .pm-steps{grid-template-columns:1fr}}.pm-draft-review{margin:14px 0}.pm-draft-review ol{padding-left:24px}.pm-draft-review li{margin:14px 0}.pm-draft-review li p{margin:5px 0}</style>`;
