import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudApi} from '../server/cloud.js';
import {templateCatalog,templateLesson} from '../worker/template-catalog.js';
import {lessonChecks,scheduleConflicts,allocateSchedule} from '../worker/studio-core.js';
import {validateOutline,validatePhase,stagedApi} from '../worker/staged-api.js';
import {validateLesson} from '../worker/teaching-api.js';
class MemoryStore{data=new Map();version=0;async get(k){return structuredClone(this.data.get(k)?.data??null)}async getWithMetadata(k){return structuredClone(this.data.get(k)??null)}async setJSON(k,data,options={}){const old=this.data.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};const etag=String(++this.version);this.data.set(k,{data:structuredClone(data),etag});return {modified:true,etag};}async delete(k){this.data.delete(k)}}
const req=(path,body,cookie='',origin='https://qizhi.test')=>new Request('https://qizhi.test/api/cloud/'+path,{method:body===undefined?'GET':'POST',headers:{origin,cookie,'content-type':'application/json','x-nf-client-connection-ip':'127.0.0.1'},...(body===undefined?{}:{body:JSON.stringify(body)})});
const run=async(api,path,body,cookie,origin)=>{const r=await api(req(path,body,cookie,origin));return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
test('original templates contain valid lesson, timing, topic-specific activities and reminders',()=>{assert.equal(new Set(templateCatalog.map(x=>x.category)).size,6);for(const t of templateCatalog){const p=validateLesson(templateLesson(t));assert.equal(p.phases.reduce((n,x)=>n+x.minutes,0),40);assert(p.keypoints.length&&p.difficulties.length);assert(!lessonChecks(p,{minutes:40,resources:'无投影'}).some(x=>x.level==='error'));}});
test('scheduler detects overlapping intervals, accepts adjacent lessons and solves contention',()=>{const a={day:'星期一',start:'09:00',end:'09:40',teacher:'甲',className:'一班',subject:'科学'};assert.equal(scheduleConflicts([a,{...a,start:'09:20',end:'10:00',className:'二班'}]).length,1);assert.equal(scheduleConflicts([a,{...a,start:'09:40',end:'10:20'}]).length,0);assert(scheduleConflicts([{...a,start:'25:00'}]).length);const slots=[{day:'星期一',start:'09:00',end:'09:40'},{day:'星期二',start:'09:00',end:'09:40'}];const solved=allocateSchedule([{teacher:'甲',className:'一班',subject:'科学',count:2}],slots);assert(solved.ok);assert.equal(scheduleConflicts(solved.rows).length,0);assert(!allocateSchedule([{teacher:'甲',className:'一班',subject:'科学',count:3}],slots).ok);});
test('outline and phase validation rejects timing drift and missing teaching actions',()=>{const p={title:'纸桥',objectives:['比较两种折法'],keypoints:['公平比较'],difficulties:['控制变量'],preparation:['纸'],phases:[{name:'预测',minutes:5,purpose:'收集猜想'},{name:'测试',minutes:35,purpose:'收集证据'}]};assert.equal(validateOutline(p,40),p);assert.throws(()=>validateOutline(p,35));assert.throws(()=>validatePhase({name:'预测',minutes:6,teacher:'提问',student:'预测',check:'理由'},p,0));assert.throws(()=>validatePhase({name:'预测',minutes:5,teacher:'',student:'预测',check:'理由'},p,0));});
test('cloud auth, CSRF, personal isolation, concurrency protection, team permissions and logout',async()=>{const store=new MemoryStore(),api=createCloudApi(store);assert.equal((await run(api,'profile')).status,401);assert.equal((await run(api,'register',{username:'lead',password:'0123456789ab',name:'组长'},'','https://evil.test')).status,403);const lead=await run(api,'register',{username:'lead',password:'long-test-password-1',name:'组长'});assert.equal(lead.status,200);assert(lead.cookie);assert(!JSON.stringify(lead.body).includes('salt'));const raw=[...store.data.entries()].find(([k])=>k.startsWith('users/'))[1].data;assert.notEqual(raw.password,'long-test-password-1');const teacher=await run(api,'register',{username:'teacher',password:'long-test-password-2',name:'教师'}),stranger=await run(api,'register',{username:'outsider',password:'long-test-password-3'});assert.equal((await run(api,'login',{username:'lead',password:'long-wrong-password'})).status,401);assert.equal((await run(api,'login',{username:'lead',password:'long-test-password-1'})).status,200);
 const p={lessons:[{lesson:templateLesson(templateCatalog[0]),brief:{topic:'安全',minutes:40}}],preferences:['用低成本材料'],schedule:[]};assert.equal((await run(api,'profile',{profile:p,version:0},lead.cookie)).status,200);assert.equal((await run(api,'profile',{profile:p,version:0},lead.cookie)).status,409);assert.equal((await run(api,'profile',undefined,teacher.cookie)).body.profile.lessons.length,0);
 const created=await run(api,'team/create',{name:'测试教研组'},lead.cookie);assert.equal(created.status,200);const id=created.body.team.id;assert(!JSON.stringify(created.body.team).includes('inviteHash'));assert.equal((await run(api,'team/get',{id},stranger.cookie)).status,403);assert.equal((await run(api,'team/join',{code:created.body.invite},teacher.cookie)).status,200);assert.equal((await run(api,'team/invite',{id},teacher.cookie)).status,403);const document={id,name:'课堂教案.docx',text:'教师讲授20分钟，学生完成出口题',report:{topic:'课堂方案',summary:'讲授与评价',strengths:[{point:'设置当堂检查',evidence:'学生完成出口题'}],risks:[],nextSteps:[]}};assert.equal((await run(api,'team/document',document,teacher.cookie)).status,200);assert.equal((await run(api,'team/document',document,stranger.cookie)).status,403);assert.equal((await run(api,'team/get',{id},lead.cookie)).body.team.documents.length,1);const publish=await run(api,'team/publish',{id,items:p.lessons},teacher.cookie);assert.equal(publish.status,200);const lessonId=publish.body.team.lessons[0].id;assert.equal((await run(api,'team/message',{id,text:'第二环节需补充时间分配',lessonId},lead.cookie)).status,200);assert.equal((await run(api,'team/message',{id,text:'无权消息'},stranger.cookie)).status,403);assert.equal((await run(api,'team/remove',{id,lessonId},stranger.cookie)).status,403);assert.equal((await run(api,'team/remove',{id,lessonId},lead.cookie)).status,200);assert.equal((await run(api,'logout',{},teacher.cookie)).status,200);assert.equal((await run(api,'me',undefined,teacher.cookie)).body.user,null);
});
test('staged service validates each independent response and retains structured upstream errors',async()=>{const old=globalThis.fetch,brief={topic:'纸桥',subject:'科学',grade:'五年级',minutes:40,prior:'观察过桥',learners:'30人',resources:'纸、积木；无投影'};const outline={title:'纸桥',objectives:['比较折法'],keypoints:['公平比较'],difficulties:['控制变量'],preparation:['同规格纸'],phases:[{name:'预测',minutes:5,purpose:'收集猜想'},{name:'实验',minutes:35,purpose:'记录证据'}]};let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({choices:[{message:{content:JSON.stringify(outline)}}]})};try{const env={LLM_API_KEY:'test-only',LLM_MODEL:'deepseek-flash',LLM_BASE_URL:'https://api.deepseek.com'};let r=await stagedApi(new Request('https://qizhi.test/api/lesson/outline',{method:'POST',headers:{origin:'https://qizhi.test'},body:JSON.stringify({brief})}),env);assert.equal(r.status,200);assert.equal(calls,1);r=await stagedApi(new Request('https://qizhi.test/api/lesson/outline',{method:'POST',headers:{origin:'https://qizhi.test'},body:JSON.stringify({brief:{...brief,resources:'未提供'}})}),env);assert.equal(r.status,200);assert.equal(calls,2);}finally{globalThis.fetch=old;}});

