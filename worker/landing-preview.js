export const landingPreviewStyles=String.raw`<style id="qizhi-landing-preview">
:root {
  --landing-font:Geist,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;
  --landing-headline-start:#000;--landing-headline-end:#666;
  --landing-canvas-ink:#f1efe4;--landing-canvas-line:#6b8577;
}
:root[data-mode="dark"] {
  --landing-headline-start:#fff;--landing-headline-end:#9b9b9b;
  --bg:#181818;--surface:#1f1f1f;--surface-soft:#272727;--sidebar:#1f1f1f;
  --notebook-board:#272727;--notebook-paper:#1f1f1f;--notebook-rule:#526251;
}
body,.s2-heading h1,.work-heading h1,.lessonpage h2,.pm-hero.s2-card h3 {font-family:var(--landing-font)}
.landing-skip {position:fixed;top:8px;left:8px;z-index:50;padding:8px 12px;background:var(--surface);color:var(--ink);border-radius:8px;transform:translateY(-160%)}
.landing-skip:focus {transform:none}
.sidebar .nav {font-size:14px;line-height:20px;transition:background-color 300ms var(--notebook-ease)}
.sidebar .nav.active {background:var(--pale);border-color:var(--pale-border);color:var(--accent)}
.landing-home {max-width:1280px;margin-inline:auto}
.landing-head {display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--line);font-size:12px;line-height:16px;color:var(--muted)}
.landing-head strong {font-size:14px;line-height:20px;font-weight:600;color:var(--ink)}
.landing-head time {font-variant-numeric:tabular-nums}
.landing-hero {display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);align-items:center;gap:32px;padding:32px 0 40px}
.landing-hero-copy {min-width:0}
.landing-eyebrow {display:flex;align-items:center;gap:8px;margin:0 0 16px;color:var(--accent);font-size:14px;line-height:20px;font-weight:600}
.landing-eyebrow::before {content:"";width:16px;height:2px;background:currentColor}
.landing-hero h1 {margin:0;max-width:680px;color:var(--ink);font-size:60px;line-height:1;font-weight:600;letter-spacing:-.05em;text-wrap:balance}
.landing-hero h1 span {display:block;padding-bottom:4px}
@supports (background-clip:text) {
  .landing-hero h1 {background:linear-gradient(90deg,var(--landing-headline-start),var(--landing-headline-end));background-clip:text;color:transparent}
}
.landing-lede {max-width: min(680px,26em);margin:16px 0 24px;color:var(--ink-soft);font-size:16px;line-height:24px;text-wrap:pretty}
.landing-actions {display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px}
.landing-home .landing-primary {display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:8px 12px;border-radius:8px;font-size:16px;line-height:24px;font-weight:600}
.landing-primary .ui-icon,.landing-demo .ui-icon {width:16px!important;height:16px!important}
.landing-demo {display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:8px 0;background:transparent;color:var(--ink);font-size:14px;line-height:20px;font-weight:500;text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:4px}
.landing-demo:hover {color:var(--accent);text-decoration-color:currentColor}
.landing-note {display:block;margin-top:12px;color:var(--muted);font-size:12px;line-height:16px;text-wrap:pretty}
.landing-canvas {min-width:0;margin:0;padding:24px;background:var(--notebook-board);border-radius:24px;color:var(--landing-canvas-ink)}
.landing-canvas-label {display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;font-size:12px;line-height:16px;font-weight:500}
.landing-canvas-label span:first-child {display:flex;align-items:center;gap:8px}
.landing-canvas-label span:first-child::before {content:"";width:8px;height:8px;border-radius:50%;background:#aec3a6}
.landing-canvas .notebook-board {padding:0;min-height:0;background:transparent}
.landing-canvas .notebook-sheet {padding:24px;border-radius:8px}
.landing-canvas .notebook-sheet h2 {margin:8px 0 12px;font:600 24px/32px var(--landing-font);overflow-wrap:anywhere;text-wrap:balance}
.landing-canvas .notebook-structure-rows li {grid-template-columns:24px 64px minmax(0,1fr);min-height:44px}
.landing-canvas .notebook-structure-rows strong {font-size:14px;line-height:20px}
.landing-canvas .notebook-structure-question {font-size:12px;line-height:16px}
.landing-canvas .notebook-sheet-meta,.landing-canvas .notebook-sheet>p {font-size:12px;line-height:16px}
.landing-canvas figcaption {margin-top:12px;padding-top:8px;border-top:1px solid var(--landing-canvas-line);font-size:12px;line-height:16px}
.landing-home .notebook-resume {margin:0 0 24px;padding:16px;border:1px solid var(--line);border-radius:8px}
.landing-section {margin-bottom:32px}
.landing-section-heading {display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:12px}
.landing-section-heading h2 {margin:0;font-size:24px;line-height:32px;font-weight:600;text-wrap:balance}
.landing-section-heading p {margin:0;color:var(--muted);font-size:12px;line-height:16px}
.landing-home .notebook-entries,.landing-home .notebook-tools {gap:8px;background:none;border:0;overflow:visible}
.landing-home .notebook-entries {grid-template-columns:1.35fr 1fr 1fr}
.landing-home .notebook-entry {padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--surface);grid-template-columns:16px minmax(0,1fr) 16px;gap:12px;transition:background-color 300ms var(--notebook-ease),transform 500ms var(--notebook-ease)}
.landing-home .notebook-entries .notebook-entry:first-child {background:var(--pale);border-color:var(--pale-border)}
.landing-home .notebook-entry:hover {background:var(--surface-soft)}
.landing-home .notebook-entry:focus-visible {outline-offset:2px}
.landing-home .notebook-entry strong {font-size:16px;line-height:24px}
.landing-home .notebook-entry small {font-size:12px;line-height:16px}
.landing-primary,.landing-demo {transition:background-color 300ms var(--notebook-ease),color 300ms var(--notebook-ease),transform 500ms var(--notebook-ease)}
.landing-primary:active,.landing-demo:active,.landing-home .notebook-entry:active {transform:translateY(1px)}
.landing-workflow {display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:32px;padding:24px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.landing-workflow .landing-section-heading {display:block;margin:0}
.landing-workflow .landing-section-heading p {margin-top:8px;font-size:14px;line-height:20px;text-wrap:pretty}
.landing-steps {list-style:none;margin:0;padding:0}
.landing-steps li {display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px;align-items:start;padding:12px 0;border-bottom:1px solid var(--line-subtle)}
.landing-steps li:first-child {padding-top:0}
.landing-steps li:last-child {padding-bottom:0;border:0}
.landing-step-number {display:grid;place-items:center;min-height:32px;border:1px solid var(--pale-border);border-radius:6px;color:var(--accent);background:var(--pale);font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
.landing-steps strong {font-size:16px;line-height:24px;font-weight:600}
.landing-steps p {margin:4px 0 0;color:var(--ink-soft);font-size:14px;line-height:20px;text-wrap:pretty}
.landing-tagline {display:grid;align-items:end;grid-template-columns:minmax(0,1fr) auto;gap:24px;padding:32px 0;border-top:1px solid var(--line)}
.landing-tagline h2 {max-width:680px;margin:0;font-size:36px;line-height:40px;font-weight:600;letter-spacing:-.03em;text-wrap:balance}
.landing-tagline-line {display:block}
.landing-tagline-word {transition:opacity 700ms var(--notebook-ease);transition-delay:calc(var(--word-order)*60ms)}
.landing-tagline[data-motion]:not([data-revealed]) .landing-tagline-word {opacity:.35}
.landing-home .notebook-footer {margin:0;padding-top:16px;font-size:12px;line-height:16px}
@media(max-width:1180px) {
  .landing-hero h1 {font-size:48px}
  .landing-hero {gap:24px}
}
@media(max-width:960px) {
  .landing-hero h1 {font-size:36px;line-height:40px}
  .landing-home .notebook-entry {padding:12px;gap:8px;grid-template-columns:16px minmax(0,1fr)}
}
@media(max-width:820px) {
  .landing-hero {grid-template-columns:1fr;padding:24px 0 32px}
  .landing-canvas {padding:16px}
  .landing-canvas .notebook-sheet {padding:16px}
}
@media(max-width:768px) {
  .landing-workflow,.landing-tagline {grid-template-columns:minmax(0,1fr);gap:16px}
  .landing-home .notebook-entries {grid-template-columns:1fr}
  .landing-home .notebook-entry {min-height:56px}
  .landing-home .notebook-entries>.notebook-entry {grid-template-columns:16px minmax(0,1fr) 16px}
  .landing-tagline {justify-items:start}
  .landing-tagline h2 {font-size:30px;line-height:36px}
  .nav-open {overflow:hidden}
  .nav-open .sidebar {position:fixed;inset:0;width:100%;height:100dvh;z-index:20;background:var(--sidebar)}
  .nav-open .sidebar nav {margin-top:16px}
}
@media(max-width:360px) {
  .landing-canvas .notebook-structure-rows li {grid-template-columns:16px 56px minmax(0,1fr);gap:4px}
}
@media(prefers-reduced-motion:reduce) {
  .landing-tagline[data-motion]:not([data-revealed]) .landing-tagline-word {opacity:1}
  .landing-primary:active,.landing-demo:active,.landing-home .notebook-entry:active {transform:none}
}
</style>`;

