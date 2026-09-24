const CACHE="trahis-v31";
const ASSETS=[
"./","./index.html","./add.html","./transfer.html","./history.html","./savings.html","./profile.html","./settings.html","./backup.html","./admin.html","./tutorial.html","./manifest.json","./sw.js",
"./css/style.css","./js/app.js","./js/components.js",
"./assets/jquery.min.js","./assets/bootstrap.min.css","./assets/bootstrap.bundle.min.js",
"./assets/bootstrap-icons.css","./assets/icon.svg","./assets/icon-192.png","./assets/icon-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith("trahis-") && key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  // HTML navigations are always network-first so a stale page can never
  // redirect the user to an unrelated TraHis module after a theme update.
  if(event.request.mode==="navigate"){
    event.respondWith(
      fetch(event.request,{cache:"no-store"})
        .then(response=>{
          if(response && response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
          }
          return response;
        })
        .catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>cached||Response.error()))
  );
});