test('document import preserves the original bytes and rejects non-document ZIP entries',async()=>{
 const {extractTeachingFiles}=await import('../worker/document-review.js');
 const {zipSync,unzipSync,strToU8}=await import('fflate');
 const word=zipSync({'word/document.xml':strToU8('<w:document><w:p><w:r><w:t>分数教案</w:t></w:r></w:p></w:document>')});
 const source=new File([zipSync({'子目录/教师教案.docx':word,'附件/旧课件.ppt':new Uint8Array([1,2,3]),'旧备课包.json':strToU8('{}')})],'文件.zip');
 const result=await extractTeachingFiles([source],unzipSync,{keepOriginals:true});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.results.length,2);
 assert.equal(result.results[0].name,'教师教案.docx');
 assert.equal(result.results[0].text,'分数教案');
 assert.deepEqual(new Uint8Array(await result.results[0].original.arrayBuffer()),word);
 assert.equal(result.results[1].text,'');
 assert.deepEqual(new Uint8Array(await result.results[1].original.arrayBuffer()),new Uint8Array([1,2,3]));
 const invalid=await extractTeachingFiles([new File(['{}'],'旧备课包.json')],unzipSync,{keepOriginals:true});
 assert.equal(invalid.results.length,0);
 assert.match(invalid.errors[0],/格式不支持/);
});

