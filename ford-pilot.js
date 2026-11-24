(function(){
'use strict';
const $=id=>document.getElementById(id),base='https://dfexhuqdbcrjfhscmqjy.supabase.co',key='sb_publishable_orpnUOVOCwqMmNjsE0LVXQ_mG97SiVM',bucket='ford-pilot-private',dialog=$('fordPilotDialog');
const sess=()=>window.izkarPushSession?.();
let role='',owner='',busy=false,draft=null,offset=0,photoURL='',epoch=0,archiveReady=false,enhanced=false,editing=null;
const editors={account:window.izkarPhotoEditor.attach($('fordAccountFile'),$('fordAccountPreview')),ford:window.izkarPhotoEditor.attach($('fordAppFile'),$('fordAppPreview'))};
const status=s=>$('fordStatus').textContent=s, canWrite=()=>['operator','admin'].includes(role), canReview=()=>['reviewer','admin'].includes(role);
function guard(id){if(!id||sess()?.id!==id||owner!==id)throw Error('Oturum değişti.')}
async function req(path,{method='GET',body,headers={}}={},id=owner){
 guard(id);const s=sess();
 const r=await fetch(base+path,{method,body,headers:{apikey:key,Authorization:'Bearer '+s.token,...headers},cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30000)});
 guard(id);if(!r.ok){const e=Error('Sunucu işlemi tamamlanamadı (HTTP '+r.status+').');e.http=r.status;throw e}return r
}
const rest='/rest/v1/',rpc=(name,data,id)=>req(rest+'rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)},id);
const objectPath=(id,kind)=>'/storage/v1/object/'+bucket+'/'+id+'/'+kind+'.jpg';
async function photo(id,kind,account=owner){return (await req('/storage/v1/object/authenticated/'+bucket+'/'+id+'/'+kind+'.jpg',{},account)).blob()}
function hidePhoto(){if(photoURL)URL.revokeObjectURL(photoURL);photoURL='';$('fordPhoto').removeAttribute('src');$('fordPhotoView').hidden=true}
function toggle(){
 for(const [check,file,label] of [['fordAccount','fordAccountFile','fordAccountFileLabel'],['fordApp','fordAppFile','fordAppFileLabel']]){
  $(label).hidden=!$(check).checked;$(file).required=$(check).checked&&!draft&&!editing;if(!$(check).checked){$(file).value='';editors[check==='fordAccount'?'account':'ford'].reset()}
 }
}
function reset(){
 draft=null;editing=null;$('fordForm').reset();for(const e of Object.values(editors))e.reset();$('fordCancelEdit').hidden=true;$('fordNoteLabel').hidden=!enhanced;$('fordProgress').hidden=true;for(const id of ['fordName','fordDate','fordAccount','fordApp'])$(id).disabled=false;
 $('fordDate').value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date());
 $('fordForm').querySelector('button[type=submit]').textContent='Kaydı oluştur';toggle()
}
function clear(){hidePhoto();reset();$('fordList').replaceChildren();$('fordScope').textContent='';status('');offset=0}
function updateWork(){
 const allowed=['operator','reviewer','admin'].includes(role);
 $('fordPilotPanel').hidden=!allowed;$('homeWork').hidden=!allowed;$('workNav').hidden=!allowed;
 $('homeNewFord').hidden=!canWrite();$('fordAdminLink').hidden=!canReview();
 $('workEmpty').hidden=allowed;$('workEmpty').textContent=sess()?'Bu hesaba henüz iş modülü atanmadı.':'İş modülleri için Profil bölümünden giriş yap.';
 if(!allowed&&!$('page-work').hidden)document.querySelector('.tabbar [data-tab=home]').click();
}
async function access(){
 const seq=++epoch,s=sess();
 if(s?.id===owner&&role){updateWork();return;}
 role='';owner=s?.id||'';updateWork();
 if(dialog.open)dialog.close();clear();if(!owner)return;
 const id=owner;
 try{const rows=await (await req(rest+'work_module_members?select=role&module_key=eq.ford-pilot&user_id=eq.'+encodeURIComponent(id),{},id)).json();if(seq!==epoch||sess()?.id!==id)return;role=rows[0]?.role||'';updateWork()}catch{}
}
function setBusy(v){busy=v;if(!v)$('fordProgress').hidden=true;for(const id of ['fordFields','fordRefresh','fordExport','fordMore'])$(id).disabled=v}
async function ensurePhoto(id,kind,file,account){
 try{await photo(id,kind,account);return}catch(e){if(![400,404].includes(e.http))throw e}
 if(!file)throw Error('Eksik teyit fotoğrafını seç.');
 const blob=await window.izkarPhotoEditor.compress(file,editors[kind].crop());guard(account);
 await new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest(),p=$('fordProgress');p.hidden=false;p.value=0;
  xhr.open('POST',base+objectPath(id,kind));xhr.timeout=60000;
  xhr.setRequestHeader('apikey',key);xhr.setRequestHeader('Authorization','Bearer '+sess().token);xhr.setRequestHeader('Content-Type','image/jpeg');xhr.setRequestHeader('x-upsert','false');
  xhr.upload.onprogress=e=>{if(e.lengthComputable)p.value=Math.round(e.loaded/e.total*100)};
  xhr.onload=()=>{try{guard(account);if(xhr.status>=200&&xhr.status<300){p.value=100;resolve()}else reject(Error('Fotoğraf yüklenemedi (HTTP '+xhr.status+').'))}catch(e){reject(e)}};
  xhr.onerror=xhr.ontimeout=xhr.onabort=()=>reject(Error('Fotoğraf yüklemesi kesildi. Yeniden deneyebilirsin.'));xhr.send(blob)
 });
}
function readable(err){return err.message==='Failed to fetch'?'Bağlantı kesildi. İnternetini kontrol edip yeniden dene.':err.message||'İşlem başarısız.'}
async function duplicateWarning(name,date,id,account){
 if(!enhanced)return true;
 const found=await (await rpc('ford_pilot_duplicate',{p_name:name,p_date:date,p_exclude:id||null},account)).json();
 return found!==true||confirm('Benzer kayıt bulundu: bu isim ve teslim tarihiyle daha önce bir kayıt açılmış. Yine de devam etmek istiyor musun?')
}
$('fordForm').onsubmit=async e=>{
 e.preventDefault();if(busy||!canWrite())return;
 const account=owner,name=$('fordName').value.trim(),date=$('fordDate').value,a=$('fordAccount').checked,f=$('fordApp').checked;
 if(!/^TEST .{1,115}$/.test(name)){status('Örnek isim TEST ile başlamalı.');return}
 const id=editing?.id||draft?.id||crypto.randomUUID(),note=$('fordNote').value.trim(),af=$('fordAccountFile').files[0],ff=$('fordAppFile').files[0];
 setBusy(true);status('Kayıt hazırlanıyor…');
 try{
  if(!draft&&(!editing||editing.customer_name!==name||editing.delivery_date!==date)&&!await duplicateWarning(name,date,editing?.id,account)){status('Kayıt oluşturulmadı.');return}
  if(editing){
   if(a)await ensurePhoto(id,'account',af,account);if(f)await ensurePhoto(id,'ford',ff,account);
   await rpc('ford_pilot_edit',{p_id:id,p_revision:editing.revision,p_name:name,p_date:date,p_account:a,p_ford:f,p_note:note},account);
   guard(account);reset();await list(true);status('Kayıt güncellendi. Değişiklik geçmişi kaydedildi.');return
  }
  const payload={p_id:id,p_name:name,p_date:date,p_account:a,p_ford:f};
  if(enhanced)await rpc('ford_pilot_begin_v2',{...payload,p_note:note},account);else await rpc('ford_pilot_begin',payload,account);
  draft={id,customer_name:name,delivery_date:date,account_done:a,ford_done:f,created_by:account,status:'draft',incomplete_note:note};
  for(const id of ['fordName','fordDate','fordAccount','fordApp'])$(id).disabled=true;toggle();
  if(a){status('Ford Hesabım fotoğrafı kaydediliyor…');await ensurePhoto(id,'account',af,account)}
  if(f){status('Ford fotoğrafı kaydediliyor…');await ensurePhoto(id,'ford',ff,account)}
  await rpc('ford_pilot_finish',{p_id:id},account);guard(account);reset();status('Kayıt sunucuya kaydedildi.');await list(true)
 }catch(err){if(owner===account)status(readable(err)+' Taslak varsa kayıtlar bölümünden devam edebilirsin.')}
 finally{setBusy(false)}
};
async function rows(start,limit,id=owner){
 const fields='id,created_by,customer_name,delivery_date,account_done,ford_done,status,created_at,completed_at';
 const q=new URLSearchParams({select:fields+',incomplete_note,revision',order:'created_at.desc,id.desc',offset:String(start),limit:String(limit),archived_at:'is.null'});
 try{const result=await (await req(rest+'ford_pilot_records?'+q,{},id)).json();archiveReady=true;enhanced=true;$('fordNoteLabel').hidden=false;return result}catch(e){if(e.http!==400)throw e;enhanced=false;$('fordNoteLabel').hidden=true;q.set('select',fields)}
 try{const result=await (await req(rest+'ford_pilot_records?'+q,{},id)).json();archiveReady=true;return result}catch(e){if(e.http!==400)throw e;archiveReady=false;q.delete('archived_at');return (await req(rest+'ford_pilot_records?'+q,{},id)).json()}
}
function button(label,fn){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.onclick=fn;return b}
function resume(r){
 if(busy)return;reset();draft=r;
 $('fordName').value=r.customer_name;$('fordDate').value=r.delivery_date;$('fordAccount').checked=r.account_done;$('fordApp').checked=r.ford_done;
 for(const id of ['fordName','fordDate','fordAccount','fordApp'])$(id).disabled=true;toggle();
 $('fordNote').value=r.incomplete_note||'';$('fordCancelEdit').hidden=false;$('fordForm').querySelector('button[type=submit]').textContent='Taslağı tamamla';$('fordForm').scrollIntoView({block:'start'});status('Eksik fotoğrafları seç. Önceden yüklenenler korunacak.')
}
function edit(r){
 if(busy||!enhanced||!canWrite()||(role!=='admin'&&r.created_by!==owner))return;
 reset();editing=r;$('fordName').value=r.customer_name;$('fordDate').value=r.delivery_date;$('fordAccount').checked=r.account_done;$('fordApp').checked=r.ford_done;$('fordNote').value=r.incomplete_note||'';
 $('fordCancelEdit').hidden=false;$('fordForm').querySelector('button[type=submit]').textContent='Değişiklikleri kaydet';toggle();$('fordForm').scrollIntoView({block:'start'});status('Mevcut fotoğraflar korunur. Eksik uygulamaya ilk fotoğrafını ekleyebilirsin.')
}
$('fordCancelEdit').onclick=()=>{if(!busy){reset();status('Yeni kayıt oluşturabilirsin.')}};
async function view(r,kind){
 const id=owner;hidePhoto();
 try{const b=await photo(r.id,kind,id);guard(id);if(!dialog.open)return;photoURL=URL.createObjectURL(b);$('fordPhoto').src=photoURL;$('fordPhotoView').hidden=false;$('fordPhotoView').scrollIntoView({block:'nearest'})}catch(e){if(owner===id)status(e.message)}
}
async function removeRecord(r){
 if(busy||role!=='admin'||!archiveReady||!confirm(r.customer_name+' kaydı çöp kutusuna taşınsın mı? Fotoğraflar korunur.'))return;
 const id=owner;setBusy(true);hidePhoto();
 try{await rpc('ford_pilot_archive',{p_id:r.id,p_archive:true},id);guard(id);if(draft?.id===r.id)reset();await list(true);status('Kayıt çöp kutusuna taşındı. Yönetim portalından geri alabilirsin.')}catch(e){if(owner===id)status(e.message)}finally{setBusy(false)}
}
async function list(resetList){
 const id=owner;if(resetList){offset=0;$('fordList').replaceChildren()}
 const data=await rows(offset,25,id);guard(id);
 for(const r of data){
  const section=document.createElement('section'),h=document.createElement('h2'),p=document.createElement('p');
  h.textContent=r.customer_name;p.textContent=r.delivery_date+' · '+(r.status==='complete'?'Kaydedildi':'Taslak')+' · Ford Hesabım: '+(r.account_done?'Evet':'Hayır')+' · Ford: '+(r.ford_done?'Evet':'Hayır');section.append(h,p);if(r.incomplete_note){const note=document.createElement('p');note.textContent='Açıklama: '+r.incomplete_note;section.append(note)}
  if(r.status==='draft'&&r.created_by===id&&canWrite())section.append(button('Taslağa devam et',()=>resume(r)));
  if(r.status==='complete'){if(r.account_done)section.append(button('Hesabım fotoğrafı',()=>view(r,'account')));if(r.ford_done)section.append(button('Ford fotoğrafı',()=>view(r,'ford')))}
  if(enhanced&&r.status==='complete'&&canWrite()&&(role==='admin'||r.created_by===id))section.append(button('Düzenle',()=>edit(r)));
  if(role==='admin'&&archiveReady)section.append(button('Sil',()=>removeRecord(r)));
  $('fordList').append(section)
 }
 offset+=data.length;$('fordMore').hidden=data.length<25;$('fordScope').textContent=(canReview()?'Yetkili olduğun test kayıtları':'Kendi test kayıtların')+' · '+offset+' kayıt gösteriliyor.'
}
async function refresh(resetList=true){if(busy)return;setBusy(true);try{await list(resetList)}catch(e){status(e.message)}finally{setBusy(false)}}
async function hash(blob){const h=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function dataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
$('fordExport').onclick=async()=>{
 if(busy||!canReview()||!confirm('Tamamlanmış TEST kayıtlarının fotoğraflı yedeğini indir? Güvenli bir yerde sakla.'))return;
 const account=owner;setBusy(true);
 try{
  let all=[],page=0;
  while(true){const batch=await rows(page,25,account);all.push(...batch);if(all.length>200)throw Error('Pilot yedeği 200 kayıtla sınırlı.');if(batch.length<25)break;page+=batch.length}
  const records=[];
  for(const r of all){if(r.status!=='complete')continue;status('Yedek hazırlanıyor: '+(records.length+1));const images={};
   for(const [kind,done] of [['account',r.account_done],['ford',r.ford_done]])if(done){const b=await photo(r.id,kind,account);images[kind]={bytes:b.size,sha256:await hash(b),data:await dataURL(b)}}
   records.push({record:r,images})
  }
  guard(account);const blob=new Blob([JSON.stringify({format:'izkarwell-ford-pilot-1',created_at:new Date().toISOString(),records})],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='izkarwell-ford-test-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status(records.length+' tamamlanmış kayıt ve fotoğrafları yedek dosyasına hazırlandı. Geri yükleme henüz yok.')
 }catch(e){status(e.message)}finally{setBusy(false)}
};
function openFord(mode){if(!role||!owner||busy||dialog.open)return;clear();$('fordForm').hidden=!canWrite();$('fordExport').hidden=!canReview();dialog.showModal();refresh().then(()=>{if(dialog.open&&mode==='records')$('fordList').scrollIntoView({block:'start'})})}
$('fordOpen').onclick=()=>openFord('records');$('homeNewFord').onclick=()=>openFord('new');$('homeFordRecords').onclick=()=>openFord('records');
$('fordClose').onclick=()=>{if(!busy)dialog.close()};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});dialog.addEventListener('close',clear);
$('fordAccount').onchange=toggle;$('fordApp').onchange=toggle;$('fordPhotoClose').onclick=hidePhoto;$('fordRefresh').onclick=()=>refresh();$('fordMore').onclick=()=>refresh(false);
window.addEventListener('izkarwell-auth',access);access();
})();