export const pptOnlineClient=String.raw`
let pptServiceConfig=null,pptSubmitting=false,pptOnlineError='',pptPollTimer=null,pptPolling=false,pptAccessLost='';
const pptPhases={queued:'等待后台接单',running:'制作中',preparing:'加载PPTMaster',designing:'设计页面',checking:'整稿检查',exporting:'导出PPTX',rendering:'渲染预览',complete:'整稿完成',failed:'制作未完成',cancelled:'已停止'};
function onlinePptJob(){return T().pptOnline?.job||null;}
function onlinePptFile(id,name){return '/api/ppt/jobs/'+encodeURIComponent(id)+'/file/'+encodeURIComponent(name);}
slidesHtml=function(){const j=onlinePptJob(),lost=j&&pptAccessLost===j.id,running=j&&!lost&&['queued','running'].includes(j.status),done=j?.status==='complete',selected=T().pptOnline?.selected||0;const page=j?.result?.pages?.[selected];return '<section class="s2-card pm-hero"><span class="tag">DEEPSEEK × PPTMASTER</span><h3>把这节课，讲得更生动。</h3><p>使用当前登录账号绑定的DeepSeek API密钥调用真实PPTMaster，完成整稿设计、质量检查与可编辑PPTX导出。模型费用计入你自己的DeepSeek账户。</p><div class="pm-steps"><div><b>01</b><strong>设置页数与风格</strong><span>自动决定设计方案，无需逐步确认</span></div><div><b>02</b><strong>后台完成整稿</strong><span>逐页设计、检查、导出与预览</span></div><div><b>03</b><strong>检查并下载</strong><span>保留可编辑文字、图形与教师备注</span></div></div></section><section class="s2-card"><h3>这份课件，想怎样呈现？</h3><label for="pptOnlineCount">整稿页数（含封面与结尾）</label><input id="pptOnlineCount" class="input" type="number" min="4" max="20" step="1" value="'+(T().pptOnlineDraft?.count||T().pptOnline?.count||8)+'" '+(running?'disabled':'')+'><label for="pptOnlineStyle">视觉方向与教学要求</label><textarea id="pptOnlineStyle" class="input" maxlength="1500" '+(running?'disabled':'')+' placeholder="例如：小学科学，温暖的纸页质感，清晰的概念图解与实验流程，少文字，让学生先观察再思考。">'+esc(T().pptOnlineDraft?.style??T().pptOnline?.style??'现代课堂演示，米白与深青色，文字简洁，概念与实验用有意义的图解表达。每页围绕一个核心问题，整稿有变化且风格一致。')+'</textarea><div class="s2-toolbar"><button class="btn primary" id="pptOnlineCreate" '+(running||pptSubmitting||!ready||!pptServiceConfig?.connected?'disabled':'')+'>'+(pptSubmitting?'正在提交…':'直接生成整份 PPT')+'</button>'+(running?'<button class="btn" id="pptOnlineCancel">停止这次制作</button>':'')+'</div><p class="s2-muted">点击即选择自动设计并跳过逐步方案确认。生成通常需要数分钟；任务在后台继续，刷新后可查看进度，无需安装插件或保持你的电脑运行。</p>'+(!pptServiceConfig||pptServiceConfig.loading?'<div class="notice" role="status">正在检查后台执行服务…</div>':!pptServiceConfig.connected?'<div class="s2-warn" role="alert">'+esc(pptServiceConfig.message||'后台执行服务尚未上线，本次不会启动旧生成器。')+'</div>':'')+(!ready?'<div class="s2-warn">制作前请先登录并绑定自己的DeepSeek API密钥。<button class="btn" id="pptBillingAccount">前往登录与绑定</button></div>':'')+(pptOnlineError?'<div class="s2-warn" role="alert">'+esc(pptOnlineError)+(lost?'<div class="s2-toolbar"><button class="btn" id="pptDiscardUnavailable">关闭旧任务记录</button></div>':'')+'</div>':'')+'</section>'+(j?'<section class="s2-card" style="margin-top:18px"><span class="tag">'+esc(pptPhases[j.status]||j.status)+'</span><h3>'+esc(j.title)+'</h3><div class="s2-profile-status" role="status">'+esc(lost?'无法读取此任务状态':j.status==='queued'?'已提交，后台正在启动或等待空闲':j.error||j.progress?.message||'后台正在处理')+'</div><p class="s2-muted">'+Math.min(j.count,j.progress?.pages||0)+' / '+j.count+' 页 · '+esc(pptPhases[j.progress?.phase]||pptPhases[j.status])+'</p>'+(done?'<div class="s2-toolbar"><a class="btn primary" href="'+onlinePptFile(j.id,'deck.pptx')+'" download>下载完整可编辑 PPTX（'+j.result.actualCount+'页）</a><a class="btn" href="'+onlinePptFile(j.id,'audit.json')+'" download>查看制作检查记录</a></div><div class="slidethumbs">'+j.result.pages.map((p,i)=>'<button data-ppt-online-page="'+i+'" class="'+(selected===i?'active':'')+'">'+(i+1)+' '+esc(p.title)+'</button>').join('')+'</div>'+(page?'<img class="pm-online-preview" alt="第'+(selected+1)+'页完整设计预览" src="'+onlinePptFile(j.id,page.preview)+'">':'')+'<p class="s2-muted">预览来自PPTMaster用于导出的同一份SVG设计稿。知识、实验条件与最终PowerPoint显示效果请教师核对。文件在当前浏览器可访问7天，请及时下载。</p>':'')+'</section>':'');};
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

const pptOnlineRender=render;render=function(){pptOnlineRender();if(active!=='prep'||prepTab!=='slides')return;if(pptServiceConfig===null){pptServiceConfig={loading:true};api('ppt/config').then(x=>{pptServiceConfig=x;render();}).catch(e=>{pptServiceConfig={connected:false,message:e.message};render();});}for(const [id,key]of [['pptOnlineCount','count'],['pptOnlineStyle','style']]){const field=$(id);if(field)field.oninput=()=>{T().pptOnlineDraft||={};T().pptOnlineDraft[key]=field.value;saveTeaching();};}bindId('pptBillingAccount',()=>go('account'));bindId('pptDiscardUnavailable',()=>{T().pptOnline.job=null;pptAccessLost='';pptOnlineError='';saveTeaching();render();});bindId('pptOnlineCreate',async()=>{if(pptSubmitting)return;if(!ready){go('account');return toast('请先绑定个人DeepSeek API密钥');}try{const count=Number($('pptOnlineCount').value),style=$('pptOnlineStyle').value.trim();if(!Number.isInteger(count)||count<4||count>20)throw Error('页数须为4至20的整数');const guidedStyle=pptReferenceStyle(style);pptSubmitting=true;pptOnlineError='';render();const {job}=await api('ppt/jobs',{lesson:clone(T().lesson),brief:clone(T().lessonBrief||T().brief),count,style:guidedStyle,mode:'direct'});T().pptOnline={count,style,job,selected:0,lastWake:Date.now()};saveTeaching();pollOnlinePpt(job.id);}catch(e){pptOnlineError=e.message;}finally{pptSubmitting=false;render();}});bindId('pptOnlineCancel',async()=>{try{const {job}=await api('ppt/jobs/'+onlinePptJob().id+'/cancel',{});T().pptOnline.job=job;saveTeaching();render();}catch(e){toast(e.message)}});document.querySelectorAll('[data-ppt-online-page]').forEach(el=>el.onclick=()=>{T().pptOnline.selected=Number(el.dataset.pptOnlinePage);saveTeaching();render();});if(onlinePptJob()&&['queued','running'].includes(onlinePptJob().status)&&pptAccessLost!==onlinePptJob().id&&!pptPollTimer&&!pptPolling)pptPollTimer=setTimeout(()=>pollOnlinePpt(onlinePptJob().id),1000);};
`;
export const pptOnlineStyles=String.raw`<style>.pm-online-preview{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;background:#f4f4f6;border-radius:14px;border:1px solid #e2e8f0;margin-top:20px}.pm-hero .pm-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:24px}.pm-hero .pm-steps>div{display:flex;flex-direction:column;gap:8px;padding:18px;background:#ffffffa8;border:1px solid #e2e8f0;border-radius:12px}.pm-steps b{font-size:24px;color:#0f766e}.pm-steps span{font-size:12px;color:#64748b}@media(max-width:700px){.pm-hero .pm-steps{grid-template-columns:1fr}}</style>`;
