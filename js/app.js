/* TraHis - offline local PWA
   v9: settings, themes and responsive chart controls
*/
(function(){
"use strict";

const MASTER = { username:"tra_his", password:"tra_his@2503", name:"Master Admin" };
const DB_KEY = "trahis_state_v5";
const LEGACY_DB_KEY = "trahis_state_v4";
const SESSION_KEY = "trahis_session_v1";
const REMEMBER_KEY = "trahis_remember_user_v1";
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
let currentRoute = document.body.dataset.page || "dashboard";
let editingId = null;
let historyPage = 1;
const HISTORY_PER_PAGE = 10;
let chartRange = "weekly";

function defaultPreferences(){
  return {theme:"light",themeColor:"indigo",density:"comfortable"};
}
function normalizePreferences(pref){
  const p=pref&&typeof pref==="object"?pref:{};
  return {
    theme:p.theme==="dark"?"dark":"light",
    themeColor:THEME_COLORS[p.themeColor]?p.themeColor:"indigo",
    density:p.density==="compact"?"compact":"comfortable"
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
  $('img[src*="icon.svg"]').attr('src',src);
}
function applyPreferences(pref){
  const p=normalizePreferences(pref);
  const root=document.documentElement;
  root.dataset.theme=p.theme;
  root.dataset.themeColor=p.themeColor;
  document.body.classList.toggle("density-compact",p.density==="compact");
  const c=THEME_COLORS[p.themeColor];
  root.style.setProperty("--primary",c.primary);
  root.style.setProperty("--primary2",c.primary2);
  root.style.setProperty("--primary-soft",c.soft);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",p.theme==="dark"?"#111827":c.primary);
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
function loadState(){
  let s;
  try{s=JSON.parse(localStorage.getItem(DB_KEY)||localStorage.getItem(LEGACY_DB_KEY)||"null");}catch(e){s=null;}
  if(!s || !Array.isArray(s.users) || !Array.isArray(s.transactions) || !s.profiles || typeof s.profiles!=="object") s=defaultState();
  if(!s.users.some(u=>u.username===MASTER.username)) s.users.unshift({id:"master",name:MASTER.name,username:MASTER.username,password:MASTER.password,role:"admin",approved:true,createdAt:new Date().toISOString()});
  s.profiles=s.profiles||{};
  s.transactions=s.transactions||[];
  Object.keys(s.profiles).forEach(id=>{
    const p=s.profiles[id]||{};
    p.cash=Math.max(0,Number(p.cash)||0);
    p.bank=Math.max(0,Number(p.bank)||0);
    p.upi=p.bank;
    p.savings=normalizeSavings(p.savings);
    s.profiles[id]=p;
  });
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
  const p=state.profiles[u.id];
  p.cash=Math.max(0,Number(p.cash)||0); p.bank=Math.max(0,Number(p.bank)||0); p.upi=p.bank; p.savings=normalizeSavings(p.savings); p.preferences=normalizePreferences(p.preferences);
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
function initPWA(){
  if(location.protocol==="http:"||location.protocol==="https:"){
    const m=document.getElementById("pwaManifest");if(m)m.href="manifest.json";
    if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}
function renderAuth(){
  $("#appHeader,#bottomNav").hide();
  $("#main").removeClass("main-shell").html(`<div class="login-page"><div class="login-card"><img src="assets/icon.svg" class="login-logo" alt="TraHis"><h1>TraHis</h1><div class="lead">Your private personal finance tracker</div><div class="auth-tabs"><button class="active" data-auth="login">Login</button><button data-auth="register">Register</button></div><div id="authBody"></div></div></div>`);
  renderLogin();
}
function renderLogin(){
  const remembered=localStorage.getItem(REMEMBER_KEY)||"";
  $("#authBody").html(`<form id="loginForm" autocomplete="off" novalidate><div class="mb-3"><label class="form-label">Username</label><input id="loginUser" name="login_username" class="form-control" value="${esc(remembered)}" autocomplete="username" autocapitalize="none" spellcheck="false" required></div><div class="mb-3"><label class="form-label">Password</label><input id="loginPass" name="login_password" type="password" class="form-control" value="" autocomplete="current-password" required></div><div class="form-check mb-3"><input id="remember" class="form-check-input" type="checkbox" ${remembered?"checked":""}><label class="form-check-label">Remember username</label></div><button class="btn btn-primary w-100 py-3">Login</button><div id="authMsg" class="mt-3"></div></form>`);
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
}
function updateNav(){
  $("#bottomNav a").removeClass("active");
  $(`#bottomNav a[href="${pageFor(currentRoute)}"]`).addClass("active");
}
function pageFor(route){return {dashboard:"index.html",add:"add.html",transfer:"transfer.html",history:"history.html",savings:"savings.html",profile:"profile.html",backup:"backup.html",admin:"admin.html"}[route]||"index.html"}
function go(route,extra=""){if(!state.session){window.location.href="index.html";return}closeDrawer();window.location.href=pageFor(route)+(extra||"")}
function renderDashboard(){
  const p=profile(),list=txs();
  const totalInc=list.filter(t=>t.kind==="income").reduce((a,t)=>a+t.amount,0),totalExp=list.filter(t=>t.kind==="expense").reduce((a,t)=>a+t.amount,0);
  const month=localMonthKey(new Date()),monthExp=list.filter(t=>t.kind==="expense"&&localMonthKey(t.date)===month).reduce((a,t)=>a+t.amount,0);
  const s=p.savings,budget=Number(s.monthlyBudget||0),remaining=budget?Math.max(0,budget-monthExp):0,st=savingsTotal(),avail=availableBalance(),total=totalBalance();
  const recent=list.slice(0,3);
  const chartTitle=chartRange==="daily"?"Daily expense activity":chartRange==="monthly"?"Monthly expense activity":"Weekly expense activity";
  $("#main").html(`<div class="page-head"><div><h1 class="page-title">Dashboard</h1><div class="page-subtitle">Your money, clearly tracked.</div></div><a class="btn-soft" href="add.html"><i class="bi bi-plus-lg"></i> Add</a></div><div class="hero mb-3"><div class="small opacity-75">Available to spend</div><div class="hero-amount">${money(avail)}</div><div class="mt-2 small opacity-75">Total ${money(total)} <span class="dot-sep">•</span> Savings locked ${money(st)}</div></div><div class="row g-3"><div class="col-6"><div class="cardx stat-card"><div class="stat-icon stat-blue"><i class="bi bi-wallet2"></i></div><div class="stat-label">Total Income</div><div class="stat-value">${money(totalInc)}</div></div></div><div class="col-6"><div class="cardx stat-card"><div class="stat-icon stat-green"><i class="bi bi-graph-up-arrow"></i></div><div class="stat-label">Total Expense</div><div class="stat-value">${money(totalExp)}</div></div></div><div class="col-6"><div class="cardx stat-card"><div class="stat-icon stat-red"><i class="bi bi-receipt"></i></div><div class="stat-label">This Month</div><div class="stat-value">${money(monthExp)}</div></div></div><div class="col-6"><div class="cardx stat-card"><div class="stat-icon stat-yellow"><i class="bi bi-list-check"></i></div><div class="stat-label">Transactions</div><div class="stat-value">${list.length}</div></div></div></div><div class="section-title">Balances</div><div class="cardx overflow-hidden">${balanceRow("bi-cash-stack","Cash",p.cash,"stat-green","Cash in hand")}${balanceRow("bi-bank","Bank",p.bank,"stat-blue","Bank account")}${balanceRow("bi-phone","UPI",p.bank,"stat-purple","Linked to Bank")}</div><div class="section-title d-flex justify-content-between align-items-center"><span>Recent transactions</span><a class="small fw-bold text-decoration-none" href="history.html">View all</a></div><div class="cardx overflow-hidden">${recent.map(txHtml).join("")||`<div class="empty"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No transactions yet.</div>`}</div><div class="section-title chart-section-title"><span>Expense activity</span><div class="chart-switcher" role="group" aria-label="Expense chart range"><button type="button" class="chart-range ${chartRange==="daily"?"active":""}" data-range="daily">Daily</button><button type="button" class="chart-range ${chartRange==="weekly"?"active":""}" data-range="weekly">Weekly</button><button type="button" class="chart-range ${chartRange==="monthly"?"active":""}" data-range="monthly">Monthly</button></div></div><div class="cardx chart-box"><div class="chart-caption"><strong id="chartTitle">${chartTitle}</strong><span id="chartHint">Expense only</span></div><canvas id="miniChart" aria-label="Expense activity chart"></canvas></div>`);
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
  $("#main").html(`<div class="page-head mb-3"><div><h1 class="page-title">History</h1><div class="page-subtitle">All your income, expense and transfers.</div></div><a class="btn-soft" href="add.html"><i class="bi bi-plus-lg"></i> Add</a></div><div class="cardx filter-bar mb-3"><div class="row g-2"><div class="col-12 col-md-4"><input id="search" class="form-control" placeholder="Search note..." autocomplete="off"></div><div class="col-6 col-md-2"><select id="kindFilter" class="form-select"><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></select></div><div class="col-6 col-md-2"><select id="methodFilter" class="form-select"><option value="">All methods</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option></select></div><div class="col-6 col-md-2"><input id="fromDate" type="date" class="form-control"></div><div class="col-6 col-md-2"><input id="toDate" type="date" class="form-control"></div></div></div><div class="cardx overflow-hidden" id="historyBox"></div><div id="historyPagination" class="history-pagination"></div>`);
  renderHistoryList();$("#search,#kindFilter,#methodFilter,#fromDate,#toDate").on("input change",()=>{historyPage=1;renderHistoryList()});
}
function filteredHistory(){
  const s=($("#search").val()||"").toLowerCase().trim(),k=$("#kindFilter").val(),m=$("#methodFilter").val(),fd=$("#fromDate").val(),td=$("#toDate").val();
  return txs().filter(t=>(!s||(t.note||"").toLowerCase().includes(s))&&(!k||t.kind===k)&&(!m||(t.kind==="transfer"?false:t.method===m))&&(!fd||localDateKey(t.date)>=fd)&&(!td||localDateKey(t.date)<=td));
}
function renderHistoryList(){
  const list=filteredHistory(),totalPages=Math.max(1,Math.ceil(list.length/HISTORY_PER_PAGE));if(historyPage>totalPages)historyPage=totalPages;
  const start=(historyPage-1)*HISTORY_PER_PAGE,pageItems=list.slice(start,start+HISTORY_PER_PAGE);
  $("#historyBox").html(pageItems.length?pageItems.map(t=>`<div class="tx-item border-bottom"><div class="tx-left"><div class="tx-icon ${t.kind==="transfer"?"transfer-bg":t.kind==="income"?"income-bg":"expense-bg"}"><i class="bi ${t.kind==="transfer"?"bi-arrow-left-right":t.kind==="income"?"bi-arrow-down-left":"bi-arrow-up-right"}"></i></div><div class="tx-copy"><div class="tx-title">${esc(t.note||t.kind)}</div><div class="tx-meta">${txMeta(t)}</div></div></div><div class="history-right"><div class="tx-amount ${t.kind==="income"?"income":t.kind==="transfer"?"transfer":"expense"}">${t.kind==="income"?"+":t.kind==="transfer"?"↔":"-"}${money(t.amount)}</div><div class="tx-actions">${t.kind!=="transfer"?`<button class="btn btn-sm btn-light editTx" data-id="${esc(t.id)}" aria-label="Edit transaction"><i class="bi bi-pencil"></i></button>`:""}<button class="btn btn-sm btn-light text-danger deleteTx" data-id="${esc(t.id)}" aria-label="Delete transaction"><i class="bi bi-trash"></i></button></div></div></div>`).join(""):`<div class="empty"><i class="bi bi-search fs-2 d-block mb-2"></i>No records found.</div>`);
  let html=`<div class="history-count">${list.length?`${start+1}–${Math.min(start+HISTORY_PER_PAGE,list.length)} of ${list.length}`:"0 records"}</div><div class="pagination-buttons"><button class="page-btn" data-history-page="${historyPage-1}" ${historyPage<=1?"disabled":""}><i class="bi bi-chevron-left"></i></button>`;
  for(let i=1;i<=totalPages;i++){if(totalPages>7&&i!==1&&i!==totalPages&&Math.abs(i-historyPage)>1){if(i===2||i===totalPages-1)html+=`<span class="page-dots">…</span>`;continue}html+=`<button class="page-btn ${i===historyPage?"active":""}" data-history-page="${i}">${i}</button>`}
  html+=`<button class="page-btn" data-history-page="${historyPage+1}" ${historyPage>=totalPages?"disabled":""}><i class="bi bi-chevron-right"></i></button></div>`;$("#historyPagination").html(html);
}
function renderSavings(){
  const p=profile(),s=p.savings,total=totalBalance(),st=savingsTotal(),avail=availableBalance(),c=s.categories,month=localMonthKey(new Date()),monthExp=txs().filter(t=>t.kind==="expense"&&localMonthKey(t.date)===month).reduce((a,t)=>a+t.amount,0),budget=Number(s.monthlyBudget||0),remaining=budget?Math.max(0,budget-monthExp):0;
  $("#main").html(`<div class="page-head mb-3"><div><h1 class="page-title">Savings</h1><div class="page-subtitle">Keep your savings protected from normal expenses.</div></div><div class="savings-head-icon"><i class="bi bi-piggy-bank-fill"></i></div></div><div class="cardx savings-hero-card mb-3"><div><div class="savings-hero-label"><i class="bi bi-lock-fill"></i> Protected savings</div><div class="savings-hero-amount">${money(st)}</div><div class="savings-hero-note">Normal expenses never reduce this amount.</div></div><div class="savings-hero-right"><div class="savings-available-label">Available for normal spending</div><strong>${money(avail)}</strong></div></div><div class="cardx savings-setup-card mb-3"><div class="savings-section-head"><h5>Savings setup</h5><p>Choose the reserve percentage and your monthly spending budget.</p></div><div class="row g-3 align-items-end"><div class="col-12 col-md-4"><label class="form-label">Savings %</label><div class="input-group savings-input"><input id="savePercent" type="number" min="0" max="100" step="1" inputmode="numeric" class="form-control" value="${s.percent}"><span class="input-group-text">%</span></div></div><div class="col-12 col-md-4"><label class="form-label">Monthly expense budget</label><div class="input-group savings-input"><span class="input-group-text">₹</span><input id="monthlyBudget" type="number" min="0" step="0.01" inputmode="decimal" class="form-control" value="${s.monthlyBudget||0}"></div></div><div class="col-12 col-md-4"><button id="saveSetupBtn" class="btn btn-primary w-100 savings-save-btn">Save settings</button></div></div><div class="savings-reserve-box mt-3"><div><div class="small text-muted">Suggested reserve from current total</div><strong id="suggestedSavings">${money(total*(Number(s.percent)||0)/100)}</strong></div><button id="reserveBtn" class="btn btn-soft">Set / Update reserve</button></div></div><div class="section-title">Savings categories</div><div class="row g-3"><div class="col-6 col-md-3"><div class="cardx savings-category-card"><div class="cat-icon">🏦</div><div class="cat-name">Main Savings</div><strong>${money(c.main)}</strong></div></div><div class="col-6 col-md-3"><div class="cardx savings-category-card"><div class="cat-icon">🚨</div><div class="cat-name">Emergency</div><strong>${money(c.emergency)}</strong></div></div><div class="col-6 col-md-3"><div class="cardx savings-category-card"><div class="cat-icon">🎯</div><div class="cat-name">Personal</div><strong>${money(c.personal)}</strong></div></div><div class="col-6 col-md-3"><div class="cardx savings-category-card"><div class="cat-icon">💰</div><div class="cat-name">Other Savings</div><strong>${money(c.other)}</strong></div></div></div><div class="row g-3 mt-1"><div class="col-12 col-lg-6"><div class="cardx savings-action-card h-100"><div class="savings-action-head"><div class="savings-action-icon"><i class="bi bi-arrow-left-right"></i></div><div><h6>Move inside savings</h6><p>Rearrange protected money between categories.</p></div></div><form id="saveMoveForm"><div class="row g-3"><div class="col-6"><label class="form-label">From</label><select id="saveFrom" class="form-select">${CATS.map(k=>`<option value="${k}">${CAT_LABEL[k]}</option>`).join("")}</select></div><div class="col-6"><label class="form-label">To</label><select id="saveTo" class="form-select">${CATS.map(k=>`<option value="${k}">${CAT_LABEL[k]}</option>`).join("")}</select></div><div class="col-7"><label class="form-label">Amount</label><div class="input-group savings-input"><span class="input-group-text">₹</span><input id="saveMoveAmount" type="number" min="0.01" step="0.01" inputmode="decimal" class="form-control" required></div></div><div class="col-5 d-flex align-items-end"><button class="btn btn-primary w-100">Move</button></div></div></form></div></div><div class="col-12 col-lg-6"><div class="cardx savings-action-card h-100"><div class="savings-action-head"><div class="savings-action-icon"><i class="bi bi-unlock-fill"></i></div><div><h6>Use savings</h6><p>Release protected money back to your available balance.</p></div></div><form id="saveWithdrawForm"><div class="row g-3"><div class="col-12 col-sm-6"><label class="form-label">Category</label><select id="saveWithdrawFrom" class="form-select">${CATS.map(k=>`<option value="${k}">${CAT_LABEL[k]}</option>`).join("")}</select></div><div class="col-12 col-sm-6"><label class="form-label">Amount</label><div class="input-group savings-input"><span class="input-group-text">₹</span><input id="saveWithdrawAmount" type="number" min="0.01" step="0.01" inputmode="decimal" class="form-control" required></div></div><div class="col-12"><button class="btn btn-primary w-100">Use savings</button></div></div></form></div></div></div><div class="cardx savings-budget-card mt-3"><div><div class="budget-title">This month</div><div class="small text-muted">Expense budget</div></div><div class="text-end"><strong>${budget?money(remaining):"Not set"}</strong><div class="small text-muted">${budget?`${money(monthExp)} spent of ${money(budget)}`:"Set a budget above"}</div></div></div>`);
  $("#savePercent").on("input",function(){const pct=Math.max(0,Math.min(100,Number(this.value)||0));$("#suggestedSavings").text(money(total*pct/100))});
}
function renderProfile(){
  const p=profile(),u=user(),pref=userPreferences();
  const colors=Object.entries(THEME_COLORS).map(([k,v])=>`<option value="${k}" ${pref.themeColor===k?"selected":""}>${v.label}</option>`).join("");
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Profile</h1><div class="page-subtitle">Account details, balances and appearance settings.</div></div><div class="cardx form-card"><form id="profileForm" autocomplete="off"><div class="row g-3"><div class="col-12 col-md-6"><label class="form-label">Full name</label><input id="pName" class="form-control" maxlength="80" value="${esc(p.name)}" required></div><div class="col-12 col-md-6"><label class="form-label">Username</label><input class="form-control" value="${esc(u.username)}" disabled></div><div class="col-12"><hr><h6 class="fw-bold mb-1">Opening balances</h6><div class="small text-muted">Use these only for money you already had before starting TraHis.</div></div><div class="col-12 col-md-4"><label class="form-label">Cash</label><input id="pCash" type="number" min="0" step="0.01" inputmode="decimal" class="form-control" value="${p.cash}"></div><div class="col-12 col-md-4"><label class="form-label">Bank</label><input id="pBank" type="number" min="0" step="0.01" inputmode="decimal" class="form-control" value="${p.bank}"></div><div class="col-12 col-md-4"><label class="form-label">UPI</label><input class="form-control" value="${p.bank}" disabled><div class="small text-muted mt-1">Linked to Bank</div></div><div class="col-12"><button class="btn btn-primary">Save profile</button></div></div></form></div><div class="cardx form-card mt-3"><div class="settings-heading"><div><h6 class="fw-bold mb-1">Appearance</h6><div class="small text-muted">Customize TraHis for this account.</div></div><div class="settings-preview-dot"></div></div><div class="row g-3 mt-1"><div class="col-12 col-md-6"><label class="form-label">Theme color</label><select id="themeColor" class="form-select">${colors}</select><div class="small text-muted mt-1">Changes the app accent color.</div></div><div class="col-12 col-md-6"><label class="form-label">Interface density</label><select id="densityMode" class="form-select"><option value="comfortable" ${pref.density==="comfortable"?"selected":""}>Comfortable</option><option value="compact" ${pref.density==="compact"?"selected":""}>Compact</option></select><div class="small text-muted mt-1">Compact uses tighter spacing; Comfortable gives more room.</div></div></div><div class="settings-theme-note mt-3"><i class="bi bi-moon-stars"></i><div><strong>Light / Dark mode</strong><div class="small text-muted">Use the Light / Dark button in the fixed header.</div></div></div></div><div class="cardx form-card mt-3"><h6 class="fw-bold">Change password</h6><form id="passForm" class="row g-3" autocomplete="off"><div class="col-12 col-md-6"><input id="oldPass" type="password" class="form-control" placeholder="Current password" autocomplete="current-password" required></div><div class="col-12 col-md-6"><input id="newPass" type="password" class="form-control" placeholder="New password" minlength="4" autocomplete="new-password" required></div><div class="col-12"><button class="btn btn-soft">Change password</button></div></form></div>`);
  $("#themeColor,#densityMode").on("change",function(){
    const pp=profile();pp.preferences=normalizePreferences(pp.preferences);
    pp.preferences.themeColor=$("#themeColor").val();pp.preferences.density=$("#densityMode").val();
    save();applyPreferences(pp.preferences);showToast("Appearance settings saved");
  });
}
function renderBackup(){$("#main").html(`<div class="mb-3"><h1 class="page-title">Backup & Restore</h1><div class="page-subtitle">Keep a copy of your local TraHis data.</div></div><div class="row g-3"><div class="col-12 col-md-6"><div class="cardx form-card h-100"><div class="stat-icon stat-blue"><i class="bi bi-download"></i></div><h5 class="fw-bold">Export backup</h5><p class="text-muted small">Download a JSON backup of your TraHis data.</p><button id="exportBtn" class="btn btn-primary">Download backup</button></div></div><div class="col-12 col-md-6"><div class="cardx form-card h-100"><div class="stat-icon stat-green"><i class="bi bi-upload"></i></div><h5 class="fw-bold">Restore backup</h5><p class="text-muted small">Restore a previous JSON backup on this device.</p><button id="restoreBtn" class="btn btn-soft">Choose backup</button><div class="small text-danger mt-2">Restoring replaces current local data.</div></div></div></div><div class="cardx p-3 mt-3"><strong>Privacy</strong><div class="small text-muted mt-1">TraHis stores data in this browser/device only. There is no cloud sync in this version.</div></div>`)}
function renderAdmin(){
  if(user()?.role!=="admin"){go("dashboard");return}
  const pending=state.users.filter(u=>u.role!=="admin"&&!u.approved),all=state.users.filter(u=>u.role!=="admin");
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Admin</h1><div class="page-subtitle">Approve registered users before they can log in.</div></div><div class="hero mb-3"><div class="small opacity-75">Master admin</div><div class="admin-master">${MASTER.username}</div><div class="small opacity-75 mt-1">Pending approvals: ${pending.length}</div></div><div class="section-title">Registered users</div><div class="row g-3">${all.length?all.map(u=>`<div class="col-12 col-md-6"><div class="cardx admin-card"><div class="d-flex gap-3 align-items-center"><div class="avatar">${esc((u.name||u.username)[0].toUpperCase())}</div><div class="flex-grow-1"><strong>${esc(u.name)}</strong><div class="small text-muted">@${esc(u.username)}</div><div class="small mt-1">${u.approved?'<span class="text-success fw-bold">Approved</span>':'<span class="text-warning fw-bold">Pending</span>'}</div></div></div><div class="admin-actions mt-3">${u.approved?`<button class="btn btn-sm btn-outline-warning revokeUser" data-id="${esc(u.id)}">Revoke</button>`:`<button class="btn btn-sm btn-success approveUser" data-id="${esc(u.id)}">Approve</button>`}<button class="btn btn-sm btn-outline-danger deleteUser" data-id="${esc(u.id)}">Delete</button></div></div></div>`).join(""):`<div class="col-12"><div class="cardx empty">No registered users.</div></div>`}</div>`);
}
function doLogin(username,password,remember){
  const u=state.users.find(x=>String(x.username).toLowerCase()===username.toLowerCase());
  if(!u||u.password!==password)return "Invalid username or password.";
  if(!u.approved)return "Your account is waiting for master admin approval.";
  state.session=u.id;sessionStorage.setItem(SESSION_KEY,u.id);
  if(remember)localStorage.setItem(REMEMBER_KEY,u.username);else localStorage.removeItem(REMEMBER_KEY);
  return "";
}
function logout(){
  if(!confirm("Are you sure you want to logout?"))return;
  state.session=null;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
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
  const w=Math.max(280,canvas.clientWidth||280),h=Math.max(180,canvas.clientHeight||180);
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const today=new Date();today.setHours(0,0,0,0);
  let labels=[],vals=[];
  if(range==="daily"){
    labels=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-6+i);return i===6?"Today":d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})});
    vals=Array(7).fill(0);
    list.forEach(t=>{if(t.kind!=="expense")return;const d=new Date(t.date);if(Number.isNaN(d.getTime()))return;d.setHours(0,0,0,0);const age=Math.round((today-d)/86400000);if(age>=0&&age<7)vals[6-age]+=Number(t.amount)||0});
  }else if(range==="monthly"){
    const months=[];
    for(let i=11;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"})});}
    labels=months.map(x=>x.label);vals=months.map(x=>list.filter(t=>t.kind==="expense"&&localMonthKey(t.date)===x.key).reduce((a,t)=>a+(Number(t.amount)||0),0));
  }else{
    const weeks=[];
    for(let i=7;i>=0;i--){
      const end=new Date(today);end.setDate(today.getDate()-i*7);
      const startDay=new Date(end);startDay.setDate(end.getDate()-6);
      const key=localDateKey(end);
      weeks.push({start:startDay,end,label:i===0?"This week":startDay.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})});
    }
    labels=weeks.map(x=>x.label);
    vals=weeks.map(x=>list.filter(t=>{if(t.kind!=="expense")return false;const d=new Date(t.date);if(Number.isNaN(d.getTime()))return false;d.setHours(0,0,0,0);return d>=x.start&&d<=x.end}).reduce((a,t)=>a+(Number(t.amount)||0),0));
  }
  const max=Math.max(...vals,1),pad=32,gap=(w-pad*2)/Math.max(vals.length,1),bw=Math.max(7,gap*.58),base=h-34,plotH=Math.max(50,base-28);
  const primary=getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()||"#4f46e5";
  const muted=getComputedStyle(document.documentElement).getPropertyValue("--muted").trim()||"#64748b";
  const line=getComputedStyle(document.documentElement).getPropertyValue("--line").trim()||"#e2e8f0";
  ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad,12);ctx.lineTo(pad,base);ctx.lineTo(w-pad,base);ctx.stroke();
  vals.forEach((v,i)=>{const bh=plotH*(v/max),x=pad+i*gap+(gap-bw)/2,y=base-bh;ctx.fillStyle=primary;if(typeof ctx.roundRect==="function"){ctx.beginPath();ctx.roundRect(x,y,bw,Math.max(2,bh),7);ctx.fill()}else{ctx.fillRect(x,y,bw,Math.max(2,bh))}ctx.fillStyle=muted;ctx.font="10px system-ui";ctx.textAlign="center";ctx.fillText(labels[i],x+bw/2,h-9)});
}