test('cloud preserves partial confirmed workflows and rejects corrupted completed phases',async()=>{const api=createCloudApi(new MemoryStore());const u=await run(api,'register',{username:'workflow',password:'workflow-test-password-1'});const brief={topic:'纸桥',subject:'科学',grade:'五年级',minutes:40};const outline={title:'纸桥',objectives:['比较形状'],keypoints:['控制变量'],difficulties:['公平比较'],preparation:['纸'],phases:[{name:'预测',minutes:5,purpose:'收集观点'},{name:'实验',minutes:35,purpose:'收集证据'}]};const job={brief,outline,confirmed:true,phases:[{name:'预测',minutes:5,teacher:'提问',student:'预测',check:'说出理由'}],finish:null};const profile={lessons:[],preferences:[],schedule:[],workspace:{brief,lesson:null,job}};assert.equal((await run(api,'profile',{version:0,profile},u.cookie)).status,200);assert.equal((await run(api,'profile',undefined,u.cookie)).body.profile.workspace.job.phases.length,1);job.phases[0].minutes=6;assert.notEqual((await run(api,'profile',{version:1,profile},u.cookie)).status,200);});

test('deck pagination preserves long student tasks and layouts stay within the slide',async()=>{const {createDeckPlan}=await import('../worker/deck-engine.js');const lesson=templateLesson(templateCatalog[2]);lesson.phases[0].student='这是需要完整保留的课堂任务。'.repeat(90);const pages=createDeckPlan(lesson,{grade:'小学五年级',subject:'科学',minutes:40},'forest');assert(pages.length>12);for(const page of pages)for(const e of page.elements){assert(e.x>=0&&e.y>=0);assert(e.x+e.w<=13.334);assert(e.y+e.h<=7.51);if(e.type==='text')assert(e.size>=10);}const retained=pages.filter(p=>p.title===lesson.phases[0].name).flatMap(p=>p.elements.filter(e=>e.type==='text').map(e=>e.value.replace(/\s/g,''))).join('');assert(retained.includes('这是需要完整保留的课堂任务。'));assert.equal(pages[0].kind,'cover');assert(pages.some(p=>p.kind==='focus'));});

test('Office import extracts text and review rejects fabricated evidence',async()=>{const {extractTeachingFiles,validateDocumentReview}=await import('../worker/document-review.js');const ff=await import('fflate');const bytes=ff.zipSync({'word/document.xml':new TextEncoder().encode('<w:document><w:p><w:t>教师讲授20分钟</w:t></w:p><w:p><w:t>学生完成出口题</w:t></w:p></w:document>')});const d=await extractTeachingFiles([{name:'教案.docx',size:bytes.length,arrayBuffer:async()=>bytes.buffer}],ff.unzipSync);assert.equal(d.results.length,1);assert(d.results[0].text.includes('学生完成出口题'));const report={topic:'科学教案',summary:'含讲授和出口题',strengths:[{point:'有当堂检查',evidence:'学生完成出口题'}],risks:[],nextSteps:[]};assert.equal(validateDocumentReview(report,d.results[0].text),report);report.strengths[0].evidence='教师完成实测证明效果显著';assert.throws(()=>validateDocumentReview(report,d.results[0].text));});

test('AI scene validation rejects overflow, tiny fonts, overlapping text and arbitrary external images',async()=>{const {validateScene}=await import('../worker/ai-deck.js');const p={background:'F5F5F0',elements:[{type:'text',role:'title',text:'纸桥承重',x:.7,y:.5,w:11,h:1,size:36,color:'203D34'},{type:'text',text:'观察并说明理由',x:.7,y:2,w:10,h:2,size:24,color:'203D34'}]};assert.equal(validateScene(p),p);const bad=structuredClone(p);bad.elements[1].x=12;assert.throws(()=>validateScene(bad));bad.elements[1].x=.7;bad.elements[1].y=.5;assert.throws(()=>validateScene(bad));bad.elements[1].y=2;bad.elements[1].size=10;assert.throws(()=>validateScene(bad));const image=structuredClone(p);image.elements.push({type:'image',asset:'https://evil.test/image',x:1,y:1,w:3,h:2});assert.throws(()=>validateScene(image));});

