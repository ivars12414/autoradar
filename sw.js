'use strict';
const PREFIX='autoradar-'+new URL(self.registration.scope).pathname.replace(/[^a-z0-9]/gi,'_')+'-';
const CACHE=PREFIX+'v4-2.0.1';
const ASSETS=['./','./index.html','./style.css?v=2.0.1','./app.js?v=2.0.1','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
const assetPaths=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
const url=new URL(e.request.url),scope=new URL(self.registration.scope);
if(e.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
if(e.request.mode==='navigate'){
 e.respondWith((async()=>{const cache=await caches.open(CACHE);try{const r=await fetch(e.request);if(r.ok)await cache.put(new URL('index.html',scope).href,r.clone());return r}catch(error){const cached=await cache.match(new URL('index.html',scope).href);if(cached)return cached;throw error}})());return
}
if(!assetPaths.has(url.pathname))return;
e.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(e.request);if(cached)return cached;const r=await fetch(e.request);if(r.ok)await cache.put(e.request,r.clone());return r})())
});
