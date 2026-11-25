(function(){
'use strict';
const $=id=>document.getElementById(id),base='https://dfexhuqdbcrjfhscmqjy.supabase.co',key='sb_publishable_orpnUOVOCwqMmNjsE0LVXQ_mG97SiVM';
let client,session=null,role='',records=[],filtered=[],page=0,busy=false,epoch=0,url='',photoEpoch=0,photoName='',creatorReady=false,reportSnapshot=null,enhanced=false,editing=null,size=25,corporateReady=false,realEnabled=false,photoRecord=null;
const status=s=>$('status').textContent=s;
function clearPhoto(){photoRecord=null;$('zoomPhoto').disabled=true;$('photoDialog').classList.remove('photo-full');$('zoomPhoto').textContent='Tam ekran';$('downloadPhoto').disabled=true;photoName='';photoEpoch++;if(url)URL.revokeObjectURL(url);url='';$('photoImage').removeAttribute('src');$('photoImage').hidden=true}
function reset(){corporateReady=false;realEnabled=false;$('recordType').value='real';$('corporateGate').textContent='Gerçek müşteri kaydı girişi kapalı. Yalnızca sentetik veriler kullan.';enhanced=false;editing=null;busy=false;for(const k of ['editRecordDialog','recordHistoryDialog'])if($(k).open)$(k).close();$('person').replaceChildren(new Option('Tümü',''));$('staffChart').replaceChildren();$('monthChart').replaceChildren();$('signOut').hidden=!session;$('userAdminLink').hidden=true;reportSnapshot=null;creatorReady=false;if($('reportDialog').open)$('reportDialog').close();records=[];filtered=[];page=0;role='';$('workspace').hidden=true;$('records').replaceChildren();$('identity').textContent='';clearPhoto();if($('photoDialog').open)$('photoDialog').close()}
async function req(path,options={},id=session?.user?.id){
 const s=session;if(!id||s?.user?.id!==id||!s.access_token)throw Error('Oturum yok.');
 const r=await fetch(base+path,{...options,headers:{apikey:key,Authorization:'Bearer '+s.access_token,...options.headers},cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30000)});
 if(session?.user?.id!==id)throw Error('Oturum değişti.');if(!r.ok)throw Error('Sunucu işlemi başarısız (HTTP '+r.status+').');return r
}
async function auth(s){
 const n=++epoch;session=s;reset();$('login').hidden=!!s;
 if(!s){status('Çalışan uygulamasında Google ile giriş yapıp tekrar buraya dön.');return}
 const id=s.user.id;$('signOut').hidden=false;
 try{const isAdmin=await (await req('/rest/v1/rpc/platform_is_admin',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},id)).json();if(n!==epoch)return;$('userAdminLink').hidden=isAdmin!==true}catch{if(n!==epoch)return}
 try{const rs=await (await req('/rest/v1/work_module_members?select=role&module_key=eq.ford-pilot&user_id=eq.'+encodeURIComponent(id),{},id)).json();if(n!==epoch)return;
 role=rs[0]?.role||'';if(!['reviewer','admin'].includes(role)){status($('userAdminLink').hidden?'Bu yönetim portalı için yetkin yok.':'Ford kayıtlarına erişim yetkin yok. Kullanıcı Yönetimi menüsünü kullanabilirsin.');return}
 $('identity').textContent=(s.user.email||'')+' · '+(role==='admin'?'Modül yöneticisi':'İnceleyici');$('archiveLabel').hidden=role!=='admin';$('archive').value='active';$('workspace').hidden=false;await load(n)
 }catch(e){if(n===epoch){reset();status('Erişim kontrolü başarısız. '+e.message)}}
}
async function load(n=epoch){
 if(!role)return;const id=session.user.id;busy=true;$('reload').disabled=true;$('export').disabled=true;$('report').disabled=true;$('zip').disabled=true;creatorReady=false;status('Kayıtlar yükleniyor…');
 try{
 corporateReady=false;realEnabled=false;
 try{const g=await (await rpc('ford_corporate_status',{})).json();if(n!==epoch)return;corporateReady=true;realEnabled=g.real_entry_enabled===true;role=g.role;if(!['admin','reviewer'].includes(role))throw Error('Yetki kaldırıldı.')}catch(e){if(e.message.includes('HTTP 401')||e.message.includes('HTTP 403')||!['admin','reviewer'].includes(role))throw e}
 $('corporateGate').textContent=realEnabled?'Gerçek kayıt girişi açık. Müşteri verilerini yalnızca yetkili iş amacıyla kullan.':'Gerçek müşteri kaydı girişi kapalı. Test kayıtları ayrı görünümde bulunur.';
 let all=[],offset=0;const fields='id,customer_name,delivery_date,account_done,ford_done,status,created_at,created_by,archived_at';enhanced=true;while(true){
 const q=new URLSearchParams({select:fields+(enhanced?',incomplete_note,revision':'')+(corporateReady?',is_test':''),order:'created_at.desc,id.desc',limit:'250',offset:String(offset)});
 let data;try{data=await (await req('/rest/v1/ford_pilot_records?'+q,{},id)).json()}catch(e){if(corporateReady||!enhanced||offset!==0||!e.message.includes('HTTP 400'))throw e;enhanced=false;q.set('select',fields);data=await (await req('/rest/v1/ford_pilot_records?'+q,{},id)).json()}
 if(n!==epoch)return;all.push(...data);if(all.length>10000)throw Error('Pilot 10.000 kayıt sınırını aştı. Sunucu tarafı sayfalama gerekli.');if(data.length<250)break;offset+=data.length
 }
 if(n!==epoch)return;
 let creatorError=false;
 try{
  const creators=new Map();
  for(let i=0;i<all.length;i+=250){
   const result=await (await req('/rest/v1/rpc/ford_pilot_report_creators',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_record_ids:all.slice(i,i+250).map(r=>r.id)})},id)).json();
   if(n!==epoch)return;for(const item of result)creators.set(item.record_id,item)
  }
  all=all.map(r=>({...r,creator:creators.get(r.id)||null}));
  creatorReady=all.every(r=>!!r.creator);
 }catch(e){creatorError=true}
 if(n!==epoch)return;records=all;populatePeople();apply();status(creatorError||!creatorReady?'Kayıtlar yüklendi; üye bilgisi için yeni rapor SQL kurulumunu kontrol et.':'Kayıtlar güncel.')
 }catch(e){if(n===epoch){records=[];creatorReady=false;apply();clearPhoto();if($('reportDialog').open)$('reportDialog').close();status(e.message+' SQL güncellemesini kontrol et.')}}finally{if(n===epoch){busy=false;$('reload').disabled=false;$('export').disabled=!creatorReady;$('report').disabled=!creatorReady;$('zip').disabled=false}}
}
function populatePeople(){
 const el=$('person'),old=el.value;el.replaceChildren(new Option('Tümü',''));
 const people=new Map();for(const r of records)people.set(r.created_by,r.creator?.creator_name||r.creator?.creator_email||'Üye '+r.created_by.slice(0,8));
 for(const [id,name] of [...people].sort((a,b)=>a[1].localeCompare(b[1],'tr')))el.append(new Option(name,id));
 if(people.has(old))el.value=old
}
const normalize=v=>String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
function apply(){
 const q=normalize($('search').value.trim()),from=$('from').value,to=$('to').value,st=$('state').value,arch=$('archive').value==='archived',person=$('person').value,type=$('recordType').value;
 filtered=records.filter(r=>(type==='all'||(type==='test'?r.is_test!==false:r.is_test===false))&&!!r.archived_at===arch&&(!person||r.created_by===person)&&(!q||normalize(r.customer_name).includes(q))&&(!from||r.delivery_date>=from)&&(!to||r.delivery_date<=to)&&(
 st==='all'||st==='complete'&&r.status==='complete'||st==='draft'&&r.status==='draft'||r.status==='complete'&&(st==='both'&&r.account_done&&r.ford_done||st==='account-missing'&&!r.account_done||st==='ford-missing'&&!r.ford_done)));
 page=0;render();renderCharts()
}
function cell(tr,t,cls){const td=document.createElement('td');td.textContent=t;if(cls)td.className=cls;tr.append(td);return td}
function btn(parent,t,fn,cls){const b=document.createElement('button');b.textContent=t;b.onclick=fn;if(cls)b.className=cls;parent.append(b);return b}
function groups(rows,key,label){
 const map=new Map();for(const r of rows){const id=key(r);if(!map.has(id))map.set(id,{label:label(r),total:0,complete:0,a:0,f:0});const g=map.get(id);g.total++;if(r.status==='complete'){g.complete++;if(r.account_done)g.a++;if(r.ford_done)g.f++}}
 return [...map.values()]
}
function staffGroups(rows){return groups(rows,r=>r.created_by,r=>(r.creator?.creator_name||'Üye '+r.created_by.slice(0,8))+(r.creator?.creator_email?' · '+r.creator.creator_email:'')).sort((a,b)=>a.label.localeCompare(b.label,'tr'))}
function renderCharts(){
 for(const [id,values] of [['staffChart',staffGroups(filtered)],['monthChart',groups(filtered,r=>r.delivery_date.slice(0,7),r=>r.delivery_date.slice(0,7)).sort((a,b)=>a.label.localeCompare(b.label))]]){
  const host=$(id);host.replaceChildren();const max=Math.max(1,...values.flatMap(v=>[v.a,v.f]));
  if(!values.length){host.textContent='Kayıt yok.';continue}
  for(const v of values){const g=document.createElement('div');g.className='trend-group';const h=document.createElement('strong');h.textContent=v.label;g.append(h);
   for(const [name,num,kind] of [['Hesabım',v.a,'account'],['Ford',v.f,'ford']]){const row=document.createElement('div');row.className='trend-row';const label=document.createElement('span');label.textContent=name+' · '+num;const track=document.createElement('div');track.className='trend-track';const bar=document.createElement('i');bar.className=kind;bar.style.width=num/max*100+'%';track.append(bar);row.append(label,track);g.append(row)}host.append(g)
  }
 }
}
function render(){
 const done=filtered.filter(r=>r.status==='complete'),a=done.filter(r=>r.account_done).length,f=done.filter(r=>r.ford_done).length;
 $('total').textContent=filtered.length;$('complete').textContent=done.length;$('accountCount').textContent=a;$('fordCount').textContent=f;
 $('accountRate').textContent=done.length?'%'+(a/done.length*100).toFixed(1).replace('.',','):'—';$('fordRate').textContent=done.length?'%'+(f/done.length*100).toFixed(1).replace('.',','):'—';
 const body=$('records');body.replaceChildren();for(const r of filtered.slice(page*size,(page+1)*size)){
 const tr=document.createElement('tr');const customer=cell(tr,r.customer_name);if(r.is_test!==false){const tag=document.createElement('small');tag.className='creator-email';tag.textContent='Test kaydı';customer.append(tag)}if(r.incomplete_note){const note=document.createElement('small');note.className='creator-email';note.textContent=r.incomplete_note;customer.append(note)}cell(tr,r.delivery_date.split('-').reverse().join('.'));
 for(const [flag,kind] of [[r.account_done,'account'],[r.ford_done,'ford']]){
 const td=cell(tr,r.status==='draft'?'Taslak':flag?'Tamam':'Eksik',r.status==='complete'&&flag?'yes':'no');
 if(r.status==='complete'&&flag){btn(td,'Fotoğraf',()=>photo(r,kind));btn(td,'İndir',()=>downloadDirect(r,kind))}
 }
 cell(tr,r.archived_at?'Çöp kutusu':r.status==='complete'?'Kaydedildi':'Taslak');
 const who=cell(tr,r.creator?.creator_name||'—');if(r.creator?.creator_email){const email=document.createElement('small');email.className='creator-email';email.textContent=r.creator.creator_email;who.append(email)}
 const td=cell(tr,'');if(enhanced){btn(td,'Geçmiş',()=>historyRecord(r));if(role==='admin'&&!r.archived_at&&r.status==='complete'&&(r.is_test!==false||realEnabled))btn(td,'Düzenle',()=>editRecord(r))}if(role==='admin')btn(td,r.archived_at?'Geri al':'Sil',()=>archive(r),r.archived_at?'':'danger');body.append(tr)
 }
 if(!filtered.length){const tr=document.createElement('tr'),td=cell(tr,'Kayıt bulunamadı.');td.colSpan=7;body.append(tr)}
 $('count').textContent=filtered.length?(page*size+1)+'–'+Math.min((page+1)*size,filtered.length)+' / '+filtered.length:'0 kayıt';
 $('prev').disabled=page===0;$('next').disabled=(page+1)*size>=filtered.length
}
async function photo(r,kind){
 clearPhoto();const seq=photoEpoch,id=session?.user?.id,n=epoch;
 $('photoTitle').textContent=r.customer_name+' · '+(kind==='account'?'Ford Hesabım':'Ford');$('photoStatus').textContent='Fotoğraf yükleniyor…';if(!$('photoDialog').open)$('photoDialog').showModal();
 try{const response=await req('/storage/v1/object/authenticated/ford-pilot-private/'+r.id+'/'+kind+'.jpg',{},id);const blob=await response.blob();if(n!==epoch||seq!==photoEpoch||!$('photoDialog').open)return;$('zoomPhoto').disabled=false;url=URL.createObjectURL(blob);photoName=filename(r,kind);photoRecord=r;$('downloadPhoto').disabled=false;$('photoImage').src=url;$('photoImage').hidden=false;$('photoStatus').textContent=''}catch(e){if(n===epoch&&seq===photoEpoch)$('photoStatus').textContent=e.message}
}
async function archive(r){
 if(busy||role!=='admin'||!confirm(r.customer_name+' kaydı '+(r.archived_at?'geri alınsın mı?':'çöp kutusuna taşınsın mı? Fotoğraflar korunur.')))return;
 const n=epoch;busy=true;
 try{await req('/rest/v1/rpc/ford_pilot_archive',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_id:r.id,p_archive:!r.archived_at})});if(n===epoch)await load(n)}catch(e){if(n===epoch)status(e.message)}finally{if(n===epoch)busy=false}
}
const rpc=(name,data)=>req('/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function editRecord(r){
 if(busy||!enhanced||role!=='admin')return;editing=r;$('editName').value=r.customer_name;$('editDate').value=r.delivery_date;$('editAccount').value=String(r.account_done);$('editFord').value=String(r.ford_done);$('editNote').value=r.incomplete_note||'';$('editRecordStatus').textContent='';$('editRecordDialog').showModal()
}
$('closeRecordEdit').onclick=()=>{if(!busy)$('editRecordDialog').close()};$('editRecordDialog').addEventListener('cancel',e=>{if(busy)e.preventDefault()});$('editRecordDialog').addEventListener('close',()=>{editing=null;$('editRecordStatus').textContent=''});
$('editRecordForm').onsubmit=async e=>{
 e.preventDefault();if(busy||role!=='admin'||!editing)return;const r=editing,n=epoch,name=$('editName').value.trim(),date=$('editDate').value;
 if(name.length<3||name.length>120||name.startsWith('TEST ')!==(r.is_test!==false)){$('editRecordStatus').textContent='Ad 3–120 karakter olmalı; kayıt türü değiştirilemez.';return}if(r.is_test===false&&!realEnabled){$('editRecordStatus').textContent='Gerçek kayıt düzenleme kapalı.';return}
 busy=true;$('saveRecordEdit').disabled=true;try{
  if(name!==r.customer_name||date!==r.delivery_date){const found=await (await rpc('ford_pilot_duplicate',{p_name:name,p_date:date,p_exclude:r.id})).json();if(n!==epoch)return;if(found===true&&!confirm('Benzer kayıt bulundu. Yine de devam et?'))return}
  await rpc('ford_pilot_edit',{p_id:r.id,p_revision:r.revision,p_name:name,p_date:date,p_account:$('editAccount').value==='true',p_ford:$('editFord').value==='true',p_note:$('editNote').value.trim()});
  if(n!==epoch)return;$('editRecordDialog').close();await load(n);status('Kayıt güncellendi.')
 }catch(e){if(n===epoch)$('editRecordStatus').textContent=e.message+' Eksik fotoğraf varsa çalışan uygulamasından ekle; kayıt değişmişse yenile.'}
 finally{if(n===epoch){busy=false;$('saveRecordEdit').disabled=false}}
};
async function historyRecord(r){
 const n=epoch,host=$('recordHistory');host.textContent='Yükleniyor…';$('recordHistoryDialog').showModal();
 try{const rows=await (await rpc('ford_pilot_edit_history',{p_id:r.id})).json();if(n!==epoch||!$('recordHistoryDialog').open)return;host.replaceChildren();if(!rows.length){host.textContent='Henüz düzenleme yapılmamış.';return}
  const labels={customer_name:'Müşteri',delivery_date:'Teslim tarihi',account_done:'Ford Hesabım',ford_done:'Ford',incomplete_note:'Açıklama'},display=v=>typeof v==='boolean'?(v?'Tamam':'Eksik'):String(v??'—');
  for(const row of rows){const box=document.createElement('div');box.className='record-history-item';const h=document.createElement('strong');h.textContent=new Date(row.occurred_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})+' · '+row.actor_name+' · '+(row.actor_email||'');box.append(h);for(const k of Object.keys(labels)){if(row.before_values[k]!==row.after_values[k]){const p=document.createElement('p');p.textContent=labels[k]+': '+display(row.before_values[k])+' → '+display(row.after_values[k]);box.append(p)}}host.append(box)}
 }catch(e){if(n===epoch)host.textContent=e.message}
}
$('closeRecordHistory').onclick=()=>$('recordHistoryDialog').close();$('recordHistoryDialog').addEventListener('close',()=>{$('recordHistory').replaceChildren()});
async function checkExport(ids){
 if(!corporateReady)throw Error('v2.1 SQL kurulumu ve yetki doğrulaması gerekli.');
 const n=epoch;for(let i=0;i<Math.max(1,ids.length);i+=250){if(await (await rpc('ford_corporate_check_export',{p_ids:ids.slice(i,i+250)})).json()!==true||n!==epoch)throw Error('Rapor veya fotoğraf indirme yetkin yok.')}return true
}
function filename(r,kind){return (r.customer_name.replace(/[^\p{L}\p{N} _-]/gu,'_').slice(0,70)||'musteri')+'_'+r.delivery_date+'_'+(kind==='account'?'ford-hesabim':'ford')+'_'+r.id.slice(0,8)+'.jpg'}
function saveUrl(u,name){const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove()}
function saveBlob(b,name){const u=URL.createObjectURL(b);saveUrl(u,name);setTimeout(()=>URL.revokeObjectURL(u),60000)}
$('zoomPhoto').onclick=()=>{const full=$('photoDialog').classList.toggle('photo-full');$('zoomPhoto').textContent=full?'Normal boyut':'Tam ekran'};
$('downloadPhoto').onclick=async()=>{const u=url,name=photoName,r=photoRecord,n=epoch;if(!u||!r||!role)return;try{await checkExport([r.id]);if(n===epoch&&u===url)saveUrl(u,name)}catch(e){if(n===epoch){clearPhoto();status(e.message)}}};
async function downloadDirect(r,kind){
 if(!role)return;const n=epoch,id=session?.user?.id;
 try{await checkExport([r.id]);const response=await req('/storage/v1/object/authenticated/ford-pilot-private/'+r.id+'/'+kind+'.jpg',{},id);const blob=await response.blob();if(n!==epoch||!role)return;await checkExport([r.id]);if(n!==epoch)return;saveBlob(blob,filename(r,kind));status('Fotoğraf indirme işlemi başlatıldı.')}catch(e){if(n===epoch)status(e.message)}
}
$('zip').onclick=async()=>{
 if(busy||!role)return;const n=epoch,id=session?.user?.id,items=filtered.filter(r=>r.status==='complete').flatMap(r=>[['account',r.account_done],['ford',r.ford_done]].filter(x=>x[1]).map(x=>[r,x[0]]));
 if(!items.length){status('İndirilecek fotoğraf yok.');return}
 if(items.length>200){status('Bir ZIP en fazla 200 fotoğraf içerir. Tarih veya personel filtresini daralt.');return}
 if(!confirm(items.length+' fotoğraf ZIP olarak indirilsin mi? Dosyayı güvenli sakla.'))return;
 busy=true;$('zip').disabled=true;try{
  const files=[];let total=0;
  for(const [r,kind] of items){const b=await (await req('/storage/v1/object/authenticated/ford-pilot-private/'+r.id+'/'+kind+'.jpg',{},id)).arrayBuffer();if(n!==epoch)return;total+=b.byteLength;if(total>200000000)throw Error('ZIP 200 MB sınırını aştı. Filtreyi daralt.');files.push([r.id+'/'+filename(r,kind),new Uint8Array(b)]);status('Fotoğraflar hazırlanıyor: '+files.length+'/'+items.length)}
  if(n!==epoch)return;await checkExport([...new Set(items.map(([r])=>r.id))]);if(n!==epoch)return;saveBlob(window.izkarFordZip(files),'izkarwell-ford-fotograflar.zip');status('ZIP indirme işlemi başlatıldı.')
 }catch(e){if(n===epoch)status(e.message)}finally{if(n===epoch){busy=false;$('zip').disabled=false}}
};
function buildReport(){
 const source=filtered.slice(),done=source.filter(r=>r.status==='complete'),a=done.filter(r=>r.account_done).length,f=done.filter(r=>r.ford_done).length;
 const formatDate=v=>v?v.split('-').reverse().join('.'):'';
 const rows=[['Müşteri','Teslim tarihi','Ford Hesabım','Ford','Durum','İşlemler','Kaydı oluşturan üye','Üye e-posta','Kayıt zamanı','Eksik kurulum açıklaması','Kayıt türü'],...source.map(r=>[r.customer_name,formatDate(r.delivery_date),r.status==='draft'?'Taslak':r.account_done?'Tamam':'Eksik',r.status==='draft'?'Taslak':r.ford_done?'Tamam':'Eksik',r.status==='complete'?'Kaydedildi':'Taslak',r.archived_at?'Çöp kutusu':'Aktif',r.creator?.creator_name||'İsim tanımlı değil',r.creator?.creator_email||'',new Date(r.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}),r.incomplete_note||'',r.is_test===false?'Gerçek':'Test'])];
 const summary=[['Gösterge','Değer'],['Rapor zamanı',new Date().toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})],['Müşteri filtresi',$('search').value||'Tümü'],['Personel filtresi',$('person').selectedOptions[0].textContent],['Teslim başlangıç',formatDate($('from').value)||'Tümü'],['Teslim bitiş',formatDate($('to').value)||'Tümü'],['Durum filtresi',$('state').selectedOptions[0].textContent],['Görünüm',$('archive').selectedOptions[0].textContent],['Kayıt türü',$('recordType').selectedOptions[0].textContent],['Toplam kayıt',source.length],['Tamamlanmış kayıt',done.length],['Ford Hesabım tamam',a],['Ford tamam',f],['Ford Hesabım oranı',done.length?(a/done.length*100).toFixed(1)+'%':'—'],['Ford oranı',done.length?(f/done.length*100).toFixed(1)+'%':'—'],['Kapsam','Oranlar tamamlanmış filtreli kayıtları esas alır; tüm araç teslimatlarını temsil etmez.']];
 const staff=[['Personel','Toplam kayıt','Tamamlanmış kayıt','Ford Hesabım tamam','Ford tamam'],...staffGroups(source).map(g=>[g.label,g.total,g.complete,g.a,g.f])];return {rows,summary,staff,epoch,ids:source.map(r=>r.id),count:source.length}
}
async function downloadReport(report){
 if(busy||!role||!creatorReady||!report||report.epoch!==epoch)return;
 if(typeof window.izkarFordWorkbook!=='function'){status('Excel bileşeni yüklenemedi. Sayfayı yenile.');return}
 try{await checkExport(report.ids);if(report.epoch!==epoch)return;saveBlob(window.izkarFordWorkbook(report.rows,report.summary,report.staff),'izkarwell-ford-raporu-'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date())+'.xlsx');status('Excel indirme işlemi başlatıldı.')}catch(e){status(e.message)}
}
$('export').onclick=()=>downloadReport(buildReport());
$('report').onclick=()=>{
 if(busy||!role||!creatorReady)return;reportSnapshot=buildReport();$('reportSummary').textContent=reportSnapshot.count+' kayıt · Seçili filtreler · En fazla ilk 10 kayıt ön izlemede';
 const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
 for(const h of reportSnapshot.rows[0]){const th=document.createElement('th');th.textContent=h;tr.append(th)}head.append(tr);table.append(head);
 const body=document.createElement('tbody');for(const row of reportSnapshot.rows.slice(1,11)){const tr=document.createElement('tr');for(const value of row)cell(tr,value);body.append(tr)}table.append(body);
 $('reportPreview').replaceChildren(table);$('reportDialog').showModal()
};
$('closeReport').onclick=()=>$('reportDialog').close();$('reportDialog').addEventListener('close',()=>{reportSnapshot=null;$('reportPreview').replaceChildren()});$('reportDownload').onclick=()=>downloadReport(reportSnapshot);
for(const k of ['search','from','to','state','archive','person','recordType'])$(k).addEventListener(k==='search'?'input':'change',apply);
const filterKey=()=>session?.user?.id?'izkarwell.admin.ford.filter.'+session.user.id:null;
$('saveFilters').onclick=()=>{const key=filterKey();if(!role||!key)return;try{localStorage.setItem(key,JSON.stringify(Object.fromEntries(['from','to','state','person','pageSize'].map(k=>[k,$(k).value]))));status('Tarih, durum, personel ve sayfa boyutu filtreleri bu cihazda kaydedildi. Müşteri adı kaydedilmez.')}catch{status('Filtre kaydedilemedi.')}};
$('loadFilters').onclick=()=>{const key=filterKey();if(!role||!key)return;try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(!saved){status('Bu cihazda kayıtlı filtre yok.');return}for(const k of ['from','to','state','person','pageSize'])if(typeof saved[k]==='string')$(k).value=saved[k];if(!$('state').value)$('state').value='all';if(!$('pageSize').value)$('pageSize').value='25';size=Number($('pageSize').value)||25;apply();status('Kayıtlı filtreler uygulandı.')}catch{status('Kayıtlı filtre okunamadı.')}};
$('clear').onclick=()=>{for(const k of ['search','from','to'])$(k).value='';$('state').value='all';$('archive').value='active';$('person').value='';$('recordType').value='real';apply()};
$('prev').onclick=()=>{if(page>0){page--;render()}};$('next').onclick=()=>{if((page+1)*size<filtered.length){page++;render()}};
$('pageSize').onchange=()=>{size=Number($('pageSize').value)||25;page=0;render()};
$('signOut').onclick=async()=>{if(busy||!confirm('Oturumu kapatmak istiyor musun?'))return;const {error}=await client.auth.signOut({scope:'local'});if(error)status('Çıkış tamamlanamadı.');else await auth(null)};
$('reload').onclick=()=>{if(!busy)load()};$('closePhoto').onclick=()=>$('photoDialog').close();$('photoDialog').addEventListener('close',clearPhoto);
async function start(){try{client=window.supabase.createClient(base,key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'izkarwell.auth.v1'}});client.auth.onAuthStateChange((event,s)=>{setTimeout(()=>{if(event==='TOKEN_REFRESHED'&&s?.user?.id===session?.user?.id){session=s;return}auth(s)},0)});const {data,error}=await client.auth.getSession();if(error)throw error;await auth(data.session)}catch(e){status('Oturum başlatılamadı. Çalışan uygulamasına dön.');$('login').hidden=false}}
start();
})();