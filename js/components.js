/* TraHis shared UI components
   v31: one source of truth for header, drawer, bottom navigation and common controls.
*/
(function(){
  "use strict";

  const shell = `
<header id="appHeader" class="app-header">
  <div class="header-inner">
    <a class="brand" href="index.html"><img src="assets/icon.svg" alt="TraHis"> <span>TraHis</span></a>
    <div class="header-actions">
      <button id="themeToggle" class="theme-toggle" type="button" aria-label="Switch theme" title="Switch theme"><i class="bi bi-moon-stars-fill"></i><span class="theme-toggle-label">Dark</span></button>
      <span id="headerUser" class="header-user"></span>
      <button id="headerMenuBtn" class="icon-btn" type="button" aria-label="Open menu"><i class="bi bi-person-circle"></i></button>
    </div>
  </div>
</header>
<div id="drawerOverlay" class="drawer-overlay"></div>
<aside id="appDrawer" class="app-drawer" aria-label="Main menu">
  <div class="drawer-top">
    <div class="drawer-brand"><img src="assets/icon.svg" alt=""><div><strong>TraHis</strong><small>Personal finance</small></div></div>
    <button id="closeDrawer" class="icon-btn" type="button" aria-label="Close menu"><i class="bi bi-x-lg"></i></button>
  </div>
  <div class="drawer-user" id="drawerUser"></div>
  <nav class="drawer-nav">
    <a href="profile.html"><i class="bi bi-person"></i><span>Profile</span></a>
    <a href="savings.html"><i class="bi bi-piggy-bank"></i><span>Savings</span></a>
    <a href="tutorial.html"><i class="bi bi-play-circle"></i><span>App Tutorial</span></a>
    <a href="calendar.html"><i class="bi bi-calendar3"></i><span>Calendar</span></a>
    <a href="settings.html"><i class="bi bi-gear"></i><span>Settings</span></a>
    <a href="backup.html"><i class="bi bi-cloud-arrow-down"></i><span>Backup &amp; Restore</span></a>
    <a id="adminNav" href="admin.html"><i class="bi bi-shield-check"></i><span>Admin</span></a>
    <button id="logoutBtn" class="danger" type="button"><i class="bi bi-box-arrow-right"></i><span>Logout</span></button>
  </nav>
  <div class="drawer-foot">Local-only data • No server database</div>
</aside>
<main id="main" class="main-shell"></main>
<nav id="bottomNav" class="bottom-nav" aria-label="Primary navigation">
  <a href="index.html"><i class="bi bi-grid-1x2-fill"></i><span>Home</span></a>
  <a href="add.html"><i class="bi bi-plus-circle"></i><span>Add</span></a>
  <a href="transfer.html"><i class="bi bi-arrow-left-right"></i><span>Transfer</span></a>
  <a href="history.html"><i class="bi bi-clock-history"></i><span>History</span></a>
</nav>
<div id="toastBox" class="toast-container position-fixed top-0 end-0 p-3"></div>
<input id="restoreFile" type="file" accept=".json,application/json" hidden>
`;

  function mount(){
    const app=document.getElementById("app");
    if(!app)return;
    app.insertAdjacentHTML("afterend",shell);
    app.remove();
  }

  // A shared component file is intentionally the only owner of the repeated app chrome.
  mount();

  const SELECT_CLASS="tr-select";
  const DATE_CLASS="tr-date-field";
  let openSelect=null;
  let openDate=null;

  function esc(v){return String(v??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m]));}
  function selectedOption(select){
    return select.options[select.selectedIndex]||select.options[0]||null;
  }
  function positionFloating(el,anchor){
    const r=anchor.getBoundingClientRect();
    const margin=6, maxH=Math.min(320,window.innerHeight-20);
    el.style.maxHeight=`${maxH}px`;
    el.style.width=`${Math.max(r.width,180)}px`;
    const measured=el.getBoundingClientRect();
    let left=Math.min(Math.max(8,r.left),Math.max(8,window.innerWidth-measured.width-8));
    let top=r.bottom+margin;
    if(top+Math.min(measured.height,maxH)>window.innerHeight-8)top=Math.max(8,r.top-measured.height-margin);
    el.style.left=`${Math.round(left)}px`;el.style.top=`${Math.round(top)}px`;
  }
  function positionDatePicker(el,anchor){
    const r=anchor.getBoundingClientRect();
    const margin=8, viewportPad=10;
    el.style.width=`min(430px,calc(100vw - 20px))`;
    el.style.maxHeight=`calc(100vh - 20px)`;
    const measured=el.getBoundingClientRect();
    const availableBelow=window.innerHeight-r.bottom-margin;
    const availableAbove=r.top-margin;
    let top=r.bottom+margin;
    if(measured.height>availableBelow && availableAbove>availableBelow) top=Math.max(viewportPad,r.top-measured.height-margin);
    else top=Math.min(top,window.innerHeight-measured.height-viewportPad);
    const left=Math.min(Math.max(viewportPad,r.left),Math.max(viewportPad,window.innerWidth-measured.width-viewportPad));
    el.style.left=`${Math.round(left)}px`;
    el.style.top=`${Math.round(Math.max(viewportPad,top))}px`;
  }
  function closeSelect(){
    if(!openSelect)return;
    openSelect.menu.classList.remove("open");
    openSelect.trigger.setAttribute("aria-expanded","false");
    openSelect.wrapper.classList.remove("is-open");
    openSelect=null;
  }
  function openSelectMenu(wrapper){
    const select=wrapper.querySelector("select"), trigger=wrapper.querySelector(".tr-select-trigger");
    if(!select||select.disabled)return;
    if(openSelect&&openSelect.wrapper===wrapper){closeSelect();return;}
    closeSelect();closeDate();
    const menu=document.createElement("div");menu.className="tr-select-menu";menu.setAttribute("role","listbox");
    [...select.options].forEach((opt,i)=>{
      if(opt.hidden)return;
      const item=document.createElement("button");item.type="button";item.className="tr-select-option";item.setAttribute("role","option");item.dataset.value=opt.value;item.dataset.index=String(i);item.disabled=opt.disabled;item.innerHTML=`<span>${esc(opt.textContent)}</span>${i===select.selectedIndex?'<i class="bi bi-check2"></i>':""}`;
      item.setAttribute("aria-selected",String(i===select.selectedIndex));
      item.addEventListener("click",()=>{
        if(item.disabled)return;
        select.value=opt.value;
        select.dispatchEvent(new Event("change",{bubbles:true}));
        updateSelectVisual(wrapper);
        closeSelect();
      });
      menu.appendChild(item);
    });
    document.body.appendChild(menu);
    openSelect={wrapper,select,trigger,menu};
    trigger.setAttribute("aria-expanded","true");
    wrapper.classList.add("is-open");
    menu.classList.add("open");positionFloating(menu,trigger);
    const active=menu.querySelector(`[data-index="${select.selectedIndex}"]`);active?.scrollIntoView({block:"nearest"});
  }
  function updateSelectVisual(wrapper){
    const select=wrapper.querySelector("select"), trigger=wrapper.querySelector(".tr-select-trigger");
    if(!select||!trigger)return;
    const opt=selectedOption(select);trigger.querySelector(".tr-select-label").textContent=opt?.textContent||"Select";
    wrapper.classList.toggle("has-value",!!opt?.value);
  }
  function enhanceSelect(select){
    if(!select||select.dataset.customEnhanced)return;
    select.dataset.customEnhanced="1";
    const wrapper=document.createElement("div");wrapper.className=SELECT_CLASS;
    select.parentNode.insertBefore(wrapper,select);wrapper.appendChild(select);
    select.classList.add("tr-native-select");
    const trigger=document.createElement("button");trigger.type="button";trigger.className="tr-select-trigger";trigger.setAttribute("aria-haspopup","listbox");trigger.setAttribute("aria-expanded","false");
    trigger.innerHTML='<span class="tr-select-label"></span><i class="bi bi-chevron-down tr-select-chevron"></i>';
    wrapper.insertBefore(trigger,select);
    trigger.addEventListener("click",()=>openSelectMenu(wrapper));
    trigger.addEventListener("keydown",e=>{
      if(["ArrowDown","ArrowUp","Enter"," "].includes(e.key)){e.preventDefault();openSelectMenu(wrapper)}
    });
    select.addEventListener("change",()=>updateSelectVisual(wrapper));
    updateSelectVisual(wrapper);
  }
  function enhanceAllSelects(root=document){root.querySelectorAll("select:not([data-custom-enhanced])").forEach(enhanceSelect);}

  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS=["Su","Mo","Tu","We","Th","Fr","Sa"];
  function pad(n){return String(n).padStart(2,"0");}
  function localDateParts(value,datetime){
    if(!value){const d=new Date();return {y:d.getFullYear(),m:d.getMonth(),day:d.getDate(),h:d.getHours(),min:d.getMinutes()};}
    const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if(!m)return localDateParts("",datetime);
    return {y:+m[1],m:+m[2]-1,day:+m[3],h:m[4]!=null?+m[4]:new Date().getHours(),min:m[5]!=null?+m[5]:new Date().getMinutes()};
  }
  function formatDateValue(p,datetime){
    const base=`${p.y}-${pad(p.m+1)}-${pad(p.day)}`;
    return datetime?`${base}T${pad(p.h)}:${pad(p.min)}`:base;
  }
  function prettyDate(value,datetime){
    if(!value)return datetime?"Select date & time":"Select date";
    const p=localDateParts(value,datetime), d=new Date(p.y,p.m,p.day,p.h,p.min);
    const date=d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
    if(!datetime)return date;
    const time=d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
    return `${date} • ${time}`;
  }
  function closeDate(){
    if(!openDate)return;
    const trigger=openDate.field.querySelector(".tr-date-trigger");
    if(trigger)trigger.setAttribute("aria-expanded","false");
    openDate.panel.remove();openDate=null;
  }
  function renderDatePicker(field){
    const input=field.querySelector("input.tr-native-date");
    if(!input)return;
    const datetime=input.type==="datetime-local";
    let p=localDateParts(input.value,datetime);
    let viewY=p.y,viewM=p.m;
    closeSelect();closeDate();
    const panel=document.createElement("div");panel.className="tr-datepicker";panel.setAttribute("role","dialog");panel.setAttribute("aria-label",datetime?"Select date and time":"Select date");
    document.body.appendChild(panel);
    openDate={field,input,panel};
    function draw(){
      const first=new Date(viewY,viewM,1).getDay();
      const days=new Date(viewY,viewM+1,0).getDate();
      const prevDays=new Date(viewY,viewM,0).getDate();
      const selected=localDateParts(input.value,datetime);
      const today=new Date();
      let cells="";
      for(let i=0;i<42;i++){
        const n=i-first+1;let day=n,month=viewM,year=viewY,muted=false;
        if(n<1){day=prevDays+n;month--;muted=true;if(month<0){month=11;year--;}}
        else if(n>days){day=n-days;month++;muted=true;if(month>11){month=0;year++;}}
        const active=year===selected.y&&month===selected.m&&day===selected.day;
        const todayClass=year===today.getFullYear()&&month===today.getMonth()&&day===today.getDate()?" today":"";
        cells+=`<button type="button" class="tr-day${muted?" muted":""}${active?" active":""}${todayClass}" data-y="${year}" data-m="${month}" data-d="${day}">${day}</button>`;
      }
      let timeHtml="";
      if(datetime){
        const h12=(selected.h%12)||12, ampm=selected.h>=12?"PM":"AM";
        const hours=[1,2,3,4,5,6,7,8,9,10,11,12], mins=Array.from({length:60},(_,i)=>i);
        timeHtml=`<div class="tr-time-panel"><div class="tr-time-title">Time</div><div class="tr-time-columns"><div>${hours.map(h=>`<button type="button" class="tr-time-btn ${h===h12?"active":""}" data-hour="${h}">${pad(h)}</button>`).join("")}</div><div>${mins.map(m=>`<button type="button" class="tr-time-btn ${m===selected.min?"active":""}" data-minute="${m}">${pad(m)}</button>`).join("")}</div><div>${["AM","PM"].map(a=>`<button type="button" class="tr-time-btn ${a===ampm?"active":""}" data-ampm="${a}">${a}</button>`).join("")}</div></div></div>`;
      }
      panel.innerHTML=`<div class="tr-datepicker-head"><button type="button" class="tr-cal-nav" data-prev aria-label="Previous month"><i class="bi bi-chevron-left"></i></button><strong>${MONTHS[viewM]} ${viewY}</strong><button type="button" class="tr-cal-nav" data-next aria-label="Next month"><i class="bi bi-chevron-right"></i></button></div><div class="tr-weekdays">${DAYS.map(d=>`<span>${d}</span>`).join("")}</div><div class="tr-days">${cells}</div>${timeHtml}<div class="tr-datepicker-foot"><button type="button" class="tr-cal-link" data-clear>Clear</button><button type="button" class="tr-cal-link" data-today>Today</button><button type="button" class="tr-cal-done" data-done>Done</button></div>`;
      panel.querySelector("[data-prev]").onclick=()=>{viewM--;if(viewM<0){viewM=11;viewY--;}draw()};
      panel.querySelector("[data-next]").onclick=()=>{viewM++;if(viewM>11){viewM=0;viewY++;}draw()};
      panel.querySelectorAll(".tr-day").forEach(btn=>btn.onclick=()=>{p.y=+btn.dataset.y;p.m=+btn.dataset.m;p.day=+btn.dataset.d;viewY=p.y;viewM=p.m;write(false);draw()});
      panel.querySelectorAll("[data-hour]").forEach(btn=>btn.onclick=()=>{const h=+btn.dataset.hour;const isPm=p.h>=12;p.h=(h%12)+(isPm?12:0);write(false);draw()});
      panel.querySelectorAll("[data-minute]").forEach(btn=>btn.onclick=()=>{p.min=+btn.dataset.minute;write(false);draw()});
      panel.querySelectorAll("[data-ampm]").forEach(btn=>btn.onclick=()=>{const isPm=btn.dataset.ampm==="PM";p.h=(p.h%12)+(isPm?12:0);write(false);draw()});
      panel.querySelector("[data-clear]").onclick=()=>{input.value="";field.querySelector(".tr-date-label").textContent=prettyDate("",datetime);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));closeDate()};
      panel.querySelector("[data-today]").onclick=()=>{const d=new Date();p={y:d.getFullYear(),m:d.getMonth(),day:d.getDate(),h:d.getHours(),min:Math.floor(d.getMinutes()/5)*5};viewY=p.y;viewM=p.m;write(false);draw()};
      panel.querySelector("[data-done]").onclick=()=>{write(true);closeDate()};
      positionDatePicker(panel,field.querySelector(".tr-date-trigger"));
    }
    function write(close){input.value=formatDateValue(p,datetime);field.querySelector(".tr-date-label").textContent=prettyDate(input.value,datetime);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));if(close)closeDate();}
    draw();
  }
  function enhanceDateInput(input){
    if(!input||input.dataset.customEnhanced)return;
    input.dataset.customEnhanced="1";
    const field=document.createElement("div");field.className=DATE_CLASS;
    input.parentNode.insertBefore(field,input);field.appendChild(input);input.classList.add("tr-native-date");
    const trigger=document.createElement("button");trigger.type="button";trigger.className="tr-date-trigger";trigger.setAttribute("aria-haspopup","dialog");trigger.setAttribute("aria-expanded","false");trigger.innerHTML=`<span class="tr-date-label">${prettyDate(input.value,input.type==="datetime-local")}</span><i class="bi bi-calendar3"></i>`;
    field.insertBefore(trigger,input);
    trigger.onclick=()=>{if(openDate?.field===field){closeDate();return;}renderDatePicker(field);trigger.setAttribute("aria-expanded","true")};
    input.addEventListener("change",()=>{trigger.querySelector(".tr-date-label").textContent=prettyDate(input.value,input.type==="datetime-local")});
  }
  function enhanceAllDates(root=document){root.querySelectorAll('input[type="date"]:not([data-custom-enhanced]),input[type="datetime-local"]:not([data-custom-enhanced])').forEach(enhanceDateInput)}

  function enhance(root=document){enhanceAllSelects(root);enhanceAllDates(root)}
  const observer=new MutationObserver(muts=>{
    for(const m of muts)for(const n of m.addedNodes){if(n.nodeType===1)enhance(n)}
  });
  observer.observe(document.body,{childList:true,subtree:true});
  enhance(document);

  document.addEventListener("click",e=>{
    if(openSelect && !openSelect.wrapper.contains(e.target) && !openSelect.menu.contains(e.target))closeSelect();
    if(openDate && !openDate.field.contains(e.target) && !openDate.panel.contains(e.target))closeDate();
  });
  document.addEventListener("keydown",e=>{
    if(e.key!=="Escape")return;
    if(openSelect){closeSelect();e.preventDefault();return;}
    if(openDate){closeDate();e.preventDefault();}
  });
  window.addEventListener("resize",()=>{if(openSelect)positionFloating(openSelect.menu,openSelect.trigger);if(openDate)positionDatePicker(openDate.panel,openDate.field.querySelector(".tr-date-trigger"))});
  window.addEventListener("scroll",()=>{if(openSelect)positionFloating(openSelect.menu,openSelect.trigger);if(openDate)positionDatePicker(openDate.panel,openDate.field.querySelector(".tr-date-trigger"))},true);
})();
