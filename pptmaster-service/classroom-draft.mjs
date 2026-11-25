const profiles={
  young:{label:'幼儿园与小学低年级',guide:'每页一个动作或问题。用大字、鲜明暖色和贴合课题的可编辑插画；多画具体物体、人物动作、配对和对照。正文只保留两到三句短句，说明放在教师备注。',dark:'#0F2357',primary:'#1E3A8A',paper:'#F8FAFC',card:'#FFFFFF',ink:'#1E293B',muted:'#475569',accent:'#1E3A8A',wash:'#EEF2FF',pop:'#F59E0B',popWash:'#FEF3C7',rule:'#E2E8F0',lightText:'#CBD5E1',body:34},
  primary:{label:'小学中高年级',guide:'用标注式插图、分步实验图和简单表格。每个插图配一个观察或解释问题，每页三到四个短要点。',dark:'#0F2357',primary:'#1E3A8A',paper:'#F8FAFC',card:'#FFFFFF',ink:'#1E293B',muted:'#475569',accent:'#1E3A8A',wash:'#EEF2FF',pop:'#F59E0B',popWash:'#FEF3C7',rule:'#E2E8F0',lightText:'#CBD5E1',body:32},
  middle:{label:'初中',guide:'用概念关系、实验变量和流程图解释原理，减少装饰。先展示证据，再用问题要求解释或迁移。',dark:'#0F2357',primary:'#1E3A8A',paper:'#F8FAFC',card:'#FFFFFF',ink:'#1E293B',muted:'#475569',accent:'#1E3A8A',wash:'#EEF2FF',pop:'#F59E0B',popWash:'#FEF3C7',rule:'#E2E8F0',lightText:'#CBD5E1',body:30},
  senior:{label:'高中及以上',guide:'优先使用假设、证据、推理和结论构成的严谨图表，区分事实与待验证猜想。使用低饱和配色，保留必要的术语、比较条件和资料来源。',dark:'#0F2357',primary:'#1E3A8A',paper:'#F8FAFC',card:'#FFFFFF',ink:'#1E293B',muted:'#475569',accent:'#1E3A8A',wash:'#EEF2FF',pop:'#F59E0B',popWash:'#FEF3C7',rule:'#E2E8F0',lightText:'#CBD5E1',body:30},
};

export function classroomProfile(brief={}){
  const grade=String(brief.grade||'');
  const detected=/高中|高[一二三]|大学|成人|十[一二]?年级|(?:10|11|12)年级/.test(grade)?'senior':
    /幼儿|学前|小班|中班|大班|低年级|[一二三123]年级|(?:^|[^0-9])[3-8]岁/.test(grade)?'young':
    /初中|初[一二三]|[七八九789]年级/.test(grade)?'middle':'primary';
  return profiles[Object.hasOwn(profiles,brief.audience)?brief.audience:detected];
}

