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
 const res=await fetch(endpoint,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({action,...extra}),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data.error||'http_'+res.status);
 return data;
}
function explain(e){
 const m=e?.message||'';
 const errors={sign_in_required:'Önce Google hesabınla giriş yap.',server_not_configured:'Sunucu VAPID anahtarlarını kontrol etmek gerekiyor.',not_registered_or_cooldown:'Cihaz kayıtlı değil veya son testten bu yana 60 saniye geçmedi.',subscription_expired:'Aboneliğin süresi doldu. Bildirimleri yeniden etkinleştir.',unsupported_subscription:'Bu tarayıcının bildirim aboneliği desteklenmedi.',device_limit:'Hesap için cihaz sınırına ulaşıldı.',http_401:'Sunucu oturumu doğrulayamadı. Supabase fonksiyon ayarlarını kontrol et.',http_404:'Bildirim fonksiyonu bulunamadı.',push_rejected:'Bildirim sağlayıcısı isteği kabul etmedi.',push_service_error:'Sunucu bildirim gönderemedi. Edge Function kayıtlarını kontrol et.',invalid_public_key:'Sunucudaki açık VAPID anahtarı geçersiz.'};
 return errors[m]||((e?.name==='NotAllowedError'||e?.name==='PermissionDeniedError')?'Bildirim izni verilmedi. Cihazın bildirim ayarlarını kontrol et.':'Bildirim bağlantısı kurulamadı. İnternet bağlantını ve sunucu ayarlarını kontrol et.');
}
function buttons(connected=false){
 const has=!!current()?.id;
 el('pushEnable').disabled=busy||!has||!registration||!publicKey;
 el('pushTest').disabled=busy||!has||!connected;
 el('pushDisable').disabled=busy||!connected;
}
function checkWorker(reg){
 return new Promise((resolve,reject)=>{
  if(!reg.active)return reject(Error('worker_not_ready'));
  const channel=new MessageChannel();
  const timer=setTimeout(()=>{channel.port1.close();reject(Error('worker_not_ready'))},2000);
  channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();e.data==='izkarwell-push-v1.2'?resolve():reject(Error('worker_not_ready'))};
  reg.active.postMessage('izkarwell-push-version',[channel.port2]);
 });
}
async function refresh(){
 const seq=++generation;buttons();
 if(!supported()){status('Bu ortam bildirimleri desteklemiyor. iPhone’da izkarwell.’i Safari ile ana ekrana ekleyip simgesinden aç.');return}
 const s=current();
 if(!s){owner='';publicKey=null;status('Bildirimleri açmak için Google hesabınla giriş yap.');return}
 try{
  const reg=await navigator.serviceWorker.ready;
  await checkWorker(reg);
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
  // Subscribe directly from the button gesture; browser asks for permission.
  const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pk});
  if(current()?.id!==s.id){await sub.unsubscribe();throw Error('sign_in_required')}
  try{await api('register',{device_id:deviceId(),subscription:sub.toJSON()},s)}
  catch(e){await sub.unsubscribe().catch(()=>{});throw e}
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
 finally{busy=false;buttons(true)}
}
el('pushEnable').onclick=enable;el('pushDisable').onclick=disable;el('pushTest').onclick=test;
window.addEventListener('izkarwell-auth',()=>{if(owner!==current()?.id||!publicKey)refresh()});
navigator.serviceWorker?.addEventListener('controllerchange',refresh);
refresh();
})();