export const landingPreviewClient=String.raw`
const landingSkip=document.createElement('a');
landingSkip.href='#content';
landingSkip.className='landing-skip';
landingSkip.textContent='跳到主要内容';
document.body.prepend(landingSkip);
$('content').tabIndex=-1;
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&document.body.classList.contains('nav-open')){
  $('menuToggle').click();
  $('menuToggle').focus();
 }
});

const landingNav=nav;
nav=function(){
 landingNav();
 $('navigation').querySelector('.nav.active')?.setAttribute('aria-current','page');
};

const landingSteps=[
 ['填写课题','写明年级、学科和课时，有现成资料也可导入。'],
 ['审阅教案','核对教学目标、课堂活动和评价，按班级情况编辑。'],
 ['制作课件','以确认后的教案为基础，制作可编辑的课堂 PPT。']
];
const landingObserver=typeof IntersectionObserver==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches
 ?new IntersectionObserver(([entry],observer)=>{
  if(!entry.isIntersecting)return;
  entry.target.setAttribute('data-revealed','');
  observer.unobserve(entry.target);
 },{threshold:.35}):null;
const landingRender=render;
render=function(){
 landingRender();
 if(landingObserver){
  landingObserver.disconnect();
  const tagline=$('landingTagline');
  if(tagline)landingObserver.observe(tagline);
 }
};

home=function(){
 const {brief}=T(),lesson=lessonForBrief(),job=jobForBrief();
 const resumeTitle=lesson?.title||(!job?.complete?job?.brief?.topic:'');
 const date=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Shanghai'}).format(new Date());
 const resume=resumeTitle?'<section class="notebook-resume"><div><small>'+(lesson?'本机教案':'尚未完成的备课')+'</small><h3>'+esc(resumeTitle)+'</h3></div><button class="btn" data-teachgo="prep">继续备课</button></section>':'';
 const steps=landingSteps.map(([title,detail],index)=>'<li><span class="landing-step-number" aria-hidden="true">0'+(index+1)+'</span><div><strong>'+title+'</strong><p>'+detail+'</p></div></li>').join('');
 return '<div class="landing-home"><header class="landing-head"><strong>备课工作台</strong><time>'+date+'</time></header>'+
  '<section class="landing-hero" aria-labelledby="landingTitle"><div class="landing-hero-copy">'+
  '<p class="landing-eyebrow">给教师与支教团队</p><h1 id="landingTitle"><span>从一个课题</span><span>备好一堂课</span></h1>'+
  '<p class="landing-lede">输入课题、年级和课时，整理教学目标与课堂活动。审阅教案后，再制作可编辑的 PPT。</p>'+
  '<div class="landing-actions"><button type="button" class="btn primary landing-primary" id="startStudio">开始备课 '+uiIcon('arrow')+'</button>'+
  '<button type="button" class="landing-demo" id="judgeDemo">免登录体验示例</button></div>'+
  '<small class="landing-note">AI 生成需绑定个人 DeepSeek 密钥</small></div>'+
  '<figure class="landing-canvas"><div class="landing-canvas-label"><span>备课手册</span><span>'+(lesson||brief.topic?.trim()?'当前备课':'教案预览')+'</span></div>'+
  notebookLessonSheet(lesson,brief)+'<figcaption>教学设计 · 启知未来</figcaption></figure></section>'+resume+
  '<section class="landing-section" aria-labelledby="landingEntries"><div class="landing-section-heading"><h2 id="landingEntries">备课入口</h2><p>教案、模板与团队分工</p></div>'+
  '<div class="notebook-entries">'+notebookEntries.map(notebookEntry).join('')+'</div></section>'+
  '<section class="landing-section landing-workflow" aria-labelledby="landingWorkflow"><div class="landing-section-heading"><h2 id="landingWorkflow">从课题到课件</h2><p>按自己的节奏准备，上课前逐项核对。</p></div><ol class="landing-steps" role="list">'+steps+'</ol></section>'+
  '<section class="landing-section" aria-labelledby="landingTools"><div class="landing-section-heading"><h2 id="landingTools">协作与设置</h2></div>'+
  '<div class="notebook-tools">'+notebookTools.map(notebookEntry).join('')+'</div></section>'+
  '<section class="landing-tagline" id="landingTagline"'+(landingObserver?' data-motion':'')+'>'+
  '<h2><span class="landing-tagline-line"><span class="landing-tagline-word" style="--word-order:0">先看清</span><span class="landing-tagline-word" style="--word-order:1">这堂课怎么教</span></span>'+
  '<span class="landing-tagline-line"><span class="landing-tagline-word" style="--word-order:2">再把课堂流程</span><span class="landing-tagline-word" style="--word-order:3">做成课件</span></span></h2>'+
  '<button type="button" class="btn primary landing-primary" data-teachgo="prep">开始备课 '+uiIcon('arrow')+'</button></section>'+
  '<footer class="notebook-footer"><span>启知未来 · 协同备课工作台</span><button type="button" data-teachgo="templates">浏览教学模板</button></footer></div>';
};
`;
