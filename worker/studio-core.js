// Shared deterministic tools; no model call is involved.
export function lessonChecks(p,b={}) {
 const out=[];const add=(level,text)=>out.push({level,text});
 const total=(p.phases||[]).reduce((n,x)=>n+Number(x.minutes||0),0);
 add(total===Number(b.minutes)?'ok':'error','环节合计 '+total+' 分钟 / 计划 '+(b.minutes||'未填')+' 分钟');
 for(const [key,label] of [['keypoints','教学重点'],['difficulties','教学难点'],['assessment','达标评价']])add(p[key]?.length?'ok':'warn',label+(p[key]?.length?'已填写，需核对活动是否落实':'尚未填写'));
 const measurable=/(说出|列出|比较|解释|演示|完成|记录|辨认|设计|举例|判断|写出|指出|区分)/;
 const vague=(p.objectives||[]).filter(x=>!measurable.test(x));if(vague.length)add('warn','以下目标缺少明确的可观察动作：'+vague.join('；'));
 for(const x of p.phases||[])if(!x.teacher?.trim()||!x.student?.trim()||!x.check?.trim())add('error','“'+x.name+'”缺少教师行动、学生活动或评价依据');
 const teacher=(p.phases||[]).map(x=>x.teacher+' '+x.student).join(' ');
 if(/无投影|没有投影/.test(b.resources||'')&&/播放|投影|视频|幻灯/.test(teacher)&&!/替代|改用|无投影|不使用/.test(teacher))add('warn','资源可能冲突：无投影课堂出现播放或投影任务，请确认替代方案');
 if(/实验|剪刀|用水|户外/.test(teacher)&&!(p.preparation||[]).some(x=>/安全|不饮|防|看护|钝头/.test(x)))add('warn','涉及操作活动，课前准备中尚未发现安全提示');
 add('info','以上是规则检查，不代表知识准确性或实际教学效果评分。');return out;
}
export function scheduleConflicts(rows){
 const errors=[];for(let i=0;i<rows.length;i++){const a=rows[i];if(!a.day||!a.start||!a.end||!a.teacher||!a.className||!a.subject){errors.push({row:i,text:'信息不完整'});continue;}
 const time=x=>{if(!/^\d{2}:\d{2}$/.test(x))return NaN;const [h,m]=x.split(':').map(Number);return h<24&&m<60?h*60+m:NaN;};
 const start=time(a.start),end=time(a.end);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start){errors.push({row:i,text:'结束时间必须晚于开始时间'});continue;}
 for(let j=0;j<i;j++){const b=rows[j];if(a.day===b.day&&start<time(b.end)&&end>time(b.start)&&(a.teacher.trim()===b.teacher.trim()||a.className.trim()===b.className.trim()))errors.push({row:i,other:j,text:'与第 '+(j+1)+' 项的教师或班级时间冲突'});}}
 return errors;
}
export function allocateSchedule(tasks,slots){
 if(tasks.length>35||slots.length>50)throw Error('自动排课最多35个课次、50个时段');
 const expanded=tasks.flatMap(t=>Array.from({length:Math.max(1,Math.min(10,Number(t.count)||1))},()=>({...t})));if(expanded.length>35)throw Error('请将总课次控制在35次内');
 const rows=[];let visits=0;function search(i){if(++visits>30000)return false;if(i===expanded.length)return true;for(const slot of slots){const r={...expanded[i],...slot};rows.push(r);if(!scheduleConflicts(rows).length&&search(i+1))return true;rows.pop();}return false;}
 const ok=search(0);return {ok,rows:ok?rows:[],reason:ok?'已找到无教师/班级时间冲突的安排':visits>30000?'搜索达到上限，请缩小任务或手工安排':'这些时段无法容纳全部课次，请增加时段或调整教师'};
}
export function reviewLesson(p,b={}){
 const checks=lessonChecks(p,b),strengths=[];if((p.phases||[]).every(x=>x.check?.trim()))strengths.push('每个环节均列有评价与反馈，可据此开展形成性观察');if(p.differentiation?.length)strengths.push('提供了分层支持条目，可进一步核对目标学生与实施条件');if(p.keypoints?.length&&p.difficulties?.length)strengths.push('重点与难点分开记录，便于教研审阅');
 return {topic:p.title,outline:(p.phases||[]).map(x=>x.name+'（'+x.minutes+'分钟）').join(' → '),strengths,risks:checks.filter(x=>['error','warn'].includes(x.level)).map(x=>x.text),next:['逐条核对重点、难点是否在具体活动和评价中落实','对照教材核查知识，试做操作活动后再授课']};
}
