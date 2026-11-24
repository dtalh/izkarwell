(function(){
'use strict';
const $=id=>document.getElementById(id),base='https://dfexhuqdbcrjfhscmqjy.supabase.co',key='sb_publishable_orpnUOVOCwqMmNjsE0LVXQ_mG97SiVM';
let client,session=null,role='',records=[],filtered=[],page=0,busy=false,epoch=0,url='',photoEpoch=0,photoName='',creatorReady=false,reportSnapshot=null;const size=25;
const status=s=>$('status').textContent=s;
function clearPhoto(){$('downloadPhoto').disabled=true;photoName='';photoEpoch++;if(url)URL.revokeObjectURL(url);url='';$('photoImage').removeAttribute('src');$('photoImage').hidden=true}
function reset(){reportSnapshot=null;creatorReady=false;if($('reportDialog').open)$('reportDialog').close();records=[];filtered=[];page=0;role='';$('workspace').hidden=true;$('records').replaceChildren();$('identity').textContent='';clearPhoto();if($('photoDialog').open)$('photoDialog').close()}
async function req(path,options={},id=session?.user?.id){
 const s=session;if(!id||s?.user?.id!==id||!s.access_token)throw Error('Oturum yok.');
 const r=await fetch(base+path,{...options,headers:{apikey:key,Authorization:'Bearer '+s.access_token,...options.headers},cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30000)});
 if(session?.user?.id!==id)throw Error('Oturum değişti.');if(!r.ok)throw Error('Sunucu işlemi başarısız (HTTP '+r.status+').');return r
}
async function auth(s){
 const n=++epoch;session=s;reset();$('login').hidden=!!s;
 if(!s){status('Çalışan uygulamasında Google ile giriş yapıp tekrar buraya dön.');return}
 const id=s.user.id;
 try{const rs=await (await req('/rest/v1/work_module_members?select=role&module_key=eq.ford-pilot&user_id=eq.'+encodeURIComponent(id),{},id)).json();if(n!==epoch)return;
 role=rs[0]?.role||'';if(!['reviewer','admin'].includes(role)){status('Bu yönetim portalı için yetkin yok.');return}
 $('identity').textContent=(s.user.email||'')+' · '+(role==='admin'?'Modül yöneticisi':'İnceleyici');$('archiveLabel').hidden=role!=='admin';$('archive').value='active';$('workspace').hidden=false;await load(n)
 }catch(e){if(n===epoch){reset();status('Erişim kontrolü başarısız. '+e.message)}}
}
async function load(n=epoch){
 if(!role)return;const id=session.user.id;busy=true;$('reload').disabled=true;$('export').disabled=true;$('report').disabled=true;creatorReady=false;status('Kayıtlar yükleniyor…');
 try{let all=[],offset=0;while(true){
 const q=new URLSearchParams({select:'id,customer_name,delivery_date,account_done,ford_done,status,created_at,created_by,archived_at',order:'created_at.desc,id.desc',limit:'250',offset:String(offset)});
 const data=await (await req('/rest/v1/ford_pilot_records?'+q,{},id)).json();
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
 if(n!==epoch)return;records=all;apply();status(creatorError||!creatorReady?'Kayıtlar yüklendi; üye bilgisi için yeni rapor SQL kurulumunu kontrol et.':'Kayıtlar güncel.')
 }catch(e){if(n===epoch){records=[];apply();status(e.message+' SQL güncellemesini kontrol et.')}}finally{if(n===epoch){busy=false;$('reload').disabled=false;$('export').disabled=!creatorReady;$('report').disabled=!creatorReady}}
}
const normalize=v=>String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
function apply(){
 const q=normalize($('search').value.trim()),from=$('from').value,to=$('to').value,st=$('state').value,arch=$('archive').value==='archived';
 filtered=records.filter(r=>!!r.archived_at===arch&&(!q||normalize(r.customer_name).includes(q))&&(!from||r.delivery_date>=from)&&(!to||r.delivery_date<=to)&&(
 st==='all'||st==='complete'&&r.status==='complete'||st==='draft'&&r.status==='draft'||r.status==='complete'&&(st==='both'&&r.account_done&&r.ford_done||st==='account-missing'&&!r.account_done||st==='ford-missing'&&!r.ford_done)));
 page=0;render()
}
function cell(tr,t,cls){const td=document.createElement('td');td.textContent=t;if(cls)td.className=cls;tr.append(td);return td}
function btn(parent,t,fn,cls){const b=document.createElement('button');b.textContent=t;b.onclick=fn;if(cls)b.className=cls;parent.append(b);return b}
function render(){
 const done=filtered.filter(r=>r.status==='complete'),a=done.filter(r=>r.account_done).length,f=done.filter(r=>r.ford_done).length;
 $('total').textContent=filtered.length;$('complete').textContent=done.length;$('accountCount').textContent=a;$('fordCount').textContent=f;
 $('accountRate').textContent=done.length?'%'+(a/done.length*100).toFixed(1).replace('.',','):'—';$('fordRate').textContent=done.length?'%'+(f/done.length*100).toFixed(1).replace('.',','):'—';
 const body=$('records');body.replaceChildren();for(const r of filtered.slice(page*size,(page+1)*size)){
 const tr=document.createElement('tr');cell(tr,r.customer_name);cell(tr,r.delivery_date.split('-').reverse().join('.'));
 for(const [flag,kind] of [[r.account_done,'account'],[r.ford_done,'ford']]){
 const td=cell(tr,r.status==='draft'?'Taslak':flag?'Tamam':'Eksik',r.status==='complete'&&flag?'yes':'no');
 if(r.status==='complete'&&flag){btn(td,'Fotoğraf',()=>photo(r,kind));btn(td,'İndir',()=>downloadDirect(r,kind))}
 }
 cell(tr,r.archived_at?'Çöp kutusu':r.status==='complete'?'Kaydedildi':'Taslak');
 const who=cell(tr,r.creator?.creator_name||'—');if(r.creator?.creator_email){const email=document.createElement('small');email.className='creator-email';email.textContent=r.creator.creator_email;who.append(email)}
 const td=cell(tr,'');if(role==='admin')btn(td,r.archived_at?'Geri al':'Sil',()=>archive(r),r.archived_at?'':'danger');body.append(tr)
 }
 if(!filtered.length){const tr=document.createElement('tr'),td=cell(tr,'Kayıt bulunamadı.');td.colSpan=7;body.append(tr)}
 $('count').textContent=filtered.length?(page*size+1)+'–'+Math.min((page+1)*size,filtered.length)+' / '+filtered.length:'0 kayıt';
 $('prev').disabled=page===0;$('next').disabled=(page+1)*size>=filtered.length
}
async function photo(r,kind){
 clearPhoto();const seq=photoEpoch,id=session?.user?.id,n=epoch;
 $('photoTitle').textContent=r.customer_name+' · '+(kind==='account'?'Ford Hesabım':'Ford');$('photoStatus').textContent='Fotoğraf yükleniyor…';if(!$('photoDialog').open)$('photoDialog').showModal();
 try{const response=await req('/storage/v1/object/authenticated/ford-pilot-private/'+r.id+'/'+kind+'.jpg',{},id);const blob=await response.blob();if(n!==epoch||seq!==photoEpoch||!$('photoDialog').open)return;url=URL.createObjectURL(blob);photoName=filename(r,kind);$('downloadPhoto').disabled=false;$('photoImage').src=url;$('photoImage').hidden=false;$('photoStatus').textContent=''}catch(e){if(n===epoch&&seq===photoEpoch)$('photoStatus').textContent=e.message}
}
async function archive(r){
 if(busy||role!=='admin'||!confirm(r.customer_name+' kaydı '+(r.archived_at?'geri alınsın mı?':'çöp kutusuna taşınsın mı? Fotoğraflar korunur.')))return;
 const n=epoch;busy=true;
 try{await req('/rest/v1/rpc/ford_pilot_archive',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_id:r.id,p_archive:!r.archived_at})});if(n===epoch)await load(n)}catch(e){if(n===epoch)status(e.message)}finally{if(n===epoch)busy=false}
}
function filename(r,kind){return (r.customer_name.replace(/[^\p{L}\p{N} _-]/gu,'_').slice(0,70)||'musteri')+'_'+r.delivery_date+'_'+(kind==='account'?'ford-hesabim':'ford')+'_'+r.id.slice(0,8)+'.jpg'}
function saveUrl(u,name){const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove()}
function saveBlob(b,name){const u=URL.createObjectURL(b);saveUrl(u,name);setTimeout(()=>URL.revokeObjectURL(u),60000)}
$('downloadPhoto').onclick=()=>{if(url&&photoName&&role)saveUrl(url,photoName)};
async function downloadDirect(r,kind){
 if(!role)return;const n=epoch,id=session?.user?.id;
 try{const response=await req('/storage/v1/object/authenticated/ford-pilot-private/'+r.id+'/'+kind+'.jpg',{},id);const blob=await response.blob();if(n!==epoch||!role)return;saveBlob(blob,filename(r,kind));status('Fotoğraf indirme işlemi başlatıldı.')}catch(e){if(n===epoch)status(e.message)}
}
function buildReport(){
 const source=filtered.slice(),done=source.filter(r=>r.status==='complete'),a=done.filter(r=>r.account_done).length,f=done.filter(r=>r.ford_done).length;
 const formatDate=v=>v?v.split('-').reverse().join('.'):'';
 const rows=[['Müşteri','Teslim tarihi','Ford Hesabım','Ford','Durum','İşlemler','Kaydı oluşturan üye','Üye e-posta','Kayıt zamanı'],...source.map(r=>[r.customer_name,formatDate(r.delivery_date),r.status==='draft'?'Taslak':r.account_done?'Tamam':'Eksik',r.status==='draft'?'Taslak':r.ford_done?'Tamam':'Eksik',r.status==='complete'?'Kaydedildi':'Taslak',r.archived_at?'Çöp kutusu':'Aktif',r.creator?.creator_name||'İsim tanımlı değil',r.creator?.creator_email||'',new Date(r.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})])];
 const summary=[['Gösterge','Değer'],['Rapor zamanı',new Date().toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})],['Müşteri filtresi',$('search').value||'Tümü'],['Teslim başlangıç',formatDate($('from').value)||'Tümü'],['Teslim bitiş',formatDate($('to').value)||'Tümü'],['Durum filtresi',$('state').selectedOptions[0].textContent],['Görünüm',$('archive').selectedOptions[0].textContent],['Toplam kayıt',source.length],['Tamamlanmış kayıt',done.length],['Ford Hesabım tamam',a],['Ford tamam',f],['Ford Hesabım oranı',done.length?(a/done.length*100).toFixed(1)+'%':'—'],['Ford oranı',done.length?(f/done.length*100).toFixed(1)+'%':'—'],['Kapsam','Oranlar tamamlanmış filtreli kayıtları esas alır; tüm araç teslimatlarını temsil etmez.']];
 return {rows,summary,epoch,count:source.length}
}
function downloadReport(report){
 if(busy||!role||!creatorReady||!report||report.epoch!==epoch)return;
 if(typeof window.izkarFordWorkbook!=='function'){status('Excel bileşeni yüklenemedi. Sayfayı yenile.');return}
 saveBlob(window.izkarFordWorkbook(report.rows,report.summary),'izkarwell-ford-raporu-'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date())+'.xlsx');status('Excel indirme işlemi başlatıldı.')
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
for(const k of ['search','from','to','state','archive'])$(k).addEventListener(k==='search'?'input':'change',apply);
$('clear').onclick=()=>{for(const k of ['search','from','to'])$(k).value='';$('state').value='all';$('archive').value='active';apply()};
$('prev').onclick=()=>{if(page>0){page--;render()}};$('next').onclick=()=>{if((page+1)*size<filtered.length){page++;render()}};
$('reload').onclick=()=>{if(!busy)load()};$('closePhoto').onclick=()=>$('photoDialog').close();$('photoDialog').addEventListener('close',clearPhoto);
async function start(){try{client=window.supabase.createClient(base,key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'izkarwell.auth.v1'}});client.auth.onAuthStateChange((event,s)=>{setTimeout(()=>{if(event==='TOKEN_REFRESHED'&&s?.user?.id===session?.user?.id){session=s;return}auth(s)},0)});const {data,error}=await client.auth.getSession();if(error)throw error;await auth(data.session)}catch(e){status('Oturum başlatılamadı. Çalışan uygulamasına dön.');$('login').hidden=false}}
start();
})();