const xml=value=>String(value||'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\uD800-\uDFFF]/gu,'')
  .replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const rect=(x,y,w,h,fill,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const strokeRect=(x,y,w,h,fill,stroke,rx=16,sw=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const line=(x,y,x2,y2,stroke,width=5)=>`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`;
const group=(name,bounds,children)=>`<g id="${name}" data-pptx-bounds="${bounds}">${children}</g>`;

function text(value,x,y,size,color,bold=false,anchor='start'){
  const a=anchor==='start'?'':` text-anchor="${anchor}"`;
  return `<text x="${x}" y="${y}" font-family="Microsoft YaHei" font-size="${size}" fill="${color}"${bold?' font-weight="bold"':''}${a}>${xml(value)}</text>`;
}

function wrapLines(value,width,limit){
  const input=Array.from(clean(value)),out=[];
  for(let i=0;i<input.length&&out.length<limit;i+=width){
    const last=out.length===limit-1&&i+width<input.length;
    out.push(input.slice(i,i+width-(last?1:0)).join('')+(last?'…':''));
  }
  return out.length?out:[''];
}

function splitPoints(items,fallback=[]){
  const raw=(items||[]).flatMap(item=>clean(item).split(/[；;。\n]+/)).map(clean).filter(Boolean);
  if(raw.length)return raw;
  return fallback.map(clean).filter(Boolean);
}

function headerGroup(profile,tag,titleText){
  const tLines=wrapLines(titleText,26,1);
  return group('header','64 28 1152 126',
    rect(64,34,240,34,profile.wash,17)+
    text(tag,184,58,18,profile.primary,true,'middle')+
    text(tLines[0],64,122,40,profile.ink,true)+
    rect(64,146,1152,3,profile.rule,1)
  );
}

function footerGroup(profile,number,count,layoutName){
  return group('footer','64 654 1152 44',
    text('启知未来 · '+layoutName,64,682,18,profile.muted)+
    text(number+' / '+count,1216,682,18,profile.primary,true,'end')
  );
}

function topicGraphic(topic,profile,x,y,w,h,onDark=false){
  const bg=onDark?profile.primary:profile.card;
  const soft=onDark?'#314EA8':profile.wash;
  const fg=onDark?'#FFFFFF':profile.primary;
  const pop=profile.pop;
  const cx=Math.round(x+w/2),cy=Math.round(y+h/2);
  let art=strokeRect(x,y,w,h,bg,onDark?pop:profile.rule,20,onDark?2:2);
  if(/纸桥/.test(topic)){
    art+=rect(x+36,cy+44,64,88,fg,6)+rect(x+w-100,cy+44,64,88,fg,6)+
      `<polygon points="${x+44},${cy+34} ${x+88},${cy+4} ${x+w-88},${cy+4} ${x+w-44},${cy+34} ${x+w-44},${cy+52} ${x+44},${cy+52}" fill="${pop}"/>`+
      line(x+96,cy+34,x+w-96,cy+34,fg,5)+circle(cx,cy-28,24,fg);
  }else if(/沉浮|沉与浮/.test(topic)){
    art+=rect(x+44,cy+10,w-88,120,fg,14)+rect(x+54,cy+24,w-108,84,soft,10)+
      line(x+70,cy+44,x+w-70,cy+44,pop,6)+rect(cx-28,cy-46,56,64,pop,10);
  }else if(/阅读|语文|故事|诗|绘本|写作|词/.test(topic)){
    art+=rect(cx-122,cy-78,116,156,fg,10)+rect(cx+6,cy-78,116,156,pop,10)+
      line(cx,cy-82,cx,cy+86,soft,5)+
      [-36,-6,24].map(dy=>line(cx-96,cy+dy,cx-28,cy+dy,soft,5)+line(cx+28,cy+dy,cx+96,cy+dy,onDark?'#0F2357':bg,5)).join('');
  }else if(/分数|图形|形状|数学|几何|数量/.test(topic)){
    art+=circle(cx,cy-12,92,pop)+line(cx-92,cy-12,cx+92,cy-12,fg,6)+
      line(cx,cy-104,cx,cy+80,fg,6)+rect(cx-96,cy+104,192,16,fg,8);
  }else if(/实验|科学|观察|生物|植物|物理|化学/.test(topic)){
    art+=circle(cx-16,cy-16,74,pop)+circle(cx-16,cy-16,52,soft)+
      line(cx+38,cy+38,cx+96,cy+98,fg,16)+
      circle(cx-16,cy-16,14,fg)+line(cx-44,cy-16,cx+12,cy-16,fg,4)+line(cx-16,cy-44,cx-16,cy+12,fg,4);
  }else{
    art+=circle(cx,cy-54,54,soft)+circle(cx,cy-54,28,pop)+
      rect(x+54,cy+26,w-108,24,fg,12)+
      rect(x+78,cy+66,w-156,18,soft,9)+
      rect(x+96,cy+98,w-192,18,pop,9);
  }
  return art;
}

function buildCover(job,profile){
  const {lesson,brief}=job;
  const titleLines=wrapLines(lesson.title||'教学课件',14,2);
  const subLines=wrapLines(lesson.objectives?.[0]||'聚焦核心概念与课堂探究任务',24,2);
  const meta=[clean(brief?.grade)||profile.label,clean(brief?.subject),'启知未来课件'].filter(Boolean).join(' · ');
  const hero=group('hero','72 110 680 500',
    rect(72,118,220,38,profile.primary,19)+
    text('教学课件 · COVER',182,144,18,profile.pop,true,'middle')+
    titleLines.map((ln,i)=>text(ln,72,240+i*66,48,'#FFFFFF',true)).join('')+
    rect(72,388,128,8,profile.pop,4)+
    subLines.map((ln,i)=>text(ln,72,444+i*40,26,profile.lightText)).join('')+
    text(meta,72,584,22,profile.pop,true)
  );
  const visual=group('main-visual','784 110 432 500',
    topicGraphic(lesson.title+' '+(brief?.subject||''),profile,792,118,416,484,true)
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="cover" font-family="Microsoft YaHei">`+
    rect(0,0,1280,720,profile.dark)+rect(0,0,22,720,profile.pop)+hero+visual+'</svg>';
}

function buildToc(job,profile,number,count){
  const {lesson}=job;
  const goalText=lesson.objectives?.[0]||'理解本节核心概念并完成课堂探究练习';
  const goalLines=wrapLines(goalText,13,4);
  const items=(lesson.phases?.length?lesson.phases.map(p=>({h:p.name,d:p.student||p.check})):
    (lesson.objectives||[]).map((o,i)=>({h:'学习目标 '+(i+1),d:o}))).slice(0,4);
  while(items.length<3)items.push({h:'课堂探究 '+(items.length+1),d:'围绕核心问题展开观察与讨论'});

  const left=group('goal-panel','64 176 380 456',
    rect(64,176,380,456,profile.primary,20)+
    rect(96,210,136,36,profile.pop,18)+
    text('核心目标',164,235,19,profile.dark,true,'middle')+
    goalLines.map((ln,i)=>text(ln,96,296+i*42,26,'#FFFFFF',true)).join('')+
    text('按模块循序渐进，掌握重点',96,590,19,profile.lightText)
  );
  const stepH=items.length===4?102:136;
  const gap=items.length===4?16:24;
  const right=group('toc-items','472 176 744 456',
    items.map((it,i)=>{
      const y=176+i*(stepH+gap);
      const hLine=wrapLines(it.h||'学习模块',18,1)[0];
      const dLine=wrapLines(it.d||'核心内容与探究任务',26,1)[0];
      return strokeRect(472,y,744,stepH,profile.card,profile.rule,16,1.5)+
        circle(524,Math.round(y+stepH/2),24,profile.wash)+
        text('0'+(i+1),524,Math.round(y+stepH/2)+8,22,profile.primary,true,'middle')+
        text(hLine,572,y+Math.round(stepH*0.42),24,profile.ink,true)+
        text(dLine,572,y+Math.round(stepH*0.78),20,profile.muted);
    }).join('')
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="toc" font-family="Microsoft YaHei">`+
    rect(0,0,1280,720,profile.paper)+rect(0,0,1280,10,profile.primary)+
    headerGroup(profile,'目录与目标 · TOC','这节课要学什么')+
    left+right+footerGroup(profile,number,count,'toc')+'</svg>';
}

function buildConceptSplit(job,profile,number,count,title,points){
  const defLines=wrapLines(points[0]||title,20,2);
  const bullets=(points.slice(1,4).length?points.slice(1,4):points.slice(0,3)).slice(0,3);
  while(bullets.length<3)bullets.push('结合课堂实例进行观察、记录与总结');

  const left=group('concept-content','64 176 620 456',
    rect(64,176,620,136,profile.wash,16)+
    rect(64,176,10,136,profile.primary,4)+
    text('核心概念',94,210,19,profile.primary,true)+
    defLines.map((ln,i)=>text(ln,94,250+i*36,24,profile.ink,true)).join('')+
    bullets.map((b,i)=>{
      const y=332+i*104;
      const bLines=wrapLines(b,21,2);
      return strokeRect(64,y,620,90,profile.card,profile.rule,14,1.5)+
        circle(102,y+45,20,profile.primary)+
        text(String(i+1),102,y+53,20,'#FFFFFF',true,'middle')+
        bLines.map((ln,j)=>text(ln,138,y+(bLines.length===1?53:38+j*30),22,profile.ink)).join('');
    }).join('')
  );
  const right=group('main-visual','712 176 504 456',
    topicGraphic(job.lesson.title+' '+(job.brief?.subject||''),profile,712,176,504,456,false)
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="content" font-family="Microsoft YaHei">`+
    rect(0,0,1280,720,profile.paper)+rect(0,0,1280,10,profile.primary)+
    headerGroup(profile,'核心概念 · CONCEPT',title)+
    left+right+footerGroup(profile,number,count,'concept_split')+'</svg>';
}

function buildThreeCards(profile,number,count,title,points){
  const items=points.slice(0,3);
  while(items.length<3)items.push('梳理关键要点并结合案例巩固理解');
  const cardW=362,gap=33,startX=64;
  const cards=group('cards-grid','64 176 1152 456',
    items.map((raw,i)=>{
      const cx=startX+i*(cardW+gap);
      const barColor=i===1?profile.pop:profile.primary;
      const parts=raw.split(/[:：]/);
      const heading=wrapLines(parts.length>1?parts[0]:('核心要点 0'+(i+1)),12,1)[0];
      const bodyText=parts.length>1?parts.slice(1).join('：'):raw;
      const bLines=wrapLines(bodyText,13,4);
      return strokeRect(cx,176,cardW,456,profile.card,profile.rule,18,1.5)+
        rect(cx,176,cardW,12,barColor,4)+
        circle(cx+54,244,28,profile.wash)+
        text('0'+(i+1),cx+54,252,22,profile.primary,true,'middle')+
        text(heading,cx+30,320,25,profile.ink,true)+
        rect(cx+30,340,64,5,barColor,2)+
        bLines.map((ln,j)=>text(ln,cx+30,392+j*38,22,profile.muted)).join('');
    }).join('')
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="content" font-family="Microsoft YaHei">`+
    rect(0,0,1280,720,profile.paper)+rect(0,0,1280,10,profile.primary)+
    headerGroup(profile,'知识卡片 · THREE CARDS',title)+
    cards+footerGroup(profile,number,count,'three_cards')+'</svg>';
}

function buildTimeline(profile,number,count,title,points){
  const items=points.slice(0,4);
  while(items.length<3)items.push('完成当前阶段任务并记录关键结论');
  const n=items.length;
  const gap=24,cardW=Math.floor((1152-gap*(n-1))/n);
  const timeline=group('process-timeline','64 176 1152 456',
    line(140,236,1140,236,profile.primary,6)+
    items.map((raw,i)=>{
      const sx=64+i*(cardW+gap);
      const cx=Math.round(sx+cardW/2);
      const isLast=i===n-1;
      const nodeBg=isLast?profile.pop:profile.primary;
      const nodeFg=isLast?profile.dark:'#FFFFFF';
      const parts=raw.split(/[:：]/);
      const heading=wrapLines(parts.length>1?parts[0]:('步骤 '+(i+1)),n===4?9:12,1)[0];
      const bodyText=parts.length>1?parts.slice(1).join('：'):raw;
      const bLines=wrapLines(bodyText,n===4?10:13,4);
      return circle(cx,236,34,nodeBg)+
        text('0'+(i+1),cx,244,24,nodeFg,true,'middle')+
        strokeRect(sx,296,cardW,336,profile.card,profile.rule,16,1.5)+
        text('STEP '+(i+1),cx,336,18,profile.primary,true,'middle')+
        text(heading,cx,376,24,profile.ink,true,'middle')+
        rect(cx-28,394,56,4,nodeBg,2)+
        bLines.map((ln,j)=>text(ln,cx,440+j*36,21,profile.muted,false,'middle')).join('');
    }).join('')
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="content" font-family="Microsoft YaHei">`+
    rect(0,0,1280,720,profile.paper)+rect(0,0,1280,10,profile.primary)+
    headerGroup(profile,'步骤流程 · TIMELINE',title)+
    timeline+footerGroup(profile,number,count,'process_timeline')+'</svg>';
}

function buildComparison(profile,number,count,title,leftPts,rightPts){
  const lItems=(leftPts.length?leftPts:['围绕核心任务展开观察与实践']).slice(0,3);
  const rItems=(rightPts.length?rightPts:['结合现象检验结论并避免常见误区']).slice(0,3);
  while(lItems.length<3)lItems.push('记录关键现象与依据');
  while(rItems.length<3)rItems.push('反思改进并归纳规律');

  const left=group('compare-left','64 176 552 456',
    strokeRect(64,176,552,456,profile.card,profile.rule,18,1.5)+
    rect(64,176,552,72,profile.primary,14)+
    text('探究与行动要点',96,222,24,'#FFFFFF',true)+
    lItems.map((pt,i)=>{
      const y=274+i*112;
      const ls=wrapLines(pt,19,2);
      return rect(92,y,496,92,profile.wash,12)+
        ls.map((ln,j)=>text(ln,116,y+(ls.length===1?54:38+j*30),22,profile.ink)).join('');
    }).join('')
  );
  const right=group('compare-right','664 176 552 456',
    strokeRect(664,176,552,456,profile.card,profile.rule,18,1.5)+
    rect(664,176,552,72,profile.pop,14)+
    text('检验与辨析重点',696,222,24,profile.dark,true)+
    rItems.map((pt,i)=>{
      const y=274+i*112;
      const ls=wrapLines(pt,19,2);
      return rect(692,y,496,92,profile.popWash,12)+
        ls.map((ln,j)=>text(ln,716,y+(ls.length===1?54:38+j*30),22,profile.ink)).join('');
    }).join('')
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="content" font-family="Microsoft YaHei">`+
    rect(0,0,1280,720,profile.paper)+rect(0,0,1280,10,profile.primary)+
    headerGroup(profile,'对比辨析 · COMPARISON',title)+
    left+right+footerGroup(profile,number,count,'comparison')+'</svg>';
}

function buildSummaryQuiz(job,profile,number,count){
  const {lesson}=job;
  const takeaways=splitPoints(lesson.objectives,['掌握本节核心概念与方法','能够结合实例解释关键原理','完成课堂实践并总结规律']).slice(0,3);
  while(takeaways.length<3)takeaways.push('结合课后练习巩固本节知识');
  const quizPool=splitPoints([...(lesson.assessment||[]),...(lesson.homework||[])],['请用自己的话总结本节课最关键的规律，并举出一个生活中的应用例子。']);
  const qLines=wrapLines(quizPool[0],16,4);
  const hLines=wrapLines(quizPool[1]||'提示：回顾前面的核心概念与对比要点进行作答',18,2);

  const left=group('takeaways','64 176 600 456',
    text('核心知识回顾',64,210,24,profile.primary,true)+
    takeaways.map((tk,i)=>{
      const y=236+i*134;
      const ls=wrapLines(tk,20,2);
      return strokeRect(64,y,600,114,profile.card,profile.rule,16,1.5)+
        circle(110,y+57,24,profile.primary)+
        text('0'+(i+1),110,y+65,20,'#FFFFFF',true,'middle')+
        ls.map((ln,j)=>text(ln,154,y+(ls.length===1?65:48+j*32),22,profile.ink)).join('');
    }).join('')
  );
  const right=group('quiz-card','696 176 520 456',
    rect(696,176,520,456,profile.dark,20)+
    rect(732,212,156,38,profile.pop,19)+
    text('随堂思考题',810,238,19,profile.dark,true,'middle')+
    qLines.map((ln,i)=>text(ln,732,304+i*42,25,'#FFFFFF',true)).join('')+
    rect(732,494,448,104,profile.primary,14)+
    hLines.map((ln,i)=>text(ln,756,536+i*32,20,profile.lightText)).join('')
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="ending" font-family="Microsoft YaHei">`+
    rect(0,0,1280,720,profile.paper)+rect(0,0,1280,10,profile.primary)+
    headerGroup(profile,'总结思考 · SUMMARY','本节核心回顾与随堂思考')+
    left+right+footerGroup(profile,number,count,'summary_quiz')+'</svg>';
}

export function classroomPage(job,number){
  const {lesson,count}=job,profile=classroomProfile(job.brief);
  const phases=Array.isArray(lesson.phases)?lesson.phases:[];
  const phaseIndex=number>2&&number<count&&phases.length
    ?Math.min(phases.length-1,Math.floor((number-3)*phases.length/Math.max(1,count-3)))
    :0;
  const phase=phases[phaseIndex]||{};
  const compact=count===4&&number===3;
  const title=number===1?lesson.title
    :number===count?'本节核心回顾与随堂思考'
    :number===2?'这节课要学什么'
    :compact?'课堂核心探究'
    :(phase.name||'课堂活动');

  const note=[lesson.title+' · '+title,
    ...(number<=2?(lesson.objectives||[]):number===count?[...(lesson.assessment||[]),...(lesson.homework||[])]:
      compact?phases.map(p=>p.name+': '+p.teacher+' ; '+p.student+' ; '+p.check):
      [phase.teacher,phase.student,phase.check]),
    '请根据教材和学生实际情况核对后使用。'].filter(Boolean).join('\n');

  let svg;
  if(number===1){
    svg=buildCover(job,profile);
  }else if(number===2){
    svg=buildToc(job,profile,number,count);
  }else if(number===count){
    svg=buildSummaryQuiz(job,profile,number,count);
  }else{
    const points=compact
      ?phases.map(p=>`${p.name}：${p.student||p.check||''}`)
      :splitPoints([phase.student,phase.check,phase.teacher],[title]);
    const slot=(number-3)%4;
    if(slot===0){
      svg=buildConceptSplit(job,profile,number,count,title,points);
    }else if(slot===1){
      svg=buildThreeCards(profile,number,count,title,points);
    }else if(slot===2){
      svg=buildTimeline(profile,number,count,title,points);
    }else{
      const leftPts=splitPoints([phase.student],points.slice(0,2));
      const rightPts=splitPoints([phase.check],points.slice(2));
      svg=buildComparison(profile,number,count,title,leftPts,rightPts);
    }
  }
  return {number,svg,notes:note.slice(0,1500)};
}
