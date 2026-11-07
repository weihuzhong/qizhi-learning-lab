const profiles={
 young:{label:'幼儿园与小学低年级',guide:'每页一个动作或问题。用大字、鲜明暖色和贴合课题的可编辑插画；多画具体物体、人物动作、配对和对照。正文只保留两到三句短句，说明放在教师备注。',paper:'#FFF7E3',ink:'#193455',accent:'#087482',wash:'#E4F3F8',pop:'#F4AB43',body:36},
 primary:{label:'小学中高年级',guide:'用标注式插图、分步实验图和简单表格。每个插图配一个观察或解释问题，每页三到四个短要点。',paper:'#F1FAF5',ink:'#1F3931',accent:'#13725A',wash:'#DCEFE4',pop:'#EBAA55',body:32},
 middle:{label:'初中',guide:'用概念关系、实验变量和流程图解释原理，减少装饰。先展示证据，再用问题要求解释或迁移。',paper:'#F5F7FC',ink:'#182D45',accent:'#284D80',wash:'#E4EBF7',pop:'#6986BC',body:30},
 senior:{label:'高中及以上',guide:'优先使用假设、证据、推理和结论构成的严谨图表，区分事实与待验证猜想。使用低饱和配色，保留必要的术语、比较条件和资料来源。',paper:'#F7F5F0',ink:'#23292E',accent:'#395057',wash:'#E6EBEB',pop:'#7A918D',body:30},
};

export function classroomProfile(brief={}){
 const grade=String(brief.grade||'');
 const detected=/高中|高[一二三]|大学|成人|十[一二]?年级|(?:10|11|12)年级/.test(grade)?'senior':
  /幼儿|学前|小班|中班|大班|低年级|[一二三123]年级|(?:^|[^0-9])[3-8]岁/.test(grade)?'young':
  /初中|初[一二三]|[七八九789]年级/.test(grade)?'middle':'primary';
 return profiles[Object.hasOwn(profiles,brief.audience)?brief.audience:detected];
}

