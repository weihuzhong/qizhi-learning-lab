import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {installAppearance} from '../worker/appearance.js';

function browserFixture({stored=null,dark=false,blocked=false}={}) {
 const listeners={},mediaListeners={};
 const storage=new Map([['qizhi-appearance-v1',stored],['qizhi-teaching','untouched lesson']]);
 const media={matches:dark,addEventListener:(name,fn)=>mediaListeners[name]=fn};
 const doc={documentElement:{dataset:{}},dispatchEvent:()=>{}};
 const win={matchMedia:()=>media,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},addEventListener:(name,fn)=>listeners[name]=fn,localStorage:{getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key);},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage.set(key,value);}}};
 installAppearance(win,doc);
 return {win,doc,storage,media,setSystem:dark=>{media.matches=dark;mediaListeners.change();},storageEvent:change=>listeners.storage(change)};
}

test('appearance survives reload, follows system only in automatic mode, and leaves lessons untouched',()=>{
 const b=browserFixture({dark:true});
 assert.deepEqual(b.win.qizhiAppearance.get(),{palette:'forest',mode:'system'});
 assert.equal(b.doc.documentElement.dataset.mode,'dark');
 b.setSystem(false);assert.equal(b.doc.documentElement.dataset.mode,'light');
 for(const palette of ['forest','ocean','violet','amber']) {
  assert.equal(b.win.qizhiAppearance.set({palette,mode:'dark'}),true);
  assert.equal(b.doc.documentElement.dataset.palette,palette);
 }
 b.setSystem(false);assert.equal(b.doc.documentElement.dataset.mode,'dark');
 const reload=browserFixture({stored:b.storage.get('qizhi-appearance-v1')});
 assert.deepEqual(reload.win.qizhiAppearance.get(),{palette:'amber',mode:'dark'});
 assert.equal(b.storage.get('qizhi-teaching'),'untouched lesson');
});

test('unavailable/corrupt storage does not prevent applying a theme; tab changes and storage clear synchronize',()=>{
 const blocked=browserFixture({blocked:true});
 assert.equal(blocked.win.qizhiAppearance.set({palette:'ocean',mode:'dark'}),false);
 assert.equal(blocked.doc.documentElement.dataset.palette,'ocean');
 assert.equal(blocked.doc.documentElement.dataset.mode,'dark');
 const b=browserFixture({stored:'not json'});
 assert.equal(b.win.qizhiAppearance.get().palette,'forest');
 b.storageEvent({key:'qizhi-appearance-v1',newValue:JSON.stringify({palette:'violet',mode:'light'})});
 assert.equal(b.doc.documentElement.dataset.palette,'violet');
 b.storageEvent({key:'unrelated',newValue:null});assert.equal(b.doc.documentElement.dataset.palette,'violet');
 b.storageEvent({key:null,newValue:null});assert.equal(b.doc.documentElement.dataset.palette,'forest');
 b.win.qizhiAppearance.set({palette:'invalid',mode:'invalid'});
 assert.deepEqual(b.win.qizhiAppearance.get(),{palette:'forest',mode:'system'});
});

test('served page scripts parse together; appearance initializes before paint and after existing client modules',async()=>{
 const {default:worker}=await import('../worker/index.js');
 const html=await (await worker.fetch(new Request('https://test.invalid/'),{})).text();
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
 for(const script of scripts)new Script(script);
 assert(html.indexOf('charset="utf-8"')<1024);
 assert(html.indexOf('installAppearance')<html.indexOf('<style>'));
 const main=scripts.at(-1);
 assert(main.includes('const appearanceNames'));
 assert(main.indexOf('const appearanceNames')<main.lastIndexOf('nav();render();'));
});
