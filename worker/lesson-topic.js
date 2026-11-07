export function lessonScope(brief) {
 const fields=['topic','subject','grade'];
 return fields.map(field=>String(brief?.[field]||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,'')).join('\n');
}

function topicText(value) {
 return String(value||'').normalize('NFKC').toLowerCase().replace(/[\s，。？！：；、“”‘’《》【】（）()—·,:;!?'"-]/g,'');
}

function matchesTitle(title,topic) {
 const expected=topicText(topic);
 return Boolean(expected&&topicText(title).includes(expected));
}

export const lessonGenerationRoute=/^\/api\/lesson(?:\/(outline|phase|finish))?$/;

export const topicInstruction='以当前课题、学科和年级为唯一备课目标，按本课需要编写重点、难点、课堂环节、例子与评价。展开或收尾时遵循已确认的本课大纲。参考资料只可借鉴适用的内容和方法；舍弃其他课题的知识点、实验、材料、板书和作业。';

const unknownConditions={
 learners:'班级人数与分组待教师确认。活动应能按实际人数调整。',
 prior:'学生已有基础待确认。设计与本课相关的简短诊断。',
 resources:'可用资源待教师确认。用适合本课的常见材料，必要时给出替代做法。',
};

export function prepareLessonRequest(data) {
 if(typeof data?.brief?.topic!=='string'||!data.brief.topic.trim())throw Error('请填写当前课题');
 const brief={...data.brief,topic:data.brief.topic.trim()};
 for(const [field,fallback] of Object.entries(unknownConditions)){
  if(typeof brief[field]!=='string'||!brief[field].trim()||/^未提供/.test(brief[field].trim()))brief[field]=fallback;
 }
 if(!String(brief.requirements||'').startsWith(topicInstruction)){
  brief.requirements=[topicInstruction,data.outline?'':'标题保留完整课题名称「'+brief.topic+'」。',brief.requirements].filter(Boolean).join('\n');
 }
 return {...data,brief,...(data.current&&!matchesTitle(data.current.title,brief.topic)?{current:null}:{})};
}

export function hasUnrelatedBuoyancyExample(result,brief) {
 const lessonContext=[brief?.topic,brief?.subject,brief?.requirements].join(' ');
 const buoyancy=/沉[与和、]?浮|浮沉|浮力|漂浮|下沉|阿基米德|排水|密度|称象|船|流体/;
 const text=JSON.stringify(result||{});
 const exampleMaterials=/橡皮泥|水盆|石块.{0,8}木块|木块.{0,8}石块/;
 const examplePhrases=/物体的?沉[与和]?浮|猜一猜谁沉谁浮|生活中的沉浮|橡皮泥改形再试|重就沉.{0,8}轻就浮/;
 return !buoyancy.test(lessonContext)&&(examplePhrases.test(text)||(buoyancy.test(text)&&exampleMaterials.test(text)));
}

export function assertLessonTopic(result,brief,{checkTitle=false}={}) {
 if(!result||typeof result!=='object')throw Error('生成结果缺少当前课题内容，请重试本步骤。');
 if(checkTitle&&!matchesTitle(result.title,brief.topic))throw Error('返回的标题与当前课题「'+brief.topic+'」不符，请重试生成。');
 if(hasUnrelatedBuoyancyExample(result,brief)){
  throw Error('生成内容混入了与本课无关的沉浮示例，请重试本步骤。');
 }
}
