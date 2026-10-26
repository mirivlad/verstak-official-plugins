#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
let bundle;
vm.runInNewContext(fs.readFileSync(path.join(root,'plugins/actions/frontend/src/index.js'),'utf8'), {
  window: { crypto: {randomUUID}, VerstakPluginRegister(id,value){ assert.equal(id,'verstak.actions');bundle=value; } },
  URL, Set, Promise, Date, console
});
let settings={unrelated:'kept'};
const handlers={};
let runs=0,reviews=0;
const api={
  settings:{read:async(key)=>JSON.parse(JSON.stringify(settings[key]||[])),upsertRecord:async(key,id,record)=>{const list=settings[key]||[];settings[key]=[record,...list.filter(r=>r[id]!==record[id])];}},
  commands:{register:async(id,fn)=>{handlers[id]=fn;}},
  ui:{openView:async(id)=>id},
  processes:{run:async()=>{runs++;},review:async()=>{reviews++;}}
};
async function main(){
 await bundle.activate(api);
 const list=()=>handlers['verstak.actions.list']();
 const save=(value)=>handlers['verstak.actions.save'](value);
 const global=await save({title:'Global',type:'application',target:'printf',args:['%s','two words; $(no-shell)'],mode:'wait',workspaceId:''});
 const deal=await save({title:'Deal',type:'script',target:'/tmp/example.py',interpreter:'python3',args:['--flag'],mode:'wait',workspaceId:'11111111-1111-4111-8111-111111111111'});
 assert.equal((await list()).length,2);
 assert.equal((await list()).filter(r=>r.workspaceId==='').length,1);
 assert.equal((await list()).filter(r=>r.workspaceId===deal.workspaceId).length,1);
 await save({...global,title:'Edited',cwd:'/tmp'});
 settings=JSON.parse(JSON.stringify(settings));
 assert.equal((await list()).find(r=>r.id===global.id).title,'Edited');
 assert.equal(settings.unrelated,'kept');
 await assert.rejects(save({...deal,args:'shell line'}),/invalid_arguments/);
 await assert.rejects(save({...deal,workspaceId:'Some/path'}),/invalid_scope/);
 await assert.rejects(save({...deal,target:'relative.py'}),/invalid_script/);
 await handlers['verstak.actions.delete']({id:global.id});
 assert.equal((await list()).length,1);
 assert.equal(settings.actions.find(r=>r.id===global.id).target,undefined,'tombstone removes executable definition');
 await bundle.activate(api); // enable/reload is passive and preserves definitions
 settings.actions.push({...global,id:randomUUID(),title:'Synced imported definition'});
 await list();
 assert.equal(runs,0);assert.equal(reviews,0,'loading/sync must never request execution approval');
 assert.equal(await handlers['verstak.actions.open'](),'verstak.actions.view');
 console.log('Actions: CRUD, reload, UUID/global scope, validation, tombstones and passive activation passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
