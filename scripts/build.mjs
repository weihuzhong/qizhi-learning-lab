import {build} from 'esbuild';
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
const vendors={};
for(const [source,target] of [['pptxgen.bundle.js','pptx.js'],['docx.iife.js','docx.js']])vendors['/vendor/'+target]=await readFile('worker/vendor/'+source,'utf8');
const zipBundle=await build({stdin:{contents:"import * as fflate from 'fflate'; window.fflate=fflate;",resolveDir:process.cwd()},bundle:true,write:false,minify:true,format:'iife'});
vendors['/vendor/zip.js']=zipBundle.outputFiles[0].text;
await writeFile('worker/assets.js','export const vendorAssets='+JSON.stringify(vendors)+';\n');
const {default:worker}=await import('../worker/index.js');
await mkdir('public/vendor',{recursive:true});
const page=await worker.fetch(new Request('https://build.invalid/'),{});
if(!page.ok)throw Error('Homepage build failed');
await writeFile('public/index.html',await page.text());
for(const [source,target] of [['pptxgen.bundle.js','pptx.js'],['docx.iife.js','docx.js']])await copyFile('worker/vendor/'+source,'public/vendor/'+target);

await writeFile('public/vendor/zip.js',vendors['/vendor/zip.js']);
