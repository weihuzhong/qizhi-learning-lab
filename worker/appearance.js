// Website preferences are deliberately separate from lesson and slide themes.
export function installAppearance(win, doc) {
  const key = 'qizhi-appearance-v1';
  const palettes = ['forest', 'ocean', 'violet', 'amber'];
  const modes = ['light', 'dark', 'system'];
  const media = win.matchMedia('(prefers-color-scheme: dark)');
  const normalize = value => ({palette: palettes.includes(value?.palette) ? value.palette : 'forest', mode: modes.includes(value?.mode) ? value.mode : 'system'});
  let state;
  try { state = normalize(JSON.parse(win.localStorage.getItem(key))); } catch { state = normalize(null); }
  function apply() {
    doc.documentElement.dataset.palette = state.palette;
    doc.documentElement.dataset.mode = state.mode === 'system' ? (media.matches ? 'dark' : 'light') : state.mode;
    doc.dispatchEvent(new win.CustomEvent('qizhi:appearance', {detail: {...state}}));
  }
  win.qizhiAppearance = {
    get: () => ({...state}),
    set: change => {
      state = normalize({...state, ...change});
      let saved = true;
      try { win.localStorage.setItem(key, JSON.stringify(state)); } catch { saved = false; }
      apply();
      return saved;
    }
  };
  media.addEventListener('change', () => { if (state.mode === 'system') apply(); });
  win.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    try { state = normalize(JSON.parse(event.newValue)); } catch { state = normalize(null); }
    apply();
  });
  apply();
}
export const appearanceBoot = '<script>(' + installAppearance.toString() + ')(window,document);</script>';

