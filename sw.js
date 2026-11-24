/* Release-scoped app-shell cache. OAuth responses and cloud requests are never cached. */
const CACHE='izkarwell-v1.1.0';
const ASSETS=['./','./index.html','./style.css','./cloud-namespace.js?v=1.1.0','./water.js?v=1.1.0','./smoking.js?v=1.1.0','./cloud-core.js?v=1.1.0','./cloud-auth.js?v=1.1.0','./manifest.json','./icon-180.png','./icon-192.png','./icon-512.png','./privacy.html','./terms.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(a=>new Request(a,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('izkarwell-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(['code','error','error_code','error_description','access_token','sb_flow_id'].some(k=>u.searchParams.has(k)))return;
 // Versioned scripts are immutable for this release; navigation checks for a fresh page.
 if(e.request.mode!=='navigate'&&u.searchParams.get('v')==='1.1.0'){
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));return;
 }
 e.respondWith(fetch(e.request).then(r=>{
  if(r.ok&&!u.search){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}
  return r;
 }).catch(()=>caches.open(CACHE).then(async c=>(await c.match(e.request))||(e.request.mode==='navigate'?await c.match('./index.html'):null)||Response.error())));
});
