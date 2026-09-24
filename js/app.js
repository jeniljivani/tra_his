/* TraHis - offline local PWA
   v31: shared components + custom controls + navigation-safe multi-theme stability
*/
(function(){
"use strict";

const APP_VERSION = "v31";
const MASTER = { username:"tra_his", password:"tra_his@2503", name:"Master Admin" };
const DB_KEY = "trahis_state_v5";
const LEGACY_DB_KEY = "trahis_state_v4";
const SESSION_KEY = "trahis_session_v1";
const REMEMBER_KEY = "trahis_remember_user_v1";
const REMEMBER_SESSION_KEY = "trahis_remember_session_v1";
const BACKUP_META_KEY = "trahis_backup_meta_v1";
const CATS = ["main","emergency","personal","other"];
const CAT_LABEL = {main:"Main Savings",emergency:"Emergency",personal:"Personal",other:"Other"};
const THEME_COLORS = {
  indigo:{label:"Indigo",primary:"#4f46e5",primary2:"#2563eb",soft:"#eef2ff"},
  blue:{label:"Blue",primary:"#2563eb",primary2:"#0ea5e9",soft:"#eaf4ff"},
  green:{label:"Green",primary:"#059669",primary2:"#16a34a",soft:"#ecfdf5"},
  purple:{label:"Purple",primary:"#7c3aed",primary2:"#a855f7",soft:"#f3e8ff"},
  rose:{label:"Rose",primary:"#e11d48",primary2:"#f43f5e",soft:"#fff1f2"},
  orange:{label:"Orange",primary:"#ea580c",primary2:"#f59e0b",soft:"#fff7ed"}
};
let state = loadState();
const ROUTES = {dashboard:"index.html",add:"add.html",transfer:"transfer.html",history:"history.html",profile:"profile.html",savings:"savings.html",tutorial:"tutorial.html",settings:"settings.html",backup:"backup.html",admin:"admin.html"};
function routeFromLocation(){
  const file=(location.pathname.split("/").pop()||"index.html").toLowerCase();
  const found=Object.keys(ROUTES).find(k=>ROUTES[k].toLowerCase()===file);
  return found || (document.body.dataset.page && Object.prototype.hasOwnProperty.call(ROUTES,document.body.dataset.page)?document.body.dataset.page:"dashboard");
}
let currentRoute = routeFromLocation();
let editingId = null;
let historyPage = 1;
const HISTORY_PER_PAGE = 10;
let chartRange = "weekly";

function defaultPreferences(){
  return {theme:"light",themeColor:"indigo",density:"comfortable",visualStyle:"classic"};
}
function normalizePreferences(pref){
  const p=pref&&typeof pref==="object"?pref:{};
  return {
    theme:p.theme==="dark"?"dark":"light",
    themeColor:THEME_COLORS[p.themeColor]?p.themeColor:"indigo",
    density:p.density==="compact"?"compact":"comfortable",
    visualStyle:["classic","glass","neumorphism","aurora","liquid-glass"].includes(p.visualStyle)?p.visualStyle:"classic"
  };
}
function themedLogoSvg(){
  const c=THEME_COLORS[normalizePreferences(profile()?.preferences||defaultPreferences()).themeColor]||THEME_COLORS.indigo;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" aria-hidden="true"><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c.primary}"/><stop offset="1" stop-color="${c.primary2}"/></linearGradient></defs><rect width="128" height="128" rx="32" fill="url(#tg)"/><rect x="30" y="36" width="68" height="56" rx="10" fill="none" stroke="white" stroke-width="7"/><path d="M39 36v-7h50l9 7" fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="62" r="4" fill="white"/></svg>`;
}
function refreshThemeLogos(){
  const p=normalizePreferences(profile()?.preferences||defaultPreferences());
  const c=THEME_COLORS[p.themeColor]||THEME_COLORS.indigo;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c.primary}"/><stop offset="1" stop-color="${c.primary2}"/></linearGradient></defs><rect width="128" height="128" rx="32" fill="url(#tg)"/><rect x="30" y="36" width="68" height="56" rx="10" fill="none" stroke="white" stroke-width="7"/><path d="M39 36v-7h50l9 7" fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="62" r="4" fill="white"/></svg>`;
  const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  $('.brand img,.drawer-brand img,.login-logo').attr('src',src);
}
function applyPreferences(pref){
  const p=normalizePreferences(pref);
  const root=document.documentElement;
  root.dataset.theme=p.theme;
  root.dataset.themeColor=p.themeColor;
  root.dataset.visualStyle=p.visualStyle;
  document.body.classList.toggle("density-compact",p.density==="compact");
  document.body.classList.toggle("theme-glass",p.visualStyle==="glass");
  document.body.classList.toggle("theme-neumorphism",p.visualStyle==="neumorphism");
  document.body.classList.toggle("theme-aurora",p.visualStyle==="aurora");
  document.body.classList.toggle("theme-liquid-glass",p.visualStyle==="liquid-glass");
  document.body.classList.toggle("theme-dark",p.theme==="dark");
  const c=THEME_COLORS[p.themeColor]||THEME_COLORS.indigo;
  root.style.setProperty("--primary",c.primary);
  root.style.setProperty("--primary2",c.primary2);
  root.style.setProperty("--primary-soft",c.soft);
  root.style.setProperty("--theme-primary",c.primary);
  root.style.setProperty("--theme-primary2",c.primary2);
  root.style.setProperty("--theme-soft",c.soft);
  root.style.setProperty("--bg",p.theme==="dark"?"#0b1220":"#f4f7fb");
  root.style.setProperty("--card",p.theme==="dark"?"#111827":"#ffffff");
  root.style.setProperty("--line",p.theme==="dark"?"#263247":"#e5eaf2");
  root.style.setProperty("--ink",p.theme==="dark"?"#e5e7eb":"#172033");
  root.style.setProperty("--muted",p.theme==="dark"?"#94a3b8":"#64748b");
  root.style.setProperty("--border",p.theme==="dark"?"#263247":"#e5eaf2");
  root.style.setProperty("--text",p.theme==="dark"?"#e5e7eb":"#172033");
  root.style.setProperty("--surface",p.theme==="dark"?"#0f172a":"#f8fafc");
  root.style.setProperty("--surface-soft",p.theme==="dark"?"#172033":"#f8fafc");
  root.style.setProperty("--card-bg",p.theme==="dark"?"#111827":"#ffffff");
  root.style.setProperty("--glass-tint",p.theme==="dark"?"rgba(15,23,42,.58)":"rgba(255,255,255,.58)");
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",p.theme==="dark"?"#0f172a":c.primary);
  const btn=$("#themeToggle");
  if(btn.length){
    const dark=p.theme==="dark";
    btn.attr("aria-label",dark?"Switch to light mode":"Switch to dark mode");
    btn.attr("title",dark?"Switch to light mode":"Switch to dark mode");
    btn.html(`<i class="bi ${dark?"bi-sun-fill":"bi-moon-stars-fill"}"></i><span class="theme-toggle-label">${dark?"Light":"Dark"}</span>`);
  }
  refreshThemeLogos();
}

function userPreferences(){return normalizePreferences(profile()?.preferences||defaultPreferences())}
function blankSavings(){
  return {enabled:false,percent:20,total:0,monthlyBudget:0,categories:{main:0,emergency:0,personal:0,other:0}};
}
function normalizeSavings(s){
  const x = s && typeof s === "object" ? s : blankSavings();
  x.categories = x.categories && typeof x.categories === "object" ? x.categories : {};
  CATS.forEach(k=>x.categories[k]=Math.max(0,Number(x.categories[k])||0));
  // Legacy builds sometimes stored total separately from categories.
  let catTotal=CATS.reduce((sum,k)=>sum+x.categories[k],0);
  const legacyTotal=Math.max(0,Number(x.total)||0);
  if(catTotal===0 && legacyTotal>0) x.categories.main=legacyTotal;
  catTotal=CATS.reduce((sum,k)=>sum+x.categories[k],0);
  x.total=catTotal;
  x.percent=Math.max(0,Math.min(100,Number(x.percent) || 0));
  x.monthlyBudget=Math.max(0,Number(x.monthlyBudget)||0);
  x.enabled=x.total>0;
  return x;
}
function defaultState(){
  return {
    users:[{id:"master",name:MASTER.name,username:MASTER.username,password:MASTER.password,role:"admin",approved:true,createdAt:new Date().toISOString()}],
    session:null,
    transactions:[],
    profiles:{master:{name:MASTER.name,username:MASTER.username,cash:0,bank:0,upi:0,savings:blankSavings(),preferences:defaultPreferences()}}
  };
}
function normalizeTransaction(t, validIds){
  if(!t || typeof t!=="object") return null;
  if(typeof t.id!=="string" || !t.id || !validIds.has(t.userId)) return null;
  if(!["income","expense","transfer"].includes(t.kind)) return null;
  const amount=Number(t.amount);
  const date=new Date(t.date);
  if(!(amount>0) || !Number.isFinite(amount) || Number.isNaN(date.getTime())) return null;
  const out={...t,amount,note:String(t.note||"").slice(0,120),date:date.toISOString()};
  if(t.kind==="transfer") {
    if(!["cash","bank"].includes(t.from)||!["cash","bank"].includes(t.to)||t.from===t.to) return null;
    out.method="transfer";
  } else {
    out.method=["cash","bank","upi"].includes(t.method)?t.method:"bank";
  }
  return out;
}
function normalizeProfile(p,u){
  const x=p&&typeof p==="object"?p:{};
  x.name=String(x.name||u?.name||u?.username||"").slice(0,80);
  x.username=String(x.username||u?.username||"").slice(0,40);
  x.cash=Math.max(0,Number(x.cash)||0);
  x.bank=Math.max(0,Number(x.bank)||0);
  x.upi=x.bank;
  x.savings=normalizeSavings(x.savings);
  x.preferences=normalizePreferences(x.preferences);
  return x;
}
function loadState(){
  let s;
  try{s=JSON.parse(localStorage.getItem(DB_KEY)||localStorage.getItem(LEGACY_DB_KEY)||"null");}catch(e){s=null;}
  if(!s || !Array.isArray(s.users) || !Array.isArray(s.transactions) || !s.profiles || typeof s.profiles!=="object") s=defaultState();
  s.users=s.users.filter(u=>u&&typeof u==="object"&&typeof u.id==="string"&&typeof u.username==="string"&&typeof u.password==="string");
  s.users.forEach(u=>{u.name=String(u.name||u.username).slice(0,80);u.username=String(u.username).trim().slice(0,40);u.password=String(u.password);u.role=u.role==="admin"?"admin":"user";u.approved=Boolean(u.approved)});
  if(!s.users.some(u=>u.username===MASTER.username)){
    s.users.unshift({id:"master",name:MASTER.name,username:MASTER.username,password:MASTER.password,role:"admin",approved:true,createdAt:new Date().toISOString()});
  }
  const master=s.users.find(u=>u.username===MASTER.username)||s.users.find(u=>u.id==="master");
  if(master){master.id="master";master.name=MASTER.name;master.username=MASTER.username;master.password=MASTER.password;master.role="admin";master.approved=true;}
  s.profiles=s.profiles&&typeof s.profiles==="object"?s.profiles:{};
  const validIds=new Set(s.users.map(u=>u.id));
  s.transactions=s.transactions.map(t=>normalizeTransaction(t,validIds)).filter(Boolean);
  s.users.forEach(u=>{s.profiles[u.id]=normalizeProfile(s.profiles[u.id],u)});
  Object.keys(s.profiles).forEach(id=>{if(!validIds.has(id))delete s.profiles[id]});
  // Session is intentionally NOT persisted in localStorage.
  s.session=null;
  return s;
}

function save(){
  try{
    const copy=JSON.parse(JSON.stringify(state));
    copy.session=null;
    localStorage.setItem(DB_KEY,JSON.stringify(copy));
  }catch(e){showToast("Could not save local data. Storage may be full.","danger");}
}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function user(){return state.session?state.users.find(u=>u.id===state.session):null}
function profile(){
  const u=user(); if(!u)return null;
  if(!state.profiles[u.id]) state.profiles[u.id]={name:u.name,username:u.username,cash:0,bank:0,upi:0,savings:blankSavings(),preferences:defaultPreferences()};
  const p=normalizeProfile(state.profiles[u.id],u);
  state.profiles[u.id]=p;
  return p;
}
function localDateKey(value){
  const d=value instanceof Date?value:new Date(value);
  if(Number.isNaN(d.getTime()))return "";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function localMonthKey(value){return localDateKey(value).slice(0,7)}
function txs(){return state.transactions.filter(t=>t.userId===state.session).sort((a,b)=>new Date(b.date)-new Date(a.date))}
function totalBalance(){const p=profile();return (p?.cash||0)+(p?.bank||0)}
function savingsTotal(){const p=profile();return p?.savings?CATS.reduce((sum,k)=>sum+(Number(p.savings.categories[k])||0),0):0}
function availableBalance(){return Math.max(0,totalBalance()-savingsTotal())}
function showToast(msg,type="primary"){
  const icon=type==="danger"?"bi-exclamation-triangle":"bi-check-circle";
  $("#toastBox").html(`<div class="toast show toast-${esc(type)} border-0 shadow-sm" role="alert"><div class="toast-body"><i class="bi ${icon} me-2"></i>${esc(msg)}</div></div>`);
  setTimeout(()=>$("#toastBox").empty(),2800);
}

/* ===== TraHis custom action dialog =====
   One reusable dialog UI replaces native browser confirmation prompts.
   The content, icon and action labels are supplied by the caller while
   the component styling remains identical across the entire application.
*/
let activeDialogResolve=null;
let activeDialogKeyHandler=null;
function closeAppDialog(result=false){
  const root=document.getElementById("appDialogRoot");
  if(!root)return;
  if(activeDialogKeyHandler){document.removeEventListener("keydown",activeDialogKeyHandler);activeDialogKeyHandler=null;}
  const resolve=activeDialogResolve;activeDialogResolve=null;
  root.classList.remove("open");
  document.body.classList.remove("dialog-open");
  setTimeout(()=>{if(!root.classList.contains("open"))root.innerHTML=""},180);
  if(resolve)resolve(Boolean(result));
}
function showConfirmDialog({title="Confirm action",message="Are you sure?",confirmText="Confirm",cancelText="Cancel",icon="bi-question-circle",danger=false}={}){
  if(activeDialogResolve)closeAppDialog(false);
  let root=document.getElementById("appDialogRoot");
  if(!root){
    root=document.createElement("div");
    root.id="appDialogRoot";
    document.body.appendChild(root);
  }
  const confirmClass=danger?"app-dialog-confirm danger":"app-dialog-confirm";
  root.innerHTML=`<div class="app-dialog-backdrop" data-dialog-cancel></div><section class="app-dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="appDialogTitle" aria-describedby="appDialogMessage"><div class="app-dialog-icon ${danger?"danger":""}"><i class="bi ${esc(icon)}"></i></div><div class="app-dialog-content"><h2 id="appDialogTitle">${esc(title)}</h2><p id="appDialogMessage">${esc(message)}</p></div><div class="app-dialog-actions"><button type="button" class="app-dialog-btn app-dialog-cancel" data-dialog-cancel>${esc(cancelText)}</button><button type="button" class="app-dialog-btn ${confirmClass}" data-dialog-confirm>${esc(confirmText)}</button></div></section>`;
  root.classList.add("open");
  document.body.classList.add("dialog-open");
  const confirmBtn=root.querySelector("[data-dialog-confirm]");
  const cancelBtn=root.querySelector("[data-dialog-cancel]:not(.app-dialog-backdrop)");
  confirmBtn?.focus();
  root.querySelector("[data-dialog-confirm]")?.addEventListener("click",()=>closeAppDialog(true),{once:true});
  cancelBtn?.addEventListener("click",()=>closeAppDialog(false),{once:true});
  root.querySelector(".app-dialog-backdrop")?.addEventListener("click",()=>closeAppDialog(false),{once:true});
  activeDialogKeyHandler=e=>{if(e.key==="Escape"){e.preventDefault();closeAppDialog(false)}else if(e.key==="Tab"){const focusables=[...root.querySelectorAll("button:not([disabled])")];if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
  document.addEventListener("keydown",activeDialogKeyHandler);
  return new Promise(resolve=>{activeDialogResolve=resolve});
}

/* ===== TraHis Local AI Assistant =====
   Offline rule-based finance assistant. No API/network call.
*/
function aiFormatNumber(n){return money(Math.round((Number(n)||0)*100)/100)}
function aiMonthName(d){return d.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
function aiTxList(){return txs().filter(t=>t.kind==="income"||t.kind==="expense")}
function aiSum(list,kind){return list.filter(t=>!kind||t.kind===kind).reduce((s,t)=>s+Number(t.amount||0),0)}
function aiStartOfWeek(d){
  const x=new Date(d); x.setHours(0,0,0,0);
  const day=x.getDay(); x.setDate(x.getDate()-(day===0?6:day-1)); return x;
}
function aiDateRange(type){
  const now=new Date(); now.setHours(23,59,59,999);
  let start=new Date(now); start.setHours(0,0,0,0);
  if(type==="today"){}
  else if(type==="week") start=aiStartOfWeek(now);
  else if(type==="month") start=new Date(now.getFullYear(),now.getMonth(),1);
  else if(type==="lastmonth"){start=new Date(now.getFullYear(),now.getMonth()-1,1);const end=new Date(now.getFullYear(),now.getMonth(),0);return [start,end]}
  return [start,now];
}
function aiPeriodStats(type){
  const [start,end]=aiDateRange(type);
  const list=aiTxList().filter(t=>{const d=new Date(t.date);return d>=start&&d<=end});
  return {list,start,end,income:aiSum(list,"income"),expense:aiSum(list,"expense")};
}
function aiLatest(n=5){
  return aiTxList().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,n);
}
function aiMoneyChange(a,b){
  if(!b)return a>0?"new":"no change";
  const pct=((a-b)/b)*100;
  return `${pct>=0?"+":""}${pct.toFixed(1)}%`;
}
function aiHelp(){
  return `I can answer questions about your TraHis data.\n\nTry:\n• “My balance?”\n• “This month expense”\n• “Last month vs this month”\n• “This week income”\n• “My savings”\n• “Recent transactions”\n• “Highest expense”\n• “If I spend ₹5000, what remains?”`;
}
function aiAnswer(raw){
  const q=String(raw||"").trim();
  if(!q)return "Ask me something about your finances.";
  const l=q.toLowerCase().replace(/\s+/g," ");
  const p=profile(), list=aiTxList(), total=totalBalance(), saved=savingsTotal(), available=availableBalance();

  if(/\b(hi|hello|hey|kem cho|kem chho|hii|namaste)\b/.test(l)){
    return `Hi ${p?.name||"there"} 👋\nI’m TraHis Assistant. Ask me about your balance, expenses, income, savings or transactions.`;
  }
  if(/\b(help|what can you do|shu kari|su kari|help me)\b/.test(l)) return aiHelp();

  if(/\b(balance|available|paisa|paise|કેટલા પૈસા|બેલેન્સ)\b/.test(l) && !/\b(expense|kharch|income|aavak)\b/.test(l)){
    return `Your current balance is ${aiFormatNumber(total)}.\n\nAvailable after protected savings: ${aiFormatNumber(available)}\nProtected savings: ${aiFormatNumber(saved)}\nCash: ${aiFormatNumber(p?.cash||0)}\nBank: ${aiFormatNumber(p?.bank||0)}`;
  }

  /* Savings what-if calculator: understand questions like
     "hu 100 saving karu dar month 1 year pachi total ketlu thayu?"
     This is a projection, so do not confuse it with the user's current protected savings.
  */
  const saveWhatIf = l.match(/(?:save|saving|savings|bachat|બચત)[^\d₹]{0,25}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*month|each\s*month|every\s*month|monthly|dar\s*month|દર\s*month|મહિને)/i)
    || l.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*month|each\s*month|every\s*month|monthly|dar\s*month|દર\s*month|મહિને)[^\d]{0,20}(?:save|saving|savings|bachat|બચત)/i);
  if(saveWhatIf){
    const monthly=Number(saveWhatIf[1].replace(/,/g,""));
    let months=null;
    const yearMatch=l.match(/(\d+(?:\.\d+)?)\s*(?:year|years|yr|yrs|વર્ષ)/i);
    const monthMatch=l.match(/(\d+)\s*(?:month|months|મહિના|મહિને)/i);
    if(yearMatch) months=Math.round(Number(yearMatch[1])*12);
    else if(monthMatch) months=Number(monthMatch[1]);
    if(months && monthly>0){
      const projected=monthly*months;
      const years=months/12;
      return `Savings projection\n\nMonthly saving: ${aiFormatNumber(monthly)}\nDuration: ${months} month${months===1?"":"s"}${years>=1?` (${Number.isInteger(years)?years:years.toFixed(1)} year${years===1?"":"s"})`:""}\n\nTotal after ${months} months: ${aiFormatNumber(projected)}\n\nFormula: ${aiFormatNumber(monthly)} × ${months} = ${aiFormatNumber(projected)}\n\nThis is a projection only. It does not change your current TraHis savings balance.`;
    }
  }

  if(/\b(saving|savings|bachat|બચત)\b/.test(l)){
    const s=p?.savings||{};
    return `Protected savings: ${aiFormatNumber(saved)}\n\nMain Savings: ${aiFormatNumber(s.categories?.main||0)}\nEmergency: ${aiFormatNumber(s.categories?.emergency||0)}\nPersonal: ${aiFormatNumber(s.categories?.personal||0)}\nOther: ${aiFormatNumber(s.categories?.other||0)}\n\nSavings percentage: ${Number(s.percent||0)}%`;
  }

  if(/\b(recent|latest|last)\b/.test(l) && /\b(transaction|tx|record)\b/.test(l) || /\b(recent transactions|latest transactions)\b/.test(l)){
    const recent=aiLatest(5);
    if(!recent.length)return "There are no income, expense or transfer records yet.";
    return "Recent transactions:\n"+recent.map((t,i)=>{
      const d=new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
      const sign=t.kind==="income"?"+":t.kind==="expense"?"-":"↔";
      return `${i+1}. ${d} • ${sign}${aiFormatNumber(t.amount)} • ${t.note||t.kind}`;
    }).join("\n");
  }

  if(/\b(highest|largest|biggest|max|most)\b/.test(l) && /\b(expense|kharch|ખર્ચ)\b/.test(l)){
    const ex=list.filter(t=>t.kind==="expense").sort((a,b)=>b.amount-a.amount)[0];
    if(!ex)return "No expense transactions found.";
    return `Your highest recorded expense is ${aiFormatNumber(ex.amount)}.\n\n${ex.note||"No note"}\n${new Date(ex.date).toLocaleDateString("en-IN",{dateStyle:"medium"})}`;
  }

  if(/\b(last month|previous month|ગયા મહિને|પાછલા મહિને)\b/.test(l) && /\b(compare|vs|versus|difference|compare karo|સરખામણી)\b/.test(l)){
    const cur=aiPeriodStats("month"), prev=aiPeriodStats("lastmonth");
    return `Month comparison\n\n${aiMonthName(cur.start)}\nIncome: ${aiFormatNumber(cur.income)}\nExpense: ${aiFormatNumber(cur.expense)}\n\nPrevious month\nIncome: ${aiFormatNumber(prev.income)}\nExpense: ${aiFormatNumber(prev.expense)}\n\nExpense change: ${aiMoneyChange(cur.expense,prev.expense)}\nIncome change: ${aiMoneyChange(cur.income,prev.income)}`;
  }

  let period="month";
  if(/\b(today|aaje|આજે)\b/.test(l))period="today";
  else if(/\b(this week|aa week|aaje week|આ અઠવાડિયે|આ અઠવાડિયું)\b/.test(l))period="week";
  else if(/\b(last month|previous month|ગયા મહિને|પાછલા મહિને)\b/.test(l))period="lastmonth";
  const st=aiPeriodStats(period);

  if(/\b(expense|expenses|kharch|ખર્ચ)\b/.test(l)){
    const label=period==="today"?"Today":period==="week"?"This week":period==="lastmonth"?"Last month":`This month (${aiMonthName(st.start)})`;
    return `${label} expense: ${aiFormatNumber(st.expense)}\nTransactions: ${st.list.filter(t=>t.kind==="expense").length}`;
  }
  if(/\b(income|earn|earning|aavak|આવક)\b/.test(l)){
    const label=period==="today"?"Today":period==="week"?"This week":period==="lastmonth"?"Last month":`This month (${aiMonthName(st.start)})`;
    return `${label} income: ${aiFormatNumber(st.income)}\nTransactions: ${st.list.filter(t=>t.kind==="income").length}`;
  }

  const spendMatch=l.match(/(?:spend|kharch|ખર્ચ).{0,30}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);
  if(spendMatch){
    const amt=Number(spendMatch[1].replace(/,/g,""));
    if(amt>0)return `If you spend ${aiFormatNumber(amt)}, your available balance would be about ${aiFormatNumber(available-amt)}.\n\n${available>=amt?"This is within your currently available balance.":"This would exceed your currently available balance."}`;
  }

  if(/\b(summary|overview|report|સારાંશ)\b/.test(l)){
    const cur=aiPeriodStats("month");
    return `TraHis summary\n\nTotal balance: ${aiFormatNumber(total)}\nAvailable balance: ${aiFormatNumber(available)}\nProtected savings: ${aiFormatNumber(saved)}\n\nThis month income: ${aiFormatNumber(cur.income)}\nThis month expense: ${aiFormatNumber(cur.expense)}\nNet this month: ${aiFormatNumber(cur.income-cur.expense)}`;
  }

  if(/\b(transfer|transferred)\b/.test(l)){
    const transfers=txs().filter(t=>t.kind==="transfer");
    const totalTransfer=aiSum(transfers);
    return `You have ${transfers.length} transfer record(s), totaling ${aiFormatNumber(totalTransfer)}.\nTransfers are not counted as income or expense in TraHis.`;
  }

  return `I can calculate that from your local TraHis data, but I didn't understand the question.\n\nTry “this month expense”, “my balance”, “my savings”, “recent transactions”, or “last month vs this month”.`;
}
function aiAppendMessage(text,who="bot"){
  const box=$("#aiMessages"); if(!box.length)return;
  const safe=esc(text);
  box.append(`<div class="ai-msg ${who==="user"?"user":""}"><div class="ai-bubble">${safe}</div></div>`);
  box.scrollTop(box[0].scrollHeight);
}
function aiOpen(){
  if(!$("#aiChatOverlay").length) return;
  $("#aiChatOverlay").addClass("open").attr("aria-hidden","false");
  setTimeout(()=>$("#aiInput").trigger("focus"),80);
}
function aiClose(){$("#aiChatOverlay").removeClass("open").attr("aria-hidden","true")}
function aiSend(text){
  const q=String(text||$("#aiInput").val()||"").trim(); if(!q)return;
  aiAppendMessage(q,"user");$("#aiInput").val("");
  setTimeout(()=>aiAppendMessage(aiAnswer(q),"bot"),120);
}
function aiMount(){
  if($("#aiFab").length)return;
  $("body").append(`
    <button id="aiFab" class="ai-fab" aria-label="Open TraHis Assistant" title="Ask TraHis"><i class="bi bi-stars"></i><span class="ai-dot"></span></button>
    <div id="aiChatOverlay" class="ai-chat-overlay" aria-hidden="true">
      <section class="ai-chat" role="dialog" aria-modal="true" aria-label="TraHis Assistant">
        <header class="ai-head">
          <div class="ai-avatar"><i class="bi bi-stars"></i></div>
          <div><div class="ai-head-title">TraHis Assistant</div><div class="ai-head-sub">Local finance assistant • Offline</div></div>
          <button class="ai-close" id="aiClose" aria-label="Close"><i class="bi bi-x-lg"></i></button>
        </header>
        <div class="ai-quickbar" aria-label="Quick questions">
          <div class="ai-quick-label"><i class="bi bi-lightning-charge-fill"></i><span>Quick ask</span></div>
          <div class="ai-quick">
            <button data-ai-q="My balance?">Balance</button>
            <button data-ai-q="This month expense">This month</button>
            <button data-ai-q="My savings">Savings</button>
            <button data-ai-q="Recent transactions">Recent</button>
            <button data-ai-q="Last month vs this month">Compare</button>
          </div>
        </div>
        <div id="aiMessages" class="ai-body">
          <div class="ai-welcome"><strong>Ask me anything about your TraHis data.</strong><br>Calculations are done locally on this device.</div>
        </div>
        <form id="aiForm" class="ai-compose">
          <input id="aiInput" autocomplete="off" placeholder="Ask about your finances…">
          <button class="ai-send" type="submit" aria-label="Send"><i class="bi bi-send-fill"></i></button>
        </form>
      </section>
    </div>`);
  $("#aiFab").on("click",aiOpen);$("#aiClose").on("click",aiClose);
  $("#aiChatOverlay").on("click",function(e){if(e.target===this)aiClose()});
  $("#aiForm").on("submit",function(e){e.preventDefault();aiSend()});
  $(document).on("click","[data-ai-q]",function(){aiOpen();aiSend($(this).data("ai-q"))});
  $(document).on("keydown",function(e){if(e.key==="Escape"&&$("#aiChatOverlay").hasClass("open"))aiClose()});
}

function initPWA(){
  if(location.protocol==="http:"||location.protocol==="https:"){
    const m=document.getElementById("pwaManifest");if(m)m.href="manifest.json";
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("sw.js").then(reg=>{
        if(reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"});
        reg.addEventListener("updatefound",()=>{
          const worker=reg.installing;
          if(worker) worker.addEventListener("statechange",()=>{
            if(worker.state==="installed" && navigator.serviceWorker.controller) worker.postMessage({type:"SKIP_WAITING"});
          });
        });
      }).catch(()=>{});
      navigator.serviceWorker.addEventListener("controllerchange",()=>{});
    }
  }
}
function renderAuth(){
  $("#appHeader,#bottomNav").hide();
  $("#main").removeClass("main-shell").html(`<div class="login-page"><div class="login-card"><img src="assets/icon.svg" class="login-logo" alt="TraHis"><h1>TraHis</h1><div class="lead">Your private personal finance tracker</div><div class="auth-tabs"><button class="active" data-auth="login">Login</button><button data-auth="register">Register</button></div><div id="authBody"></div></div></div>`);
  renderLogin();
}
function renderLogin(){
  const remembered=localStorage.getItem(REMEMBER_KEY)||"";
  $("#authBody").html(`<form id="loginForm" autocomplete="off" novalidate><div class="mb-3"><label class="form-label">Username</label><input id="loginUser" name="login_username" class="form-control" value="${esc(remembered)}" autocomplete="username" autocapitalize="none" spellcheck="false" required></div><div class="mb-3"><label class="form-label">Password</label><div class="password-field"><input id="loginPass" name="login_password" type="password" class="form-control" value="" autocomplete="current-password" required><button type="button" class="password-toggle" id="toggleLoginPassword" aria-label="Show password" aria-pressed="false"><i class="bi bi-eye"></i></button></div></div><div class="form-check mb-3"><input id="remember" class="form-check-input" type="checkbox" ${remembered?"checked":""}><label class="form-check-label">Remember Me</label></div><button class="btn btn-primary w-100 py-3">Login</button><div id="authMsg" class="mt-3"></div></form>`);
}
function renderRegister(){
  $("#authBody").html(`<form id="registerForm" autocomplete="off" novalidate><div class="mb-3"><label class="form-label">Full name</label><input id="regName" class="form-control" maxlength="80" required></div><div class="mb-3"><label class="form-label">Username</label><input id="regUser" class="form-control" maxlength="40" required></div><div class="mb-3"><label class="form-label">Password</label><input id="regPass" type="password" class="form-control" minlength="4" required></div><div class="mb-3"><label class="form-label">Confirm password</label><input id="regPass2" type="password" class="form-control" minlength="4" required></div><button class="btn btn-primary w-100 py-3">Create account</button><div class="alertx mt-3 info-box">Your account must be approved by the master admin before login.</div><div id="authMsg" class="mt-3"></div></form>`);
}
function shell(){
  $("#appHeader,#bottomNav").show();$("#main").addClass("main-shell");
  applyPreferences(userPreferences());
  const u=user(),p=profile();
  $("#headerUser").text(u?.username||"");
  $("#drawerUser").html(`<strong>${esc(p?.name||u?.name||"")}</strong><div class="small text-muted">@${esc(u?.username||"")}</div>`);
  $("#adminNav").toggle(u?.role==="admin");
  updateNav();
  aiMount();
}
function updateNav(){
  $("#bottomNav a").removeClass("active");
  $(`#bottomNav a[href="${pageFor(currentRoute)}"]`).addClass("active");
}
function pageFor(route){return ROUTES[route]||ROUTES.dashboard}
function go(route,extra=""){
  const target=Object.prototype.hasOwnProperty.call(ROUTES,route)?route:"dashboard";
  if(!state.session){window.location.assign(ROUTES.dashboard);return}
  closeDrawer();
  currentRoute=target;
  const suffix=extra||"";
  window.location.assign(ROUTES[target]+suffix);
}
function bindInternalNavigation(){
  $(document).on("click","a[href]",function(e){
    const raw=this.getAttribute("href")||"";
    if(!raw || raw.startsWith("#") || /^(https?:|mailto:|tel:|javascript:)/i.test(raw)) return;
    let url;
    try{url=new URL(raw,window.location.href)}catch(_){return}
    if(url.origin!==window.location.origin)return;
    const file=url.pathname.split("/").pop().toLowerCase();
    const route=Object.keys(ROUTES).find(k=>ROUTES[k].toLowerCase()===file);
    if(!route)return;
    e.preventDefault();
    go(route,(url.search||"")+(url.hash||""));
  });
}
function renderDashboard(){
  const p=profile(),list=txs();
  const totalInc=list.filter(t=>t.kind==="income").reduce((a,t)=>a+t.amount,0),totalExp=list.filter(t=>t.kind==="expense").reduce((a,t)=>a+t.amount,0);
  const month=localMonthKey(new Date()),monthExp=list.filter(t=>t.kind==="expense"&&localMonthKey(t.date)===month).reduce((a,t)=>a+t.amount,0);
  const s=p.savings,budget=Number(s.monthlyBudget||0),remaining=budget?Math.max(0,budget-monthExp):0,st=savingsTotal(),avail=availableBalance(),total=totalBalance();
  const recent=list.slice(0,3);
  const chartTitle=chartRange==="daily"?"Daily income & expense activity":chartRange==="monthly"?"Monthly income & expense activity":"Weekly income & expense activity";
  $("#main").html(`<div class="page-head"><div><h1 class="page-title">Dashboard</h1><div class="page-subtitle">Your money, clearly tracked.</div></div><a class="btn-soft" href="add.html"><i class="bi bi-plus-lg"></i> Add</a></div><div class="hero mb-3"><div class="small opacity-75">Available to spend</div><div class="hero-amount">${money(avail)}</div><div class="mt-2 small opacity-75">Total ${money(total)} <span class="dot-sep">•</span> Savings locked ${money(st)}</div></div><div class="row g-3"><div class="col-6"><div class="cardx stat-card"><div class="stat-icon stat-blue"><i class="bi bi-wallet2"></i></div><div class="stat-label">Total Income</div><div class="stat-value">${money(totalInc)}</div></div></div><div class="col-6"><div class="cardx stat-card"><div class="stat-icon stat-green"><i class="bi bi-graph-up-arrow"></i></div><div class="stat-label">Total Expense</div><div class="stat-value">${money(totalExp)}</div></div></div><div class="col-6"><div class="cardx stat-card"><div class="stat-icon stat-red"><i class="bi bi-receipt"></i></div><div class="stat-label">This Month</div><div class="stat-value">${money(monthExp)}</div></div></div><div class="col-6"><div class="cardx stat-card"><div class="stat-icon stat-yellow"><i class="bi bi-list-check"></i></div><div class="stat-label">Transactions</div><div class="stat-value">${list.length}</div></div></div></div><div class="section-title">Balances</div><div class="cardx overflow-hidden">${balanceRow("bi-cash-stack","Cash",p.cash,"stat-green","Cash in hand")}${balanceRow("bi-bank","Bank",p.bank,"stat-blue","Bank account")}${balanceRow("bi-phone","UPI",p.bank,"stat-purple","Linked to Bank")}</div><div class="section-title d-flex justify-content-between align-items-center"><span>Recent transactions</span><a class="small fw-bold text-decoration-none" href="history.html">View all</a></div><div class="cardx overflow-hidden">${recent.map(txHtml).join("")||`<div class="empty"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No transactions yet.</div>`}</div><div class="section-title chart-section-title"><span>Income &amp; Expense activity</span><div class="chart-switcher" role="group" aria-label="Expense chart range"><button type="button" class="chart-range ${chartRange==="daily"?"active":""}" data-range="daily">Daily</button><button type="button" class="chart-range ${chartRange==="weekly"?"active":""}" data-range="weekly">Weekly</button><button type="button" class="chart-range ${chartRange==="monthly"?"active":""}" data-range="monthly">Monthly</button></div></div><div class="cardx chart-box"><div class="chart-caption"><strong id="chartTitle">${chartTitle}</strong><div class="chart-caption-right"><span id="chartYearInfo">Year: —</span><span id="chartHint"></span></div></div><div class="chart-scroll"><canvas id="miniChart" aria-label="Expense activity chart"></canvas></div></div>`);
  drawChart($("#miniChart")[0],list,chartRange);
}
function balanceRow(icon,name,value,theme,note){return `<div class="balance-row border-bottom"><div class="balance-left"><div class="balance-icon ${theme}"><i class="bi ${icon}"></i></div><div><div class="balance-name">${name}</div><div class="balance-note">${note}</div></div></div><div class="balance-value">${money(value)}</div></div>`}
function txMeta(t){
  if(t.kind==="transfer")return `${esc(t.from||"")} → ${esc(t.to||"")} • ${new Date(t.date).toLocaleString()}`;
  const method=t.method==="upi"?"UPI":(t.method||"bank").toUpperCase();
  return `${method} • ${new Date(t.date).toLocaleString()}`;
}
function txHtml(t){
  const income=t.kind==="income",transfer=t.kind==="transfer";
  return `<div class="tx-item border-bottom"><div class="tx-left"><div class="tx-icon ${transfer?"transfer-bg":income?"income-bg":"expense-bg"}"><i class="bi ${transfer?"bi-arrow-left-right":income?"bi-arrow-down-left":"bi-arrow-up-right"}"></i></div><div class="tx-copy"><div class="tx-title">${esc(t.note||"Transaction")}</div><div class="tx-meta">${txMeta(t)}</div></div></div><div class="tx-amount ${income?"income":transfer?"transfer":"expense"}">${income?"+":transfer?"↔":"-"}${money(t.amount)}</div></div>`
}
function renderAdd(){
  if(!editingId){const q=new URLSearchParams(location.search).get("edit");if(q)editingId=q;}
  const t=editingId?txs().find(x=>x.id===editingId):null;
  if(editingId&&!t)editingId=null;
  $("#main").html(`<div class="mb-3"><h1 class="page-title">${t?"Edit transaction":"Add transaction"}</h1><div class="page-subtitle">${t?"Update the selected record.":"Income adds money; expense removes it."}</div></div><div class="cardx form-card"><form id="txForm" autocomplete="off"><div class="row g-3"><div class="col-12 col-md-6"><label class="form-label">Type</label><select id="txKind" class="form-select"><option value="income">Income</option><option value="expense">Expense</option></select></div><div class="col-12 col-md-6"><label class="form-label">Payment method</label><select id="txMethod" class="form-select"><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI (from Bank)</option></select></div><div class="col-12 col-md-6"><label class="form-label">Amount</label><input id="txAmount" type="number" min="0.01" step="0.01" inputmode="decimal" class="form-control" required></div><div class="col-12 col-md-6"><label class="form-label">Date & time</label><input id="txDate" type="datetime-local" class="form-control" required></div><div class="col-12"><label class="form-label">Note / Description</label><input id="txNote" class="form-control" maxlength="120" placeholder="e.g. Salary, grocery, rent" required></div><div class="col-12"><div id="txHelp" class="alertx info-box"></div></div><div class="col-12 d-flex flex-wrap gap-2"><button class="btn btn-primary">${t?"Update":"Save"} transaction</button>${t?'<button type="button" id="cancelEdit" class="btn btn-light">Cancel</button>':""}</div></div></form></div>`);
  const now=t?new Date(t.date):new Date();$("#txDate").val(new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16));
  if(t){$("#txKind").val(t.kind);$("#txMethod").val(t.method);$("#txAmount").val(t.amount);$("#txNote").val(t.note)}
  updateTxHelp();$("#txKind,#txMethod").on("change",updateTxHelp);
}
function updateTxHelp(){const kind=$("#txKind").val(),m=$("#txMethod").val();$("#txHelp").text(kind==="income"?(m==="cash"?"Cash will increase.":"Bank will increase. UPI income is treated as money received in Bank."):(m==="cash"?"Cash will decrease.":"Bank will decrease. UPI expense is deducted from Bank."))}
function applyRecord(p,t,dir){
  const amount=Number(t.amount)||0;
  if(t.kind==="transfer") {
    if(t.from==="cash"&&t.to==="bank"){p.cash-=amount*dir;p.bank+=amount*dir;return}
    if(t.from==="bank"&&t.to==="cash"){p.bank-=amount*dir;p.cash+=amount*dir;return}
    return;
  }
  const signed=(t.kind==="income"?1:-1)*amount*dir;
  if(t.method==="cash")p.cash+=signed;else p.bank+=signed;
}
function applyTx(oldT,newT){
  const p=profile();if(oldT)applyRecord(p,oldT,-1);applyRecord(p,newT,1);
  const ok=validAccounts(p)&&availableBalance()>=-0.00001;
  if(!ok){applyRecord(p,newT,-1);if(oldT)applyRecord(p,oldT,1);return false}
  return true;
}
function validAccounts(p){return p.cash>=-0.00001&&p.bank>=-0.00001}

function renderTransfer(){
  const p=profile();
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Transfer</h1><div class="page-subtitle">Move money between your own Cash and Bank.</div></div><div class="row g-3 mb-3"><div class="col-6"><div class="cardx mini-balance"><div class="small text-muted">Cash</div><strong>${money(p.cash)}</strong></div></div><div class="col-6"><div class="cardx mini-balance"><div class="small text-muted">Bank</div><strong>${money(p.bank)}</strong></div></div></div><div class="cardx form-card"><form id="transferForm" autocomplete="off"><div class="row g-3"><div class="col-12 col-md-6"><label class="form-label">From</label><select id="from" class="form-select"><option value="bank">Bank</option><option value="cash">Cash</option></select></div><div class="col-12 col-md-6"><label class="form-label">To</label><select id="to" class="form-select"><option value="cash">Cash</option><option value="bank">Bank</option></select></div><div class="col-12 col-md-6"><label class="form-label">Amount</label><input id="trAmount" type="number" min="0.01" step="0.01" inputmode="decimal" class="form-control" required></div><div class="col-12 col-md-6"><label class="form-label">Note</label><input id="trNote" class="form-control" maxlength="120" placeholder="ATM cash withdrawal, deposit..."></div><div class="col-12"><div class="alertx info-box">Transfers do not count as income or expense. Your protected savings remain protected.</div></div><div class="col-12"><button class="btn btn-primary">Complete transfer</button></div></div></form></div>`);
}
function renderHistory(){
  historyPage=1;
  $("#main").html(`<div class="page-head mb-3"><div><h1 class="page-title">History</h1><div class="page-subtitle">All your income, expense and transfers.</div></div><a class="btn-soft" href="add.html"><i class="bi bi-plus-lg"></i> Add</a></div><div class="cardx filter-bar mb-3"><div class="row g-2"><div class="col-12 col-md-4"><input id="search" class="form-control" placeholder="Search note..." autocomplete="off"></div><div class="col-6 col-md-2"><select id="kindFilter" class="form-select"><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></select></div><div class="col-6 col-md-2"><select id="methodFilter" class="form-select"><option value="">All methods</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option></select></div><div class="col-6 col-md-2"><input id="fromDate" type="date" class="form-control"></div><div class="col-6 col-md-2"><input id="toDate" type="date" class="form-control"></div></div></div><div class="history-summary row g-3 mb-3" id="historySummary"></div><div class="cardx overflow-hidden" id="historyBox"></div><div id="historyPagination" class="history-pagination"></div>`);
  renderHistoryList();$("#search,#kindFilter,#methodFilter,#fromDate,#toDate").on("input change",()=>{historyPage=1;renderHistoryList()});
}
function filteredHistory(){
  const s=($("#search").val()||"").toLowerCase().trim(),k=$("#kindFilter").val(),m=$("#methodFilter").val(),fd=$("#fromDate").val(),td=$("#toDate").val();
  return txs().filter(t=>(!s||(t.note||"").toLowerCase().includes(s))&&(!k||t.kind===k)&&(!m||(t.kind==="transfer"?false:t.method===m))&&(!fd||localDateKey(t.date)>=fd)&&(!td||localDateKey(t.date)<=td));
}
function renderHistoryList(){
  const list=filteredHistory();
  const filteredIncome=list.filter(t=>t.kind==="income").reduce((sum,t)=>sum+Number(t.amount||0),0);
  const filteredExpense=list.filter(t=>t.kind==="expense").reduce((sum,t)=>sum+Number(t.amount||0),0);
  $("#historySummary").html(`<div class="col-6"><div class="cardx history-total-card income-total"><div class="history-total-icon"><i class="bi bi-arrow-down-left"></i></div><div><div class="history-total-label">Total Income</div><div class="history-total-value">${money(filteredIncome)}</div><div class="history-total-note">${list.filter(t=>t.kind==="income").length} matching record${list.filter(t=>t.kind==="income").length===1?"":"s"}</div></div></div></div><div class="col-6"><div class="cardx history-total-card expense-total"><div class="history-total-icon"><i class="bi bi-arrow-up-right"></i></div><div><div class="history-total-label">Total Expense</div><div class="history-total-value">${money(filteredExpense)}</div><div class="history-total-note">${list.filter(t=>t.kind==="expense").length} matching record${list.filter(t=>t.kind==="expense").length===1?"":"s"}</div></div></div></div>`);
  const totalPages=Math.max(1,Math.ceil(list.length/HISTORY_PER_PAGE));if(historyPage>totalPages)historyPage=totalPages;
  const start=(historyPage-1)*HISTORY_PER_PAGE,pageItems=list.slice(start,start+HISTORY_PER_PAGE);
  $("#historyBox").html(pageItems.length?pageItems.map(t=>`<div class="tx-item border-bottom"><div class="tx-left"><div class="tx-icon ${t.kind==="transfer"?"transfer-bg":t.kind==="income"?"income-bg":"expense-bg"}"><i class="bi ${t.kind==="transfer"?"bi-arrow-left-right":t.kind==="income"?"bi-arrow-down-left":"bi-arrow-up-right"}"></i></div><div class="tx-copy"><div class="tx-title">${esc(t.note||t.kind)}</div><div class="tx-meta">${txMeta(t)}</div></div></div><div class="history-right"><div class="tx-amount ${t.kind==="income"?"income":t.kind==="transfer"?"transfer":"expense"}">${t.kind==="income"?"+":t.kind==="transfer"?"↔":"-"}${money(t.amount)}</div><div class="tx-actions">${t.kind!=="transfer"?`<button class="btn btn-sm btn-light editTx" data-id="${esc(t.id)}" aria-label="Edit transaction"><i class="bi bi-pencil"></i></button>`:""}<button class="btn btn-sm btn-light text-danger deleteTx" data-id="${esc(t.id)}" aria-label="Delete transaction"><i class="bi bi-trash"></i></button></div></div></div>`).join(""):`<div class="empty"><i class="bi bi-search fs-2 d-block mb-2"></i>No records found.</div>`);
  let html=`<div class="history-count">${list.length?`${start+1}–${Math.min(start+HISTORY_PER_PAGE,list.length)} of ${list.length}`:"0 records"}</div><div class="pagination-buttons"><button class="page-btn" data-history-page="${historyPage-1}" ${historyPage<=1?"disabled":""}><i class="bi bi-chevron-left"></i></button>`;
  for(let i=1;i<=totalPages;i++){if(totalPages>7&&i!==1&&i!==totalPages&&Math.abs(i-historyPage)>1){if(i===2||i===totalPages-1)html+=`<span class="page-dots">…</span>`;continue}html+=`<button class="page-btn ${i===historyPage?"active":""}" data-history-page="${i}">${i}</button>`}
  html+=`<button class="page-btn" data-history-page="${historyPage+1}" ${historyPage>=totalPages?"disabled":""}><i class="bi bi-chevron-right"></i></button></div>`;$("#historyPagination").html(html);
}
function renderSavings(){
  const p=profile(),s=p.savings,total=totalBalance(),st=savingsTotal(),avail=availableBalance(),c=s.categories,month=localMonthKey(new Date()),monthExp=txs().filter(t=>t.kind==="expense"&&localMonthKey(t.date)===month).reduce((a,t)=>a+t.amount,0),budget=Number(s.monthlyBudget||0),remaining=budget?Math.max(0,budget-monthExp):0;
  $("#main").html(`<div class="page-head mb-3"><div><h1 class="page-title">Savings</h1><div class="page-subtitle">Keep your savings protected from normal expenses.</div></div><div class="savings-head-icon"><i class="bi bi-piggy-bank-fill"></i></div></div><div class="cardx savings-hero-card mb-3"><div><div class="savings-hero-label"><i class="bi bi-lock-fill"></i> Protected savings</div><div class="savings-hero-amount">${money(st)}</div><div class="savings-hero-note">Normal expenses never reduce this amount.</div></div><div class="savings-hero-right"><div class="savings-available-label">Available for normal spending</div><strong>${money(avail)}</strong></div></div><div class="cardx savings-setup-card mb-3"><div class="savings-section-head"><div><h5>Savings setup</h5><p>Choose the reserve percentage and your monthly spending budget.</p></div><button id="resetSavingsBtn" type="button" class="btn btn-outline-danger savings-reset-btn"><i class="bi bi-arrow-counterclockwise"></i> Reset</button></div><div class="row g-3 align-items-end"><div class="col-12 col-md-4"><label class="form-label">Savings %</label><div class="input-group savings-input"><input id="savePercent" type="number" min="0" max="100" step="1" inputmode="numeric" class="form-control" value="${s.percent}"><span class="input-group-text">%</span></div></div><div class="col-12 col-md-4"><label class="form-label">Monthly expense budget</label><div class="input-group savings-input"><span class="input-group-text">₹</span><input id="monthlyBudget" type="number" min="0" step="0.01" inputmode="decimal" class="form-control" value="${s.monthlyBudget||0}"></div></div><div class="col-12 col-md-4"><button id="saveSetupBtn" class="btn btn-primary w-100 savings-save-btn">Save settings</button></div></div><div class="savings-reserve-box mt-3"><div><div class="small text-muted">Suggested reserve from current total</div><strong id="suggestedSavings">${money(total*(Number(s.percent)||0)/100)}</strong></div><button id="reserveBtn" class="btn btn-soft">Set / Update reserve</button></div><div class="small text-muted savings-reset-note mt-2"><i class="bi bi-info-circle"></i> Reset clears savings percentage, monthly budget and all protected savings categories. Your Cash/Bank balance is not changed.</div></div><div class="section-title">Savings categories</div><div class="row g-3"><div class="col-6 col-md-3"><div class="cardx savings-category-card"><div class="cat-icon"><i class="bi bi-wallet2" aria-hidden="true"></i></div><div class="cat-name">Main Savings</div><strong>${money(c.main)}</strong></div></div><div class="col-6 col-md-3"><div class="cardx savings-category-card"><div class="cat-icon"><i class="bi bi-shield-check" aria-hidden="true"></i></div><div class="cat-name">Emergency</div><strong>${money(c.emergency)}</strong></div></div><div class="col-6 col-md-3"><div class="cardx savings-category-card"><div class="cat-icon"><i class="bi bi-person-check" aria-hidden="true"></i></div><div class="cat-name">Personal</div><strong>${money(c.personal)}</strong></div></div><div class="col-6 col-md-3"><div class="cardx savings-category-card"><div class="cat-icon"><i class="bi bi-coin" aria-hidden="true"></i></div><div class="cat-name">Other Savings</div><strong>${money(c.other)}</strong></div></div></div><div class="row g-3 mt-1"><div class="col-12 col-lg-6"><div class="cardx savings-action-card h-100"><div class="savings-action-head"><div class="savings-action-icon"><i class="bi bi-arrow-left-right"></i></div><div><h6>Move inside savings</h6><p>Rearrange protected money between categories.</p></div></div><form id="saveMoveForm"><div class="row g-3"><div class="col-6"><label class="form-label">From</label><select id="saveFrom" class="form-select">${CATS.map(k=>`<option value="${k}">${CAT_LABEL[k]}</option>`).join("")}</select></div><div class="col-6"><label class="form-label">To</label><select id="saveTo" class="form-select">${CATS.map(k=>`<option value="${k}">${CAT_LABEL[k]}</option>`).join("")}</select></div><div class="col-7"><label class="form-label">Amount</label><div class="input-group savings-input"><span class="input-group-text">₹</span><input id="saveMoveAmount" type="number" min="0.01" step="0.01" inputmode="decimal" class="form-control" required></div></div><div class="col-5 d-flex align-items-end"><button class="btn btn-primary w-100">Move</button></div></div></form></div></div><div class="col-12 col-lg-6"><div class="cardx savings-action-card h-100"><div class="savings-action-head"><div class="savings-action-icon"><i class="bi bi-unlock-fill"></i></div><div><h6>Use savings</h6><p>Release protected money back to your available balance.</p></div></div><form id="saveWithdrawForm"><div class="row g-3"><div class="col-12 col-sm-6"><label class="form-label">Category</label><select id="saveWithdrawFrom" class="form-select">${CATS.map(k=>`<option value="${k}">${CAT_LABEL[k]}</option>`).join("")}</select></div><div class="col-12 col-sm-6"><label class="form-label">Amount</label><div class="input-group savings-input"><span class="input-group-text">₹</span><input id="saveWithdrawAmount" type="number" min="0.01" step="0.01" inputmode="decimal" class="form-control" required></div></div><div class="col-12"><button class="btn btn-primary w-100">Use savings</button></div></div></form></div></div></div><div class="cardx savings-budget-card mt-3"><div><div class="budget-title">This month</div><div class="small text-muted">Expense budget</div></div><div class="text-end"><strong>${budget?money(remaining):"Not set"}</strong><div class="small text-muted">${budget?`${money(monthExp)} spent of ${money(budget)}`:"Set a budget above"}</div></div></div>`);
  $("#savePercent").on("input",function(){const pct=Math.max(0,Math.min(100,Number(this.value)||0));$("#suggestedSavings").text(money(total*pct/100))});
}
function renderTutorial(){ /* tutorial.html contains its own static tutorial content */ }
function renderProfile(){
  const p=profile(),u=user();
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Profile</h1><div class="page-subtitle">Account details and opening balances.</div></div><div class="cardx form-card"><form id="profileForm" autocomplete="off"><div class="row g-3"><div class="col-12 col-md-6"><label class="form-label">Full name</label><input id="pName" class="form-control" maxlength="80" value="${esc(p.name)}" required></div><div class="col-12 col-md-6"><label class="form-label">Username</label><input class="form-control" value="${esc(u.username)}" disabled></div><div class="col-12"><hr><h6 class="fw-bold mb-1">Opening balances</h6><div class="small text-muted">Use these only for money you already had before starting TraHis.</div></div><div class="col-12 col-md-4"><label class="form-label">Cash</label><input id="pCash" type="number" min="0" step="0.01" inputmode="decimal" class="form-control" value="${p.cash}"></div><div class="col-12 col-md-4"><label class="form-label">Bank</label><input id="pBank" type="number" min="0" step="0.01" inputmode="decimal" class="form-control" value="${p.bank}"></div><div class="col-12 col-md-4"><label class="form-label">UPI</label><input class="form-control" value="${p.bank}" disabled><div class="small text-muted mt-1">Linked to Bank</div></div><div class="col-12"><button class="btn btn-primary">Save profile</button></div></div></form></div><div class="cardx form-card mt-3"><h6 class="fw-bold">Change password</h6><form id="passForm" class="row g-3" autocomplete="off"><div class="col-12 col-md-6"><input id="oldPass" type="password" class="form-control" placeholder="Current password" autocomplete="current-password" required></div><div class="col-12 col-md-6"><input id="newPass" type="password" class="form-control" placeholder="New password" minlength="4" autocomplete="new-password" required></div><div class="col-12"><button class="btn btn-soft">Change password</button></div></form></div>`);
}
function renderSettings(){
  const pref=userPreferences();
  const colors=Object.entries(THEME_COLORS).map(([k,v])=>`<option value="${k}" ${pref.themeColor===k?"selected":""}>${v.label}</option>`).join("");
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Settings</h1><div class="page-subtitle">Customize the look and feel of your TraHis app.</div></div><div class="cardx form-card settings-card"><div class="settings-heading"><div><h6 class="fw-bold mb-1">App Theme</h6><div class="small text-muted">Choose how the entire TraHis interface should look.</div></div><div class="settings-preview-dot"></div></div><div class="theme-choice-grid mt-3"><button type="button" class="theme-choice ${pref.visualStyle==="classic"?"active":""}" data-visual-style="classic"><span class="theme-choice-preview classic-preview"><span></span><span></span><span></span></span><span class="theme-choice-copy"><strong>Classic</strong><small>Clean &amp; simple</small></span><i class="bi bi-check-circle-fill theme-choice-check"></i></button><button type="button" class="theme-choice ${pref.visualStyle==="glass"?"active":""}" data-visual-style="glass"><span class="theme-choice-preview glass-preview"><span></span><span></span><span></span></span><span class="theme-choice-copy"><strong>Glassmorphism</strong><small>Frosted glass &amp; soft depth</small></span><i class="bi bi-check-circle-fill theme-choice-check"></i></button><button type="button" class="theme-choice ${pref.visualStyle==="neumorphism"?"active":""}" data-visual-style="neumorphism"><span class="theme-choice-preview neo-preview"><span></span><span></span><span></span></span><span class="theme-choice-copy"><strong>Neumorphism</strong><small>Soft raised surfaces</small></span><i class="bi bi-check-circle-fill theme-choice-check"></i></button><button type="button" class="theme-choice ${pref.visualStyle==="aurora"?"active":""}" data-visual-style="aurora"><span class="theme-choice-preview aurora-preview"><span></span><span></span><span></span></span><span class="theme-choice-copy"><strong>Aurora</strong><small>Colorful ambient glow</small></span><i class="bi bi-check-circle-fill theme-choice-check"></i></button><button type="button" class="theme-choice ${pref.visualStyle==="liquid-glass"?"active":""}" data-visual-style="liquid-glass"><span class="theme-choice-preview liquid-preview"><span></span><span></span><span></span></span><span class="theme-choice-copy"><strong>Liquid Glass</strong><small>Fluid translucent depth</small></span><i class="bi bi-check-circle-fill theme-choice-check"></i></button></div><div class="settings-glass-note mt-3"><i class="bi bi-palette2"></i><div><strong>App-wide visual style</strong><div class="small text-muted">The selected style is applied consistently to the header, cards, forms, navigation, drawers, dialogs, charts and other major surfaces.</div></div></div></div><div class="cardx form-card mt-3"><div class="settings-heading"><div><h6 class="fw-bold mb-1">Appearance</h6><div class="small text-muted">Fine-tune the app after choosing a theme.</div></div></div><div class="row g-3 mt-1"><div class="col-12 col-md-6"><label class="form-label">Theme color</label><select id="themeColor" class="form-select">${colors}</select><div class="small text-muted mt-1">Changes the app accent color.</div></div><div class="col-12 col-md-6"><label class="form-label">Interface density</label><select id="densityMode" class="form-select"><option value="comfortable" ${pref.density==="comfortable"?"selected":""}>Comfortable</option><option value="compact" ${pref.density==="compact"?"selected":""}>Compact</option></select><div class="small text-muted mt-1">Compact uses tighter spacing; Comfortable gives more room.</div></div></div><div class="settings-theme-note mt-3"><i class="bi bi-moon-stars"></i><div><strong>Light / Dark mode</strong><div class="small text-muted">Use the Light / Dark button in the fixed header.</div></div></div></div>`);
  $("#themeColor,#densityMode").on("change",function(){
    const pp=profile();
    if(!pp)return;
    pp.preferences=normalizePreferences(pp.preferences);
    const color=$("#themeColor").val();
    const density=$("#densityMode").val();
    pp.preferences.themeColor=THEME_COLORS[color]?color:"indigo";
    pp.preferences.density=density==="compact"?"compact":"comfortable";
    save();
    applyPreferences(pp.preferences);
    showToast("Appearance settings saved","success");
  });
}
function getBackupMeta(){try{return JSON.parse(localStorage.getItem(BACKUP_META_KEY)||"null")||{}}catch(e){return {}}}
function backupHealth(){
  const list=txs(), p=profile()||{}, s=p.savings||blankSavings(), meta=getBackupMeta();
  const backup=JSON.parse(JSON.stringify(state)); backup.session=null;
  const sizeBytes=new Blob([JSON.stringify(backup)]).size;
  const issues=[];
  if(!Array.isArray(state.transactions))issues.push("Transaction data is invalid");
  if(!state.profiles||typeof state.profiles!=="object")issues.push("Profile data is invalid");
  if(savingsTotal()<0)issues.push("Savings total is invalid");
  const expected=CATS.reduce((a,k)=>a+(Number(s.categories?.[k])||0),0);
  if(Math.abs(expected-(Number(s.total)||0))>0.01)issues.push("Savings category total mismatch");
  const users=state.users||[];
  const orphan=list.filter(t=>!users.some(u=>u.id===t.userId));
  if(orphan.length)issues.push(`${orphan.length} orphan transaction${orphan.length===1?"":"s"}`);
  const last=meta.lastBackup?new Date(meta.lastBackup):null;
  const age=last&&!Number.isNaN(last.getTime())?(Date.now()-last.getTime())/86400000:null;
  if(!last)issues.push("No backup has been created yet");
  else if(age>30)issues.push("Backup is older than 30 days");
  const healthy=issues.length===0, attention=issues.length>0;
  return {healthy,issues,records:list.length,users:users.length,sizeBytes,lastBackup:last,age};
}
function formatBytes(n){if(!Number.isFinite(n)||n<0)return "—";if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(2)} MB`}
function renderBackup(){
  const h=backupHealth(),status=h.healthy?"Healthy":"Needs attention",statusClass=h.healthy?"health-good":"health-warn",last=h.lastBackup&&!Number.isNaN(h.lastBackup.getTime())?h.lastBackup.toLocaleString():"Never";
  const issuesHtml=h.issues.length?`<div class="health-issues">${h.issues.map(x=>`<div><i class="bi bi-exclamation-triangle-fill"></i><span>${esc(x)}</span></div>`).join("")}</div>`:`<div class="health-ok"><i class="bi bi-check-circle-fill"></i><span>Your local backup data looks healthy.</span></div>`;
  $("#main").html(`<div class="page-head mb-3"><div><h1 class="page-title">Backup & Restore</h1><div class="page-subtitle">Keep a safe copy of your local TraHis data.</div></div><div class="backup-head-icon"><i class="bi bi-shield-check"></i></div></div><div class="cardx backup-health-card mb-3"><div class="backup-health-top"><div><div class="backup-health-label"><i class="bi bi-heart"></i> Backup Health</div><div class="backup-health-status ${statusClass}">${status}</div><div class="small text-muted mt-1">Local backup and data consistency check</div></div><button id="scanBackupHealth" class="btn btn-soft"><i class="bi bi-arrow-clockwise"></i> Scan now</button></div><div class="row g-2 backup-health-stats"><div class="col-6 col-md-3"><div class="health-stat"><span>Last backup</span><strong>${esc(last)}</strong></div></div><div class="col-6 col-md-3"><div class="health-stat"><span>Records</span><strong>${h.records}</strong></div></div><div class="col-6 col-md-3"><div class="health-stat"><span>Data size</span><strong>${formatBytes(h.sizeBytes)}</strong></div></div><div class="col-6 col-md-3"><div class="health-stat"><span>Users</span><strong>${h.users}</strong></div></div></div>${issuesHtml}<div class="backup-health-note"><i class="bi bi-info-circle"></i><span>Backup Health checks only this browser's local TraHis data. Nothing is uploaded to a server.</span></div></div><div class="row g-3"><div class="col-12 col-md-6"><div class="cardx form-card h-100"><div class="stat-icon stat-blue"><i class="bi bi-download"></i></div><h5 class="fw-bold">Export backup</h5><p class="text-muted small">Download a JSON backup of your TraHis data.</p><button id="exportBtn" class="btn btn-primary">Download backup</button></div></div><div class="col-12 col-md-6"><div class="cardx form-card h-100"><div class="stat-icon stat-green"><i class="bi bi-upload"></i></div><h5 class="fw-bold">Restore backup</h5><p class="text-muted small">Restore a previous JSON backup on this device.</p><button id="restoreBtn" class="btn btn-soft">Choose backup</button><div class="small text-danger mt-2">Restoring replaces current local data.</div></div></div></div><div class="cardx p-3 mt-3"><strong>Privacy</strong><div class="small text-muted mt-1">TraHis stores data in this browser/device only. There is no cloud sync in this version.</div></div>`)}
