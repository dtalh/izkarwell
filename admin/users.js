(function(){
'use strict';
const $=id=>document.getElementById(id),base='https://dfexhuqdbcrjfhscmqjy.supabase.co',key='sb_publishable_orpnUOVOCwqMmNjsE0LVXQ_mG97SiVM',dialog=$('editDialog');
let client,session=null,allowed=false,epoch=0,loading=false,saving=false,offset=0,query='',modules=[],users=[],selected=null;
const status=t=>$('status').textContent=t,roleName=v=>({operator:'Operatör',reviewer:'İnceleyici',admin:'Modül yöneticisi'}[v]||'Erişim yok');
function cell(tr,t){const td=document.createElement('td');td.textContent=t??'';const labels=tr.closest('tbody')?.id==='history'?['Tarih','İşlemi yapan','Üye','Modül','Önceki yetki','Yeni yetki']:['Üye','Kayıt tarihi','Platform yetkisi','Modül yetkileri','İşlem'];td.dataset.label=labels[tr.children.length]||'';tr.append(td);return td}
function date(v){return v?new Date(v).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'—'}
async function rpc(name,data={},id=session?.user?.id){
 const s=session,n=epoch;if(!id||s?.user?.id!==id||!s.access_token)throw Error('Oturum değişti.');
 const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30000)});
 if(n!==epoch||session?.user?.id!==id)throw Error('Oturum değişti.');if(!r.ok){if(r.status===401||r.status===403){++epoch;reset();status('Yetkiniz kaldırıldı veya oturum sona erdi. Yeniden giriş yapın.')}throw Error('Sunucu işlemi başarısız (HTTP '+r.status+').')}const result=await r.json();if(n!==epoch)throw Error('Oturum değişti.');return result
}
function reset(){for(const k of ['module','role','saveRole','closeEdit'])$(k).disabled=false;allowed=false;selected=null;modules=[];users=[];offset=0;query='';loading=false;saving=false;$('search').value='';$('workspace').hidden=true;$('users').replaceChildren();$('history').replaceChildren();$('identity').textContent='';$('editUser').textContent='';$('module').replaceChildren();if(dialog.open)dialog.close()}
async function auth(s){
 const n=++epoch;session=s;reset();$('signOut').hidden=!s;$('login').hidden=!!s;if(!s){status('Önce çalışan uygulamasından giriş yap.');return}
 try{const ok=await rpc('platform_is_admin');if(n!==epoch)return;if(ok!==true){status('Bu ekran yalnızca genel sistem yöneticisine açıktır.');return}
 const list=await rpc('platform_list_modules');if(n!==epoch)return;modules=list;allowed=true;$('identity').textContent=(s.user.email||'')+' · Genel sistem yöneticisi';$('workspace').hidden=false;await load(n);await history(n)
 }catch(e){if(n===epoch){reset();status('Yetki doğrulanamadı. Kullanıcı yönetimi SQL kurulumunu kontrol et. '+e.message)}}
}
function controls(v){loading=v;for(const k of ['reload','prev','next','clear','search'])$(k).disabled=v;$('searchForm').querySelector('button[type=submit]').disabled=v;if(!v){$('prev').disabled=offset===0;$('next').disabled=users.length<50}}
async function load(n=epoch){
 if(!allowed||loading||saving)return;controls(true);status('Kullanıcılar yükleniyor…');try{const data=await rpc('platform_list_users',{p_search:query,p_offset:offset});if(n!==epoch)return;users=data;render();status('Kullanıcılar güncel.')}catch(e){if(n===epoch){users=[];render();status(e.message)}}finally{if(n===epoch)controls(false)}
}
function render(){
 const body=$('users');body.replaceChildren();for(const u of users){const tr=document.createElement('tr');body.append(tr);const td=cell(tr,u.display_name);const email=document.createElement('small');email.className='creator-email';email.textContent=u.email||'—';td.append(email);cell(tr,date(u.joined_at));cell(tr,u.is_platform_admin?'Genel sistem yöneticisi':'Üye');cell(tr,modules.map(m=>m.title+': '+roleName(u.module_roles?.[m.module_key])).join(' · ')||'Modül yok');const action=cell(tr,'');const b=document.createElement('button');b.textContent='Yetkileri düzenle';b.onclick=()=>edit(u);action.append(b);body.append(tr)}
 if(!users.length){const tr=document.createElement('tr');const td=cell(tr,'Kullanıcı bulunamadı.');td.colSpan=5;body.append(tr)}
 $('count').textContent=users.length?(offset+1)+'–'+(offset+users.length)+'. kullanıcı':'0 sonuç';
}
function edit(u){
 if(!allowed||loading||saving||!modules.length)return;selected=u;$('editUser').textContent=u.display_name+' · '+(u.email||'');$('module').replaceChildren();for(const m of modules){const o=document.createElement('option');o.value=m.module_key;o.textContent=m.title;$('module').append(o)}syncRole();$('editStatus').textContent='';dialog.showModal()
}
function syncRole(){$('role').value=selected?.module_roles?.[$('module').value]||''}
$('module').onchange=syncRole;
$('saveRole').onclick=async()=>{
 if(!selected||!allowed||saving)return;const u=selected,m=$('module').value,r=$('role').value||null,n=epoch;if(!modules.some(x=>x.module_key===m))return;
 if(!confirm((u.email||u.display_name)+' için '+roleName(r)+' yetkisi kaydedilsin mi?'))return;
 saving=true;for(const k of ['module','role','saveRole','closeEdit'])$(k).disabled=true;$('editStatus').textContent='Kaydediliyor…';
 try{if(await rpc('platform_is_admin')!==true){if(n===epoch){++epoch;reset();status('Yönetim yetkiniz kaldırıldı.')}return}if(n!==epoch)return;const changed=await rpc('platform_set_module_role',{p_user_id:u.user_id,p_module_key:m,p_role:r});if(n!==epoch)return;selected=null;dialog.close();saving=false;await load(n);await history(n);if(n===epoch&&allowed)status(changed?'Yetki güncellendi ve işlem geçmişine kaydedildi.':'Yetki zaten aynı.')}catch(e){if(n===epoch)$('editStatus').textContent=e.message}finally{if(n===epoch){saving=false;for(const k of ['module','role','saveRole','closeEdit'])$(k).disabled=false}}
};
async function history(n=epoch){
 if(!allowed)return;try{const data=await rpc('platform_role_history');if(n!==epoch)return;const body=$('history');body.replaceChildren();for(const h of data){const tr=document.createElement('tr');body.append(tr);for(const v of [date(h.occurred_at),h.actor_email||'—',h.target_email||'—',modules.find(m=>m.module_key===h.module_key)?.title||h.module_key,roleName(h.old_role),roleName(h.new_role)])cell(tr,v);body.append(tr)}if(!data.length){const tr=document.createElement('tr');cell(tr,'Henüz yetki değişikliği yok.').colSpan=6;body.append(tr)}}catch(e){if(n===epoch){$('history').replaceChildren();status(e.message)}}
}
$('searchForm').onsubmit=e=>{e.preventDefault();if(!loading&&!saving){query=$('search').value.trim();offset=0;load()}};
$('clear').onclick=()=>{if(!loading&&!saving){$('search').value='';query='';offset=0;load()}};
$('reload').onclick=()=>load();$('prev').onclick=()=>{if(!loading&&!saving&&offset>0){offset=Math.max(0,offset-50);load()}};$('next').onclick=()=>{if(!loading&&!saving&&users.length===50){offset+=50;load()}};
$('historyReload').onclick=()=>history();$('closeEdit').onclick=()=>{if(!saving)dialog.close()};dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault()});dialog.addEventListener('close',()=>{selected=null;$('editUser').textContent='';$('editStatus').textContent=''});
$('signOut').onclick=async()=>{if(saving||!confirm('Oturumu kapatmak istiyor musun?'))return;const {error}=await client.auth.signOut({scope:'local'});if(error)status('Çıkış tamamlanamadı.');else await auth(null)};
async function start(){try{client=window.supabase.createClient(base,key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'izkarwell.auth.v1'}});client.auth.onAuthStateChange((event,s)=>{setTimeout(()=>{auth(s)},0)});const {data,error}=await client.auth.getSession();if(error)throw error;await auth(data.session)}catch(e){status('Oturum başlatılamadı.');$('login').hidden=false}}
window.addEventListener('focus',()=>auth(session));
document.addEventListener('visibilitychange',()=>{if(document.hidden){++epoch;reset()}else auth(session)});
start();
})();