/* Release-scoped app-shell cache. OAuth responses and cloud requests are never cached. */
const CACHE='izkarwell-v2.1-corporate2';
const ASSETS=['./','./index.html','./style.css?v=2.0.0','./cloud-namespace.js?v=1.3.0','./water.js?v=1.3.0','./smoking.js?v=2.0.0','./cloud-core.js?v=1.3.0','./cloud-auth.js?v=2.1.1','./notifications.js?v=1.3.0','./ford-photo.js?v=1.0.0','./ford-pilot.js?v=1.2.0','./manifest.json','./icon-180.png','./icon-192.png','./icon-512.png','./privacy.html','./terms.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(a=>new Request(a,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('izkarwell-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(u.pathname.startsWith(new URL('./admin/',self.registration.scope).pathname))return;
 if(['code','error','error_code','error_description','access_token','sb_flow_id'].some(k=>u.searchParams.has(k)))return;
 // Versioned scripts are immutable for this release; navigation checks for a fresh page.
 if(e.request.mode!=='navigate'&&['2.1.1','1.3.0','2.0.0','1.1.0','1.2.0','1.0.0'].includes(u.searchParams.get('v'))){
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));return;
 }
 e.respondWith(fetch(e.request).then(r=>{
  if(r.ok&&!u.search){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}
  return r;
 }).catch(()=>caches.open(CACHE).then(async c=>(await c.match(e.request))||(e.request.mode==='navigate'?await c.match('./index.html'):null)||Response.error())));
});

self.addEventListener('message',e=>{if(e.data==='izkarwell-push-v1.3.0' || e.data==='izkarwell-push-version')e.ports[0]?.postMessage('izkarwell-push-v1.3.0')});
self.addEventListener('push',e=>{
 let data={};try{data=e.data?.json()||{}}catch{}
 // Display only neutral, predefined messages. Never show private health data.
 const messages={'izkarwell-test':'Bildirimler başarıyla bağlandı. İyi yaşam yolculuğun seninle.','izkarwell-water':'Su molası zamanı! Bir bardak su içmeye ne dersin?'};
 const tag=Object.hasOwn(messages,data?.tag)?data.tag:'izkarwell-reminder';
 e.waitUntil(self.registration.showNotification('izkarwell.',{body:messages[tag]||'İyi yaşam yolculuğunda küçük bir mola ver.',icon:new URL('./icon-192.png',self.registration.scope).href,badge:new URL('./icon-192.png',self.registration.scope).href,tag}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();
 e.waitUntil((async()=>{
  const target=new URL('./',self.registration.scope).href;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(c=>c.url.startsWith(target));
  if(existing){await existing.focus();return}
  await self.clients.openWindow(target);
 })());
});