function renderAdmin(){
  if(user()?.role!=="admin"){go("dashboard");return}
  const pending=state.users.filter(u=>u.role!=="admin"&&!u.approved),all=state.users.filter(u=>u.role!=="admin");
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Admin</h1><div class="page-subtitle">Approve registered users before they can log in.</div></div><div class="hero mb-3"><div class="small opacity-75">Master admin</div><div class="admin-master">${MASTER.username}</div><div class="small opacity-75 mt-1">Pending approvals: ${pending.length}</div></div><div class="section-title">Registered users</div><div class="row g-3">${all.length?all.map(u=>`<div class="col-12 col-md-6"><div class="cardx admin-card"><div class="d-flex gap-3 align-items-center"><div class="avatar">${esc((u.name||u.username)[0].toUpperCase())}</div><div class="flex-grow-1"><strong>${esc(u.name)}</strong><div class="small text-muted">@${esc(u.username)}</div><div class="small mt-1">${u.approved?'<span class="text-success fw-bold">Approved</span>':'<span class="text-warning fw-bold">Pending</span>'}</div></div></div><div class="admin-actions mt-3">${u.approved?`<button class="btn btn-sm btn-outline-warning revokeUser" data-id="${esc(u.id)}">Revoke</button>`:`<button class="btn btn-sm btn-success approveUser" data-id="${esc(u.id)}">Approve</button>`}<button class="btn btn-sm btn-outline-danger deleteUser" data-id="${esc(u.id)}">Delete</button></div></div></div>`).join(""):`<div class="col-12"><div class="cardx empty">No registered users.</div></div>`}</div>`);
}
function doLogin(username,password,remember){
  const u=state.users.find(x=>String(x.username).toLowerCase()===username.toLowerCase());
  if(!u||u.password!==password)return "Invalid username or password.";
  if(!u.approved)return "Your account is waiting for master admin approval.";
  state.session=u.id;
  sessionStorage.setItem(SESSION_KEY,u.id);
  if(remember){
    localStorage.setItem(REMEMBER_KEY,u.username);
    localStorage.setItem(REMEMBER_SESSION_KEY,u.id);
  }else{
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(REMEMBER_SESSION_KEY);
  }
  return "";
}
async function logout(){
  const ok=await showConfirmDialog({
    title:"Log out of TraHis?",
    message:"You will return to the login screen. Your saved local finance data will remain on this device.",
    confirmText:"Log out",
    cancelText:"Stay signed in",
    icon:"bi-box-arrow-right",
    danger:true
  });
  if(!ok)return;
  state.session=null;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(REMEMBER_SESSION_KEY);
  closeDrawer();
  applyPreferences(defaultPreferences());
  renderAuth();
}
function openDrawer(){$("#appDrawer,#drawerOverlay").addClass("open");$("body").addClass("drawer-open")}
function closeDrawer(){$("#appDrawer,#drawerOverlay").removeClass("open");$("body").removeClass("drawer-open")}
function toggleTheme(){
  const p=profile();
  if(!p)return;
  p.preferences=normalizePreferences(p.preferences);
  p.preferences.theme=p.preferences.theme==="dark"?"light":"dark";
  save();
  applyPreferences(p.preferences);
}
function drawChart(canvas,list,range="weekly"){
  if(!canvas)return;
  const ctx=canvas.getContext("2d");
  const dpr=window.devicePixelRatio||1;
  const host=canvas.parentElement;
  const today=new Date();today.setHours(0,0,0,0);
  const records=list.filter(t=>(t.kind==="income"||t.kind==="expense")&&!Number.isNaN(new Date(t.date).getTime()));
  let labels=[],keys=[];
  const firstRecord=records.length?records.reduce((min,t)=>{const d=new Date(t.date);return d<min?d:min},new Date(records[0].date)):today;
  firstRecord.setHours(0,0,0,0);

  // Build the complete historical axis, with one empty period before the first record.
  if(range==="daily"){
    const first=new Date(firstRecord);first.setDate(first.getDate()-1);
    for(let d=new Date(first);d<=today;d.setDate(d.getDate()+1)){
      const key=localDateKey(d);keys.push(key);
      labels.push(key===localDateKey(today)?"Today":d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:d.getFullYear()!==today.getFullYear()?"2-digit":undefined}));
    }
  }else if(range==="monthly"){
    const first=new Date(firstRecord.getFullYear(),firstRecord.getMonth()-1,1);
    for(let d=new Date(first);d<=today;d.setMonth(d.getMonth()+1)){
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      keys.push(key);labels.push(d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"}));
    }
  }else{
    const first=new Date(firstRecord);first.setDate(first.getDate()-((first.getDay()+6)%7));first.setDate(first.getDate()-7);
    const currentWeek=new Date(today);currentWeek.setDate(today.getDate()-((today.getDay()+6)%7));
    for(let d=new Date(first);d<=currentWeek;d.setDate(d.getDate()+7)){
      const key=localDateKey(d);keys.push(key);
      labels.push(key===localDateKey(currentWeek)?"This week":d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:d.getFullYear()!==today.getFullYear()?"2-digit":undefined}));
    }
  }

  // Aggregate once so large histories stay fast even when the chart spans years.
  const incomeMap=new Map(),expenseMap=new Map();
  records.forEach(t=>{
    let key;
    if(range==="monthly")key=localMonthKey(t.date);
    else if(range==="daily")key=localDateKey(t.date);
    else{
      const d=new Date(t.date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));key=localDateKey(d);
    }
    const map=t.kind==="income"?incomeMap:expenseMap;
    map.set(key,(map.get(key)||0)+(Number(t.amount)||0));
  });
  const income=keys.map(k=>incomeMap.get(k)||0),expense=keys.map(k=>expenseMap.get(k)||0);

  const yearSet=[...new Set(keys.map(k=>String(k).slice(0,4)))];
  const yearText=yearSet.length===1?`Year: ${yearSet[0]}`:`Years: ${yearSet[0]} – ${yearSet[yearSet.length-1]}`;
  const rangeText=range==="daily"?"Daily • All history":range==="monthly"?"Monthly • All history":"Weekly • All history";
  $("#chartHint").html(`<span class="chart-legend"><span><i class="legend-dot income-dot"></i>Income</span><span><i class="legend-dot expense-dot"></i>Expense</span></span>`);
  $("#chartYearInfo").text(`${yearText} • ${rangeText}`);

  // Keep a comfortable touch target on phones while allowing older periods to scroll horizontally.
  // Desktop shows more columns at once; small screens deliberately use wider columns for legibility.
  const viewportW=host?.clientWidth||320;
  const isPhone=window.matchMedia && window.matchMedia("(max-width: 767.98px)").matches;
  const visibleSlots=isPhone?6:9;
  const slot=Math.max(isPhone?56:52,Math.min(isPhone?78:88,viewportW/visibleSlots));
  const minW=visibleSlots*slot;
  const w=Math.max(viewportW,labels.length*slot+56,minW);
  const h=isPhone?225:Math.max(205,canvas.clientHeight||205);
  canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
  canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);

  const rootStyle=getComputedStyle(document.documentElement);
  const muted=rootStyle.getPropertyValue("--muted").trim()||"#64748b";
  const line=rootStyle.getPropertyValue("--line").trim()||"#e2e8f0";
  const incomeColor=rootStyle.getPropertyValue("--chart-income").trim()||"#16a34a";
  const expenseColor=rootStyle.getPropertyValue("--chart-expense").trim()||"#ef4444";
  const markerColor=rootStyle.getPropertyValue("--chart-marker").trim()||"#94a3b8";
  const padLeft=isPhone?32:38,padRight=isPhone?14:20,base=h-(isPhone?34:40),plotTop=16,plotH=base-plotTop;
  const max=Math.max(...income,...expense,1);
  const gap=(w-padLeft-padRight)/Math.max(labels.length,1);
  const pairGap=Math.min(isPhone?12:28,gap*(isPhone?.20:.28));
  const barW=Math.max(isPhone?10:8,Math.min(isPhone?20:24,(gap-pairGap)/2));
  const compactMoney=v=>{
    const n=Number(v)||0;
    if(!isPhone)return money(n);
    const abs=Math.abs(n);
    if(abs>=10000000)return `₹${(n/10000000).toFixed(abs>=100000000?0:1)}Cr`;
    if(abs>=100000)return `₹${(n/100000).toFixed(abs>=1000000?0:1)}L`;
    if(abs>=1000)return `₹${(n/1000).toFixed(abs>=10000?0:1)}k`;
    return money(n);
  };

  ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padLeft,plotTop);ctx.lineTo(padLeft,base);ctx.lineTo(w-padRight,base);ctx.stroke();
  ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(padLeft,plotTop+plotH/2);ctx.lineTo(w-padRight,plotTop+plotH/2);ctx.stroke();ctx.globalAlpha=1;

  // The first slot is the period immediately before the first real record.
  const markerX=padLeft+gap/2;
  ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle=markerColor;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(markerX,plotTop);ctx.lineTo(markerX,base);ctx.stroke();ctx.restore();
  ctx.fillStyle=markerColor;ctx.font=isPhone?"700 8px system-ui":"700 9px system-ui";ctx.textAlign="center";ctx.fillText("START",markerX,plotTop+10);

  labels.forEach((label,i)=>{
    const center=padLeft+i*gap+gap/2;
    const vals=[income[i],expense[i]];
    [incomeColor,expenseColor].forEach((color,j)=>{
      const v=vals[j],bh=plotH*(v/max),x=center-(barW*2+pairGap)/2+j*(barW+pairGap),y=base-bh;
      ctx.fillStyle=color;
      if(typeof ctx.roundRect==="function"){ctx.beginPath();ctx.roundRect(x,y,barW,Math.max(2,bh),6);ctx.fill()}else{ctx.fillRect(x,y,barW,Math.max(2,bh))}
      if(v>0){
        ctx.fillStyle=muted;
        ctx.font=isPhone?"700 8px system-ui":"700 8px system-ui";
        ctx.textAlign="center";
        const valueText=compactMoney(v);
        // Never let a value label collide with the bar pair or run outside the plot.
        const labelY=Math.max(13,y-4);
        ctx.fillText(valueText,x+barW/2,labelY,Math.max(34,barW+16));
      }
    });
    ctx.fillStyle=i===0?markerColor:muted;
    ctx.font=isPhone?"600 9px system-ui":"10px system-ui";
    ctx.textAlign="center";
    ctx.fillText(label,center,h-(isPhone?9:13),Math.max(40,gap-5));
  });

  if(host){host.style.minWidth="0";requestAnimationFrame(()=>{host.scrollLeft=Math.max(0,host.scrollWidth-host.clientWidth);});}
}

$(document).on("click","#toggleLoginPassword",function(){const input=document.getElementById("loginPass");if(!input)return;const show=input.type==="password";input.type=show?"text":"password";$(this).attr("aria-label",show?"Hide password":"Show password").attr("aria-pressed",String(show)).find("i").attr("class",show?"bi bi-eye-slash":"bi bi-eye");});
$(document).on("click","[data-auth]",function(){$(".auth-tabs button").removeClass("active");$(this).addClass("active");$(this).data("auth")==="login"?renderLogin():renderRegister()});
$(document).on("submit","#loginForm",function(e){e.preventDefault();const err=doLogin($("#loginUser").val().trim(),$("#loginPass").val(),$("#remember").prop("checked"));if(err)$("#authMsg").html(`<div class="alertx error-box">${esc(err)}</div>`);else go("dashboard")});
$(document).on("submit","#registerForm",function(e){e.preventDefault();const name=$("#regName").val().trim(),username=$("#regUser").val().trim(),pass=$("#regPass").val(),pass2=$("#regPass2").val();if(name.length<2)return $("#authMsg").html('<div class="alertx error-box">Please enter your full name.</div>');if(!/^[A-Za-z0-9_.-]{3,40}$/.test(username))return $("#authMsg").html('<div class="alertx error-box">Username must be 3–40 characters: letters, numbers, dot, underscore or hyphen.</div>');if(pass.length<4)return $("#authMsg").html('<div class="alertx error-box">Password must be at least 4 characters.</div>');if(pass!==pass2)return $("#authMsg").html('<div class="alertx error-box">Passwords do not match.</div>');if(state.users.some(u=>String(u.username).toLowerCase()===username.toLowerCase()))return $("#authMsg").html('<div class="alertx error-box">Username already exists.</div>');const id=uid();state.users.push({id,name,username,password:pass,role:"user",approved:false,createdAt:new Date().toISOString()});state.profiles[id]={name,username,cash:0,bank:0,upi:0,savings:blankSavings(),preferences:defaultPreferences()};save();$("#authMsg").html('<div class="alertx success-box">Registration submitted. Master admin approval is required.</div>');setTimeout(renderLogin,1100)});
$(document).on("submit","#txForm",function(e){e.preventDefault();const amount=Number($("#txAmount").val()),dateValue=$("#txDate").val(),note=$("#txNote").val().trim();if(!(amount>0)||!Number.isFinite(amount))return showToast("Enter a valid amount.","danger");if(!dateValue)return showToast("Select a date and time.","danger");if(!note)return showToast("Enter a note or description.","danger");const t={id:editingId||uid(),userId:state.session,kind:$("#txKind").val(),method:$("#txMethod").val(),amount,note,date:new Date(dateValue).toISOString()};if(Number.isNaN(new Date(dateValue).getTime()))return showToast("Invalid date and time.","danger");const old=editingId?txs().find(x=>x.id===editingId):null;if(t.kind==="expense"){const p=profile(),budget=Number(p.savings.monthlyBudget||0),month=localMonthKey(t.date),monthExp=txs().filter(x=>x.kind==="expense"&&localMonthKey(x.date)===month&&(!old||x.id!==old.id)).reduce((a,x)=>a+x.amount,0);if(budget>0&&monthExp+t.amount>budget)return showToast(`Monthly budget exceeded. Remaining: ${money(Math.max(0,budget-monthExp))}`,"danger")}if(!applyTx(old,t))return showToast("Insufficient available balance. Savings are protected.","danger");if(old)state.transactions=state.transactions.filter(x=>x.id!==old.id);state.transactions.push(t);save();editingId=null;showToast("Transaction saved");go("history")});
$(document).on("click","#cancelEdit",()=>{editingId=null;go("history")});
$(document).on("click",".editTx",function(){editingId=$(this).data("id");go("add",`?edit=${encodeURIComponent(editingId)}`)});
$(document).on("click","[data-history-page]",function(){const p=Number($(this).data("history-page"));if(p>=1){historyPage=p;renderHistoryList()}});
$(document).on("click",".deleteTx",async function(){const id=$(this).data("id"),t=txs().find(x=>x.id===id);if(!t)return;const ok=await showConfirmDialog({title:"Delete transaction?",message:"This transaction will be removed and its balance effect will be reversed. This action cannot be undone.",confirmText:"Delete transaction",cancelText:"Keep transaction",icon:"bi-trash",danger:true});if(!ok)return;const p=profile();applyRecord(p,t,-1);if(!validAccounts(p)||availableBalance()< -0.00001){applyRecord(p,t,1);return showToast("This transaction cannot be deleted because later transactions depend on its balance.","danger")}state.transactions=state.transactions.filter(x=>x.id!==id);save();renderHistoryList();showToast("Transaction deleted")});
$(document).on("submit","#transferForm",function(e){e.preventDefault();const from=$("#from").val(),to=$("#to").val(),amount=Number($("#trAmount").val());if(from===to)return showToast("From and To must be different.","danger");if(!(amount>0)||!Number.isFinite(amount))return showToast("Enter a valid amount.","danger");const p=profile();if(!["cash","bank"].includes(from)||!["cash","bank"].includes(to))return showToast("Invalid transfer account.","danger");if(amount>Number(p[from]||0)+0.00001)return showToast(`Insufficient ${from} balance.`,"danger");p[from]-=amount;p[to]+=amount;state.transactions.push({id:uid(),userId:state.session,kind:"transfer",method:"transfer",amount,note:$("#trNote").val().trim()||`${from} → ${to}`,date:new Date().toISOString(),from,to});save();showToast("Transfer completed");go("history")});
$(document).on("click","#saveSetupBtn",function(){const p=profile(),s=p.savings,pct=Math.max(0,Math.min(100,Number($("#savePercent").val())||0)),budget=Math.max(0,Number($("#monthlyBudget").val())||0),target=totalBalance()*pct/100,current=savingsTotal();if(target+0.00001<current)return showToast("Savings reserve cannot be reduced here. Use ‘Use savings’ first.","danger");s.percent=pct;s.monthlyBudget=budget;s.enabled=current>0||target>0;save();showToast("Savings settings saved");renderSavings()});
$(document).on("click","#reserveBtn",function(){const p=profile(),s=p.savings,pct=Math.max(0,Math.min(100,Number($("#savePercent").val())||0)),target=totalBalance()*pct/100,current=savingsTotal(),diff=target-current;if(diff< -0.00001)return showToast("New reserve is lower than current savings. Use ‘Use savings’ first.","danger");if(diff>0)s.categories.main+=diff;s.total=CATS.reduce((a,k)=>a+s.categories[k],0);s.percent=pct;s.enabled=s.total>0;save();showToast(diff>0?`Savings reserve increased by ${money(diff)}.`:"Savings reserve already set.");renderSavings()});
$(document).on("click","#resetSavingsBtn",async function(){const p=profile(),s=p?.savings;if(!p||!s)return;const ok=await showConfirmDialog({title:"Reset Savings?",message:"Savings % and monthly budget will be set to 0, and all protected savings categories will be cleared. Your Cash/Bank balance will not be changed.",confirmText:"Reset savings",cancelText:"Keep savings",icon:"bi-arrow-counterclockwise",danger:true});if(!ok)return;s.percent=0;s.monthlyBudget=0;s.enabled=false;CATS.forEach(k=>s.categories[k]=0);s.total=0;save();showToast("Savings reset to 0.");renderSavings()});
$(document).on("submit","#saveMoveForm",function(e){e.preventDefault();const s=profile().savings,from=$("#saveFrom").val(),to=$("#saveTo").val(),amt=Number($("#saveMoveAmount").val());if(from===to)return showToast("From and To must be different.","danger");if(!(amt>0)||amt>s.categories[from]+0.00001)return showToast(`Insufficient ${CAT_LABEL[from]} amount.`,"danger");s.categories[from]-=amt;s.categories[to]+=amt;s.total=CATS.reduce((a,k)=>a+s.categories[k],0);save();showToast("Savings moved");renderSavings()});
$(document).on("submit","#saveWithdrawForm",function(e){e.preventDefault();const s=profile().savings,from=$("#saveWithdrawFrom").val(),amt=Number($("#saveWithdrawAmount").val());if(!(amt>0)||amt>s.categories[from]+0.00001)return showToast(`Insufficient ${CAT_LABEL[from]} amount.`,"danger");s.categories[from]-=amt;s.total=CATS.reduce((a,k)=>a+s.categories[k],0);s.enabled=s.total>0;save();showToast(`${money(amt)} released from savings.`);renderSavings()});
$(document).on("click","[data-visual-style]",function(){
  const p=profile();
  if(!p)return;
  const allowed=["classic","glass","neumorphism","aurora","liquid-glass"];
  const style=String($(this).attr("data-visual-style"));
  if(!allowed.includes(style))return;
  p.preferences=normalizePreferences(p.preferences);
  p.preferences.visualStyle=style;
  save();
  applyPreferences(p.preferences);
  $("[data-visual-style]").removeClass("active");
  $(`[data-visual-style="${style}"]`).addClass("active");
  const labels={classic:"Classic",glass:"Glassmorphism",neumorphism:"Neumorphism",aurora:"Aurora","liquid-glass":"Liquid Glass"};
  showToast(`${labels[style]} theme enabled`,"success");
});
$(document).on("submit","#profileForm",function(e){e.preventDefault();const p=profile(),u=user(),old={name:p.name,cash:p.cash,bank:p.bank};const name=$("#pName").val().trim(),cash=Number($("#pCash").val()),bank=Number($("#pBank").val());if(!name)return showToast("Name is required.","danger");if(!Number.isFinite(cash)||cash<0||!Number.isFinite(bank)||bank<0)return showToast("Opening balances must be zero or more.","danger");p.name=name;p.cash=cash;p.bank=bank;p.upi=bank;u.name=name;if(savingsTotal()>totalBalance()+0.00001){p.name=old.name;p.cash=old.cash;p.bank=old.bank;p.upi=old.bank;u.name=old.name;return showToast("Opening balance cannot be lower than protected savings.","danger")}save();showToast("Profile saved");shell();renderProfile()});
$(document).on("submit","#passForm",function(e){e.preventDefault();const u=user(),old=$("#oldPass").val(),next=$("#newPass").val();if(old!==u.password)return showToast("Current password is incorrect.","danger");if(next.length<4)return showToast("New password must be at least 4 characters.","danger");if(next===old)return showToast("New password must be different.","danger");u.password=next;save();$("#oldPass,#newPass").val("");showToast("Password changed")});
$(document).on("click","#scanBackupHealth",function(){renderBackup();showToast(backupHealth().healthy?"Backup Health: Healthy":"Backup Health: Attention needed",backupHealth().healthy?"success":"danger")});
$(document).on("click","#exportBtn",function(){
  try{
    const backup=JSON.parse(JSON.stringify(state));backup.session=null;backup.appVersion=APP_VERSION;backup.exportedAt=new Date().toISOString();
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`trahis-backup-${localDateKey(new Date())}.json`;document.body.appendChild(a);a.click();a.remove();
    try{localStorage.setItem(BACKUP_META_KEY,JSON.stringify({lastBackup:new Date().toISOString(),records:txs().length,sizeBytes:blob.size}));}catch(e){}
    setTimeout(()=>URL.revokeObjectURL(url),1000);setTimeout(renderBackup,50);showToast("Backup downloaded and health status updated","success");
  }catch(e){showToast("Could not create backup. Please check browser storage and try again.","danger")}
});
$(document).on("click","#restoreBtn",()=>$("#restoreFile").click());
$(document).on("change","#restoreFile",function(){
  const f=this.files&&this.files[0];if(!f)return;
  if(f.size>10*1024*1024){showToast("Backup file is too large.","danger");this.value="";return}
  const r=new FileReader();
  r.onload=async()=>{
    try{
      const candidate=JSON.parse(r.result);
      if(!Array.isArray(candidate.users)||!Array.isArray(candidate.transactions)||!candidate.profiles||typeof candidate.profiles!=="object")throw Error();
      candidate.users=candidate.users.filter(u=>u&&typeof u==="object"&&typeof u.id==="string"&&typeof u.username==="string"&&typeof u.password==="string");
      candidate.users.forEach(u=>{u.name=String(u.name||u.username).slice(0,80);u.username=String(u.username).trim().slice(0,40);u.password=String(u.password);u.approved=Boolean(u.approved);u.role=u.role==="admin"?"admin":"user"});
      const master=candidate.users.find(u=>u.username===MASTER.username)||candidate.users.find(u=>u.id==="master");
      if(master){master.id="master";master.name=MASTER.name;master.username=MASTER.username;master.password=MASTER.password;master.role="admin";master.approved=true;}
      else candidate.users.unshift({id:"master",name:MASTER.name,username:MASTER.username,password:MASTER.password,role:"admin",approved:true,createdAt:new Date().toISOString()});
      const validIds=new Set(candidate.users.map(u=>u.id));
      candidate.transactions=candidate.transactions.map(t=>normalizeTransaction(t,validIds)).filter(Boolean);
      Object.keys(candidate.profiles).forEach(id=>{
        if(!validIds.has(id)){delete candidate.profiles[id];return;}
        const p=candidate.profiles[id]||{};
        p.cash=Math.max(0,Number(p.cash)||0);
        p.bank=Math.max(0,Number(p.bank)||0);
        p.upi=p.bank;
        p.savings=normalizeSavings(p.savings);
        p.preferences=normalizePreferences(p.preferences);
        candidate.profiles[id]=p;
      });
      candidate.users.forEach(u=>{if(!candidate.profiles[u.id])candidate.profiles[u.id]={name:u.name,username:u.username,cash:0,bank:0,upi:0,savings:blankSavings(),preferences:defaultPreferences()}});
      const ok=await showConfirmDialog({title:"Restore this backup?",message:"Current local TraHis data will be replaced by this backup. This action cannot be undone unless you have another backup.",confirmText:"Restore backup",cancelText:"Cancel",icon:"bi-cloud-arrow-down",danger:true});
      if(!ok)return;
      const active=state.session&&candidate.users.some(u=>u.id===state.session)?state.session:null;
      state=candidate;state.session=active;save();
      if(!state.session){sessionStorage.removeItem(SESSION_KEY);renderAuth()}else go("dashboard");
      showToast("Backup restored");
    }catch(e){showToast("Invalid backup file.","danger")}
    this.value="";
  };
  r.readAsText(f);
});
$(document).on("click",".approveUser",function(){if(user()?.role!=="admin")return;const u=state.users.find(x=>x.id===$(this).data("id"));if(u){u.approved=true;save();renderAdmin();showToast("User approved")}});
$(document).on("click",".revokeUser",function(){if(user()?.role!=="admin")return;const u=state.users.find(x=>x.id===$(this).data("id"));if(u&&u.id!==state.session){u.approved=false;save();renderAdmin();showToast("User access revoked")}});
$(document).on("click",".deleteUser",async function(){if(user()?.role!=="admin")return;const id=$(this).data("id");if(id===state.session)return showToast("You cannot delete the current master account.","danger");const target=state.users.find(x=>x.id===id);const ok=await showConfirmDialog({title:"Delete user?",message:`${target?.name||target?.username||"This user"} and all of their local records will be permanently deleted.`,confirmText:"Delete user",cancelText:"Keep user",icon:"bi-person-x",danger:true});if(!ok)return;state.users=state.users.filter(x=>x.id!==id);delete state.profiles[id];state.transactions=state.transactions.filter(t=>t.userId!==id);save();renderAdmin();showToast("User deleted")});
$("#headerMenuBtn").on("click",openDrawer);
$("#themeToggle").on("click",toggleTheme);
$("#closeDrawer,#drawerOverlay").on("click",closeDrawer);
$("#logoutBtn").on("click",logout);
$(document).on("keydown",e=>{if(e.key==="Escape")closeDrawer()});
$(document).on("click",".chart-range",function(){chartRange=$(this).data("range")||"weekly";$(".chart-range").removeClass("active");$(this).addClass("active");const title=chartRange==="daily"?"Daily income & expense activity":chartRange==="monthly"?"Monthly income & expense activity":"Weekly income & expense activity";$("#chartTitle").text(title);drawChart($("#miniChart")[0],txs(),chartRange)});
$(window).on("resize",()=>{if(currentRoute==="dashboard")drawChart($("#miniChart")[0],txs(),chartRange)});

initPWA();
bindInternalNavigation();
const storedSession=sessionStorage.getItem(SESSION_KEY);
const rememberedSession=localStorage.getItem(REMEMBER_SESSION_KEY);
if(storedSession)state.session=storedSession;
else if(rememberedSession&&state.users.some(u=>u.id===rememberedSession&&u.approved)){
  state.session=rememberedSession;
  sessionStorage.setItem(SESSION_KEY,rememberedSession);
}
else if(rememberedSession){
  localStorage.removeItem(REMEMBER_SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}
if(state.session&&user()&&user().approved){shell();const map={dashboard:renderDashboard,add:renderAdd,transfer:renderTransfer,history:renderHistory,profile:renderProfile,savings:renderSavings,tutorial:renderTutorial,settings:renderSettings,backup:renderBackup,admin:renderAdmin};if(currentRoute==="admin"&&user().role!=="admin"){window.location.href="index.html"}else{(map[currentRoute]||renderDashboard)()}}else{state.session=null;sessionStorage.removeItem(SESSION_KEY);applyPreferences(defaultPreferences());if(currentRoute!=="dashboard"){window.location.href="index.html"}else renderAuth()}
})();
