/* izkarwell. v1.2 — opt-in Web Push device test */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const endpoint='https://dfexhuqdbcrjfhscmqjy.supabase.co/functions/v1/izkarwell-push';
const key='sb_publishable_orpnUOVOCwqMmNjsE0LVXQ_mG97SiVM';
const deviceKey='izkarwell.push.device.v1', ownerKey='izkarwell.push.owner.v1';
let registration=null, publicKey=null, owner='', busy=false, generation=0;
const status=t=>el('pushStatus').textContent=t;
const supported=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const localSupported=()=>window.isSecureContext&&'serviceWorker' in navigator&&'Notification' in window;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const current=()=>window.izkarPushSession?.()||null;
const localOwner=()=>localStorage.getItem(ownerKey)||'';
function deviceId(){
 let id=localStorage.getItem(deviceKey);
 if(!id){id=crypto.randomUUID();localStorage.setItem(deviceKey,id)}
 return id;
}
function decodeKey(value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]{87}$/.test(value))throw Error('invalid_public_key');
 const base=value.replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(base+'='.repeat((4-base.length%4)%4)),c=>c.charCodeAt(0));
}
async function api(action,extra={},session=current()){
 if(!session?.id||!session.token)throw Error('sign_in_required');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 let res;try{res=await fetch(endpoint,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({action,...extra}),cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal})}finally{clearTimeout(timeout)}
 const data=await res.json().catch(()=>({}));
 if(!res.ok){const e=Error(data.error||'http_'+res.status);e.http=res.status;e.provider=Number(data.provider_status)||0;throw e}
 return data;
}
function explain(e){
 const m=e?.message||'';
 const errors={permission_denied:'Bildirim izni verilmedi. Cihazın ayarlarını kontrol et.',worker_not_ready:'Arka plan bileşeni güncelleniyor. Uygulamayı kapatıp tekrar aç veya bağlantıyı yenile.',sign_in_required:'Önce Google hesabınla giriş yap.',server_not_configured:'Sunucu VAPID anahtarlarını kontrol etmek gerekiyor.',not_registered_or_cooldown:'Cihaz kayıtlı değil veya son testten bu yana 60 saniye geçmedi.',subscription_expired:'Aboneliğin süresi doldu. Bildirimleri yeniden etkinleştir.',unsupported_subscription:'Bu tarayıcının bildirim aboneliği desteklenmedi.',device_limit:'Hesap için cihaz sınırına ulaşıldı.',http_401:'Sunucu oturumu doğrulayamadı. Supabase fonksiyon ayarlarını kontrol et.',http_404:'Bildirim fonksiyonu bulunamadı.',push_rejected:'Bildirim sağlayıcısı isteği kabul etmedi.',push_service_error:'Sunucu bildirim gönderemedi. Edge Function kayıtlarını kontrol et.',invalid_public_key:'Sunucudaki açık VAPID anahtarı geçersiz.'};
 const desc=errors[m]||((e?.name==='NotAllowedError'||e?.name==='PermissionDeniedError')?'Bildirim izni verilmedi. Cihazın bildirim ayarlarını kontrol et.':'Bildirim bağlantısı kurulamadı. İnternet bağlantını ve sunucu ayarlarını kontrol et.');
 const code=/^[a-z][a-z0-9_]{1,60}$/.test(m)?m:'';return desc+(e?.http?' [HTTP '+e.http+(e.provider?', sağlayıcı '+e.provider:'')+']':'')+(code?' ('+code+')':'');
}
function buttons(connected=false){
 const has=!!current()?.id;
 el('pushEnable').disabled=busy||!has||!registration||!publicKey;
 el('pushRetry').disabled=busy;
 el('pushLocalTest').disabled=busy||!localSupported();
 el('pushTest').disabled=busy||!has||!connected;
 el('pushDisable').disabled=busy||!supported()||(!connected&&!localOwner());
}
function checkWorker(reg){
 return new Promise((resolve,reject)=>{
  if(!reg.active)return reject(Error('worker_not_ready'));
  const channel=new MessageChannel();
  const timer=setTimeout(()=>{channel.port1.close();reject(Error('worker_not_ready'))},6000);
  channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();e.data==='izkarwell-push-v1.2.1'?resolve():reject(Error('worker_not_ready'))};
  reg.active.postMessage('izkarwell-push-version',[channel.port2]);
 });
}
async function refresh(){
 if(busy)return;const seq=++generation;registration=null;publicKey=null;buttons();
 el('pushInfo').textContent='v1.2.1 · '+(standalone()?'Ana ekran uygulaması':'Tarayıcı')+' · '+(localSupported()?'İzin: '+Notification.permission:'Bildirim API yok')+' · '+(navigator.onLine?'Çevrimiçi':'Çevrimdışı');
 if(!supported()){status('Bu ortam bildirimleri desteklemiyor. iPhone’da izkarwell.’i Safari ile ana ekrana ekleyip simgesinden aç.');return}
 const s=current();
 if(!s){owner='';publicKey=null;status('Bildirimleri açmak için Google hesabınla giriş yap.');return}
 try{
  const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('worker_not_ready')),8000))]);
  try{await checkWorker(reg)}catch{await reg.update().catch(()=>{});throw Error('worker_not_ready')}
  if(seq!==generation||current()?.id!==s.id)return;
  registration=reg;
  const data=await api('public-key',{},s);
  if(seq!==generation||current()?.id!==s.id)return;
  publicKey=decodeKey(data.publicKey);owner=s.id;
  const sub=await reg.pushManager.getSubscription();
  if(seq!==generation||current()?.id!==s.id)return;
  const connected=!!sub&&localOwner()===s.id&&Notification.permission==='granted';
  buttons(connected);
  status(connected?'Bu cihaz bildirimlere bağlı. Test bildirimi gönderebilirsin.':Notification.permission==='denied'?'Bildirim izni kapalı. Cihaz ayarlarından izin ver.':'Hazır. Bildirimleri etkinleştirerek bu cihazı bağla.');
 }catch(e){if(seq!==generation)return;registration=null;publicKey=null;buttons();status(e.message==='worker_not_ready'?'Yeni sürüm hazırlanıyor. Uygulamayı kapatıp yeniden aç.':explain(e))}
}
async function enable(){
 const s=current(), reg=registration, pk=publicKey;
 if(busy||!s||s.id!==owner||!reg||!pk)return;
 if(localOwner()&&localOwner()!==s.id){status('Bu tarayıcıda başka hesaba ait bir abonelik var. Önce bağlantıyı kaldır.');return}
 busy=true;buttons();
 try{
  // Request permission directly in the tap handler (important on iOS).
  if(Notification.permission!=='granted'){
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('permission_denied');
   status('İzin verildi. Cihazı bağlamak için Bildirimleri etkinleştir düğmesine tekrar bas.');return;
  }
  const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pk});
  if(current()?.id!==s.id){await sub.unsubscribe();throw Error('sign_in_required')}
  try{await api('register',{device_id:deviceId(),subscription:sub.toJSON()},s)}
  catch(e){await sub.unsubscribe().catch(()=>{});throw e}
  if(current()?.id!==s.id){await sub.unsubscribe().catch(()=>{});await api('disable',{device_id:deviceId()},s).catch(()=>{});throw Error('sign_in_required')}
  localStorage.setItem(ownerKey,s.id);
  status('Bildirimler etkin. Test bildirimi gönder.');
 }catch(e){status(explain(e))}
 finally{busy=false;const sub=await reg.pushManager.getSubscription().catch(()=>null);buttons(!!sub&&localOwner()===current()?.id)}
}
async function disconnect(s=current()){
 const reg=registration||await navigator.serviceWorker.getRegistration();
 const sub=await reg?.pushManager.getSubscription();
 const saved=localOwner();
 if(saved&&s?.id===saved){
  try{await api('disable',{device_id:deviceId()},s)}
  catch(e){if(!sub)throw e}
 }
 if(sub){const removed=await sub.unsubscribe();if(!removed&&await reg.pushManager.getSubscription())throw Error('unsubscribe_failed')}
 localStorage.removeItem(ownerKey);
}
window.izkarPushDisconnect=async()=>{
 if(busy)throw Error('notification_operation_busy');
 if(!supported()||!localOwner())return;
 await disconnect();
};
async function disable(){
 if(busy)return;busy=true;buttons();
 try{await disconnect();status('Bu cihazda bildirimler kapatıldı.')}
 catch(e){status(explain(e))}
 finally{busy=false;const sub=await registration?.pushManager.getSubscription().catch(()=>null);buttons(!!sub&&localOwner()===current()?.id)}
}
async function test(){
 const s=current();
 if(busy||!s||localOwner()!==s.id)return;
 busy=true;buttons();
 try{await api('test',{device_id:deviceId()},s);status('Bildirim gönderim servisi isteği kabul etti. Bildirim merkezini kontrol et.')}
 catch(e){status(explain(e))}
 finally{busy=false;buttons(localOwner()===current()?.id)}
}
async function localTest(){
 if(busy||!localSupported())return;busy=true;buttons();
 try{
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(permission!=='granted')throw Error('permission_denied');
  const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('worker_not_ready')),8000))]);
  await reg.showNotification('izkarwell. — cihaz testi',{body:'Bu cihaz bildirim gösterebiliyor.',tag:'izkarwell-local-test',icon:'./icon-192.png'});
  status('Cihaz testi oluşturuldu. Bildirim merkezini kontrol et. Bu test sunucuya bağlanmaz.');
 }catch(e){status(explain(e))}finally{busy=false;const sub=await registration?.pushManager.getSubscription().catch(()=>null);buttons(!!sub&&localOwner()===current()?.id)}
}
el('pushEnable').onclick=enable;el('pushDisable').onclick=disable;el('pushTest').onclick=test;el('pushRetry').onclick=refresh;el('pushLocalTest').onclick=localTest;
window.addEventListener('izkarwell-auth',()=>{if(owner!==current()?.id||!publicKey)refresh()});
navigator.serviceWorker?.addEventListener('controllerchange',refresh);
window.addEventListener('online',refresh);
window.addEventListener('focus',()=>{if(!publicKey&&!busy)refresh()});
refresh();
})();
