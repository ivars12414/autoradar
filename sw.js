'use strict';
const PREFIX='autoradar-'+new URL(self.registration.scope).pathname.replace(/[^a-z0-9]/gi,'_')+'-';
const CACHE=PREFIX+'v3';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
const urls=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
if(e.request.method!=='GET'||!urls.has(e.request.url))return;
e.respondWith((async()=>{const cache=await caches.open(CACHE);try{const r=await fetch(e.request);if(r.ok)await cache.put(e.request,r.clone());return r}catch(error){const cached=await cache.match(e.request);if(cached)return cached;throw error}})())
});
