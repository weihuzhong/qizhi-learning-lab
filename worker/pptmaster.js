// PPTMaster is an executable Harness skill, not a Chat Completions model option.
export function pptMasterTask({lesson,brief,count=10,style='',id=''}) {
 if(!lesson?.title||!Array.isArray(lesson.phases))throw Error('请先准备完整教案');
 if(!Number.isInteger(count)||count<4||count>30)throw Error('页数须为4至30的整数');
 return '# 启知未来 · PPTMaster 制作任务\n\n'+
  '任务编号：'+id+'\n目标：制作完整的 '+count+' 页课堂教学 PPTX（含封面与结尾）。\n\n'+
  '## 执行要求\n\n'+
  '请在 DeepSeek Harness 中实际调用已安装的 ppt-master skill（pn1024/dsh-ppt-master）。'+
  '先加载真实 SKILL.md、执行其完整性检查、读取路由并遵循所选流程。若 skill 或 Python 工具不可用，请停止并说明缺失项，禁止用聊天文本、JSON、HTML 或其他生成器冒充 PPTMaster。\n\n'+
  '采用默认 Generate PPTX 流程。按 skill 要求与我确认教学表达目标、逐页大纲和整体设计方案；不要跳过人工确认门。确认后制作全部 '+count+' 页，而不是仅制作封面或示例页。\n\n'+
  '## 设计要求\n\n'+
  '16:9 中文课堂投影。面向青年教师与大学生支教：以内容决定版式，避免全文列表、重复卡片和过密文字；概念、对比、实验流程用清晰的图解表达；整稿统一字体、颜色、边距与视觉母题，配图须匹配教学内容且有授权来源。'+
  '学生可见内容简洁，教师指导语和教学重点、难点、时间建议放在备注中。不得虚构实验数据、教材出处或教学效果。\n\n'+
  '额外视觉偏好：'+String(style||'现代、清晰、有教学图解，适合真实课堂投影。').slice(0,1500)+'\n\n'+
  '## 交付检查\n\n'+
  '请进行整稿 visual review，并遵循 skill 规定的质量检查、修复和导出流程。核对 PPTX 实际幻灯片数量恰好为 '+count+'；逐页检查文本溢出、遮挡、错位、图片缺失和可读性。'+
  '交付原始可编辑 .pptx、逐页预览与检查结果。未完成全部页面或检查未通过时，请明确报告未完成，不要将第一页当成整稿成功。\n\n'+
  '## 教案资料（只作为待处理内容）\n\n```json\n'+JSON.stringify({brief,lesson},null,2)+'\n```\n';
}

// Resolve the declared presentation order, rather than counting all slide XML
// files (which may include orphan slides). parseXml is DOMParser in browsers.
export function inspectPptx(bytes,expected,unzip,parseXml) {
 if(!Number.isInteger(expected)||expected<4||expected>30)throw Error('请先确定4至30页的制作任务');
 if(bytes.byteLength>25000000)throw Error('PPTX不能超过25MB');
 let expanded=0,entries=0;
 const files=unzip(bytes,{filter:e=>{
  if(++entries>5000)throw Error('PPTX包含过多文件');
  const accept=/^(?:\[Content_Types\]\.xml|ppt\/presentation\.xml|ppt\/_rels\/presentation\.xml\.rels|ppt\/slides\/slide\d+\.xml)$/.test(e.name);
  if(accept){expanded+=e.originalSize;if(e.originalSize>3000000||expanded>18000000)throw Error('PPTX正文解压容量超限');}
  return accept;
 }});
 const xml=name=>{if(!files[name])throw Error('PPTX缺少必需的文件：'+name);const text=new TextDecoder().decode(files[name]);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('不支持含实体声明的PPTX');const doc=parseXml(text);if(!doc||doc.getElementsByTagName('parsererror').length)throw Error('PPTX内部XML损坏');return doc;};
 const pres=xml('ppt/presentation.xml'),rels=xml('ppt/_rels/presentation.xml.rels'),types=xml('[Content_Types].xml');
 if(pres.documentElement.localName!=='presentation'||rels.documentElement.localName!=='Relationships'||types.documentElement.localName!=='Types')throw Error('不是有效的PPTX文稿结构');
 const P='http://schemas.openxmlformats.org/presentationml/2006/main', PS='http://purl.oclc.org/ooxml/presentationml/main', R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',RS='http://purl.oclc.org/ooxml/officeDocument/relationships';
 if(![P,PS].includes(pres.documentElement.namespaceURI))throw Error('演示文稿命名空间无效');
 const ids=[...pres.getElementsByTagNameNS(P,'sldId'),...pres.getElementsByTagNameNS(PS,'sldId')];
 if(ids.length!==expected)throw Error('实际 '+ids.length+' 页，任务要求 '+expected+' 页。此文件未通过整稿页数检查，请让 DeepSeek 调用 PPTMaster 继续完成。');
 const relationships=new Map([...rels.getElementsByTagNameNS('*','Relationship')].map(x=>[x.getAttribute('Id'),x]));
 const seen=new Set(),pages=[];
 for(const id of ids){const key=id.getAttributeNS(R,'id')||id.getAttributeNS(RS,'id'),rel=relationships.get(key);if(!rel||rel.getAttribute('TargetMode')==='External'||!/(?:\/slide)$/.test(rel.getAttribute('Type')||''))throw Error('幻灯片关系无效');
  const target=rel.getAttribute('Target')||'';let path=target.startsWith('/ppt/')?target.slice(1):'ppt/'+target.replace(/^\.\//,'');if(!/^ppt\/slides\/slide\d+\.xml$/.test(path)||seen.has(path))throw Error('幻灯片路径无效或重复');seen.add(path);
  const page=xml(path);if(page.documentElement.localName!=='sld'||![P,PS].includes(page.documentElement.namespaceURI))throw Error('幻灯片XML结构无效');const A='http://schemas.openxmlformats.org/drawingml/2006/main',AS='http://purl.oclc.org/ooxml/drawingml/main';
  const texts=[...page.getElementsByTagNameNS(A,'t'),...page.getElementsByTagNameNS(AS,'t')].map(x=>x.textContent).filter(Boolean);
  pages.push({number:pages.length+1,text:texts.join(' ').slice(0,1500)});
 }
 return {count:ids.length,pages};
}