export const appearanceClient = String.raw`
const appearanceNames={forest:'青岚',ocean:'海盐',violet:'暮紫',amber:'暖砂'};
const appearanceModes={light:'浅色',dark:'深色',system:'跟随系统'};
const paletteColors={forest:'#286650',ocean:'#2969a8',violet:'#7254b6',amber:'#9c622c'};
const appearanceDialog=document.createElement('dialog');
appearanceDialog.className='appearance-dialog';
appearanceDialog.setAttribute('aria-labelledby','appearanceTitle');
appearanceDialog.innerHTML='<div class="appearance-head"><h2 id="appearanceTitle">外观设置</h2><button class="btn appearance-close" aria-label="关闭外观设置">×</button></div><fieldset><legend>主题配色</legend><div class="palette-grid">'+Object.entries(appearanceNames).map(([id,name])=>'<button class="palette-choice" data-palette-choice="'+id+'" aria-pressed="false"><span class="palette-preview" style="--sample:'+paletteColors[id]+'"><i></i><span><b></b><b></b><b></b></span></span><span>'+name+'<b class="palette-check" aria-hidden="true">✓</b></span></button>').join('')+'</div></fieldset><fieldset><legend>显示模式</legend><div class="mode-options">'+Object.entries(appearanceModes).map(([id,name])=>'<button data-mode-choice="'+id+'" aria-pressed="false">'+name+'</button>').join('')+'</div></fieldset><div class="appearance-note" role="status">设置自动保存在此浏览器，不影响课件的设计主题。</div>';
document.body.appendChild(appearanceDialog);
const appearanceTrigger=document.createElement('button');
appearanceTrigger.className='btn appearance-trigger';
appearanceTrigger.setAttribute('aria-haspopup','dialog');
appearanceTrigger.innerHTML=uiIcon('settings')+'<span>外观主题</span>';
const topActions=document.createElement('div');topActions.className='top-actions';
document.querySelector('.topbar').appendChild(topActions);
topActions.append($('status'),appearanceTrigger);
function syncAppearanceControls(){const state=window.qizhiAppearance.get();appearanceDialog.querySelectorAll('[data-palette-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.paletteChoice===state.palette)));appearanceDialog.querySelectorAll('[data-mode-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.modeChoice===state.mode)));appearanceTrigger.setAttribute('aria-label','外观主题：'+appearanceNames[state.palette]+'，'+appearanceModes[state.mode]);}
appearanceTrigger.onclick=()=>{syncAppearanceControls();appearanceDialog.showModal();};
appearanceDialog.querySelector('.appearance-close').onclick=()=>appearanceDialog.close();
appearanceDialog.addEventListener('click',event=>{if(event.target!==appearanceDialog)return;const r=appearanceDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)appearanceDialog.close();});
appearanceDialog.addEventListener('close',()=>appearanceTrigger.focus());
appearanceDialog.querySelectorAll('[data-palette-choice],[data-mode-choice]').forEach(el=>el.onclick=()=>{const saved=window.qizhiAppearance.set(el.dataset.paletteChoice?{palette:el.dataset.paletteChoice}:{mode:el.dataset.modeChoice});appearanceDialog.querySelector('.appearance-note').textContent=saved?'已保存 · 不影响课件的设计主题。':'已应用 · 浏览器禁止存储，关闭后可能无法保留。';});
document.addEventListener('qizhi:appearance',syncAppearanceControls);syncAppearanceControls();

home=function(){
 const {lesson,job}=T();
 const cards=[
  ['prep','edit','备课与课件','填写教学条件、编辑教案，制作课堂 PPT'],
  ['templates','book','教学模板','按课堂类型选择模板，载入后再按学情调整'],
  ['team','team','团队备课','分配备课任务，审阅并交换备课包']
 ];
 const utilities=[
  ['schedule','book','排课工作台','安排课次，检查时间冲突'],
  ['online','team','在线教研组','共享教案，留下审阅意见'],
  ['memory','check','教学偏好','管理自己确认的备课规则'],
  ['account','settings','账号与云端','同步教案，绑定个人密钥']
 ];
 const date=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Shanghai'}).format(new Date());
 const [sampleTitle,sampleSubtitle]=sample.title.split('：',2);
 const sampleMinutes=sample.phases.reduce((sum,phase)=>sum+phase.minutes,0);
 const sampleSteps=sample.phases.slice(0,3).map(phase=>'<li><span>'+esc(phase.name)+'</span><span>'+phase.minutes+' 分钟</span></li>').join('');
 const resumeTitle=lesson?.title||(!job?.complete?job?.brief?.topic:'');
 const resume=resumeTitle?'<section class="desk-resume"><span class="desk-tool-icon">'+uiIcon('book')+'</span><div><small>'+(lesson?'当前浏览器的教案':'尚未完成的备课')+'</small><h3>'+esc(resumeTitle)+'</h3></div><button class="btn" data-teachgo="prep">继续备课 '+uiIcon('arrow')+'</button></section>':'';
 return '<div class="desk-heading"><h1>备课工作台</h1><span class="desk-date">'+date+'</span></div>'+
  '<section class="desk-hero" aria-labelledby="deskHeroTitle"><div class="desk-hero-copy"><h2 id="deskHeroTitle">从课题到课堂课件</h2><p>为教师和支教团队准备教案、课堂活动与可编辑 PPT。</p><div class="row"><button class="btn primary" id="startStudio">开始备课 '+uiIcon('arrow')+'</button><button class="btn desk-secondary" id="judgeDemo">免登录体验示例</button></div><small>使用 AI 生成教案或课件时，需绑定个人 DeepSeek 密钥。</small></div>'+
  '<div class="desk-art"><div class="desk-art-note"><span>教案示例 · 小学科学 · '+sampleMinutes+' 分钟</span><h3>'+esc(sampleTitle)+'</h3>'+(sampleSubtitle?'<p>'+esc(sampleSubtitle)+'</p>':'')+'<ol aria-label="示例教案的前三个课堂环节">'+sampleSteps+'</ol></div></div></section>'+
  '<div class="desk-section-title"><h2>备课入口</h2></div><div class="desk-start-grid">'+cards.map(([page,icon,title,description])=>'<button class="desk-start" data-teachgo="'+page+'"><span class="desk-tool-icon">'+uiIcon(icon)+'</span><span class="desk-entry-text"><strong>'+title+'</strong><span class="desk-entry-description">'+description+'</span></span>'+uiIcon('arrow')+'</button>').join('')+'</div>'+
  resume+
  '<div class="desk-section-title"><h2>协作与设置</h2></div><div class="desk-utilities">'+utilities.map(([page,icon,title,description])=>'<button data-teachgo="'+page+'"><span class="desk-utility-icon">'+uiIcon(icon)+'</span><span><strong>'+title+'</strong><small>'+description+'</small></span>'+uiIcon('arrow')+'</button>').join('')+'</div>'+
  '<div class="desk-footer"><span>启知未来 · 协同备课工作台</span><button data-teachgo="templates">浏览教学模板 '+uiIcon('arrow')+'</button></div>';
};
const appearanceNav=nav;nav=function(){appearanceNav();document.querySelectorAll('#navigation .nav').forEach(el=>el.setAttribute('aria-current',el.classList.contains('active')?'page':'false'));};
const appearanceRender=render;
render=function(){
 appearanceRender();
 document.querySelectorAll('[data-teachgo]').forEach(el=>el.onclick=()=>go(el.dataset.teachgo));
 const demo=$('judgeDemo');
 if(demo) demo.onclick=()=>document.querySelector('[data-example-nav]')?.click();
};
`;
