export const notebookStyles=String.raw`<style id="qizhi-notebook-preview">
:root {
  --bg:#f1eee6; --surface:#fffdf7; --surface-soft:#f6f3eb; --sidebar:#eae6da;
  --ink:#242b25; --ink-soft:#424c43; --muted:#535f55; --line:#d6d1c4; --line-subtle:#e6e0d4;
  --notebook-board:#203b30; --notebook-paper:#fffaf0; --notebook-ink:#263a2f;
  --notebook-rule:#dbd8c8; --notebook-accent:#285743;
  --notebook-serif:"Noto Serif SC","Songti SC","SimSun",serif;
  --notebook-ease:cubic-bezier(.22,1,.36,1);
}
:root[data-mode="dark"] {
  --bg:#181b17; --surface:#232822; --surface-soft:#2c322a; --sidebar:#1f241e;
  --ink:#f2eddf; --ink-soft:#d0d5c8; --muted:#b5beae; --line:#454b3d; --line-subtle:#383e32;
  --notebook-board:#132c22; --notebook-paper:#2f3d31; --notebook-ink:#f0eddd;
  --notebook-rule:#526251; --notebook-accent:#a9d1b4;
}
.layout {grid-template-columns:248px minmax(0,1fr)}
.content {max-width:1536px;padding:32px}
.sidebar {padding:24px 16px}
.sidebar .brand {padding:0 8px 20px;border-color:var(--line)}
.sidebar .brandmark {width:36px;height:36px;border-radius:6px}
.sidebar .brand strong {font-size:18px;font-weight:600;letter-spacing:0}
.sidebar .brand small {font-size:10px;letter-spacing:0}
.sidebar .nav {padding:8px;gap:8px;min-height:36px;border-radius:6px}
.sidebar .nav.active {border-color:var(--line);background:var(--surface);color:var(--accent)}
.sidebar .nav .ui-icon {width:16px!important;height:16px!important}
.nav-caption {padding:16px 8px 4px}
.nav-help {border-radius:8px;background:transparent;padding:12px;margin:16px 0}
.nav-help button {border-radius:6px}
.topbar {height:60px;padding:0 32px}
.top-actions {gap:12px}
.notebook-return {color:var(--ink-soft);font-size:12px;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.notebook-return:hover {color:var(--accent)}
.btn,.input,input,textarea,select {border-radius:6px}
.btn {transition:background-color 140ms var(--notebook-ease),border-color 140ms var(--notebook-ease)}
.btn:focus-visible,.notebook-return:focus-visible {outline:2px solid var(--accent);outline-offset:3px}
.s2-card,.panel,.lessonpage,.prepform,.templatecard {border-radius:12px;box-shadow:none}
.s2-heading h1,.work-heading h1 {font-family:var(--notebook-serif);font-weight:600;letter-spacing:0}
.s2-heading p,.work-heading p {font-size:14px;line-height:1.7}
.notebook-head,.notebook-heading {display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.notebook-head {margin:0 0 12px;padding:0 0 8px;border-bottom:1px solid var(--line);font-size:13px;color:var(--muted)}
.notebook-head strong {color:var(--ink);font-size:14px;font-weight:600}
.notebook-head time {font-variant-numeric:tabular-nums}
.notebook-cover {display:grid;grid-template-columns:minmax(0, .94fr) minmax(0, 1.06fr);border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}
.notebook-cover-copy {display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:0;padding:32px}
.notebook-index {display:inline-flex;align-items:center;gap:8px;margin:0 0 16px;color:var(--muted);font-size:12px}
.notebook-index::before {content:"";width:16px;height:1px;background:currentColor}
.notebook-cover h1 {margin:0;color:var(--ink);font-family:var(--notebook-serif);font-size:clamp(34px,4.1vw,60px);font-weight:600;letter-spacing:-.02em;line-height:1.18}
.notebook-cover h1 span {display:block}
.notebook-cover-copy>p {max-width:29em;margin:16px 0 24px;color:var(--ink-soft);font-size:16px;line-height:1.75}
.notebook-actions {display:flex;flex-wrap:wrap;gap:8px}
.notebook-actions .btn {min-height:44px}
.notebook-actions .ui-icon {width:16px!important;height:16px!important}
.notebook-cover-copy>small {display:block;margin-top:12px;color:var(--muted);font-size:12px;line-height:1.55}
.notebook-board {display:grid;align-content:center;min-width:0;padding:24px;background:var(--notebook-board)}
.notebook-sheet {min-width:0;padding:20px 20px 16px;background:var(--notebook-paper);color:var(--notebook-ink);border:1px solid var(--notebook-rule);border-radius:8px}
.notebook-sheet-meta {display:flex;justify-content:space-between;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--notebook-rule);font-size:12px;line-height:1.5;font-variant-numeric:tabular-nums}
.notebook-sheet h2 {margin:8px 0 4px;color:var(--notebook-ink);font-family:var(--notebook-serif);font-size:clamp(22px,2.4vw,34px);line-height:1.3;font-weight:600}
.notebook-sheet>p {margin:0 0 12px;color:var(--notebook-accent);font-size:13px}
.notebook-track {display:flex;gap:2px;height:6px;margin-bottom:4px;overflow:hidden;border-radius:2px}
.notebook-track>span {flex-basis:0;background:var(--notebook-rule)}
.notebook-track>span[data-main] {background:var(--notebook-accent)}
.notebook-phases {list-style:none;margin:0;padding:0}
.notebook-phases li {display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:baseline;gap:4px;min-height:28px;padding:4px 0;border-bottom:1px solid var(--notebook-rule);font-size:13px;line-height:1.5}
.notebook-phases li:last-child {border:0}
.notebook-phases li[data-main] {color:var(--notebook-accent);font-weight:600}
.notebook-phases .notebook-minute {font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}
.notebook-sheet .notebook-mobile-note {display:none}
.notebook-heading {margin:24px 0 8px}
.notebook-heading h2 {margin:0;font-size:18px;font-weight:600}
.notebook-heading>span {color:var(--muted);font-size:12px}
.notebook-entries,.notebook-tools {display:grid;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:8px}
.notebook-entries {grid-template-columns:1.24fr 1fr 1fr}
.notebook-tools {grid-template-columns:repeat(4,minmax(0,1fr))}
.notebook-entry {display:grid;grid-template-columns:16px minmax(0,1fr) 16px;align-items:center;gap:12px;min-width:0;padding:12px;text-align:left;background:transparent;color:var(--ink);border-radius:0;transition:background-color 140ms var(--notebook-ease)}
.notebook-entry+.notebook-entry {border-left:1px solid var(--line)}
.notebook-entry:hover {background:var(--surface-soft)}
.notebook-entry:focus-visible {outline-offset:-3px}
.notebook-entry .ui-icon {width:16px!important;height:16px!important;color:var(--muted)}
.notebook-entry strong,.notebook-entry small {display:block;line-height:1.55}
.notebook-entry strong {font-size:14px;font-weight:600}
.notebook-entry small {margin-top:4px;color:var(--muted);font-size:12px}
.notebook-resume {display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;padding:12px 16px;border-left:2px solid var(--accent);background:var(--surface)}
.notebook-resume small {color:var(--muted);font-size:12px}
.notebook-resume h3 {margin:4px 0 0;font-size:16px;font-weight:600;overflow-wrap:anywhere}
.notebook-resume .btn {flex-shrink:0}
.notebook-footer {display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:20px;padding:12px 0;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
.notebook-footer button {padding:4px 0;background:transparent;color:var(--accent);font:inherit;text-decoration:underline;text-underline-offset:3px}
.work-heading {margin-bottom:16px}
.work-heading h1 {margin:4px 0 8px}
.prepform {top:76px;padding:20px}
.stagebar {gap:12px;margin-bottom:16px;padding:12px;background:var(--surface);border-radius:6px;font-size:12px}
.preptabs {gap:0;padding:0;margin-bottom:16px;border:0;border-bottom:1px solid var(--line);border-radius:0;background:transparent}
.preptabs button {flex:0 1 auto;padding:8px 12px;border:0;border-bottom:2px solid transparent;border-radius:0;box-shadow:none}
.preptabs button.active {background:transparent;border-color:var(--accent);box-shadow:none}
.lessonpage {background:var(--surface)}
.lessonpage h2 {font-family:var(--notebook-serif);font-weight:600}
.lessonsection h3 {letter-spacing:0;border-left-width:2px}
.pm-hero.s2-card {padding:20px}
.pm-hero.s2-card h3 {font-family:var(--notebook-serif);font-size:28px!important}
.pm-hero .pm-steps {gap:0;border:1px solid var(--line);border-radius:8px}
.pm-hero .pm-steps>div {display:grid;grid-template-columns:24px minmax(0,1fr);align-content:start;gap:4px;padding:12px;border:0;border-radius:0;background:transparent}
.pm-hero .pm-steps>div+div {border-left:1px solid var(--line)}
.pm-hero .pm-steps b {grid-row:span 2;font-size:12px}
.pm-hero .pm-steps span {grid-column:2;font-size:12px}
.pm-online-result .slidethumbs button {text-align:left;font-variant-numeric:tabular-nums}
@media(min-width:1025px) {
  .preplayout {grid-template-columns:288px minmax(0,1fr);gap:20px}
}
@media(max-width:1180px) {
  .layout {grid-template-columns:216px minmax(0,1fr)}
  .content,.topbar {padding-inline:24px}
  .notebook-cover-copy {padding:24px}
  .notebook-tools {grid-template-columns:repeat(2,minmax(0,1fr))}
  .notebook-tools>.notebook-entry:nth-child(3) {border-left:0}
  .notebook-tools>.notebook-entry:nth-child(n+3) {border-top:1px solid var(--line)}
}
@media(max-width:960px) {
  .notebook-cover-copy {padding:20px}
  .notebook-board {padding:12px}
  .notebook-sheet {padding:12px}
  .notebook-cover-copy>p {font-size:14px}
  .notebook-entries .notebook-entry {grid-template-columns:16px minmax(0,1fr);gap:8px}
  .notebook-entries .notebook-entry>.ui-icon:last-child {display:none}
}
@media(max-width:820px) {
  .notebook-cover {grid-template-columns:1fr}
  .notebook-cover-copy {padding:24px}
  .notebook-board {padding:16px}
  .notebook-sheet {padding:16px}
  .notebook-cover h1 {font-size:40px}
}
@media(max-width:768px) {
  .sidebar {padding:16px}
  .sidebar .brand {padding:0;border:0}
  .sidebar .nav {min-height:44px}
  .topbar {height:56px;padding:0 16px}
  .content {padding:20px 16px}
  .top-actions .status {display:none}
  .notebook-heading>span {display:none}
  .prepform {padding:16px}
  .preptabs {flex-wrap:wrap}
  .notebook-entries {grid-template-columns:1fr}
  .notebook-entries>.notebook-entry {grid-template-columns:16px minmax(0,1fr) 16px}
  .notebook-entries>.notebook-entry>.ui-icon:last-child {display:block}
  .notebook-entries>.notebook-entry+.notebook-entry {border-left:0;border-top:1px solid var(--line)}
  .pm-hero .pm-steps>div+div {border-left:0;border-top:1px solid var(--line)}
}
@media (min-width:701px) and (max-width:768px) {
  .pm-hero .pm-steps {grid-template-columns:1fr}
}
@media(max-width:480px) {
  .notebook-cover-copy {padding:20px}
  .notebook-cover h1 {font-size:36px}
  .notebook-cover-copy>p {margin:12px 0 16px}
  .notebook-sheet h2 {font-size:26px}
  .notebook-phases li:nth-child(n+4) {display:none}
  .notebook-sheet .notebook-mobile-note {display:block;margin:8px 0 0;font-size:12px}
  .notebook-tools .notebook-entry {grid-template-columns:16px minmax(0,1fr);gap:8px}
  .notebook-tools .notebook-entry>.ui-icon:last-child {display:none}
  .notebook-resume {flex-wrap:wrap}
}
@media print {
  .notebook-return {display:none}
}
</style>`;

