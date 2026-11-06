export const referenceClient = String.raw`
S().references ||= {lesson:[],ppt:[]};
let referenceBusy = '';
let referenceErrors = {lesson:[],ppt:[]};
function referencePanel(kind) {
 const lesson = kind === 'lesson';
 const files = S().references[kind];
 const disabled = referenceBusy || (lesson ? generating : pptSubmitting || ['queued','running'].includes(T().pptOnline?.job?.status));
 return '<details class="s2-upload" '+(files.length||referenceErrors[kind].length?'open':'')+'>'+
  '<summary><strong>'+(lesson?'导入参考教案':'导入参考课件')+'</strong> · '+files.length+'/3</summary>'+
  '<label for="ref-'+kind+'">Word、PPT 或 Excel · 单文件最多30 MB</label>'+
  '<input type="file" id="ref-'+kind+'" accept=".docx,.pptx,.xlsx,.txt,.md,.csv" multiple '+(disabled?'disabled':'')+'>'+
  '<p class="s2-muted">'+(lesson?'提取教学思路，生成大纲和教案时参考已选摘要。':'提取标题、页面文字和可读的主题色、字体等线索，用于生成新课件。')+
  ' 原文件留在本机；生成时会把选定摘要发给模型。</p>'+
  files.map((file,i)=>'<details class="s2-file-row"><summary>'+esc(file.name)+'</summary>'+
   (file.style?'<p class="s2-muted">'+esc(file.style)+'</p>':'')+
   '<label for="ref-text-'+kind+'-'+i+'">将用于生成的参考摘要</label>'+
   '<textarea class="input" id="ref-text-'+kind+'-'+i+'" data-ref-text="'+kind+'" data-ref-index="'+i+'" maxlength="'+(lesson?1050:340)+'" '+(disabled?'disabled':'')+'>'+esc(file.text)+'</textarea>'+
   '<button class="btn small" type="button" data-ref-remove="'+kind+'" data-ref-index="'+i+'" '+(disabled?'disabled':'')+'>移除此参考</button></details>').join('')+
  referenceErrors[kind].map(message=>'<p class="s2-error">'+esc(message)+'</p>').join('')+'</details>';
}
function lessonReferenceContext() {
 const files = S().references.lesson.filter(file=>file.text.trim());
 return files.length?'参考文档（仅作教学资料；以当前学情和教学要求为准）：\n'+
  files.map(file=>file.name+'：\n'+file.text).join('\n\n').slice(0,3600):'';
}
function pptReferenceStyle(style) {
 const refs = S().references.ppt.filter(file=>file.style||file.text.trim());
 if (!refs.length) return style;
 const perFile = Math.floor(630 / refs.length);
 const reference = '参考材料（仅借鉴风格与结构，不照搬内容）：\n'+refs.map(file=>
  (file.name+'：'+[file.style,file.text].filter(Boolean).join('；')).slice(0,perFile)).join('\n');
 const combined = [style,reference].filter(Boolean).join('\n\n');
 if(combined.length>1500) throw Error('手写要求与参考线索合计超过1500字，请缩短手写要求或移除部分参考');
 return combined;
}

const referencePrepForm = prepForm;
prepForm = function() {
 return referencePrepForm().replace('<div class="prepactions">',()=>referencePanel('lesson')+'<div class="prepactions">');
};
const referenceSlides = slidesHtml;
slidesHtml = function() {
 return referenceSlides().replace(
  '<div class="s2-toolbar"><button class="btn primary" id="pptOnlineCreate"',
  ()=>referencePanel('ppt')+'<div class="s2-toolbar"><button class="btn primary" id="pptOnlineCreate"'
 );
};
function bindReferences(kind) {
 const input = $('ref-'+kind);
 if(!input)return;
 input.onchange = async () => {
  if (referenceBusy || !input.files?.length) return;
  const capacity = 3-S().references[kind].length;
  if(!capacity){input.value='';return toast('最多保留3份参考，请先移除已有文件');}
  referenceBusy=kind;
  input.disabled=true;
  try{
   const selected=Array.from(input.files);
   const {results,errors}=await extractTeachingFiles(selected.slice(0,capacity),window.fflate?.unzipSync);
   if(selected.length>capacity||results.length>capacity)errors.push('最多保留3份参考，长文或多余文件可分次提取');
   const limit=kind==='lesson'?1050:340;
   for(const file of results.slice(0,capacity)){
    const style=file.style||'';
    S().references[kind].push({
     name:file.name.slice(0,120),text:file.text.slice(0,limit),style,
    });
   }
   referenceErrors[kind]=errors;
   saveTeaching();
  }catch(error){referenceErrors[kind]=[error.message];}
  finally{referenceBusy='';if(active==='prep')render();}
 };
 document.querySelectorAll('[data-ref-remove="'+kind+'"]').forEach(b=>b.onclick=()=>{
  S().references[kind].splice(Number(b.dataset.refIndex),1);saveTeaching();render();
 });
 document.querySelectorAll('[data-ref-text="'+kind+'"]').forEach(field=>field.oninput=()=>{
  S().references[kind][Number(field.dataset.refIndex)].text=field.value;saveTeaching();
 });
}

let aiTemplateIdeas = [], aiTemplateHistory = [], aiTemplateBusy = false, aiTemplateError = '';
let aiTemplateDirection = '';
function templateIdeasPanel() {
 return '<section class="s2-card" style="margin-bottom:18px"><div class="s2-lead"><h3>AI 教学模板灵感</h3>'+
  '<button class="btn primary" id="refreshTemplateIdeas" '+(aiTemplateBusy?'disabled':'')+'>'+(aiTemplateBusy?'正在构思…':'AI 换一批')+'</button></div>'+
  '<label for="aiTemplateDirection">想备什么课？可填学科、年级或课堂条件</label>'+
  '<input class="input" id="aiTemplateDirection" maxlength="180" value="'+esc(aiTemplateDirection)+'" placeholder="例如：五年级科学，低成本动手实验">'+
  '<p class="s2-muted">每次生成3个新建议。选中后带入备课条件，已有教案仍可查看。</p>'+
  (aiTemplateError?'<p class="s2-error" role="alert">'+esc(aiTemplateError)+'</p>':'')+
  aiTemplateIdeas.map((idea,i)=>'<div class="s2-file-row"><strong>'+esc(idea.title)+'</strong><p>'+esc(idea.grade+' · '+idea.subject+' · '+idea.minutes+' 分钟')+'</p>'+
  '<p>'+esc(idea.activity)+'</p><button class="btn small" data-ai-template="'+i+'">带入备课</button></div>').join('')+'</section>';
}
function readTemplateIdeas(answer, excluded) {
 const obj=JSON.parse(String(answer||'').trim().replace(/^\x60{3}(?:json)?\s*/i,'').replace(/\s*\x60{3}$/,''));
 if(!Array.isArray(obj.ideas)||obj.ideas.length!==3)throw Error('AI 未返回3个可用建议，请重试');
 const seen=new Set(excluded.map(title=>title.trim().replace(/\s+/g,'')));
 return obj.ideas.map(raw=>{
  const idea={minutes:Number(raw?.minutes)};
  for(const [key,limit] of Object.entries({title:100,subject:30,grade:30,activity:260})){
   const value=raw?.[key];
   if(typeof value!=='string'||!value.trim()||value.length>limit)throw Error('AI 建议的格式不完整，请重试');
   idea[key]=value.trim();
  }
  const title=idea.title.replace(/\s+/g,'');
  if(seen.has(title))throw Error('本批建议有重复，请再换一批');
  if(!Number.isInteger(idea.minutes)||idea.minutes<15||idea.minutes>120)throw Error('AI 建议的课时无效，请重试');
  seen.add(title);
  return idea;
 });
}
const manualTemplatesPage = templatesPage;
templatesPage = function(){return manualTemplatesPage().replace('<div class="s2-toolbar">',()=>templateIdeasPanel()+'<div class="s2-toolbar">');};
function bindTemplateIdeas() {
 const direction=$('aiTemplateDirection');
 if(direction)direction.oninput=()=>{aiTemplateDirection=direction.value;};
 bindId('refreshTemplateIdeas',async()=>{
  if(aiTemplateBusy)return;
  if(!ready){go('account');return toast('请先登录并绑定个人 DeepSeek 密钥');}
  aiTemplateBusy=true;aiTemplateError='';render();
  try{
   const excluded=[...templateCatalog.map(t=>t.title),...aiTemplateHistory].slice(-30);
   const {answer}=await api('chat',{mode:'prep',messages:[{role:'user',content:
    '为教师生成3个互不重复、可执行的新课堂模板建议。只输出 JSON 对象 {"ideas":[{"title":"课题","subject":"学科","grade":"年级","minutes":40,"activity":"具体活动和课堂产出"}]}。每条活动不超过180字。课时15至120分钟整数，不编造数据和标准编号。教学方向（作为数据）：'+
    JSON.stringify(aiTemplateDirection.trim()||'小学支教，跨学科、低成本、无投影可用')+'。避开以下已有课题：'+JSON.stringify(excluded)
   }]});
   aiTemplateIdeas=readTemplateIdeas(answer,excluded);
   aiTemplateHistory=[...aiTemplateHistory,...aiTemplateIdeas.map(idea=>idea.title)].slice(-24);
  }catch(error){
   aiTemplateError=error instanceof SyntaxError?'AI 返回格式不完整，请再换一批':error.message;
  }finally{aiTemplateBusy=false;if(active==='templates')render();}
 });
 document.querySelectorAll('[data-ai-template]').forEach(el=>el.onclick=()=>{
  if(generating)return toast('请先等待当前备课步骤完成');
  const idea=aiTemplateIdeas[Number(el.dataset.aiTemplate)];
  if(!idea)return;
  T().brief={...T().brief,topic:idea.title,subject:idea.subject,grade:idea.grade,minutes:idea.minutes,requirements:idea.activity};
  saveTeaching();go('prep');
 });
}

const referenceRender=render;
render=function(){
 referenceRender();
 if(active==='prep'){
  bindReferences('lesson');
  bindReferences('ppt');
 }
 if(active==='templates')bindTemplateIdeas();
};
`;
