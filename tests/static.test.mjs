import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Application and admin scripts parse',()=>{
 for(const file of ['water.js','smoking.js','cloud-namespace.js','cloud-core.js','cloud-auth.js','notifications.js','ford-photo.js','ford-pilot.js','sw.js','admin/admin.js','admin/users.js','admin/overview.js','admin/admin-shell.js','admin/xlsx.js'])new vm.Script(read(file),{filename:file});
});
test('DOM IDs and navigation targets exist; removed modules absent',()=>{
 for(const [html,scripts] of [['index.html',['smoking.js','water.js','ford-pilot.js','cloud-auth.js','notifications.js']],['admin/index.html',['admin/admin.js']],['admin/users.html',['admin/users.js']],['admin/overview.html',['admin/overview.js']]]){
 const h=read(html),ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,html);
 for(const file of scripts){const s=read(file);for(const match of s.matchAll(/(?:\$|\bel|\bwd)\('([^']+)'\)/g)){if(match[1].startsWith('#'))continue;assert.ok(ids.includes(match[1]),file+' missing '+match[1])}}
 if(html==='index.html'){for(const m of h.matchAll(/data-tab="([^"]+)"/g))assert.ok(ids.includes('page-'+m[1]));assert.ok(!h.includes('Aktif Yaşam'));assert.ok(!h.includes('Uyku ve Dinlenme'))}
 }
});
test('Excel has 3 worksheets and user strings cannot become formulas; ZIP bytes roundtrip',async()=>{
 const window={};vm.runInNewContext(read('admin/xlsx.js'),{window,TextEncoder,Uint8Array,Uint32Array,DataView,Blob});
 const parse=async blob=>{const b=new Uint8Array(await blob.arrayBuffer()),v=new DataView(b.buffer);let p=0;const files=new Map();while(v.getUint32(p,true)===0x04034b50){const n=v.getUint16(p+26,true),l=v.getUint32(p+18,true),s=p+30+n;files.set(new TextDecoder().decode(b.slice(p+30,s)),b.slice(s,s+l));p=s+l}assert.equal(v.getUint32(p,true),0x02014b50);assert.equal(v.getUint32(b.length-22,true),0x06054b50);return files};
 const x=await parse(window.izkarFordWorkbook([['Ad'],['=1+1 & <A>']],[['Özet'],[1]],[['Personel'],['Üye A']]));
 assert.equal(x.size,8);assert.match(new TextDecoder().decode(x.get('xl/workbook.xml')),/name="Personel"/);const cell=new TextDecoder().decode(x.get('xl/worksheets/sheet1.xml'));assert.match(cell,/=1\+1 &amp; &lt;A&gt;/);assert.doesNotMatch(cell,/<f>/);
 const src=new Uint8Array([255,216,0,255,217]),z=await parse(window.izkarFordZip([['photo.jpg',src]]));assert.deepEqual(z.get('photo.jpg'),src)
});