export const notebookClient=String.raw`
const notebookExit=document.createElement('a');
notebookExit.href='/';
notebookExit.className='notebook-return';
notebookExit.textContent='查看正式版';
document.querySelector('.top-actions').prepend(notebookExit);

const notebookPrepPage=prepPage;
prepPage=function(){
 return notebookPrepPage()
  .replace('YOUR LESSON STUDIO','备课案')
  .replace('把这节课，准备得更好。','教案与课件')
  .replace('从课题开始，准备一节好课。','新建教案');
};

const notebookEntries=[
 ['prep','edit','备课与课件','填写条件、编辑教案、制作 PPT'],
 ['templates','book','教学模板','选一个课堂框架再调整'],
 ['team','team','团队备课','分配任务、交换备课包']
];
const notebookTools=[
 ['schedule','book','排课工作台','安排课次，检查冲突'],
 ['online','team','在线教研组','共享教案，留下意见'],
 ['memory','check','教学偏好','管理备课规则'],
 ['account','settings','账号与云端','同步教案，绑定密钥']
];
function notebookEntry([route,icon,title,detail]){
 return '<button class="notebook-entry" data-teachgo="'+route+'">'+uiIcon(icon)+
  '<span><strong>'+title+'</strong><small>'+detail+'</small></span>'+uiIcon('arrow')+'</button>';
}
function notebookLessonSheet(){
 const [topic,subtitle]=sample.title.split('：',2);
 const duration=sample.phases.reduce((total,phase)=>total+phase.minutes,0);
 const longest=Math.max(...sample.phases.map(phase=>phase.minutes));
 let minute=0;
 const rows=sample.phases.map(phase=>{
  const start=String(minute).padStart(2,'0');
  minute+=phase.minutes;
  return '<li'+(phase.minutes===longest?' data-main':'')+'><span class="notebook-minute">'+start+'′</span>'+
   '<span>'+esc(phase.name)+'</span><span class="notebook-minute">'+phase.minutes+' 分钟</span></li>';
 }).join('');
 const track=sample.phases.map(phase=>'<span style="flex-grow:'+phase.minutes+'"'+(phase.minutes===longest?' data-main':'')+'></span>').join('');
 return '<div class="notebook-board"><section class="notebook-sheet" aria-labelledby="notebookLessonTitle">'+
  '<div class="notebook-sheet-meta"><span>示例课案 · 小学科学</span><span>'+duration+' 分钟</span></div>'+
  '<h2 id="notebookLessonTitle">'+esc(topic)+'</h2><p>'+esc(subtitle||'课堂流程')+'</p>'+
  '<div class="notebook-track" aria-hidden="true">'+track+'</div><ol class="notebook-phases" aria-label="示例课案的课堂流程">'+rows+'</ol>'+
  '<p class="notebook-mobile-note">前三个环节 · 完整流程见示例教案</p></section></div>';
}
home=function(){
 const {lesson,job}=T();
 const resumeTitle=lesson?.title||(!job?.complete?job?.brief?.topic:'');
 const date=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Shanghai'}).format(new Date());
 const resume=resumeTitle?'<section class="notebook-resume"><div><small>'+(lesson?'本机教案':'尚未完成的备课')+'</small><h3>'+esc(resumeTitle)+'</h3></div><button class="btn" data-teachgo="prep">继续备课</button></section>':'';
 return '<div class="notebook-head"><strong>备课工作台</strong><time>'+date+'</time></div>'+
  '<section class="notebook-cover" aria-labelledby="notebookCoverTitle"><div class="notebook-cover-copy">'+
  '<span class="notebook-index">启知未来 · 备课本</span><h1 id="notebookCoverTitle">备好一节课<span>带走一套课件</span></h1>'+
  '<p>为教师和支教团队写教案、安排课堂活动，制作可编辑的 PPT。</p>'+
  '<div class="notebook-actions"><button class="btn primary" id="startStudio">开始备课 '+uiIcon('arrow')+'</button>'+
  '<button class="btn" id="judgeDemo">免登录体验示例</button></div>'+
  '<small>使用 AI 生成教案或课件时，需绑定个人 DeepSeek 密钥。</small></div>'+notebookLessonSheet()+'</section>'+
  '<div class="notebook-heading"><h2>备课入口</h2><span>教案、模板、分工</span></div>'+
  '<div class="notebook-entries">'+notebookEntries.map(notebookEntry).join('')+'</div>'+resume+
  '<div class="notebook-heading"><h2>协作与设置</h2></div>'+
  '<div class="notebook-tools">'+notebookTools.map(notebookEntry).join('')+'</div>'+
  '<footer class="notebook-footer"><span>启知未来 · 协同备课工作台</span><button data-teachgo="templates">浏览教学模板</button></footer>';
};
`;
