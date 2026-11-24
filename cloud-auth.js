/* izkarwell. Cloud — authentication-only integration draft. No health data is uploaded. */
(function(){
'use strict';
const URL='https://dfexhuqdbcrjfhscmqjy.supabase.co';
const KEY='sb_publishable_orpnUOVOCwqMmNjsE0LVXQ_mG97SiVM';
const RETURN='https://dtalh.github.io/izkarwell/';
const el=id=>document.getElementById(id);
let client=null, busy=false;
function status(message){el('cloudStatus').textContent=message}
function show(session){
 const signed=Boolean(session?.user);
 el('cloudSignIn').hidden=signed;
 el('cloudSignOut').hidden=!signed;
 el('cloudAccount').textContent=signed?(session.user.email||'Google hesabı'):'';
 status(signed?'Google oturumu açık. Sağlık kayıtları henüz eşitlenmiyor.':'Google hesabınla bağlanabilirsin. Kayıtların cihazında kalır.');
}
function init(){
 if(client)return client;
 if(!window.supabase?.createClient)throw Error('Giriş kütüphanesi yüklenemedi.');
 client=window.supabase.createClient(URL,KEY,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'izkarwell.auth.v1'}});
 client.auth.onAuthStateChange((_event,session)=>show(session));
 return client;
}
async function login(){
 if(busy)return;busy=true;el('cloudSignIn').disabled=true;
 try{
  if(location.origin!=='https://dtalh.github.io')throw Error('Google girişi yalnızca yayın adresinde kullanılabilir.');
  status('Google giriş ekranı açılıyor…');
  const {error}=await init().auth.signInWithOAuth({provider:'google',options:{redirectTo:RETURN,scopes:'openid email profile',queryParams:{prompt:'select_account'}}});
  if(error)throw error;
 }catch{status('Google giriş bağlantısı kurulamadı. İnternet bağlantını ve sağlayıcı ayarlarını kontrol et.');}
 finally{busy=false;el('cloudSignIn').disabled=false;}
}
async function logout(){
 if(busy)return;busy=true;
 try{const {error}=await init().auth.signOut({scope:'local'});if(error)throw error;show(null)}
 catch{status('Oturum kapatılamadı. Tekrar dene.')}
 finally{busy=false}
}
async function start(){
 if(!el('cloudSignIn'))return;
 el('cloudSignIn').addEventListener('click',login);
 el('cloudSignOut').addEventListener('click',logout);
 if(!window.supabase?.createClient){status('Google girişi çevrimdışı. Yerel kullanım devam ediyor.');return}
 try{
  const {data,error}=await init().auth.getSession();
  if(error)throw error;show(data.session);
 }catch{status('Oturum doğrulanamadı. Tekrar giriş yapabilirsin.')}
}
start();
})();
