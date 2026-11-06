export function validateDocumentReview(report,text){
 if(!report||typeof report.topic!=='string'||!report.topic.trim()||report.topic.length>200||typeof report.summary!=='string'||report.summary.length>1000)throw Error('教研分析结构无效');
 for(const k of ['strengths','risks']){if(!Array.isArray(report[k])||report[k].length>5)throw Error('分析条目无效');for(const item of report[k]){if(typeof item.point!=='string'||item.point.length>500||typeof item.evidence!=='string'||!item.evidence.trim()||item.evidence.length>200||!text.replace(/\s+/g,'').includes(item.evidence.replace(/\s+/g,'')))throw Error('分析中的引文没有在原文中找到，请重新分析');if(k==='risks'&&(typeof item.suggestion!=='string'||item.suggestion.length>600))throw Error('改进建议无效');}}
 if(!Array.isArray(report.nextSteps)||report.nextSteps.length>5||report.nextSteps.some(x=>typeof x!=='string'||x.length>500))throw Error('后续建议无效');return report;
}
export async function extractTeachingFiles(files, unzip, { teachingPackages = false } = {}) {
 const results = [], packages = [], errors = [];
 const decoder = new TextDecoder();
 const MB = 1024 * 1024;
 let inputSize = 0, expandedSize = 0;
 const supported = /\.(docx|pptx|xlsx|txt|md|csv|json)$/i;
 const decode = value => value.replace(/&(#x[\da-f]+|#\d+|lt|gt|quot|apos|amp);/gi, (raw, entity) => {
  if (entity[0] === '#') {
   const n = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
   return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : raw;
  }
  return ({lt:'<',gt:'>',quot:'"',apos:"'",amp:'&'})[entity] || raw;
 });
 function xml(bytes) {
  const value = decoder.decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(value)) throw Error('不支持含实体声明的 XML');
  return value;
 }
 const fragments = (source, tag) => [...source.matchAll(new RegExp('<'+tag+'(?=[\\s/>])(?:[^>]*?\\/>|[^>]*>([\\s\\S]*?)<\\/'+tag+'>)','g'))].flatMap(m=>m[1]===undefined?[]:[m[1]]);
 const textRuns = (source, tag) => fragments(source, tag).map(decode).join('');
 const attr = (source, name) => decode(new RegExp('(?:^|\\s)'+name+'="([^"]*)"').exec(source)?.[1] || '');
 function selected(bytes, include, limit, message) {
  if (typeof unzip !== 'function') throw Error('Office 组件未加载，请刷新后重试');
  let size = 0;
  return unzip(bytes, { filter: entry => {
   if (!include(entry.name)) return false;
   size += entry.originalSize;
   expandedSize += entry.originalSize;
   if (size > limit || expandedSize > 100 * MB) throw Error(message);
   return true;
  } });
 }
 function add(name, text, style = '') {
  let remaining = text.trim();
  if (!remaining) throw Error('没有可提取的文字或表格数据；扫描件和图片需先识别');
  let part = 1;
  const split = remaining.length > 18000;
  while (remaining) {
   if (results.length + packages.length >= 20) throw Error('本批最多20份可用内容，剩余部分请分批导入');
   let end = 18000;
   if (remaining.length > end) {
    const line = remaining.lastIndexOf('\n', end);
    if (line > end / 2) end = line;
    if (/[\uD800-\uDBFF]/.test(remaining[end-1])) end--;
   }
   results.push({name: split ? name+'（第'+part+++'段）' : name, text: remaining.slice(0,end).trim(), style});
   remaining = remaining.slice(end).trimStart();
  }
 }
 function office(name, bytes, ext) {
  const entries = selected(bytes, path => {
   if (ext === 'docx') return /^word\/(?:document|header\d+|footer\d+)\.xml$/.test(path);
   if (ext === 'pptx') return /^ppt\/(?:presentation\.xml|slides\/slide\d+\.xml|theme\/theme\d+\.xml)$/.test(path);
   return /^xl\/(?:sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/sheet\d+\.xml)$/.test(path);
  }, 12*MB, '可读 Office 正文解压超过12MB，请拆分文件');
  const keys = Object.keys(entries).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const read = key => entries[key] ? xml(entries[key]) : '';
  if (ext === 'docx') {
   const text = keys.map(key => fragments(read(key),'w:p').map(p=>textRuns(p,'w:t')).filter(Boolean).join('\n')).join('\n');
   return add(name,text);
  }
  if (ext === 'pptx') {
   const slides = keys.filter(key=>key.startsWith('ppt/slides/')).map(read);
   if (!slides.length) throw Error('没有找到 PPT 页面');
   const theme = keys.filter(key=>key.startsWith('ppt/theme/')).map(read).join('\n');
   const colors = [...new Set([...theme.matchAll(/<a:srgbClr\s+[^>]*val="([\da-f]{6})"/gi)].map(m=>'#'+m[1]))].slice(0,8);
   const fonts = [...new Set([...theme.matchAll(/<a:(?:latin|ea)\s+[^>]*typeface="([^"]+)"/g)].map(m=>decode(m[1])))].slice(0,4);
   const dimensions = /<p:sldSz\b[^>]*>/.exec(read('ppt/presentation.xml'))?.[0] || '';
   const cx = Number(attr(dimensions,'cx')), cy = Number(attr(dimensions,'cy'));
   const imageSlides = slides.filter(s=>/<p:pic(?=[\s>])/.test(s)).length;
   const style = [
    slides.length+'页参考；'+imageSlides+'页含插图',
    cx>0&&cy>0 ? '宽高比 '+(cx/cy).toFixed(2)+':1' : '',
    colors.length ? '主题色 '+colors.join('、') : '',
    fonts.length ? '主题字体 '+fonts.join('、') : '',
   ].filter(Boolean).join('；');
   const text = slides.map((slide,i)=>{
    const lines = fragments(slide,'a:p').map(p=>textRuns(p,'a:t')).filter(Boolean);
    return '第'+(i+1)+'页'+(lines.length?'：'+lines.join('\n'):'（无可提取文字）');
   }).join('\n\n');
   return add(name,text,style);
  }
  const shared = fragments(read('xl/sharedStrings.xml'),'si').map(si=>textRuns(si,'t'));
  const targets = new Map([...read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\s+[^>]*>/g)]
   .map(([tag])=>[attr(tag,'Id'),attr(tag,'Target').replace(/^\//,'').replace(/^xl\//,'')]));
  const names = new Map([...read('xl/workbook.xml').matchAll(/<sheet\s+[^>]*>/g)]
   .map(([tag])=>[targets.get(attr(tag,'r:id')),attr(tag,'name')]));
  const sheets = keys.filter(key=>key.startsWith('xl/worksheets/'));
  const text = sheets.map((key,i)=>{
   const rows = fragments(read(key),'row').map(row=>[...row.matchAll(/<c(?=[\s/>])(?:[^>]*?\/>|([^>]*)>([\s\S]*?)<\/c>)/g)].map(([,attributes,body])=>{
    if (body === undefined) return '';
    const type = attr(attributes,'t'), value = fragments(body,'v')[0];
    const cell = type==='s' ? shared[Number(value)] : type==='inlineStr' ? textRuns(body,'t') : value===undefined ? '' : decode(value);
    return cell ? (attr(attributes,'r')||'')+'='+cell : '';
   }).filter(Boolean).join('  ')).filter(Boolean);
   return rows.length ? '工作表：'+(names.get(key.slice(3))||'表'+(i+1))+'\n'+rows.join('\n') : '';
  }).filter(Boolean).join('\n\n');
  return add(name,text);
 }
 function read(name, bytes) {
  if (bytes.length > 30*MB) throw Error('单文件超过30MB');
  const ext = name.split('.').pop().toLowerCase();
  if (['txt','md','csv'].includes(ext)) return add(name,decoder.decode(bytes));
  if (ext === 'json') {
   if (bytes.length > 1024*1024) throw Error('JSON 备课包超过1MB');
   const value = JSON.parse(decoder.decode(bytes));
   if (teachingPackages && value?.brief && value?.lesson) {
    if (results.length + packages.length >= 20) throw Error('本批最多20份');
    packages.push({name,value});
    return;
   }
   return add(name,JSON.stringify(value,null,2));
  }
  if (['docx','pptx','xlsx'].includes(ext)) return office(name,bytes,ext);
  throw Error('支持 DOCX、PPTX、XLSX、CSV、TXT、MD、JSON 和 ZIP；旧格式请另存为新版');
 }
 const chosen = Array.from(files);
 if (chosen.length > 20) errors.push('每批最多选择20个文件，其余文件请另批导入');
 for (const file of chosen.slice(0,20)) {
  try {
   if (file.size > 30*MB) throw Error('单文件超过30MB');
   inputSize += file.size;
   if (inputSize > 60*MB) throw Error('每批原文件合计最多60MB，请分批导入');
   const bytes = new Uint8Array(await file.arrayBuffer());
   if (!/\.zip$/i.test(file.name)) { read(file.name,bytes); continue; }
   const entries = selected(bytes,name=>supported.test(name)&&!name.startsWith('__MACOSX/')&&!name.split('/').some(part=>part.startsWith('.')),60*MB,'ZIP 所选文件解压超过60MB');
   const items = Object.entries(entries);
   if (!items.length) throw Error('压缩包内没有可读取的文档');
   for (const [name,value] of items) {
    if (results.length + packages.length >= 20) { errors.push(file.name+'：已达到20份，余下内容请分批导入'); break; }
    try { read(file.name+'/'+name,value); } catch (error) { errors.push(name+'：'+error.message); }
   }
  } catch (error) { errors.push(file.name+'：'+error.message); }
 }
 return {results,packages,errors};
}
