export const pptOnlineClient=String.raw`
let pptServiceConfig=null,pptSubmitting=false,pptOnlineError='',pptPollTimer=null,pptPolling=false,pptAccessLost='';
const pptPhases={queued:'等待后台接单',running:'制作中',preparing:'加载PPTMaster',designing:'设计页面',checking:'整稿检查',exporting:'导出PPTX',rendering:'渲染预览',complete:'整稿完成',draft:'待复核初稿',failed:'制作未完成',cancelled:'已停止'};
function onlinePptJob(){return T().pptOnline?.job||null;}
function onlinePptFile(id,name){
 const prefix=onlinePptJob()?.result?.delivery==='temporary'&&!id.startsWith('r-')?'/api/ppt/drafts/':'/api/ppt/jobs/';
 return prefix+encodeURIComponent(id)+(prefix.endsWith('jobs/')?'/file/':'/')+encodeURIComponent(name);
}
const pptStylePresets=[
 ['fresh','清新简约','清新简约的课堂演示，米白与深青色，文字简洁，概念与实验用有意义的图解表达。每页围绕一个核心问题，整稿有变化且风格一致。'],
 ['academic','学术严谨','学术严谨的课堂演示，深蓝与白色，结构分明，突出关键概念、逻辑关系与证据，图表和标题标注清晰。'],
 ['playful','活泼童趣','活泼童趣的课堂演示，暖橙与明亮色块，用简洁插图、提问和活动卡片帮助理解，文字短而清晰。'],
 ['classic','国风雅致','国风雅致的课堂演示，暖米色与朱砂，使用有留白的版式与克制的中式装饰，重点内容用清楚的现代排版。']
];
const pptStageLabels=['等待接单','准备课件','设计页面','检查内容','导出与预览'];
const pptStageIndex={queued:0,preparing:1,designing:2,checking:3,exporting:4,rendering:4};
function pptSectionTitle(id,step,label,aside=''){
 return '<div class="pm-card-head"><h2 id="'+id+'"><span class="pm-step" aria-hidden="true">'+step+'</span>'+label+'</h2>'+aside+'</div>';
}
function pptReviewHtml(job,done){
 const issues=done?job.result?.review?.issues||[]:[];
 const heading=pptSectionTitle('pptReviewHeading','3','复核建议',issues.length?'<span class="pm-badge pm-badge-warn">'+issues.length+' 条待核对</span>':'');
 const intro=!done?'课件生成后，复核结果会显示在这里。':job.status!=='draft'?'整稿已完成。请在授课前核对课件内容和实际显示效果。':!issues.length?'内容复核暂未完成。请对照教案核对教学步骤、时间分配和实验条件。':'请对照原教案确认疑点，并在 PowerPoint 或 WPS 中修改。';
 return '<section class="pm-card" aria-labelledby="pptReviewHeading">'+heading+'<p class="pm-note">'+intro+'</p>'+
  (issues.length?'<ol class="pm-review">'+issues.slice().sort((a,b)=>a.slide-b.slide).map(issue=>'<li><div><strong>第 '+esc(issue.slide)+' 页</strong><p><b>待核对</b> '+esc(issue.reason)+'</p><p><b>怎么改</b> '+esc(issue.correction)+'</p></div><button class="btn small" type="button" data-ppt-online-page="'+(Number(issue.slide)-1)+'" data-ppt-review-jump>查看该页</button></li>').join('')+'</ol>':'')+'</section>';
}
function pptDownloadHtml(job,done){
 const temporary=job?.result?.delivery==='temporary';
 return '<section class="pm-card" aria-labelledby="pptDownloadHeading">'+pptSectionTitle('pptDownloadHeading','4','下载课件')+
  '<div class="pm-downloads">'+(done?
  '<a class="btn primary pm-download" href="'+onlinePptFile(job.id,'deck.pptx')+'" download><span class="pm-format">PPTX</span><span><strong>'+(job.status==='draft'?'下载可编辑初稿':'下载完整可编辑 PPTX')+'（'+esc(job.result.actualCount)+'页）</strong><small>可在 WPS 或 PowerPoint 中编辑，含教师备注</small></span><span class="pm-download-arrow" aria-hidden="true">↓</span></a>'+
  '<a class="btn pm-download" href="'+onlinePptFile(job.id,'audit.json')+'" download><span class="pm-format">记录</span><span><strong>查看制作检查记录</strong><small>下载生成与复核记录</small></span><span class="pm-download-arrow" aria-hidden="true">↓</span></a>'+
  '<p class="pm-note">'+(temporary?'文件暂存在后台，最长保留24小时，后台重启可能提前清除，请及时下载。':'文件在当前浏览器可访问7天，请及时下载。')+'</p>':
  '<div class="pm-download-placeholder"><span class="pm-format">PPTX</span><span><strong>可编辑课件</strong><small>课件生成后，下载入口会出现在这里</small></span></div>')+'</div></section>';
}
function pptProgressHtml(job,lost,done){
 const status=job?.status;
 const phase=job?.progress?.phase||status;
 const stagesDone=done?pptStageLabels.length:(pptStageIndex[phase]??pptStageIndex[status]??0);
 const activeStage=!lost&&['queued','running'].includes(status)?stagesDone:-1;
 const count=Math.max(1,Number(job?.count)||1);
 const pages=done?Number(job.result.actualCount)||count:Math.max(0,Math.min(count,Number(job?.progress?.pages)||0));
 const message=!job?'点击「直接生成整份 PPT」后，这里会显示任务状态。':lost?'无法读取此任务状态':
  status==='queued'?'已提交，后台正在启动或等待空闲':job.error||job.progress?.message||'后台正在处理';
 const selected=T().pptOnline?.selected||0;
 const page=done?job.result.pages?.[selected]:null;
 const badge=job?'<span class="pm-badge '+(lost||status==='failed'||status==='draft'?'pm-badge-warn':'')+'">'+esc(lost?'状态不可用':pptPhases[status]||status)+'</span>':'';
 return '<section class="pm-card" aria-labelledby="pptProgressHeading">'+pptSectionTitle('pptProgressHeading','2','排队与生成进度',badge)+
  (job?'<div class="pm-progress" role="status"><div class="pm-progress-label"><strong>'+esc(job.title)+'</strong><span>'+pages+' / '+count+' 页</span></div>'+
   '<progress max="'+count+'" value="'+pages+'" aria-label="已设计页数"></progress><p>'+esc(message)+'</p></div>':'<p class="pm-note" role="status">'+message+'</p>')+
  '<ol class="pm-stage-list" aria-label="生成步骤">'+pptStageLabels.map((label,i)=>{
   const finished=!lost&&job&&(done||i<stagesDone);
   return '<li class="'+(finished?'pm-stage-done':i===activeStage?'pm-stage-active':'')+'"'+(i===activeStage?' aria-current="step"':'')+'><span aria-hidden="true">'+(finished?'✓':i+1)+'</span>'+label+'</li>';
  }).join('')+'</ol>'+
  (done?'<div class="slidethumbs pm-page-list" role="group" aria-label="选择课件预览">'+job.result.pages.map((p,i)=>'<button type="button" data-ppt-online-page="'+i+'" class="'+(selected===i?'active':'')+'" aria-pressed="'+(selected===i)+'">'+(i+1)+' '+esc(p.title)+'</button>').join('')+'</div>'+
   (page?'<img id="pptPagePreview" class="pm-online-preview" alt="第'+(selected+1)+'页完整设计预览" src="'+onlinePptFile(job.id,page.preview)+'">':'')+'<p class="pm-note">预览来自用于导出的设计稿，实际显示效果请在 PowerPoint 中核对。</p>':'')+'</section>';
}
slidesHtml=function(){
 const lesson=T().lesson,j=onlinePptJob(),lost=j&&pptAccessLost===j.id;
 const running=j&&!lost&&['queued','running'].includes(j.status);
 const done=j&&!lost&&['complete','draft'].includes(j.status)&&j.result;
 const disabled=running||pptSubmitting?' disabled':'';
 const count=T().pptOnlineDraft?.count??T().pptOnline?.count??8;
 const style=T().pptOnlineDraft?.style??T().pptOnline?.style??pptStylePresets[0][2];
 const brief=T().lessonBrief||T().brief;
 const source=[brief?.subject,brief?.grade,brief?.minutes?brief.minutes+' 分钟':''].filter(Boolean).map(esc).join(' · ');
 return '<div class="pm-workbench"><header class="pm-title"><div><span class="eyebrow">LESSON TO SLIDES</span><h1>把教案，变成一堂好看的课。</h1>'+
  '<p>设置页数与风格，用 DeepSeek 和 PPTMaster 生成可编辑课堂课件。</p></div>'+
  (ready?'<span class="pm-badge pm-credit">使用个人 DeepSeek 额度</span>':'')+'</header>'+
  '<section class="pm-card" aria-labelledby="pptSettingsHeading">'+pptSectionTitle('pptSettingsHeading','1','生成设置')+
  '<div class="pm-source"><span class="pm-source-icon">'+uiIcon('book')+'</span><div><strong>'+esc(lesson.title)+'</strong><small>'+(source||'当前教案')+'</small></div>'+
  '<button type="button" class="btn small" id="pptBackToLesson">查看教案</button></div>'+
  '<div class="pm-settings"><div class="pm-count"><span class="pm-field-title" id="pptCountPresets">常用页数</span><div class="pm-segments" role="group" aria-labelledby="pptCountPresets">'+
  [8,12,16,20].map(n=>'<button type="button" data-ppt-count="'+n+'" aria-pressed="'+(Number(count)===n)+'"'+disabled+'>'+n+'</button>').join('')+
  '</div><label for="pptOnlineCount">整稿页数 <small>含封面与结尾</small></label>'+
  '<input id="pptOnlineCount" class="input" type="number" min="4" max="20" step="1" value="'+esc(count)+'"'+disabled+'></div>'+
  '<div class="pm-style"><span class="pm-field-title" id="pptStylePresets">课件风格</span><div class="pm-style-options" role="group" aria-labelledby="pptStylePresets">'+
  pptStylePresets.map(([key,name,value])=>'<button type="button" data-ppt-style="'+key+'" aria-pressed="'+(style===value)+'"'+disabled+'><span class="pm-swatch pm-swatch-'+key+'" aria-hidden="true"></span><strong>'+name+'</strong></button>').join('')+
  '</div><label for="pptOnlineStyle">视觉方向与教学要求</label>'+
  '<textarea id="pptOnlineStyle" class="input" rows="3" maxlength="1500"'+disabled+' placeholder="例如：使用清晰的概念图解和实验流程">'+esc(style)+'</textarea></div></div>'+
  '<!-- ppt-reference -->'+
  '<div class="pm-actions"><div class="pm-action-buttons"><button type="button" class="btn primary" id="pptOnlineCreate"'+(disabled||!ready||!pptServiceConfig?.connected?' disabled':'')+'>'+uiIcon('spark')+'<span>'+(pptSubmitting?'正在提交…':'直接生成整份 PPT')+'</span></button>'+
  (running?'<button type="button" class="btn" id="pptOnlineCancel">停止这次制作</button>':'')+'</div><p class="pm-note">提交后在后台制作，刷新页面可继续查看进度。</p></div>'+
  (!pptServiceConfig||pptServiceConfig.loading?'<div class="notice" role="status">正在检查后台执行服务…</div>':!pptServiceConfig.connected?'<div class="s2-warn" role="alert">'+esc(pptServiceConfig.message||'后台执行服务暂不可用。')+'</div>':'')+
  (!ready?'<div class="s2-warn">制作前请先登录并绑定自己的 DeepSeek API 密钥。<button class="btn" id="pptBillingAccount" type="button">前往登录与绑定</button></div>':'')+
  (pptOnlineError?'<div class="s2-warn" role="alert">'+esc(pptOnlineError)+(lost?'<div class="s2-toolbar"><button class="btn" id="pptDiscardUnavailable" type="button">关闭旧任务记录</button></div>':'')+'</div>':'')+
  '</section>'+pptProgressHtml(j,lost,done)+'<div class="pm-bottom">'+pptReviewHtml(j,done)+pptDownloadHtml(j,done)+'</div></div>';
};
const pptOnlinePrepPage=prepPage;
prepPage=function(){return prepTab==='slides'&&T().lesson?slidesHtml():pptOnlinePrepPage();};
exportPpt=async function(){prepTab='slides';go('prep');};
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

const pptOnlineRender=render;
render=function(){
 pptOnlineRender();
 if(active!=='prep'||prepTab!=='slides')return;
 if(pptServiceConfig===null){
  pptServiceConfig={loading:true};
  api('ppt/config').then(config=>{pptServiceConfig=config;render();})
   .catch(error=>{pptServiceConfig={connected:false,message:error.message};render();});
 }
 const countField=$('pptOnlineCount'),styleField=$('pptOnlineStyle');
 const countButtons=document.querySelectorAll('[data-ppt-count]');
 const styleButtons=document.querySelectorAll('[data-ppt-style]');
 if(countField){
  countField.oninput=()=>{
   T().pptOnlineDraft||={};T().pptOnlineDraft.count=countField.value;saveTeaching();
   countButtons.forEach(button=>button.setAttribute('aria-pressed',String(Number(countField.value)===Number(button.dataset.pptCount))));
  };
  countButtons.forEach(button=>button.onclick=()=>{
   countField.value=button.dataset.pptCount;countField.oninput();
  });
 }
 if(styleField){
  styleField.oninput=()=>{
   T().pptOnlineDraft||={};T().pptOnlineDraft.style=styleField.value;saveTeaching();
   styleButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(styleField.value===pptStylePresets[i][2])));
  };
  styleButtons.forEach((button,i)=>button.onclick=()=>{
   styleField.value=pptStylePresets[i][2];styleField.oninput();
  });
 }
 bindId('pptBackToLesson',()=>{prepTab='preview';go('prep');});
 bindId('pptBillingAccount',()=>go('account'));
 bindId('pptDiscardUnavailable',()=>{T().pptOnline.job=null;pptAccessLost='';pptOnlineError='';saveTeaching();render();});
 bindId('pptOnlineCreate',async()=>{
  if(pptSubmitting)return;
  if(!ready){go('account');return toast('请先绑定个人 DeepSeek API 密钥');}
  try{
   const count=Number(countField.value),style=styleField.value.trim();
   if(!Number.isInteger(count)||count<4||count>20)throw Error('页数须为4至20的整数');
   const guidedStyle=pptReferenceStyle(style);
   pptSubmitting=true;pptOnlineError='';render();
   const {job}=await api('ppt/jobs',{lesson:clone(T().lesson),brief:clone(T().lessonBrief||T().brief),count,style:guidedStyle,mode:'direct'});
   T().pptOnline={count,style,job,selected:0,lastWake:Date.now()};saveTeaching();pollOnlinePpt(job.id);
  }catch(error){pptOnlineError=error.message;}finally{pptSubmitting=false;render();}
 });
 bindId('pptOnlineCancel',async()=>{
  try{
   const {job}=await api('ppt/jobs/'+onlinePptJob().id+'/cancel',{});
   T().pptOnline.job=job;saveTeaching();render();
  }catch(error){toast(error.message);}
 });
 document.querySelectorAll('[data-ppt-online-page]').forEach(button=>button.onclick=()=>{
  T().pptOnline.selected=Number(button.dataset.pptOnlinePage);saveTeaching();render();
  if(button.hasAttribute('data-ppt-review-jump'))$('pptPagePreview')?.scrollIntoView({block:'start'});
 });
 if(onlinePptJob()&&['queued','running'].includes(onlinePptJob().status)&&pptAccessLost!==onlinePptJob().id&&!pptPollTimer&&!pptPolling){
  pptPollTimer=setTimeout(()=>pollOnlinePpt(onlinePptJob().id),1000);
 }
};
`;
export const pptOnlineStyles=String.raw`<style>
:root[data-palette="forest"][data-mode="light"] body:has(.pm-workbench){background:#f7f5ef}
:root[data-palette="forest"][data-mode="light"] .pm-workbench{--pm-line:#e8e4d9;--pm-soft:#f7f5ee;--pm-brand:#1f5a45}
.pm-workbench{--pm-line:var(--line);--pm-soft:var(--surface-soft);--pm-brand:var(--accent);max-width:1120px;margin-inline:auto;display:grid;gap:20px;min-width:0}
.pm-workbench .pm-title{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:3px 0 6px}
.pm-workbench .pm-title h1{margin:6px 0;font-size:clamp(24px,3.2vw,34px);line-height:1.22;letter-spacing:-.035em}
.pm-workbench .pm-title p,.pm-workbench .pm-note{margin:0;color:var(--muted);font-size:13px}
.pm-workbench .pm-card{min-width:0;padding:24px 26px;background:var(--surface);border:1px solid var(--pm-line);border-radius:16px}
.pm-workbench .pm-card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.pm-workbench .pm-card-head h2{display:flex;align-items:center;gap:10px;font-size:17px;line-height:1.35;margin:0}
.pm-workbench .pm-step,.pm-workbench .pm-source-icon,.pm-workbench .pm-format{display:grid;place-items:center;flex-shrink:0;background:var(--pale);color:var(--pm-brand);font-weight:700}
.pm-workbench .pm-step{width:25px;height:25px;border-radius:50%;font-size:12px}
.pm-workbench .pm-badge{padding:4px 9px;border-radius:6px;background:var(--pale);color:var(--pm-brand);font-size:12px;font-weight:600}
.pm-workbench .pm-badge-warn{background:var(--warn-bg);color:var(--warn-ink)}
.pm-workbench .pm-credit{white-space:nowrap}
.pm-workbench .pm-source{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:12px 14px;background:var(--pm-soft);border:1px dashed var(--pm-line);border-radius:12px}
.pm-workbench .pm-source>div{min-width:0;overflow-wrap:anywhere}
.pm-workbench .pm-source strong,.pm-workbench .pm-source small{display:block}
.pm-workbench .pm-source small,.pm-workbench .pm-count label small{color:var(--muted);font-size:12px;font-weight:400}
.pm-workbench .pm-source-icon{width:40px;height:40px;border-radius:10px}
.pm-workbench .pm-source-icon svg{width:20px;height:20px}
.pm-workbench .pm-source button{margin-left:auto;flex-shrink:0}
.pm-workbench .pm-settings{display:grid;grid-template-columns:minmax(180px,.75fr) minmax(0,1.8fr);gap:22px}
.pm-workbench .pm-field-title,.pm-workbench .pm-settings label{display:block;margin:0 0 6px;font-size:13px;font-weight:650}
.pm-workbench .pm-settings label{margin-top:11px}
.pm-workbench .pm-segments{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:4px;border-radius:10px;background:var(--pm-soft)}
.pm-workbench .pm-segments button,.pm-workbench .pm-style-options button{min-width:0;color:var(--ink);font:inherit;cursor:pointer}
.pm-workbench .pm-segments button{min-height:40px;border-radius:7px;border:1px solid transparent;background:transparent}
.pm-workbench .pm-segments button[aria-pressed="true"]{border-color:var(--pale-border);background:var(--surface);color:var(--pm-brand);font-weight:700}
.pm-workbench .pm-style-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pm-workbench .pm-style-options button{padding:6px;border:1px solid var(--pm-line);border-radius:9px;background:var(--surface);text-align:left;font-size:12px;line-height:1.4}
.pm-workbench .pm-style-options strong{display:block;margin:5px 2px 1px;overflow-wrap:anywhere}
.pm-workbench .pm-style-options button[aria-pressed="true"]{border-color:var(--pm-brand);box-shadow:0 0 0 2px var(--pale)}
.pm-workbench .pm-style-options button:disabled,.pm-workbench .pm-segments button:disabled{opacity:.68;cursor:default}
.pm-workbench .pm-swatch{display:block;position:relative;height:34px;border-radius:6px;overflow:hidden}
.pm-workbench .pm-swatch::after{content:"";position:absolute;left:9px;top:9px;width:42%;height:4px;border-radius:3px;background:currentColor;opacity:.78;box-shadow:0 9px 0 -1px currentColor}
.pm-workbench .pm-swatch-fresh{background:#e8f0e9;color:#1f5a45}
.pm-workbench .pm-swatch-academic{background:#e8eef6;color:#2f466f}
.pm-workbench .pm-swatch-playful{background:#f9e9d4;color:#bd612b}
.pm-workbench .pm-swatch-classic{background:#f5e9df;color:#963d30}
.pm-workbench .pm-settings .input{width:100%;margin:0}
.pm-workbench .pm-settings textarea{resize:vertical;min-height:82px}
.pm-workbench .s2-upload{margin-top:18px}
.pm-workbench .pm-actions{display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;margin-top:18px}
.pm-workbench .pm-action-buttons{display:flex;flex-wrap:wrap;gap:8px}
.pm-workbench .pm-action-buttons .primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:10px 20px;background:var(--pm-brand);border-color:var(--pm-brand);font-size:14px}
.pm-workbench .pm-action-buttons .primary:not(:disabled):hover{background:var(--accent-hover);border-color:var(--accent-hover)}
.pm-workbench .pm-action-buttons .primary svg{width:17px;height:17px}
.pm-workbench .s2-warn,.pm-workbench .notice{margin:12px 0 0}
.pm-workbench .pm-progress{display:grid;gap:8px}
.pm-workbench .pm-progress-label{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.pm-workbench .pm-progress-label strong{overflow-wrap:anywhere}
.pm-workbench .pm-progress-label span{color:var(--pm-brand);font-size:14px;font-weight:700;flex-shrink:0}
.pm-workbench .pm-progress p{margin:0;font-size:13px}
.pm-workbench progress{appearance:none;width:100%;height:9px;border:0;overflow:hidden;border-radius:99px;background:var(--pm-soft)}
.pm-workbench progress::-webkit-progress-bar{background:var(--pm-soft)}
.pm-workbench progress::-webkit-progress-value{background:var(--pm-brand);border-radius:99px}
.pm-workbench progress::-moz-progress-bar{background:var(--pm-brand)}
.pm-workbench .pm-stage-list{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;list-style:none;margin:16px 0 0;padding:0}
.pm-workbench .pm-stage-list li{display:flex;align-items:center;gap:7px;min-height:38px;padding:7px 9px;border-radius:8px;border:1px solid var(--pm-line);background:var(--pm-soft);color:var(--muted);font-size:12px}
.pm-workbench .pm-stage-list li span{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;border:1px solid var(--pm-line);flex-shrink:0;font-size:11px}
.pm-workbench .pm-stage-list .pm-stage-done span{background:var(--pm-brand);border-color:var(--pm-brand);color:var(--on-accent)}
.pm-workbench .pm-stage-list .pm-stage-active{background:var(--pale);border-color:var(--pale-border);color:var(--pm-brand);font-weight:650}
.pm-workbench .pm-stage-list .pm-stage-active span{border-color:var(--pm-brand)}
.pm-workbench .pm-bottom{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:20px}
.pm-workbench .pm-review,.pm-workbench .pm-downloads{display:grid;gap:9px}
.pm-workbench .pm-review{margin:12px 0 0;padding:0;list-style:none}
.pm-workbench .pm-review li,.pm-workbench .pm-download,.pm-workbench .pm-download-placeholder{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;border:1px solid var(--pm-line);text-align:left}
.pm-workbench .pm-review li{justify-content:space-between;align-items:flex-start;background:var(--pm-soft)}
.pm-workbench .pm-review p{font-size:13px;margin:4px 0 0;overflow-wrap:anywhere}
.pm-workbench .pm-review button{flex-shrink:0}
.pm-workbench .pm-download strong,.pm-workbench .pm-download small,.pm-workbench .pm-download-placeholder strong,.pm-workbench .pm-download-placeholder small{display:block}
.pm-workbench .pm-download small,.pm-workbench .pm-download-placeholder small{font-size:12px;font-weight:400;color:var(--muted)}
.pm-workbench .pm-download.primary small{color:inherit;opacity:.88}
.pm-workbench .pm-download-arrow{margin-left:auto;font-size:17px}
.pm-workbench .pm-format{min-width:40px;min-height:38px;border-radius:8px;font-size:11px}
.pm-workbench .pm-download.primary .pm-format{color:inherit;background:color-mix(in srgb,currentColor 14%,transparent)}
.pm-workbench .pm-page-list{margin-top:14px}
.pm-workbench .pm-online-preview{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;background:var(--pm-soft);border:1px solid var(--pm-line);border-radius:12px;margin:12px 0 8px;scroll-margin-top:85px}
@media(max-width:850px){.pm-workbench .pm-stage-list{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:680px){.pm-workbench{gap:14px}.pm-workbench .pm-card{padding:16px}.pm-workbench .pm-settings,.pm-workbench .pm-bottom{grid-template-columns:1fr;gap:14px}.pm-workbench .pm-title{flex-wrap:wrap;gap:8px}.pm-workbench .pm-review li{flex-wrap:wrap}}
@media(max-width:420px){.pm-workbench .pm-stage-list,.pm-workbench .pm-style-options{grid-template-columns:repeat(2,minmax(0,1fr))}.pm-workbench .pm-source{gap:8px;padding:9px}.pm-workbench .pm-source-icon{width:30px;height:30px}.pm-workbench .pm-source button{padding-inline:7px}.pm-workbench .pm-credit{white-space:normal}}
</style>`;