$(document).on("click","[data-auth]",function(){$(".auth-tabs button").removeClass("active");$(this).addClass("active");$(this).data("auth")==="login"?renderLogin():renderRegister()});
$(document).on("submit","#loginForm",function(e){e.preventDefault();const err=doLogin($("#loginUser").val().trim(),$("#loginPass").val(),$("#remember").prop("checked"));if(err)$("#authMsg").html(`<div class="alertx error-box">${esc(err)}</div>`);else go("dashboard")});
$(document).on("submit","#registerForm",function(e){e.preventDefault();const name=$("#regName").val().trim(),username=$("#regUser").val().trim(),pass=$("#regPass").val(),pass2=$("#regPass2").val();if(name.length<2)return $("#authMsg").html('<div class="alertx error-box">Please enter your full name.</div>');if(!/^[A-Za-z0-9_.-]{3,40}$/.test(username))return $("#authMsg").html('<div class="alertx error-box">Username must be 3–40 characters: letters, numbers, dot, underscore or hyphen.</div>');if(pass.length<4)return $("#authMsg").html('<div class="alertx error-box">Password must be at least 4 characters.</div>');if(pass!==pass2)return $("#authMsg").html('<div class="alertx error-box">Passwords do not match.</div>');if(state.users.some(u=>String(u.username).toLowerCase()===username.toLowerCase()))return $("#authMsg").html('<div class="alertx error-box">Username already exists.</div>');const id=uid();state.users.push({id,name,username,password:pass,role:"user",approved:false,createdAt:new Date().toISOString()});state.profiles[id]={name,username,cash:0,bank:0,upi:0,savings:blankSavings(),preferences:defaultPreferences()};save();$("#authMsg").html('<div class="alertx success-box">Registration submitted. Master admin approval is required.</div>');setTimeout(renderLogin,1100)});
$(document).on("submit","#txForm",function(e){e.preventDefault();const amount=Number($("#txAmount").val()),dateValue=$("#txDate").val(),note=$("#txNote").val().trim();if(!(amount>0))return showToast("Enter a valid amount.","danger");if(!dateValue)return showToast("Select a date and time.","danger");if(!note)return showToast("Enter a note or description.","danger");const t={id:editingId||uid(),userId:state.session,kind:$("#txKind").val(),method:$("#txMethod").val(),amount,note,date:new Date(dateValue).toISOString()};if(Number.isNaN(new Date(dateValue).getTime()))return showToast("Invalid date and time.","danger");const old=editingId?txs().find(x=>x.id===editingId):null;if(t.kind==="expense"){const p=profile(),budget=Number(p.savings.monthlyBudget||0),month=localMonthKey(t.date),monthExp=txs().filter(x=>x.kind==="expense"&&localMonthKey(x.date)===month&&(!old||x.id!==old.id)).reduce((a,x)=>a+x.amount,0);if(budget>0&&monthExp+t.amount>budget)return showToast(`Monthly budget exceeded. Remaining: ${money(Math.max(0,budget-monthExp))}`,"danger")}if(!applyTx(old,t))return showToast("Insufficient available balance. Savings are protected.","danger");if(old)state.transactions=state.transactions.filter(x=>x.id!==old.id);state.transactions.push(t);save();editingId=null;showToast("Transaction saved");go("history")});
$(document).on("click","#cancelEdit",()=>{editingId=null;go("history")});
$(document).on("click",".editTx",function(){editingId=$(this).data("id");go("add",`?edit=${encodeURIComponent(editingId)}`)});
$(document).on("click","[data-history-page]",function(){const p=Number($(this).data("history-page"));if(p>=1){historyPage=p;renderHistoryList()}});
$(document).on("click",".deleteTx",function(){const id=$(this).data("id"),t=txs().find(x=>x.id===id);if(!t||!confirm("Delete this transaction? The balance will be reversed."))return;const p=profile();applyRecord(p,t,-1);if(!validAccounts(p)||availableBalance()< -0.00001){applyRecord(p,t,1);return showToast("This transaction cannot be deleted because later transactions depend on its balance.","danger")}state.transactions=state.transactions.filter(x=>x.id!==id);save();renderHistoryList();showToast("Transaction deleted")});
$(document).on("submit","#transferForm",function(e){e.preventDefault();const from=$("#from").val(),to=$("#to").val(),amount=Number($("#trAmount").val());if(from===to)return showToast("From and To must be different.","danger");if(!(amount>0))return showToast("Enter a valid amount.","danger");const p=profile();if(!["cash","bank"].includes(from)||!["cash","bank"].includes(to))return showToast("Invalid transfer account.","danger");if(amount>Number(p[from]||0)+0.00001)return showToast(`Insufficient ${from} balance.`,"danger");p[from]-=amount;p[to]+=amount;state.transactions.push({id:uid(),userId:state.session,kind:"transfer",method:"transfer",amount,note:$("#trNote").val().trim()||`${from} → ${to}`,date:new Date().toISOString(),from,to});save();showToast("Transfer completed");go("history")});
$(document).on("click","#saveSetupBtn",function(){const p=profile(),s=p.savings,pct=Math.max(0,Math.min(100,Number($("#savePercent").val())||0)),budget=Math.max(0,Number($("#monthlyBudget").val())||0),target=totalBalance()*pct/100,current=savingsTotal();if(target+0.00001<current)return showToast("Savings reserve cannot be reduced here. Use ‘Use savings’ first.","danger");s.percent=pct;s.monthlyBudget=budget;s.enabled=current>0||target>0;save();showToast("Savings settings saved");renderSavings()});
$(document).on("click","#reserveBtn",function(){const p=profile(),s=p.savings,pct=Math.max(0,Math.min(100,Number($("#savePercent").val())||0)),target=totalBalance()*pct/100,current=savingsTotal(),diff=target-current;if(diff< -0.00001)return showToast("New reserve is lower than current savings. Use ‘Use savings’ first.","danger");if(diff>0)s.categories.main+=diff;s.total=CATS.reduce((a,k)=>a+s.categories[k],0);s.percent=pct;s.enabled=s.total>0;save();showToast(diff>0?`Savings reserve increased by ${money(diff)}.`:"Savings reserve already set.");renderSavings()});
$(document).on("submit","#saveMoveForm",function(e){e.preventDefault();const s=profile().savings,from=$("#saveFrom").val(),to=$("#saveTo").val(),amt=Number($("#saveMoveAmount").val());if(from===to)return showToast("From and To must be different.","danger");if(!(amt>0)||amt>s.categories[from]+0.00001)return showToast(`Insufficient ${CAT_LABEL[from]} amount.`,"danger");s.categories[from]-=amt;s.categories[to]+=amt;s.total=CATS.reduce((a,k)=>a+s.categories[k],0);save();showToast("Savings moved");renderSavings()});
$(document).on("submit","#saveWithdrawForm",function(e){e.preventDefault();const s=profile().savings,from=$("#saveWithdrawFrom").val(),amt=Number($("#saveWithdrawAmount").val());if(!(amt>0)||amt>s.categories[from]+0.00001)return showToast(`Insufficient ${CAT_LABEL[from]} amount.`,"danger");s.categories[from]-=amt;s.total=CATS.reduce((a,k)=>a+s.categories[k],0);s.enabled=s.total>0;save();showToast(`${money(amt)} released from savings.`);renderSavings()});
$(document).on("submit","#profileForm",function(e){e.preventDefault();const p=profile(),u=user(),old={name:p.name,cash:p.cash,bank:p.bank};const name=$("#pName").val().trim(),cash=Number($("#pCash").val()),bank=Number($("#pBank").val());if(!name)return showToast("Name is required.","danger");if(!Number.isFinite(cash)||cash<0||!Number.isFinite(bank)||bank<0)return showToast("Opening balances must be zero or more.","danger");p.name=name;p.cash=cash;p.bank=bank;p.upi=bank;u.name=name;if(savingsTotal()>totalBalance()+0.00001){p.name=old.name;p.cash=old.cash;p.bank=old.bank;p.upi=old.bank;u.name=old.name;return showToast("Opening balance cannot be lower than protected savings.","danger")}save();showToast("Profile saved");shell();renderProfile()});
$(document).on("submit","#passForm",function(e){e.preventDefault();const u=user(),old=$("#oldPass").val(),next=$("#newPass").val();if(old!==u.password)return showToast("Current password is incorrect.","danger");if(next.length<4)return showToast("New password must be at least 4 characters.","danger");if(next===old)return showToast("New password must be different.","danger");u.password=next;save();$("#oldPass,#newPass").val("");showToast("Password changed")});
$(document).on("click","#exportBtn",function(){const backup=JSON.parse(JSON.stringify(state));backup.session=null;const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`trahis-backup-${localDateKey(new Date())}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)});
$(document).on("click","#restoreBtn",()=>$("#restoreFile").click());
$(document).on("change","#restoreFile",function(){
  const f=this.files&&this.files[0];if(!f)return;
  if(f.size>10*1024*1024){showToast("Backup file is too large.","danger");this.value="";return}
  const r=new FileReader();
  r.onload=()=>{
    try{
      const candidate=JSON.parse(r.result);
      if(!Array.isArray(candidate.users)||!Array.isArray(candidate.transactions)||!candidate.profiles||typeof candidate.profiles!=="object")throw Error();
      candidate.users.forEach(u=>{u.approved=Boolean(u.approved);u.role=u.role||"user"});
      if(!candidate.users.some(u=>u.username===MASTER.username))candidate.users.unshift({id:"master",name:MASTER.name,username:MASTER.username,password:MASTER.password,role:"admin",approved:true,createdAt:new Date().toISOString()});
      Object.keys(candidate.profiles).forEach(id=>{const p=candidate.profiles[id]||{};p.cash=Math.max(0,Number(p.cash)||0);p.bank=Math.max(0,Number(p.bank)||0);p.upi=p.bank;p.savings=normalizeSavings(p.savings);p.preferences=normalizePreferences(p.preferences);candidate.profiles[id]=p});
      if(!confirm("Restore this backup? Current local data will be replaced."))return;
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
$(document).on("click",".deleteUser",function(){if(user()?.role!=="admin")return;const id=$(this).data("id");if(id===state.session)return showToast("You cannot delete the current master account.","danger");if(!confirm("Delete this user and all their local records?"))return;state.users=state.users.filter(x=>x.id!==id);delete state.profiles[id];state.transactions=state.transactions.filter(t=>t.userId!==id);save();renderAdmin();showToast("User deleted")});
$("#headerMenuBtn").on("click",openDrawer);
$("#themeToggle").on("click",toggleTheme);
$("#closeDrawer,#drawerOverlay").on("click",closeDrawer);
$("#logoutBtn").on("click",logout);
$(document).on("keydown",e=>{if(e.key==="Escape")closeDrawer()});
$(document).on("click",".chart-range",function(){chartRange=$(this).data("range")||"weekly";$(".chart-range").removeClass("active");$(this).addClass("active");const title=chartRange==="daily"?"Daily expense activity":chartRange==="monthly"?"Monthly expense activity":"Weekly expense activity";$("#chartTitle").text(title);drawChart($("#miniChart")[0],txs(),chartRange)});
$(window).on("resize",()=>{if(currentRoute==="dashboard")drawChart($("#miniChart")[0],txs(),chartRange)});

initPWA();
const storedSession=sessionStorage.getItem(SESSION_KEY);if(storedSession)state.session=storedSession;
if(state.session&&user()&&user().approved){shell();const map={dashboard:renderDashboard,add:renderAdd,transfer:renderTransfer,history:renderHistory,savings:renderSavings,profile:renderProfile,backup:renderBackup,admin:renderAdmin};if(currentRoute==="admin"&&user().role!=="admin"){window.location.href="index.html"}else{(map[currentRoute]||renderDashboard)()}}else{state.session=null;sessionStorage.removeItem(SESSION_KEY);applyPreferences(defaultPreferences());if(currentRoute!=="dashboard"){window.location.href="index.html"}else renderAuth()}
})();
