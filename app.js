'use strict';
const DB='autoradar-local-v1',STORE='state';let state={schema_version:1,exported_at:null,updated_at:null,cars:[],favorites:[],events:[],settings:{maxPrice:17000}},tab='overview';
const $=id=>document.getElementById(id);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const money=n=>new Intl.NumberFormat('de-DE').format(Number(n)||0)+' €';const date=s=>s?new Date(s).toLocaleDateString('ru-RU'):'нет данных';
function dbOpen(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore(STORE);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function read(){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const q=tx.objectStore(STORE).get('main');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);tx.oncomplete=()=>db.close()})}
async function save(next=state){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(next,'main');tx.oncomplete=()=>{db.close();res()};tx.onabort=tx.onerror=()=>{db.close();rej(tx.error||Error('Сохранение прервано'))}})}
let writes=Promise.resolve();
function change(update){const job=writes.then(async()=>{const next=update(state);valid(next);await save(next);state=next;render()});writes=job.catch(()=>{});return job}
function report(e){alert('Не удалось сохранить изменения: '+e.message)}
const sample=[{id:'demo-volvo-v60',make:'Volvo',model:'V60 Cross Country',year:2017,price:9700,mileage_km:188000,city:'Рига',body:'wagon',engine:'2.0 бензин',hp:190,gearbox:'Автомат',interior:'Кожа',score:8.7,status:'demo',url:null,first_seen:'2026-10-25',last_checked:null,history:[{date:'2026-10-25',price:9700}],demo:true},{id:'demo-mazda-cx5',make:'Mazda',model:'CX-5',year:2016,price:9200,mileage_km:161000,city:'Даугавпилс',body:'suv',engine:'2.0 бензин',hp:165,gearbox:'Автомат',interior:'Кожа',score:8.5,status:'demo',url:null,first_seen:'2026-10-25',history:[{date:'2026-10-25',price:9200}],demo:true},{id:'demo-bmw-x3',make:'BMW',model:'X3',year:2015,price:9900,mileage_km:211000,city:'Резекне',body:'suv',engine:'2.0 бензин',hp:184,gearbox:'Автомат',interior:'Кожа',score:8.2,status:'demo',url:null,first_seen:'2026-10-25',history:[{date:'2026-10-25',price:9900}],demo:true},{id:'demo-lexus-is',make:'Lexus',model:'IS 300h',year:2015,price:9800,mileage_km:194000,city:'Рига',body:'sedan',engine:'2.5 гибрид',hp:223,gearbox:'e-CVT',interior:'Кожа',score:8.6,status:'demo',url:null,first_seen:'2026-10-25',history:[{date:'2026-10-25',price:9800}],demo:true}];
function valid(data){
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const numeric=(v,key,min=0)=>{if(v!=null&&(typeof v!=='number'||!Number.isFinite(v)||v<min))throw Error('Некорректное поле: '+key)};
if(!object(data)||data.schema_version!==1||!Array.isArray(data.cars)||!Array.isArray(data.favorites)||!Array.isArray(data.events))throw Error('Неверный формат базы: нужны schema_version: 1, cars, favorites, events');
if(data.cars.length>20000||data.events.length>100000||data.favorites.length>20000)throw Error('Слишком много записей');
const ids=new Set();
for(const c of data.cars){
if(!object(c)||typeof c.id!=='string'||!c.id||ids.has(c.id))throw Error('Ошибка идентификаторов объявлений');ids.add(c.id);
if(typeof c.price!=='number')throw Error('Не указана цена');numeric(c.price,'цена');
for(const key of ['year','mileage_km','hp','score'])numeric(c[key],key);
for(const key of ['make','model','city','engine','body','gearbox','interior','status','notes','first_seen','last_checked'])if(c[key]!=null&&typeof c[key]!=='string')throw Error('Некорректное поле: '+key);
if(c.url!=null&&c.url!==''){if(typeof c.url!=='string')throw Error('Некорректная ссылка');const u=new URL(c.url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Недопустимая ссылка')}
for(const key of ['ta_verified','registration_verified','ta_csdd_verified'])if(c[key]!=null&&typeof c[key]!=='boolean')throw Error('Некорректный флаг: '+key);
if(c.ta_until!=null&&!isTaDate(c.ta_until))throw Error('Некорректный срок TA');
if(c.ta_source!=null&&!['listing','csdd'].includes(c.ta_source))throw Error('Некорректный источник TA');
if(c.ta_check_status!=null&&!['found','not_stated','unavailable','conflict'].includes(c.ta_check_status))throw Error('Некорректный статус TA');
for(const key of ['ta_checked_at','source_checked_at'])if(c[key]!=null&&(typeof c[key]!=='string'||!Number.isFinite(Date.parse(c[key]))))throw Error('Некорректная дата: '+key);
for(const key of ['ta_evidence','ta_check_error'])if(c[key]!=null&&typeof c[key]!=='string')throw Error('Некорректное поле: '+key);
if(c.ta_source_url!=null){if(typeof c.ta_source_url!=='string')throw Error('Некорректная ссылка TA');const u=new URL(c.ta_source_url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Недопустимая ссылка TA')}
if(c.history!=null){if(!Array.isArray(c.history)||c.history.length>10000)throw Error('Некорректная история цен');for(const h of c.history){if(!object(h)||typeof h.date!=='string'||!h.date||!Number.isFinite(Date.parse(h.date))||typeof h.price!=='number')throw Error('Некорректная запись истории');numeric(h.price,'история цены')}}
}
if(data.favorites.some(id=>typeof id!=='string'||!id))throw Error('Некорректное избранное');
if(data.events.some(e=>!object(e)||(e.id!=null&&typeof e.id!=='string')))throw Error('Некорректные события');
if(data.settings!=null){if(!object(data.settings))throw Error('Некорректные настройки');numeric(data.settings.maxPrice,'максимальная цена')}
for(const k of ['updated_at','exported_at'])if(data[k]!=null&&(typeof data[k]!=='string'||!Number.isFinite(Date.parse(data[k]))))throw Error('Некорректная дата: '+k);
return true
}
function merge(incoming,current=state){
valid(incoming);const map=new Map(current.cars.map(c=>[c.id,c]));
for(const car of incoming.cars){const prev=map.get(car.id);if(prev){const history=[...(prev.history||[]),...(car.history||[])];const unique=new Map(history.map(h=>[String(h.date)+'|'+String(h.price),h]));map.set(car.id,{...prev,...car,history:[...unique.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)))})}else map.set(car.id,car)}
const ev=new Map([...current.events,...incoming.events].map(e=>[e.id||JSON.stringify(e),e]));
const next={...current,cars:[...map.values()],favorites:[...new Set([...current.favorites,...incoming.favorites])],events:[...ev.values()],settings:{...current.settings,...incoming.settings},updated_at:incoming.updated_at||new Date().toISOString()};
valid(next);return next
}
function download(){const payload={...state,exported_at:new Date().toISOString()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='autoradar-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function sortCars(a,b){const s=$('sort').value;if(s==='price')return a.price-b.price;if(s==='year')return (b.year||0)-(a.year||0);if(s==='recent')return String(b.first_seen||'').localeCompare(String(a.first_seen||''));return (b.score||0)-(a.score||0)}
function filtered(){const q=$('search').value.trim().toLowerCase(),max=$('maxPrice').value===''?Infinity:Math.max(0,Number($('maxPrice').value));let arr=state.cars.filter(c=>c.status!=='sold'&&c.status!=='removed'&&c.price<=max&&[c.make,c.model,c.city,c.engine].join(' ').toLowerCase().includes(q));if(tab==='suv')arr=arr.filter(c=>c.body==='suv');if(tab==='favorites')arr=arr.filter(c=>state.favorites.includes(c.id));if(tab==='brands')arr=arr.filter(c=>/volvo|bmw|nissan|mg/i.test(c.make||''));if(tab==='changes')arr=arr.filter(c=>(c.history||[]).length>1||c.status==='new');arr.sort(sortCars);if(tab==='suv'||tab==='all')arr=arr.slice(0,5);return arr}
function isTaDate(value){
 if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(value))return false;
 const [y,m,d]=value.split('-').map(Number);if(y<1900||y>2199)return false;if(!d)return true;
 const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d
}
function taInfo(car,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Riga',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
 const source=car.ta_source==='listing'?'По объявлению':car.ta_source==='csdd'&&car.ta_csdd_verified===true?'По CSDD':'Источник не указан';
 if(car.ta_check_status==='conflict')return {label:'TA: данные расходятся',source};
 if(isTaDate(car.ta_until)){
  const [year,month,day]=car.ta_until.split('-');const date=day?`${day}.${month}.${year}`:`${month}.${year}`;
  const expired=day?car.ta_until<today:car.ta_until<today.slice(0,7);
  const currentMonth=!day&&car.ta_until===today.slice(0,7);
  const stale=car.ta_check_status==='unavailable';
  const suffix=stale?'ранее':source==='По объявлению'?'по объявлению':source==='По CSDD'?'CSDD':'источник не указан';
  return {label:expired?`TA истёк: ${date} · ${suffix}`:currentMonth?`TA ${date} · уточнить день`:`TA до ${date} · ${suffix}`,source}
 }
 if(car.ta_check_status==='unavailable')return {label:'TA: страницу не удалось проверить',source};
 if(car.ta_csdd_verified===true)return {label:'TA: CSDD проверено, срок не указан',source};
 return {label:car.ta_verified===true?'TA указан · срок неизвестен':'TA: срок не указан',source}
}

let lastTop='suv';
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
function navigate(next){tab=next;if(next==='suv'||next==='all')lastTop=next;$('mainContent').scrollTop=0;render()}
function render(){
 const names={overview:'Обзор объявлений',suv:'ТОП-5 кроссоверов',all:'ТОП-5 всех кузовов',brands:'Любимые марки',favorites:'Избранное',changes:'Изменения и цены'};
 const cars=filtered(),active=state.cars.filter(c=>!['sold','removed'].includes(c.status));
 $('sectionTitle').textContent=names[tab];$('sectionHint').textContent=cars.length+' из '+state.cars.length+' автомобилей';
 $('countAll').textContent=active.length;$('countFav').textContent=state.favorites.length;$('sideFav').textContent=state.favorites.length;$('bottomFav').textContent=state.favorites.length;$('bottomFav').hidden=!state.favorites.length;$('countNew').textContent=state.cars.filter(c=>c.status==='new').length;
 $('lastSync').textContent=state.updated_at?'Обновлено: '+date(state.updated_at):'Обновлений ещё нет';$('dbStatus').textContent='Сохранено на устройстве';
 $('demoLabel').hidden=!cars.some(c=>c.demo);
 document.querySelectorAll('#tabs [data-tab]').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 document.querySelectorAll('#mobileTabs [data-mobile-tab]').forEach(b=>{if(b.dataset.mobileTab===(['suv','all'].includes(tab)?'top':tab))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 $('topSwitch').hidden=!['suv','all'].includes(tab);document.querySelectorAll('[data-top]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.top===tab)));
 $('content').innerHTML=cars.length?cars.map(c=>`<article class="car"><div class="car-title"><div><h3>${esc(c.make)} ${esc(c.model)}</h3><div class="sub">${esc(c.year||'Год не указан')} · ${esc(c.mileage_km==null?'Пробег неизвестен':new Intl.NumberFormat('ru-RU').format(c.mileage_km)+' км')} · ${esc(c.city||'Город неизвестен')}</div></div><button class="fav ${state.favorites.includes(c.id)?'on':''}" data-fav="${esc(c.id)}" aria-label="Избранное: ${esc(c.make)} ${esc(c.model)}" aria-pressed="${state.favorites.includes(c.id)}">${icon('heart')}</button></div><div class="car-top"><strong class="price">${money(c.price)}</strong><span class="score" aria-label="Рейтинг ${esc(c.score??'не указан')}">${icon('star')}${c.score==null?'—':esc(Number(c.score).toFixed(1))}</span></div><div class="spec">${esc(c.engine||'Двигатель не указан')} · ${esc(c.gearbox||'КПП неизвестна')} · ${esc(c.interior||'Салон не проверен')}</div><div class="car-bottom"><span class="car-status">${c.demo?'<span class="small-badge">ДЕМО</span>':''}${c.status==='new'?'<span class="small-badge">НОВИНКА</span>':''}${esc(taInfo(c).label)}</span><span class="card-links"><button class="text-button" data-detail="${esc(c.id)}">Подробнее →</button>${c.url?`<a class="link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Объявление ↗</a>`:''}</span></div></article>`).join(''):emptyState();
}
function emptyState(){
 const title=tab==='changes'?'Изменений пока нет':tab==='favorites'?'В избранном пока пусто':state.cars.length?'Ничего не найдено':'Добавь первую базу';
 const text=tab==='changes'?'После импорта обновлённой базы здесь появятся новые объявления и изменения цен.':tab==='favorites'?'Нажми сердечко на карточке, чтобы сохранить машину.':state.cars.length?'Попробуй изменить поиск или максимальную цену.':'Импортируй JSON с объявлениями или добавь демо для знакомства с приложением.';
 const action=tab==='changes'?'sync':tab==='favorites'?'overview':state.cars.length?'reset':'base';
 const label={sync:'Как обновить базу',overview:'К объявлениям',reset:'Сбросить фильтры',base:'Открыть базу'}[action];
 return `<div class="empty"><strong>${title}</strong><p>${text}</p><button class="button" data-empty="${action}">${label}</button></div>`
}
function detail(id){
 const c=state.cars.find(x=>x.id===id);if(!c)return;
 const body={suv:'Кроссовер',wagon:'Универсал',sedan:'Седан'};
 const pairs=[['Кузов',body[c.body]||c.body],['Год',c.year],['Пробег',c.mileage_km==null?'—':new Intl.NumberFormat('ru-RU').format(c.mileage_km)+' км'],['Двигатель',c.engine],['Мощность',c.hp?c.hp+' л.с.':'—'],['КПП',c.gearbox],['Салон',c.interior],['Город',c.city],['Регистрация LV',c.registration_verified?'Подтверждена':'Не подтверждена'],['Техосмотр',taInfo(c).label],['Источник TA',taInfo(c).source],['Проверка TA по CSDD',c.ta_csdd_verified===true?'Подтверждена':'Не подтверждена'],['Дата проверки TA',date(c.ta_checked_at)],['Последняя проверка',date(c.last_checked)],['Статус',c.status]];
 $('detailBody').innerHTML=`<h2>${esc(c.make)} ${esc(c.model)}</h2><p class="price">${money(c.price)}</p><div class="detailgrid">${pairs.map(([k,v])=>`<div><small>${esc(k)}</small>${esc(v??'—')}</div>`).join('')}</div>${c.ta_evidence?'<p class="fine">'+esc(c.ta_evidence)+'</p>':''}${c.ta_check_error?'<p class="fine">'+esc(c.ta_check_error)+'</p>':''}${c.ta_source_url?'<p><a class="link" href="'+esc(c.ta_source_url)+'" target="_blank" rel="noopener noreferrer">Источник срока TA ↗</a></p>':''}<h3>История цены</h3><ul class="history">${(c.history||[]).map(h=>`<li>${esc(h.date)} — ${money(h.price)}</li>`).join('')||'<li>Нет истории</li>'}</ul><p>${esc(c.notes||'Комментариев пока нет.')}</p>${c.demo?'<p class="fine">Вымышленный автомобиль для проверки интерфейса.</p>':''}${c.url?`<p><a class="link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Открыть оригинальное объявление ↗</a></p>`:''}`;
 $('detailDialog').showModal()
}
async function doImport(file){
 if(!file)return false;if(file.size>15*1024*1024){alert('Максимальный размер JSON: 15 МБ');return false}
 try{const data=JSON.parse(await file.text());await change(current=>merge(data,current));$('maxPrice').value=state.settings?.maxPrice??'';render();alert('База обновлена. Автомобилей: '+state.cars.length);return true}catch(e){alert('Не удалось импортировать: '+e.message);return false}
}
function bind(){
 document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.onclick=()=>navigate(b.dataset.tab));
 document.querySelectorAll('#mobileTabs [data-mobile-tab]').forEach(b=>b.onclick=()=>navigate(b.dataset.mobileTab==='top'?lastTop:b.dataset.mobileTab));
 document.querySelectorAll('[data-top]').forEach(b=>b.onclick=()=>navigate(b.dataset.top));
 $('sort').onchange=render;$('search').oninput=render;
 $('maxPrice').oninput=()=>{render();const maxPrice=$('maxPrice').value===''?null:Math.max(0,Number($('maxPrice').value));change(current=>({...current,settings:{...current.settings,maxPrice}})).catch(report)};
 $('content').onclick=async e=>{
  const fav=e.target.closest('[data-fav]');if(fav){const id=fav.dataset.fav;try{await change(current=>({...current,favorites:current.favorites.includes(id)?current.favorites.filter(x=>x!==id):[...current.favorites,id]}))}catch(err){report(err)}return}
  const d=e.target.closest('[data-detail]');if(d)detail(d.dataset.detail);
  const empty=e.target.closest('[data-empty]');if(empty){if(empty.dataset.empty==='sync')$('syncDialog').showModal();else if(empty.dataset.empty==='base')$('baseDialog').showModal();else if(empty.dataset.empty==='overview')navigate('overview');else{$('search').value='';$('maxPrice').value=17000;try{await change(current=>({...current,settings:{...current.settings,maxPrice:17000}}))}catch(err){report(err)}}}
 };
 ['exportBtn','syncExport'].forEach(id=>$(id).onclick=async()=>{await writes;download()});
 ['importBtn','syncImport'].forEach(id=>$(id).onclick=()=>$('filePicker').click());
 $('filePicker').onchange=async e=>{const imported=await doImport(e.target.files[0]);e.target.value='';if(imported){$('syncDialog').close();$('baseDialog').close()}};
 $('demoBtn').onclick=async()=>{try{await change(current=>({...current,cars:[...current.cars,...sample.filter(c=>!current.cars.some(x=>x.id===c.id))]}));$('baseDialog').close()}catch(e){report(e)}};
 $('clearBtn').onclick=async()=>{if(confirm('Удалить ВСЮ локальную базу? Сначала экспортируй резервную копию.')){try{await change(()=>({schema_version:1,exported_at:null,updated_at:null,cars:[],favorites:[],events:[],settings:{maxPrice:17000}}));$('maxPrice').value=17000;render();$('baseDialog').close()}catch(e){report(e)}}};
 $('baseBtn').onclick=()=>$('baseDialog').showModal();$('baseClose').onclick=()=>$('baseDialog').close();
 $('updateBtn').onclick=()=>$('syncDialog').showModal();$('syncClose').onclick=()=>$('syncDialog').close();$('closeDialog').onclick=()=>$('detailDialog').close();
 for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
}
let installPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
$('installBtn').onclick=async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else alert('Android / Chrome: меню ⋮ → Установить приложение.\nНа iPhone: Safari → Поделиться → На экран «Домой».\nНа компьютере: кнопка установки в адресной строке браузера.')};
window.addEventListener('appinstalled',()=>{$('installBtn').hidden=true});
if(window.matchMedia('(display-mode: standalone)').matches)$('installBtn').hidden=true;

let appRegistration=null,reloadForUpdate=false,lastUpdateCheck=0;
function offerAppUpdate(){if(appRegistration?.waiting){$('appUpdate').hidden=false;$('installAppUpdate').hidden=false;$('appUpdateStatus').textContent='Новая версия готова. Нажми «Перезапустить приложение».'}}
async function registerAppWorker(){
 if(!('serviceWorker'in navigator)||!location.protocol.startsWith('http'))return;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadForUpdate)location.reload()});
 try{appRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});const track=()=>{const worker=appRegistration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offerAppUpdate()});offerAppUpdate()};appRegistration.addEventListener('updatefound',track);track()}catch(e){$('appUpdateStatus').textContent='Не удалось включить офлайн-режим. Проверь подключение.'}
}
async function checkAppUpdate(manual=false){
 if(!navigator.onLine){if(manual)$('appUpdateStatus').textContent='Для проверки обновления нужен интернет.';return}
 if(!appRegistration){if(manual)$('appUpdateStatus').textContent='Сервис обновления ещё не готов. Попробуй снова.';return}
 if(!manual&&Date.now()-lastUpdateCheck<60000)return;lastUpdateCheck=Date.now();
 if(manual){$('checkAppUpdate').disabled=true;$('appUpdateStatus').textContent='Проверяем обновление…'}
 try{
  await appRegistration.update();
  const worker=appRegistration.installing;
  if(worker)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{worker.removeEventListener('statechange',done);reject(Error('timeout'))},15000);function done(){if(['installed','activated','redundant'].includes(worker.state)){clearTimeout(timer);worker.removeEventListener('statechange',done);worker.state==='redundant'?reject(Error('install')):resolve()}}worker.addEventListener('statechange',done);done()});
  offerAppUpdate();if(!appRegistration.waiting&&manual)$('appUpdateStatus').textContent='Установлена актуальная версия 2.0.2.'
 }catch(e){if(manual)$('appUpdateStatus').textContent='Проверка не завершена. Проверь интернет и попробуй снова.'}finally{if(manual)$('checkAppUpdate').disabled=false}
}
$('checkAppUpdate').onclick=()=>checkAppUpdate(true);
async function applyWaitingUpdate(){if(!appRegistration?.waiting)return;await writes;reloadForUpdate=true;appRegistration.waiting.postMessage({type:'SKIP_WAITING'})}
$('applyUpdate').onclick=applyWaitingUpdate;$('installAppUpdate').onclick=applyWaitingUpdate;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkAppUpdate()});window.addEventListener('online',()=>checkAppUpdate());
(async()=>{bind();try{state=(await read())||state;valid(state);$('maxPrice').value=state.settings?.maxPrice??'';render()}catch(e){$('dbStatus').textContent='Ошибка открытия базы';alert('Не удалось открыть IndexedDB: '+e.message)}await registerAppWorker()})();
