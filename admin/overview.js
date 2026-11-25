(function(){
'use strict';const $=id=>document.getElementById(id),base='https://dfexhuqdbcrjfhscmqjy.supabase.co',key='sb_publishable_orpnUOVOCwqMmNjsE0LVXQ_mG97SiVM';
let client,session,epoch=0,busy=false;
const status=s=>$('status').textContent=s;
async function req(path,options={},id=session?.user?.id){
 if(!id||session?.user?.id!==id)throw Error('Oturum değişti.');
 const r=await fetch(base+path,{...options,headers:{apikey:key,Authorization:'Bearer '+session.access_token,...options.headers},cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30000)});
 if(session?.user?.id!==id)throw Error('Oturum değişti.');if(!r.ok)throw Error('Sunucu yanıtı HTTP '+r.status);return r.json()
}
const rpc=(name,data={})=>req('/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function reset(){
 $('workspace').hidden=true;$('fordLink').hidden=true;$('usersLink').hidden=true;
 for(const k of ['userMetric','fordMetric','incompleteMetric','fordSection'])$(k).hidden=true;
 for(const k of ['memberCount','moduleCount','monthCount','incompleteCount'])$(k).textContent='—';
 $('trend').replaceChildren();$('identity').textContent='';$('signOut').hidden=!session;busy=false;$('refresh').disabled=false;
}
function monthKey(d){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit'}).format(d)}
function showTrend(months,rows){
 const host=$('trend');host.replaceChildren();const vals=months.map(m=>{const subset=rows.filter(r=>r.delivery_date.slice(0,7)===m&&r.status==='complete');return {m,a:subset.filter(r=>r.account_done).length,f:subset.filter(r=>r.ford_done).length}}),max=Math.max(1,...vals.flatMap(v=>[v.a,v.f]));
 for(const v of vals){const group=document.createElement('div');group.className='trend-group';const title=document.createElement('strong');title.textContent=v.m;group.append(title);for(const [label,value,kind] of [['Hesabım',v.a,'account'],['Ford',v.f,'ford']]){const row=document.createElement('div');row.className='trend-row';const name=document.createElement('span');name.textContent=label+' · '+value;const bar=document.createElement('div');bar.className='trend-track';const fill=document.createElement('i');fill.className=kind;fill.style.width=value/max*100+'%';bar.append(fill);row.append(name,bar);group.append(row)}host.append(group)}
}
async function auth(s){
 const n=++epoch;session=s;reset();$('login').hidden=!!s;if(!s){status('Önce çalışan uygulamasından giriş yap.');return}
 busy=true;$('refresh').disabled=true;const id=s.user.id;
 try{
  const roles=await req('/rest/v1/work_module_members?select=module_key,role&user_id=eq.'+encodeURIComponent(id),{},id);
  let admin=false;try{admin=await rpc('platform_is_admin')===true}catch{}
  if(n!==epoch)return;
  const ford=roles.some(r=>r.module_key==='ford-pilot'&&['admin','reviewer'].includes(r.role));
  if(!admin&&!ford){status('Yönetim merkezine erişim yetkin yok.');return}
  $('identity').textContent=(s.user.email||'')+' · '+(admin?'Genel sistem yöneticisi':'Modül yetkilisi');$('usersLink').hidden=!admin;$('fordLink').hidden=!ford;$('workspace').hidden=false;$('moduleCount').textContent=roles.filter(r=>['admin','reviewer'].includes(r.role)).length;$('dbState').textContent='Veritabanı: Yetki sorgusu başarılı.';
  if(admin){$('userMetric').hidden=false;try{let count=0;for(let offset=0;offset<=10000;offset+=50){const page=await rpc('platform_list_users',{p_search:'',p_offset:offset});count+=page.length;if(page.length<50){if(n===epoch)$('memberCount').textContent=count;break}}}catch{}}
  if(n!==epoch)return;
  if(ford){
   let ready=false;try{const g=await rpc('ford_corporate_status');if(n!==epoch)return;ready=true;$('corporateGate').textContent=g.real_entry_enabled?'Gerçek kayıt girişi açık.':'Gerçek müşteri kaydı girişi kapalı.'}catch{}if(n!==epoch)return;
   $('fordMetric').hidden=false;$('incompleteMetric').hidden=false;$('fordSection').hidden=false;
   const now=monthKey(new Date()),[y,m]=now.split('-').map(Number),months=Array.from({length:6},(_,i)=>new Date(Date.UTC(y,m-6+i,1)).toISOString().slice(0,7));
   const rows=[];if(ready)for(let offset=0;offset<=10000;offset+=250){const q=new URLSearchParams({select:'delivery_date,status,account_done,ford_done',archived_at:'is.null',is_test:'eq.false',delivery_date:'gte.'+months[0]+'-01',order:'id.asc',limit:'250',offset:String(offset)});const batch=await req('/rest/v1/ford_pilot_records?'+q,{},id);if(n!==epoch)return;rows.push(...batch);if(batch.length<250)break;if(offset===10000)throw Error('Gösterge için kayıt sınırı aşıldı.')}
   const current=rows.filter(r=>r.delivery_date.slice(0,7)===now);$('monthCount').textContent=current.length;$('incompleteCount').textContent=current.filter(r=>r.status!=='complete'||!r.account_done||!r.ford_done).length;showTrend(months,rows)
  }
  status('Göstergeler güncel.')
 }catch(e){if(n===epoch)status('Bazı göstergeler alınamadı: '+e.message)}finally{if(n===epoch){busy=false;$('refresh').disabled=false}}
}
$('refresh').onclick=()=>{if(!busy)auth(session)};
$('signOut').onclick=async()=>{if(!confirm('Yönetim oturumunu kapatmak istiyor musun?'))return;const {error}=await client.auth.signOut({scope:'local'});if(error)status('Çıkış yapılamadı.');else await auth(null)};
async function start(){try{client=window.supabase.createClient(base,key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'izkarwell.auth.v1'}});client.auth.onAuthStateChange((event,s)=>{setTimeout(()=>{if(event==='TOKEN_REFRESHED'&&s?.user?.id===session?.user?.id){session=s;return}auth(s)},0)});const {data,error}=await client.auth.getSession();if(error)throw error;await auth(data.session)}catch{status('Oturum başlatılamadı.');$('login').hidden=false}}
start();
})();