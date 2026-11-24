/* Local and account namespaces stay separate. Google login does not enable health data upload. */
(function(){
'use strict';
const endpoint='https://dfexhuqdbcrjfhscmqjy.supabase.co';
const publicKey='sb_publishable_orpnUOVOCwqMmNjsE0LVXQ_mG97SiVM';
const returnUrl='https://dtalh.github.io/izkarwell/';
const el=id=>document.getElementById(id), marker='izkarwell.active-account.v1';
const active=window.izkarAccount||'';
const metaKey=id=>'izkarwell.cloud-meta.v1.'+id;
const readMeta=id=>JSON.parse(localStorage.getItem(metaKey(id))||'null');
const writeMeta=(id,m)=>localStorage.setItem(metaKey(id),JSON.stringify(m));
const localMap=()=>flatten(state,waterState);
let client,session=null,busy=false,authBusy=false,ready=false;
function status(s){el('cloudStatus').textContent=s}
function ui(){
 const id=session?.user?.id;
 el('cloudAccount').textContent=session?.user?.email||'';
 el('cloudSignIn').hidden=!!id;
 el('cloudSignOut').hidden=!id;
 el('cloudEnable').hidden=!id||active===id;
 el('cloudSyncNow').hidden=!id||active!==id;
 el('cloudLocal').hidden=!active;
}
function switchLocal(id){
 if(id)localStorage.setItem(marker,id);else localStorage.removeItem(marker);
 location.reload();
}
function validBundle(b){
 if(!validWater(b.w))return false;
 if(!b.s.profile)return Object.keys(b.s.days).length===0&&b.s.slips.length===0&&!b.s.reward;
 return validBackup({format:'duman-yok-backup-1',...b.s});
}
function storeBundle(id,b){
 if(!validBundle(b))throw Error('Kayıt doğrulaması başarısız.');
 localStorage.setItem('duman-yok-personal-v2.'+id,JSON.stringify(b.s));
 localStorage.setItem('izkarwell.water.v1.'+id,JSON.stringify(b.w));
}
function capture(){
 if(!active)return;
 const m=readMeta(active);if(!m)throw Error('Yerel eşitleme kaydı bulunamadı.');
 const next=localMap();
 const d=changes(m.base,next);
 if(d.length){
  m.pending.push(...d.map(e=>({...e,event_id:crypto.randomUUID()})));
  m.base=next;
  writeMeta(active,m);
 }
}
window.izkarCloudChanged=()=>{try{capture();if(active)status('Yerel kayıt hazır. Eşitleme bekliyor.')}catch{status('Eşitleme kuyruğu kaydedilemedi. Yedeğini al.')}};
async function events(id){
 let all=[],offset=0;
 while(true){
  if(session?.user?.id!==id)throw Error('Oturum değişti.');
  const {data,error}=await client.from('sync_events').select('event_id,module,record_id,operation,payload,created_at').eq('user_id',id).order('created_at',{ascending:true}).order('event_id',{ascending:true}).range(offset,offset+499);
  if(error)throw error;
  all.push(...data);if(data.length<500)return all;
  offset+=data.length;if(offset>50000)throw Error('Eşitleme geçmişi sınırı.');
 }
}
async function enable(){
 const id=session?.user?.id;
 if(!id||busy||active)return;
 if(!confirm('Bu cihazdaki kişisel takip kayıtlarının Supabase Avrupa (İrlanda) sunucusuna aktarılmasına ve aynı Google hesabında eşitlenmesine izin veriyor musun? Gizlilik politikasını profil ekranından okuyabilirsin. Yerel kayıtların ayrı bir kopya olarak korunur. Bulutta mevcut bir ayar veya aynı kayıt varsa bulut sürümü önceliklidir.'))return;
 busy=true;el('cloudEnable').disabled=true;
 try{
  const existing=readMeta(id);
  if(existing){switchLocal(id);return}
  status('Bulut kayıtları kontrol ediliyor…');
  const remoteEvents=await events(id);
  if(session?.user?.id!==id)throw Error('Oturum değişti.');
  const {remote,merged}=initialMerge(remoteEvents,localMap());
  const bundle=inflate(merged);
  if(!validBundle(bundle))throw Error('Geçersiz kayıt.');
  const pending=changes(remote,merged).map(e=>({...e,event_id:crypto.randomUUID()}));
  storeBundle(id,bundle);writeMeta(id,{base:merged,pending,last:null});
  switchLocal(id);
 }catch{status('Eşitleme başlatılamadı. Mevcut cihaz kayıtların değiştirilmedi.')}
 finally{busy=false;el('cloudEnable').disabled=false}
}
async function syncInner(){
 const id=active;
 if(!id||session?.user?.id!==id||!navigator.onLine)return;
 capture();
 let m=readMeta(id);
 if(!m)return;
 status('Eşitleniyor…');
 // Stable event IDs make retries idempotent; send in order.
 for(const e of [...m.pending]){
  if(session?.user?.id!==id)throw Error('Oturum değişti.');
  const {error}=await client.from('sync_events').insert(e);
  if(error&&error.code!=='23505')throw error;
  m=readMeta(id);m.pending=m.pending.filter(p=>p.event_id!==e.event_id);writeMeta(id,m);
 }
 const remote=await events(id);
 if(session?.user?.id!==id)throw Error('Oturum değişti.');
 capture();m=readMeta(id);
 const merged=applyEvents(m.pending,applyEvents(remote)),bundle=inflate(merged);
 if(!validBundle(bundle))throw Error('Bulut kayıtları doğrulanamadı.');
 // Keep a recovery snapshot before replacing active local records.
 m.recovery=bundle;writeMeta(id,m);
 storeBundle(id,bundle);
 state=bundle.s;waterState=bundle.w;
 m.base=merged;m.last=Date.now();delete m.recovery;writeMeta(id,m);
 applyTheme();renderDays();render(true);renderWater();
 status(m.pending.length?'Yeni kayıtlar eşitleme bekliyor.':'Son eşitleme: '+new Date(m.last).toLocaleString('tr-TR'));
}
async function sync(){
 if(busy||!ready||!active||session?.user?.id!==active)return;
 if(!navigator.onLine){status('Çevrimdışı · kayıtlar cihazında saklanıyor.');return}
 busy=true;el('cloudSyncNow').disabled=true;
 try{
  if(navigator.locks)await navigator.locks.request('izkarwell-sync-'+active,{ifAvailable:true},lock=>lock?syncInner():undefined);
  else await syncInner();
 }catch{status('Eşitleme tamamlanamadı. Yerel kayıtlar ve bekleyen işlemler korunuyor. Tekrar dene.')}
 finally{busy=false;el('cloudSyncNow').disabled=false}
}
function onSession(s){
 session=s;ui();
 const id=s?.user?.id;
 if(active&&id&&id!==active){switchLocal('');return}
 if(!id){
  status(active?'Çevrimdışı yerel kayıtlar · eşitleme için tekrar Google ile giriş yap.':'Google ile bağlan. Sağlık kayıtları, eşitlemeyi ayrıca açana kadar cihazında kalır.');return;
 }
 if(active===id){status('Bulut hesabı bağlı.');setTimeout(sync,0)}
 else if(!active){status('Google hesabın bağlı. Eşitlemeyi açmak için onay ver.')}
}
async function login(){
 if(authBusy)return;authBusy=true;el('cloudSignIn').disabled=true;
 try{
  if(!client)throw Error();
  if(location.origin!=='https://dtalh.github.io')throw Error();
  status('Google giriş ekranı açılıyor…');
  const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:returnUrl,scopes:'openid email profile',queryParams:{prompt:'select_account'}}});
  if(error)throw error;
 }catch{status('Google giriş bağlantısı kurulamadı. İnterneti ve sağlayıcı ayarlarını kontrol et.')}
 finally{authBusy=false;el('cloudSignIn').disabled=false}
}
async function logout(){
 if(busy||authBusy)return;
 if(active&&!confirm('Hesaptan çıkınca kişisel bulut görünümü kapanır. Cihazdaki ayrı hesap kayıtları ve bekleyen eşitleme işlemleri korunur.'))return;
 authBusy=true;
 try{if(active)capture();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;switchLocal('')}
 catch{status('Çıkış tamamlanamadı. Tekrar dene.')}
 finally{authBusy=false}
}
async function start(){
 if(!el('cloudSignIn'))return;
 el('cloudSignIn').onclick=login;el('cloudSignOut').onclick=logout;
 el('cloudEnable').onclick=enable;el('cloudSyncNow').onclick=sync;
 el('cloudLocal').onclick=()=>{if(!busy&&confirm('Yerel (üyeliksiz) kayıtlara dönülsün mü? Bulut hesabındaki kayıtlar korunur.')){try{capture();switchLocal('')}catch{status('Önce yedek al.')}}};
 ui();
 if(!window.supabase?.createClient){status('Giriş kütüphanesi çevrimdışı. Yerel kullanım devam ediyor.');return}
 try{
  client=window.supabase.createClient(endpoint,publicKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'izkarwell.auth.v1'}});
  client.auth.onAuthStateChange((_e,s)=>{setTimeout(()=>onSession(s),0)});
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(active){
   const m=readMeta(active);
   if(m?.recovery){storeBundle(active,m.recovery);state=m.recovery.s;waterState=m.recovery.w;m.base=localMap();delete m.recovery;writeMeta(active,m);applyTheme();renderDays();render(true);renderWater()}
  }
  ready=true;onSession(data.session);
 }catch{status('Oturum doğrulanamadı. Yerel kullanım devam ediyor.')}
}
window.addEventListener('online',sync);
window.addEventListener('focus',sync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
window.addEventListener('storage',e=>{if(e.key===marker||e.key===('duman-yok-personal-v2.'+active)||e.key===('izkarwell.water.v1.'+active)){if(!busy)location.reload()}});
setInterval(()=>{if(!document.hidden)sync()},20000);
start();
})();
