import {build} from 'esbuild';
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
const vendors={};
for(const [source,target] of [['pptxgen.bundle.js','pptx.js'],['docx.iife.js','docx.js']])vendors['/vendor/'+target]=await readFile('worker/vendor/'+source,'utf8');
const zipBundle=await build({stdin:{contents:"import * as fflate from 'fflate'; window.fflate=fflate;",resolveDir:process.cwd()},bundle:true,write:false,minify:true,format:'iife'});
vendors['/vendor/zip.js']=zipBundle.outputFiles[0].text;
await writeFile('worker/assets.js','export const vendorAssets='+JSON.stringify(vendors)+';\n');
const {default:worker}=await import('../worker/index.js');
await mkdir('public/vendor',{recursive:true});
for(const [route,file] of [['/','index.html'],['/design-preview','design-preview.html']]){
 const page=await worker.fetch(new Request('https://build.invalid'+route),{});
 if(!page.ok)throw Error('Page build failed: '+route);
 await writeFile('public/'+file,await page.text());
}
for(const [source,target] of [['pptxgen.bundle.js','pptx.js'],['docx.iife.js','docx.js']])await copyFile('worker/vendor/'+source,'public/vendor/'+target);

await writeFile('public/vendor/zip.js',vendors['/vendor/zip.js']);

await mkdir('public/media',{recursive:true});
await copyFile('worker/media/classroom-cover.jpg','public/media/classroom-cover.jpg');

await copyFile('worker/media/paper-bridge.jpg','public/media/paper-bridge.jpg');