test('DeepSeek pages normalize signed line offsets and retain text when the layout is invalid',async()=>{
 const {prepareDeckScene,validateScene}=await import('../worker/ai-deck.js');
 const page={title:'斜坡上的数学'};
 const raw={background:'F5F5F0',notes:'请学生说明坡度和水平距离的关系。',elements:[
  {type:'text',role:'title',text:page.title,x:'0.8 英寸',y:.55,w:11,h:1,size:38,color:'203D34'},
  {type:'text',role:'body',text:'怎样用坡角和水平距离估算高度？',x:.8,y:2,w:11,h:1.5,size:28,color:'203D34'},
  {type:'line',x:4,y:5,w:'3.5',h:'-2.25',stroke:'427A68'},
 ]};
 const prepared=prepareDeckScene(raw,page,false);
 assert.equal(prepared.elements[0].x,.8);
 assert.deepEqual(prepared.elements[2],{type:'line',x:4,y:2.75,w:3.5,h:2.25,stroke:'427A68',flipV:true});
 assert.equal(prepared.layoutAdjusted,undefined);
 assert.equal(validateScene(prepared),prepared);
 raw.elements[1].w='缺失';
 const recovered=prepareDeckScene(raw,page,false);
 assert.equal(recovered.layoutAdjusted,true);
 assert.match(recovered.elements.at(-1).text,/估算高度/);
 assert.match(recovered.notes,/说明坡度/);
 const textOnly=prepareDeckScene({title:page.title,points:['找出对边','量出水平距离'],notes:'独立作答。'},page,false);
 assert.equal(textOnly.layoutAdjusted,true);
 assert.match(textOnly.elements.at(-1).text,/水平距离/);
 assert.throws(()=>prepareDeckScene({elements:[]},page,false),/教学文字/);
});
test('public presentation endpoints retire the old model generator without any upstream call',async()=>{const {default:worker}=await import('../worker/index.js');const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No model calls expected')};try{for(const path of ['/api/deck/plan','/api/deck/slide']){const r=await worker.fetch(new Request('https://qizhi.test'+path,{method:'POST',headers:{origin:'https://qizhi.test'},body:'{}'}),{LLM_API_KEY:'test-only'});assert.equal(r.status,410);assert.equal((await r.json()).code,'PPTMASTER_ENDPOINT_RETIRED');}assert.equal(calls,0);const status=await(await worker.fetch(new Request('https://qizhi.test/api/status'),{})).json();assert.equal(status.presentation.automaticExecution,true);assert.equal(status.presentation.mode,'server-execution');}finally{globalThis.fetch=previous;}});

test('large mixed Office imports retain slide themes, spreadsheet values and complete text segments', async () => {
 const {extractTeachingFiles}=await import('../worker/document-review.js');
 const {zipSync,unzipSync,strToU8}=await import('fflate');
 const office=(name,xml,media)=> {
  const bytes=zipSync(Object.fromEntries(Object.entries(xml).map(([path,text])=>[path,strToU8(text)]).concat(media||[])),{level:0});
  return new File([bytes],name);
 };
 const deck=office('实验示例.pptx',{
  'ppt/presentation.xml':'<p:presentation><p:sldSz cx="1600" cy="900"/></p:presentation>',
  'ppt/slides/slide1.xml':'<p:sld><a:p><a:r><a:t>纸桥承重 &amp; 观察</a:t></a:r></a:p><p:pic /></p:sld>',
  'ppt/theme/theme1.xml':'<a:theme><a:srgbClr val="4D6080"/><a:latin typeface="Noto Sans"/></a:theme>',
 },[['ppt/media/image1.png',new Uint8Array(6*1024*1024)]]);
 const workbook=office('记录.xlsx',{
  'xl/workbook.xml':'<workbook><sheets><sheet name="实验记录" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="rId1" Target="worksheets/sheet2.xml"/></Relationships>',
  'xl/sharedStrings.xml':'<sst><si><t>组别</t></si></sst>',
  'xl/worksheets/sheet2.xml':'<worksheet><sheetData><row/><row><c r="D1" s="1"/><c r="A1" t="s"><v>0</v></c><c r="B1"><f>2*3</f><v>6</v></c><c r="C1" t="inlineStr"><is><t>成功</t></is></c></row></sheetData></worksheet>',
 });
 assert(deck.size>4*1024*1024);
 const longText='甲'.repeat(18000)+'乙';
 const result=await extractTeachingFiles([deck,workbook,new File([longText],'课堂笔记.txt')],unzipSync);
 assert.deepEqual(result.errors,[]);
 assert.match(result.results[0].text,/纸桥承重 & 观察/);
 assert.match(result.results[0].style,/#4D6080.*Noto Sans/);
 assert.match(result.results[1].text,/实验记录\nA1=组别  B1=6  C1=成功/);
 assert.equal(result.results.slice(2).map(d=>d.text).join(''),longText);
});
