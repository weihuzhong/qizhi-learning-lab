import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {zipSync,unzipSync,strToU8} from 'fflate';
import {pptMasterTask,inspectPptx} from '../worker/pptmaster.js';
import {pptMasterClient} from '../worker/pptmaster-client.js';

const P='http://schemas.openxmlformats.org/presentationml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',A='http://schemas.openxmlformats.org/drawingml/2006/main';
const parse=text=>new DOMParser({onError:level=>{if(level==='error'||level==='fatalError')throw Error('invalid xml')}}).parseFromString(text,'application/xml');
function deck(count,{orphan=false,missing=false,repeated=false,reverse=false,external=false}={}){
 const order=Array.from({length:count},(_,i)=>i+1);if(reverse)order.reverse();
 const files={'[Content_Types].xml':strToU8('<Types/>'),'ppt/presentation.xml':strToU8('<p:presentation xmlns:p="'+P+'" xmlns:r="'+R+'"><p:sldIdLst>'+order.map(n=>'<p:sldId id="'+(n+255)+'" r:id="r'+(repeated?1:n)+'"/>').join('')+'</p:sldIdLst></p:presentation>'),'ppt/_rels/presentation.xml.rels':strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+order.map(n=>'<Relationship Id="r'+n+'" Type="'+R+'/slide" Target="slides/slide'+n+'.xml" '+(external?'TargetMode="External"':'')+'/>').join('')+'</Relationships>')};
 for(let i=1;i<=count;i++)if(!missing||i!==count)files['ppt/slides/slide'+i+'.xml']=strToU8('<p:sld xmlns:p="'+P+'" xmlns:a="'+A+'"><a:t>课堂第'+i+'页 &amp; 观察</a:t></p:sld>');
 if(orphan)files['ppt/slides/slide99.xml']=strToU8('<p:sld/>');return zipSync(files);
}
test('PPTMaster handoff includes complete lesson, fixed page count, actual skill execution and human gates',()=>{
 const text=pptMasterTask({lesson:{title:'纸桥',phases:[{name:'实验',minutes:20}]},brief:{grade:'五年级'},count:10,id:'request-test'});
 for(const snippet of ['DeepSeek Harness','ppt-master','pn1024/dsh-ppt-master','10 页','人工确认门','visual review','request-test','纸桥'])assert(text.includes(snippet));
 assert.throws(()=>pptMasterTask({lesson:{title:'纸桥',phases:[]},count:1}));
 assert.throws(()=>pptMasterTask({lesson:null,count:10}));
});
test('checks presentation order and actual count, ignores orphan XML slides',()=>{
 const result=inspectPptx(deck(4,{orphan:true,reverse:true}),4,unzipSync,parse);
 assert.equal(result.count,4);assert(result.pages[0].text.includes('课堂第4页 & 观察'));
 assert.throws(()=>inspectPptx(deck(1),10,unzipSync,parse),/实际 1 页/);
 assert.throws(()=>inspectPptx(deck(5),4,unzipSync,parse),/实际 5 页/);
});
test('rejects missing pages, duplicate relationships, external targets and inflated XML',()=>{
 for(const flags of [{missing:true},{repeated:true},{external:true}])assert.throws(()=>inspectPptx(deck(4,flags),4,unzipSync,parse));
 const bomb=zipSync({'ppt/presentation.xml':new Uint8Array(3000001)});
 assert.throws(()=>inspectPptx(bomb,4,unzipSync,parse),/解压容量/);
 assert.throws(()=>inspectPptx(new Uint8Array(25000001),4,unzipSync,parse),/25MB/);
});
test('new PPT entry has no silent model call or PptxGenJS fallback',()=>{
 assert(pptMasterClient.includes('网页自动调用尚未接通'));
 assert(pptMasterClient.includes('不是版式预览'));
 assert(!pptMasterClient.includes("api('deck/"));
 assert(!pptMasterClient.includes('new window.PptxGenJS'));
 new Function(pptMasterClient); // serialized functions must remain valid browser JS
});
