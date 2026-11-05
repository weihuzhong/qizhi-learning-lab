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
appearanceDialog.innerHTML='<div class="appearance-head"><div><span class="s2-label">MAKE IT YOURS</span><h2 id="appearanceTitle">让工作台，更像你的空间。</h2></div><button class="btn appearance-close" aria-label="关闭外观设置">×</button></div><p>选择喜欢的色彩，让每一次备课都舒适一点。</p><fieldset><legend>主题配色</legend><div class="palette-grid">'+Object.entries(appearanceNames).map(([id,name])=>'<button class="palette-choice" data-palette-choice="'+id+'" aria-pressed="false"><span class="palette-preview" style="--sample:'+paletteColors[id]+'"><i></i><span><b></b><b></b><b></b></span></span><span>'+name+'<b class="palette-check" aria-hidden="true">✓</b></span></button>').join('')+'</div></fieldset><fieldset><legend>显示模式</legend><div class="mode-options">'+Object.entries(appearanceModes).map(([id,name])=>'<button data-mode-choice="'+id+'" aria-pressed="false">'+name+'</button>').join('')+'</div></fieldset><div class="appearance-note" role="status">设置自动保存在此浏览器，不影响课件的设计主题。</div>';
document.body.appendChild(appearanceDialog);
const appearanceTrigger=document.createElement('button');
appearanceTrigger.className='btn appearance-trigger';
appearanceTrigger.setAttribute('aria-haspopup','dialog');
appearanceTrigger.innerHTML=uiIcon('spark')+'<span>外观主题</span>';
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
 const lesson=T().lesson;
 const cards=[['prep','edit','创作一份教案','从教学条件与大纲开始，把想法变成课堂。','开始备课'],['templates','slides','发现教学灵感','浏览教学模板，让灵感更快落地。','浏览模板'],['templates','book','借用一个好框架','六类教学模板，给你的下一节课一个起点。','挑选模板']];
 return '<div class="desk-heading"><div><span class="s2-label">YOUR TEACHING SPACE</span><h1>把灵感，带进课堂。</h1><p>备课、课件与协作，在这里从容开始。</p></div><span class="desk-date">'+new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Shanghai'}).format(new Date())+'</span></div><section class="desk-hero"><div class="desk-hero-copy"><span class="desk-overline"><i></i> 为每一节好课，留一点想象</span><h2>少一点准备的忙碌，<br>多一点教学的可能。</h2><p>从一份教案，到一堂生动的课。<br>让启知陪你把每一个好想法慢慢完善。</p><div class="row"><button class="btn primary" id="startStudio">'+uiIcon('edit')+' 开始我的备课 '+uiIcon('arrow')+'</button><button class="btn desk-secondary" id="browseCatalog">先看看教学模板</button></div><small>AI 生成需登录并绑定个人 DeepSeek API 密钥</small></div><div class="desk-art" aria-hidden="true"><div class="desk-art-note"><span>IDEAS INTO LESSONS</span><strong>一节好课，<br>从一个好奇开始。</strong><div>启知未来 / TEACHING STUDIO</div></div></div></section><div class="desk-section-title"><h2>今天，想从哪里开始？</h2><span>选择一种方式，进入你的教学工作流</span></div><div class="desk-start-grid">'+cards.map((c,i)=>'<button class="desk-start" data-teachgo="'+c[0]+'"><div class="desk-start-top"><span class="desk-tool-icon">'+uiIcon(c[1])+'</span><small>0'+(i+1)+'</small></div><h3>'+c[2]+'</h3><p>'+c[3]+'</p><span class="desk-start-link">'+c[4]+uiIcon('arrow')+'</span></button>').join('')+'</div>'+(lesson?'<section class="desk-resume"><span class="desk-tool-icon">'+uiIcon('book')+'</span><div><small>接着上次的灵感 · 本机草稿</small><h3>'+esc(lesson.title)+'</h3></div><button class="btn" data-teachgo="prep">继续完善 →</button></section>':T().job&&!T().job.complete?'<section class="desk-resume"><div><small>尚未完成的备课</small><h3>'+esc(T().job.brief.topic)+'</h3></div><button class="btn" data-teachgo="prep">继续备课 →</button></section>':'')+'<div class="desk-section-title"><h2>好课，也来自一起准备</h2><span>让教学的日常更有条理</span></div><div class="desk-utilities">'+[['schedule','book','排课工作台','安排时段，检查冲突'],['online','team','在线教研组','分享教案，一起打磨'],['memory','spark','教学偏好','记住你确认的习惯'],['account','settings','账号与云端','保存教案，连接 AI']].map(c=>'<button data-teachgo="'+c[0]+'"><span class="desk-utility-icon">'+uiIcon(c[1])+'</span><span><strong>'+c[2]+'</strong><small>'+c[3]+'</small></span>'+uiIcon('arrow')+'</button>').join('')+'</div><div class="desk-footer"><span>启知未来 · 让每一次准备，都通向更好的课堂。</span><button data-teachgo="templates">浏览教学模板 →</button></div>';
};
const appearanceNav=nav;nav=function(){appearanceNav();document.querySelectorAll('#navigation .nav').forEach(el=>el.setAttribute('aria-current',el.classList.contains('active')?'page':'false'));};
const appearanceRender=render;render=function(){appearanceRender();document.querySelectorAll('[data-teachgo]').forEach(el=>el.onclick=()=>go(el.dataset.teachgo));};
`;
