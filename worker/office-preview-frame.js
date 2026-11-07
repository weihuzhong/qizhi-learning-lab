import {renderAsync} from 'docx-preview';
import {pptxToHtml} from '@jvmr/pptx-to-html';

const content=document.getElementById('office-document');
const origin=location.origin;
const reply=state=>parent.postMessage({type:'qizhi-office-preview',state},origin);

function checkPackage(bytes,extension){
 const view=new DataView(bytes);
 let end=bytes.byteLength-22;
 const minimum=Math.max(0,end-65535);
 while(end>=minimum&&(view.getUint32(end,true)!==0x06054b50||end+22+view.getUint16(end+20,true)!==bytes.byteLength))end--;
 if(end<minimum)throw Error('Invalid archive');
 const count=view.getUint16(end+10,true);
 const offset=view.getUint32(end+16,true);
 if(!count||count>3000||offset+view.getUint32(end+12,true)!==end)throw Error('Invalid package directory');
 const required=extension==='docx'?'word/document.xml':'ppt/presentation.xml';
 const decoder=new TextDecoder();
 let position=offset,size=0,found=false;
 for(let i=0;i<count;i++){
  if(position+46>end||view.getUint32(position,true)!==0x02014b50)throw Error('Invalid package entry');
  const entrySize=view.getUint32(position+24,true);
  const nameLength=view.getUint16(position+28,true);
  size+=entrySize;
  if(entrySize>32*1024*1024||size>160*1024*1024||position+46+nameLength>end)throw Error('Oversized preview');
  const name=decoder.decode(new Uint8Array(bytes,position+46,nameLength));
  if(name===required)found=true;
  position+=46+nameLength+view.getUint16(position+30,true)+view.getUint16(position+32,true);
 }
 if(!found||position!==end)throw Error('Unsupported Office file');
}

async function renderSlides(bytes){
 const width=Math.max(240,Math.min(1120,document.documentElement.clientWidth-32));
 const slides=await pptxToHtml(bytes,{width,height:Math.round(width*9/16),scaleToFit:true,letterbox:true});
 if(!slides.length)throw Error('No slides');
 const controls=document.getElementById('preview-controls');
 const previous=document.getElementById('previous-slide');
 const next=document.getElementById('next-slide');
 const count=document.getElementById('slide-count');
 content.classList.add('slides');
 let index=0;
 function show(){
  const slide=document.createElement('template');
  slide.innerHTML=slides[index];
  slide.content.querySelectorAll('script,iframe,object,embed,meta,link,base,form').forEach(node=>node.remove());
  content.replaceChildren(slide.content);
  count.textContent='第 '+(index+1)+' 页 / 共 '+slides.length+' 页';
  previous.disabled=index===0;
  next.disabled=index===slides.length-1;
 }
 previous.onclick=()=>{index--;show();};
 next.onclick=()=>{index++;show();};
 controls.hidden=false;
 show();
}

document.addEventListener('click',event=>{
 if(event.target.closest?.('a'))event.preventDefault();
});
async function receive(event){
 if(event.source!==parent||event.origin!==origin||event.data?.type!=='qizhi-office-file')return;
 window.removeEventListener('message',receive);
 const {bytes,extension}=event.data;
 try{
  if(!(bytes instanceof ArrayBuffer)||bytes.byteLength>30*1024*1024||!['docx','pptx'].includes(extension))throw Error('Unsupported file');
  checkPackage(bytes,extension);
  if(extension==='docx')await renderAsync(bytes,content,undefined,{renderAltChunks:false,breakPages:true});
  else await renderSlides(bytes);
  reply('rendered');
 }catch{
  content.replaceChildren();
  reply('failed');
 }
}
window.addEventListener('message',receive);
reply('ready');