const xml=value=>String(value||'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\uD800-\uDFFF]/gu,'')
 .replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const rect=(x,y,w,h,fill,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const line=(x,y,x2,y2,stroke,width=5)=>`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`;
const group=(name,bounds,children)=>`<g id="${name}" data-pptx-bounds="${bounds}">${children}</g>`;
function text(value,x,y,size,color,bold=false){
 return `<text x="${x}" y="${y}" font-family="Microsoft YaHei" font-size="${size}" fill="${color}"${bold?' font-weight="bold"':''}>${xml(value)}</text>`;
}
function lines(value,width,limit){
 const input=Array.from(clean(value)),out=[];
 for(let i=0;i<input.length&&out.length<limit;i+=width){
  const last=out.length===limit-1&&i+width<input.length;
  out.push(input.slice(i,i+width-(last?1:0)).join('')+(last?'…':''));
 }
 return out;
}
function illustration(topic,profile,n,kind){
 const {wash,accent,pop}=profile;
 const base=rect(872,242,316,334,wash,24);
 if(profile===profiles.senior){
  return base+['条件','证据','结论'].map((label,index)=>{
   const y=290+index*80;
   return rect(910,y,240,54,index===n%3?accent:profile.paper,8)+
    text(label,940,y+37,26,index===n%3?'#FFFFFF':profile.ink,true);
  }).join('');
 }
 if(profile===profiles.middle){
  const labels=/实验|科学|纸桥|观察|沉浮|物理|化学/.test(topic)?['比较条件','观察记录','解释结果']:['概念','联系','应用'];
  return base+line(912,309,912,506,accent,5)+labels.map((label,index)=>{
   const y=283+index*86;
   return circle(912,y+28,9,index===n%3?pop:accent)+rect(934,y,220,56,profile.paper,6)+
    text(label,950,y+37,25,profile.ink,true);
  }).join('');
 }
 if(/纸桥/.test(topic)&&kind!=='ending'){
  const scenery=profile===profiles.young?circle(945,320,26,pop)+circle(1118,315,13,profile.paper)+
   circle(1137,319,15,profile.paper)+rect(1105,320,48,9,profile.paper,4):'';
  return base+scenery+rect(903,423,54,78,accent,4)+rect(1102,423,54,78,accent,4)+
   '<polygon points="911,413 946,387 1114,387 1148,413 1148,431 911,431" fill="'+pop+'"/>'+
   line(954,413,1105,413,accent,4)+circle(1029,356,21,accent);
 }
 if(/沉浮|沉与浮/.test(topic)&&kind!=='ending'){
  return base+rect(908,401,244,104,accent,12)+rect(916,414,228,70,profile.paper,8)+
   line(932,430,1126,430,pop,5)+rect(1006,346,50,60,pop,8);
 }
 if(/阅读|语文|故事|诗|绘本|写作|词/.test(topic)){
  return base+rect(910,330,112,154,accent,8)+rect(1025,330,124,154,pop,8)+
   line(1024,326,1024,497,accent,4)+[368,397,426].map(y=>line(934,y,1002,y,wash,4)+line(1050,y,1127,y,wash,4)).join('');
 }
 if(/分数|图形|形状|数学|几何|数量/.test(topic)){
  return base+circle(1029,396,94,pop)+line(935,396,1123,396,accent,6)+line(1029,302,1029,490,accent,6)+
   rect(932,516,194,16,accent,8);
 }
 if(/实验|科学|观察|生物|植物|浮|桥|物理|化学/.test(topic)&&n%2===1){
  return base+circle(1012,385,73,pop)+circle(1012,385,52,wash)+line(1066,440,1122,503,accent,15)+
   circle(1012,385,14,accent)+line(982,385,1042,385,accent,4)+line(1012,355,1012,415,accent,4);
 }
 if(kind==='cover'||profile===profiles.young){
  return base+circle(970,347,52,pop)+rect(1029,390,102,102,accent,12)+
   line(965,446,965,505,accent,8)+circle(965,517,13,accent)+
   circle(1091,328,19,pop);
 }
 return base+[0,1,2].map(i=>rect(916,310+i*70,218-i*32,38,i===n%3?pop:accent,8)).join('');
}

export function classroomPage(job,number){
 const {lesson,count}=job,profile=classroomProfile(job.brief);
 const young=profile===profiles.young;
 const phaseIndex=number>2&&number<count?Math.min(lesson.phases.length-1,Math.floor((number-3)*lesson.phases.length/Math.max(1,count-3))):0;
 const phase=lesson.phases[phaseIndex];
 const compact=count===4&&number===3;
 const selected=compact?lesson.phases.map(p=>p.name+'：'+p.student):[phase?.student,phase?.check].filter(Boolean);
 const cover=number===1,last=number===count,goals=number===2;
 const kind=cover?'cover':last?'ending':'content';
 const title=cover?lesson.title:last?(young?'说一说，试一试':'回顾与练习'):goals?(young?'今天要做什么':'这节课要学什么'):compact?'课堂活动':phase?.name||'课堂活动';
 const entries=cover?lesson.objectives.slice(0,1):last?[...(lesson.assessment||[]),...(lesson.homework||[])]:goals?lesson.objectives:selected;
 const detail=entries.map(clean).filter(Boolean);
 const titleLines=lines(title,22,2);
 const body=detail.slice(0,3).flatMap((item,i)=>lines((detail.length>1?(i+1)+'  ':'')+item,young?16:21,2));
 const note=[lesson.title+' · '+title,
  ...(cover||goals?lesson.objectives:last?[...lesson.assessment,...lesson.homework]:
   compact?lesson.phases.map(p=>p.name+'：'+p.teacher+'；'+p.student+'；'+p.check):
   [phase?.teacher,phase?.student,phase?.check]),'请根据教材和学生实际情况核对后使用。'].filter(Boolean).join('\n');
 const heading=text((clean(job.brief?.grade).slice(0,24)||profile.label)+'课堂',90,75,24,profile.accent,true)+
  titleLines.map((item,i)=>text(item,90,132+i*49,44,profile.ink,true)).join('');
 const contentX=young?532:82,textX=contentX+28;
 const content=rect(contentX,242,young?656:746,334,profile.wash,24)+
  text(cover?'今天的任务':last?'想一想，做一做':goals?'学习目标':'观察与行动',textX,296,24,profile.accent,true)+
  body.map((item,i)=>text(item,textX,350+i*39,profile.body,profile.ink)).join('');
 const visual=illustration(lesson.title+' '+(job.brief?.subject||''),profile,number,kind);
 const footer=text('启知未来  ·  课堂初稿',90,664,20,profile.accent)+text(number+' / '+count,1098,664,20,profile.accent);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="${kind}" font-family="Microsoft YaHei">`+
  rect(0,0,1280,720,profile.paper)+group('heading','64 38 1152 167',heading)+
  (young?group('visual','64 224 444 386','<g transform="translate(-1010 -47) scale(1.25 1.12)">'+visual+'</g>')+
   group('content','516 224 690 386',content):group('content','64 224 784 370',content)+group('visual','854 224 352 370',visual))+
  group('footer','64 620 1152 74',footer)+'</svg>';
 return {number,svg,notes:note.slice(0,1500)};
}
