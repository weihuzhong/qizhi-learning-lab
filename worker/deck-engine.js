// The preview and PPTX export consume exactly the same layout instructions.
export function deckChunks(value,width=23,maxLines=5){
 const paragraphs=String(value||'').replace(/\r/g,'').split('\n').filter(x=>x.trim());const lines=[];
 for(const paragraph of paragraphs){let line='',size=0;for(const c of Array.from(paragraph)){const n=/[\u0000-\u00ff]/.test(c)?.55:1;if(size+n>width&&line){lines.push(line);line='';size=0;}line+=c;size+=n;}if(line)lines.push(line);}
 const chunks=[];for(let i=0;i<lines.length;i+=maxLines)chunks.push(lines.slice(i,i+maxLines).join('\n'));return chunks;
}
export function createDeckPlan(lesson,brief,themeKey='forest',coverImage='',illustration=''){
 const themes={forest:{primary:'245E51',paper:'F6F4EB',ink:'203D34',accent:'637F60'},sunshine:{primary:'9A5530',paper:'FFF8ED',ink:'55392D',accent:'A9713E'},ink:{primary:'243C60',paper:'F4F6FA',ink:'233550',accent:'587694'}};const t=themes[themeKey]||themes.forest;const pages=[];
 const text=(value,x,y,w,h,size,color=t.ink,bold=false)=>({type:'text',value:String(value),x,y,w,h,size,color,bold});
 function page(kind,title,elements,notes='',background=t.paper){pages.push({kind,title,background,elements,notes});}
 const title=Array.from(lesson.title||'课堂课件').slice(0,52).join('');
 page('cover',lesson.title,[...(coverImage?[{type:'image',data:coverImage,x:0,y:0,w:13.333,h:7.5}]:[]),text('启知未来  课堂教学',.75,.62,6,.35,13,t.primary,true),text(deckChunks(title,13,4)[0]||title,.75,1.65,6.6,3.1,40,t.ink,true),text((brief.grade||'年级待定')+'  '+(brief.subject||'学科待定'),.8,5.4,7,.4,19,t.primary),text((brief.minutes||lesson.phases.reduce((n,p)=>n+p.minutes,0))+' 分钟',.8,6.02,5,.4,18,t.primary)],'完整课题：'+lesson.title);
 const objectives=lesson.objectives||[];
 objectives.forEach((value,i)=>{for(const [part,chunk]of deckChunks(value,26,5).entries())page('objective','学习目标',[text('学习目标  '+String(i+1).padStart(2,'0'),.8,.65,11,.35,14,t.accent,true),text(chunk,.8,1.65,11.6,3.8,32,t.ink,true),text(part?'目标内容续页':'这节课结束时，你能够做到什么？',.8,6.1,11,.4,16,t.accent)],value);});
 if(illustration)page('visual','观察与讨论',[{type:'image',data:illustration,x:6.2,y:1.15,w:6.4,h:4.8},text('观察与讨论',.8,.7,5,.4,15,t.accent,true),text('你看到了什么？\n你的依据是什么？',.8,2.05,4.8,2,32,t.ink,true),text('教学示意图，不能作为实测结果',.8,6.3,11,.35,13,t.accent)],'请教师说明插图与课堂实物的区别，不将示意图视为实测证据。');
 const keypoints=(lesson.keypoints||[]).join('\n');if(keypoints)for(const chunk of deckChunks(keypoints,25,5))page('focus','核心问题',[text('本课关键',.8,.7,11,.35,14,'E8E6DA'),text(chunk,.8,1.8,11.6,3.9,32,'FFFFFF',true)],keypoints,t.primary);
 for(const [i,p]of lesson.phases.entries()){
 const tasks=deckChunks(p.student,23,5),checks=deckChunks(p.check,23,5),count=Math.max(tasks.length,checks.length,1);
 for(let n=0;n<count;n++){const split=(i+n)%2===0;const elements=[text(String(i+1).padStart(2,'0')+'  '+p.minutes+' 分钟',.8,.55,11,.3,13,t.accent,true),text(deckChunks(p.name+(n?' · 续':''),25,2)[0],.8,1.12,11.7,1,30,t.ink,true)];
 if(split){elements.push(text('学习任务',.8,2.65,5.5,.35,15,t.primary,true),text(tasks[n]||'继续完成本环节任务',.8,3.18,5.5,2.9,24),text('思考与检验',7,2.65,5.5,.35,15,t.primary,true),text(checks[n]||'根据前页问题，交流你的依据',7,3.18,5.5,2.9,24));}
 else{elements.push(text('学习任务',.8,2.48,11,.3,14,t.accent,true),text(tasks[n]||'继续完成本环节任务',.8,3.0,11.6,2,26,t.ink,true),text('检验：'+(checks[n]||'结合观察解释理由'),.8,5.3,11.5,1.35,19,t.primary));}
 page(split?'activity':'discussion',p.name,elements,'教师指导：'+p.teacher+'\n学生活动：'+p.student+'\n评价依据：'+p.check);
 }}
 for(const [i,item]of (lesson.homework||[]).entries())for(const chunk of deckChunks(item,26,5))page('exit','课后延伸',[text('课后延伸 '+String(i+1).padStart(2,'0'),.8,.65,11,.4,14,t.accent,true),text(chunk,.8,1.8,11.6,3.9,30,t.ink,true),text('下一次课堂，带着你的观察继续讨论',.8,6.2,11,.35,16,t.accent)],item);
 pages.forEach((p,i)=>p.elements.push(text(String(i+1).padStart(2,'0')+' / '+String(pages.length).padStart(2,'0'),11.35,7.05,1.2,.2,10,p.kind==='focus'?'FFFFFF':t.accent)));
 return pages;
}
export async function writeDeck(PptxGenJS,pages,metadata={}){const ppt=new PptxGenJS();ppt.layout='LAYOUT_WIDE';ppt.author='启知未来';ppt.title=metadata.title||'课堂课件';ppt.lang='zh-CN';ppt.theme={headFontFace:'Microsoft YaHei',bodyFontFace:'Microsoft YaHei',lang:'zh-CN'};
 for(const p of pages){const slide=ppt.addSlide();slide.background={color:p.background};for(const e of p.elements){if(e.type==='image')slide.addImage({data:e.data,x:e.x,y:e.y,w:e.w,h:e.h});else slide.addText(e.value,{x:e.x,y:e.y,w:e.w,h:e.h,fontSize:e.size,fontFace:'Microsoft YaHei',color:e.color,bold:e.bold,margin:0,breakLine:false,valign:'top',paraSpaceAfter:0,lineSpacingMultiple:1.08});}slide.addNotes(p.notes+'\n备课条件：'+JSON.stringify(metadata.brief||{}));}return ppt;}
