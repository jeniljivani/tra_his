/* TraHis - offline local PWA */
(function(){
"use strict";

const MASTER = { username:"tra_his", password:"tra_his@2503", name:"Master Admin" };
const DB_KEY = "trahis_state_v4";
let state = loadState();
let currentRoute = "dashboard";
let editingId = null;
let headerTimer = null;
let lastScrollY = window.scrollY;

function defaultState(){
  return {
    users:[{id:"master",name:MASTER.name,username:MASTER.username,password:MASTER.password,role:"admin",approved:true,createdAt:new Date().toISOString()}],
    session:null,
    transactions:[],
    profiles:{master:{name:MASTER.name,username:MASTER.username,cash:0,bank:0,upi:0}}
  };
}
function loadState(){
  try{
    const raw=localStorage.getItem(DB_KEY);
    if(!raw) return defaultState();
    const s=JSON.parse(raw);
    if(!Array.isArray(s.users)) return defaultState();
    if(!s.users.some(u=>u.username===MASTER.username)){
      s.users.unshift({id:"master",name:MASTER.name,username:MASTER.username,password:MASTER.password,role:"admin",approved:true,createdAt:new Date().toISOString()});
    }
    s.profiles=s.profiles||{}; s.transactions=s.transactions||[]; return s;
  }catch(e){return defaultState();}
}
function save(){localStorage.setItem(DB_KEY,JSON.stringify(state));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function user(){return state.session?state.users.find(u=>u.id===state.session):null}
function profile(){const u=user(); if(!u)return null; if(!state.profiles[u.id]) state.profiles[u.id]={name:u.name,username:u.username,cash:0,bank:0,upi:0}; return state.profiles[u.id]}
function txs(){return state.transactions.filter(t=>t.userId===state.session).sort((a,b)=>new Date(b.date)-new Date(a.date))}
function balance(){const p=profile(); return (p?.cash||0)+(p?.bank||0)}
function showToast(msg,type="primary"){
  $("#toastBox").html(`<div class="toast show border-0 shadow-sm" role="alert"><div class="toast-body"><i class="bi bi-info-circle me-2"></i>${esc(msg)}</div></div>`);
  setTimeout(()=>$("#toastBox").empty(),2600);
}

function initPWA(){
  if(location.protocol==="http:"||location.protocol==="https:"){
    const m=document.getElementById("pwaManifest"); if(m)m.href="manifest.json";
    if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}
function renderAuth(){
  $("#appHeader,#bottomNav").hide();
  $("#main").removeClass("main-shell").html(`
    <div class="login-page">
      <div class="login-card">
        <img src="assets/icon.svg" class="login-logo" alt="TraHis">
        <h1>TraHis</h1><div class="lead">Your private personal finance tracker</div>
        <div class="auth-tabs"><button class="active" data-auth="login">Login</button><button data-auth="register">Register</button></div>
        <div id="authBody"></div>
      </div>
    </div>`);
  renderLogin();
}
function renderLogin(){
  $("#authBody").html(`
    <form id="loginForm">
      <div class="mb-3"><label class="form-label">Username</label><input id="loginUser" class="form-control" autocomplete="username" required></div>
      <div class="mb-3"><label class="form-label">Password</label><input id="loginPass" type="password" class="form-control" autocomplete="current-password" required></div>
      <div class="form-check mb-3"><input id="remember" class="form-check-input" type="checkbox"><label class="form-check-label">Remember me</label></div>
      <button class="btn btn-primary w-100 py-3">Login</button>
      <div id="authMsg" class="mt-3"></div>
    </form>`);
  const remembered=localStorage.getItem("trahis_remember");
  if(remembered){try{const x=JSON.parse(remembered);$("#loginUser").val(x.username);$("#loginPass").val(x.password);$("#remember").prop("checked",true)}catch(e){}}
}
function renderRegister(){
  $("#authBody").html(`
    <form id="registerForm">
      <div class="mb-3"><label class="form-label">Full name</label><input id="regName" class="form-control" required></div>
      <div class="mb-3"><label class="form-label">Username</label><input id="regUser" class="form-control" required></div>
      <div class="mb-3"><label class="form-label">Password</label><input id="regPass" type="password" class="form-control" minlength="4" required></div>
      <div class="mb-3"><label class="form-label">Confirm password</label><input id="regPass2" type="password" class="form-control" minlength="4" required></div>
      <button class="btn btn-primary w-100 py-3">Create account</button>
      <div class="alertx mt-3" style="background:#fff7ed;color:#9a3412">Your account must be approved by the master admin before login.</div>
      <div id="authMsg" class="mt-3"></div>
    </form>`);
}

function shell(){
  $("#appHeader,#bottomNav").show(); $("#main").addClass("main-shell");
  const u=user(); const p=profile();
  $("#headerUser").text(u?.username||"");
  $("#drawerUser").html(`<strong>${esc(p?.name||u?.name||"")}</strong><div class="small text-muted">@${esc(u?.username||"")}</div>`);
  $("#adminNav").toggle(u?.role==="admin");
  updateNav();
}
function updateNav(){
  $("#bottomNav button[data-route]").removeClass("active");
  $(`#bottomNav button[data-route="${currentRoute}"]`).addClass("active");
}
function go(route){
  if(!state.session){renderAuth();return}
  currentRoute=route; closeDrawer(); shell();
  const map={dashboard:renderDashboard,add:renderAdd,transfer:renderTransfer,history:renderHistory,profile:renderProfile,backup:renderBackup,admin:renderAdmin};
  (map[route]||renderDashboard)();
  updateNav(); window.scrollTo({top:0,behavior:"smooth"}); resetHeaderTimer();
}

function renderDashboard(){
  const p=profile(), list=txs(), totalInc=list.filter(t=>t.kind==="income").reduce((a,t)=>a+t.amount,0), totalExp=list.filter(t=>t.kind==="expense").reduce((a,t)=>a+t.amount,0);
  const month=new Date().toISOString().slice(0,7);
  const monthExp=list.filter(t=>t.kind==="expense"&&t.date.slice(0,7)===month).reduce((a,t)=>a+t.amount,0);
  $("#main").html(`
    <div class="d-flex align-items-center justify-content-between mb-3"><div><h1 class="page-title">Dashboard</h1><div class="page-subtitle">Your money, clearly tracked.</div></div><button class="btn-soft" data-route="add"><i class="bi bi-plus-lg"></i> Add</button></div>
    <div class="hero mb-3"><div class="small opacity-75">Total available balance</div><div style="font-size:34px;font-weight:900">${money(balance())}</div><div class="mt-2 small opacity-75">Cash ${money(p.cash)} • Bank ${money(p.bank)}</div></div>
    <div class="row g-3">
      <div class="col-6"><div class="cardx stat-card"><div class="stat-icon" style="background:#e0ecff;color:#2563eb"><i class="bi bi-wallet2"></i></div><div class="stat-label">Total Income</div><div class="stat-value">${money(totalInc)}</div></div></div>
      <div class="col-6"><div class="cardx stat-card"><div class="stat-icon" style="background:#dcfce7;color:#15803d"><i class="bi bi-graph-up-arrow"></i></div><div class="stat-label">Total Expense</div><div class="stat-value">${money(totalExp)}</div></div></div>
      <div class="col-6"><div class="cardx stat-card"><div class="stat-icon" style="background:#fee2e2;color:#dc2626"><i class="bi bi-receipt"></i></div><div class="stat-label">This Month Expense</div><div class="stat-value">${money(monthExp)}</div></div></div>
      <div class="col-6"><div class="cardx stat-card"><div class="stat-icon" style="background:#fef3c7;color:#b45309"><i class="bi bi-list-check"></i></div><div class="stat-label">Transactions</div><div class="stat-value">${list.length}</div></div></div>
    </div>
    <div class="section-title">Balances</div>
    <div class="cardx overflow-hidden">
      ${balanceRow("bi-cash-stack","Cash",p.cash,"#dcfce7","#15803d","Cash in hand")}
      ${balanceRow("bi-bank","Bank",p.bank,"#e0ecff","#2563eb","Bank account")}
      ${balanceRow("bi-phone","UPI",p.bank,"#f3e8ff","#7c3aed","Linked to Bank")}
    </div>
    <div class="section-title d-flex justify-content-between"><span>Recent transactions</span><button class="btn btn-sm btn-link text-decoration-none" data-route="history">View all</button></div>
    <div class="cardx overflow-hidden" id="recentBox">${list.slice(0,5).map(txHtml).join("")||`<div class="empty"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No transactions yet.</div>`}</div>
    <div class="section-title">Activity</div>
    <div class="cardx chart-box"><canvas id="miniChart"></canvas></div>`);
  drawChart($("#miniChart")[0],list);
}
function balanceRow(icon,name,value,bg,color,note){return `<div class="balance-row border-bottom"><div class="balance-left"><div class="balance-icon" style="background:${bg};color:${color}"><i class="bi ${icon}"></i></div><div><div class="balance-name">${name}</div><div class="balance-note">${note}</div></div></div><div class="balance-value">${money(value)}</div></div>`}
function txHtml(t){
  const income=t.kind==="income"; const method=t.method==="upi"?"UPI":t.method[0].toUpperCase()+t.method.slice(1);
  return `<div class="tx-item border-bottom"><div class="tx-left"><div class="tx-icon" style="background:${income?"#dcfce7":"#fee2e2"};color:${income?"#15803d":"#dc2626"}"><i class="bi ${income?"bi-arrow-down-left":"bi-arrow-up-right"}"></i></div><div style="min-width:0"><div class="tx-title">${esc(t.note||"Transaction")}</div><div class="tx-meta">${method} • ${new Date(t.date).toLocaleString()}</div></div></div><div class="tx-amount ${income?"income":"expense"}">${income?"+":"-"}${money(t.amount)}</div></div>`
}

function renderAdd(){
  const t=editingId?txs().find(x=>x.id===editingId):null;
  $("#main").html(`<div class="mb-3"><h1 class="page-title">${t?"Edit transaction":"Add transaction"}</h1><div class="page-subtitle">${t?"Update the selected record.":"Income adds money; expense removes it."}</div></div>
  <div class="cardx form-card"><form id="txForm">
    <div class="row g-3">
      <div class="col-12 col-md-6"><label class="form-label">Type</label><select id="txKind" class="form-select"><option value="income">Income</option><option value="expense">Expense</option></select></div>
      <div class="col-12 col-md-6"><label class="form-label">Payment method</label><select id="txMethod" class="form-select"><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI (from Bank)</option></select></div>
      <div class="col-12 col-md-6"><label class="form-label">Amount</label><input id="txAmount" type="number" min="0.01" step="0.01" class="form-control" required></div>
      <div class="col-12 col-md-6"><label class="form-label">Date & time</label><input id="txDate" type="datetime-local" class="form-control" required></div>
      <div class="col-12"><label class="form-label">Note / Description</label><input id="txNote" class="form-control" placeholder="e.g. Salary, grocery, rent" required></div>
      <div class="col-12"><div id="txHelp" class="alertx" style="background:#eef2ff;color:#3730a3"></div></div>
      <div class="col-12 d-flex gap-2"><button class="btn btn-primary">${t?"Update":"Save"} transaction</button>${t?'<button type="button" id="cancelEdit" class="btn btn-light">Cancel</button>':""}</div>
    </div></form></div>`);
  const now=t?new Date(t.date):new Date(); $("#txDate").val(new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16));
  if(t){$("#txKind").val(t.kind);$("#txMethod").val(t.method);$("#txAmount").val(t.amount);$("#txNote").val(t.note)}
  updateTxHelp(); $("#txKind,#txMethod").on("change",updateTxHelp);
}
function updateTxHelp(){
  const kind=$("#txKind").val(), m=$("#txMethod").val();
  let text=kind==="income"?(m==="cash"?"Cash will increase.":"Bank will increase. UPI income is treated as money received in Bank."):(m==="cash"?"Cash will decrease.":"Bank will decrease. UPI expense is deducted from Bank.");
  $("#txHelp").text(text);
}
function applyTx(oldT,newT){
  // Reverse old transaction first, then apply new one.
  const p=profile();
  if(oldT) applyDelta(p,oldT,-1);
  applyDelta(p,newT,1);
  if(p.cash < -0.00001 || p.bank < -0.00001){ if(oldT) applyDelta(p,newT,-1),applyDelta(p,oldT,1); return false; }
  return true;
}
function applyDelta(p,t,mult){
  const delta=t.kind==="income"?1:-1;
  const val=t.amount*delta*mult;
  if(t.method==="cash") p.cash+=val; else p.bank+=val;
}
function renderTransfer(){
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Transfer</h1><div class="page-subtitle">Move money between your own Cash and Bank.</div></div>
  <div class="cardx form-card"><form id="transferForm"><div class="row g-3">
    <div class="col-12 col-md-6"><label class="form-label">From</label><select id="from" class="form-select"><option value="bank">Bank</option><option value="cash">Cash</option></select></div>
    <div class="col-12 col-md-6"><label class="form-label">To</label><select id="to" class="form-select"><option value="cash">Cash</option><option value="bank">Bank</option></select></div>
    <div class="col-12 col-md-6"><label class="form-label">Amount</label><input id="trAmount" type="number" min="0.01" step="0.01" class="form-control" required></div>
    <div class="col-12 col-md-6"><label class="form-label">Note</label><input id="trNote" class="form-control" placeholder="ATM cash withdrawal, deposit..."></div>
    <div class="col-12"><button class="btn btn-primary">Complete transfer</button></div>
  </div></form></div>
  <div class="section-title">How it works</div><div class="cardx p-3"><div class="kpi mb-2"><strong>Bank → Cash</strong><div class="small text-muted">Bank decreases and Cash increases.</div></div><div class="kpi"><strong>Cash → Bank</strong><div class="small text-muted">Cash decreases and Bank increases.</div></div></div>`);
}
function renderHistory(){
  $("#main").html(`<div class="d-flex align-items-end justify-content-between mb-3"><div><h1 class="page-title">History</h1><div class="page-subtitle">All your income, expense and transfers.</div></div></div>
  <div class="cardx filter-bar mb-3"><div class="row"><div class="col-12 col-md-4"><input id="search" class="form-control" placeholder="Search note..."></div><div class="col-6 col-md-2"><select id="kindFilter" class="form-select"><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></select></div><div class="col-6 col-md-2"><select id="methodFilter" class="form-select"><option value="">All methods</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option></select></div><div class="col-6 col-md-2"><input id="fromDate" type="date" class="form-control"></div><div class="col-6 col-md-2"><input id="toDate" type="date" class="form-control"></div></div></div>
  <div class="cardx overflow-hidden" id="historyBox"></div>`);
  renderHistoryList();
  $("#search,#kindFilter,#methodFilter,#fromDate,#toDate").on("input change",renderHistoryList);
}
function renderHistoryList(){
  const s=($("#search").val()||"").toLowerCase(), k=$("#kindFilter").val(), m=$("#methodFilter").val(), fd=$("#fromDate").val(), td=$("#toDate").val();
  let list=txs().filter(t=>(!s||(t.note||"").toLowerCase().includes(s))&&(!k||t.kind===k)&&(!m||t.method===m)&&(!fd||t.date.slice(0,10)>=fd)&&(!td||t.date.slice(0,10)<=td));
  $("#historyBox").html(list.length?list.map(t=>`<div class="tx-item border-bottom"><div class="tx-left"><div class="tx-icon" style="background:${t.kind==="transfer"?"#e0e7ff":t.kind==="income"?"#dcfce7":"#fee2e2"}"><i class="bi ${t.kind==="transfer"?"bi-arrow-left-right":t.kind==="income"?"bi-arrow-down-left":"bi-arrow-up-right"}"></i></div><div><div class="tx-title">${esc(t.note||t.kind)}</div><div class="tx-meta">${esc(t.method.toUpperCase())} • ${new Date(t.date).toLocaleString()}</div></div></div><div class="text-end"><div class="tx-amount ${t.kind==="income"?"income":t.kind==="expense"?"expense":""}">${t.kind==="income"?"+":t.kind==="expense"?"-":"↔"}${money(t.amount)}</div><div class="d-flex gap-1 mt-1"><button class="btn btn-sm btn-light editTx" data-id="${t.id}"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-light text-danger deleteTx" data-id="${t.id}"><i class="bi bi-trash"></i></button></div></div></div>`).join(""):`<div class="empty"><i class="bi bi-search fs-2 d-block mb-2"></i>No records found.</div>`);
}
function renderProfile(){
  const p=profile(),u=user();
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Profile</h1><div class="page-subtitle">Account and starting balances.</div></div>
  <div class="cardx form-card"><form id="profileForm"><div class="row g-3">
    <div class="col-12 col-md-6"><label class="form-label">Full name</label><input id="pName" class="form-control" value="${esc(p.name)}" required></div>
    <div class="col-12 col-md-6"><label class="form-label">Username</label><input class="form-control" value="${esc(u.username)}" disabled></div>
    <div class="col-12"><hr><h6 class="fw-bold">Opening balances</h6><div class="small text-muted mb-2">Use these only for money you already had before starting TraHis.</div></div>
    <div class="col-12 col-md-4"><label class="form-label">Cash</label><input id="pCash" type="number" min="0" step="0.01" class="form-control" value="${p.cash}"></div>
    <div class="col-12 col-md-4"><label class="form-label">Bank</label><input id="pBank" type="number" min="0" step="0.01" class="form-control" value="${p.bank}"></div>
    <div class="col-12 col-md-4"><label class="form-label">UPI</label><input class="form-control" value="${p.bank}" disabled><div class="small text-muted mt-1">Linked to Bank</div></div>
    <div class="col-12"><button class="btn btn-primary">Save profile</button></div>
  </div></form></div>
  <div class="cardx form-card mt-3"><h6 class="fw-bold">Change password</h6><form id="passForm" class="row g-3"><div class="col-md-6"><input id="oldPass" type="password" class="form-control" placeholder="Current password" required></div><div class="col-md-6"><input id="newPass" type="password" class="form-control" placeholder="New password" minlength="4" required></div><div class="col-12"><button class="btn btn-soft">Change password</button></div></form></div>`);
}
function renderBackup(){
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Backup & Restore</h1><div class="page-subtitle">Keep a copy of your local TraHis data.</div></div>
  <div class="row g-3"><div class="col-12 col-md-6"><div class="cardx form-card h-100"><div class="stat-icon" style="background:#e0e7ff;color:#4f46e5"><i class="bi bi-download"></i></div><h5 class="fw-bold">Export backup</h5><p class="text-muted small">Download a JSON backup of your TraHis data.</p><button id="exportBtn" class="btn btn-primary">Download backup</button></div></div>
  <div class="col-12 col-md-6"><div class="cardx form-card h-100"><div class="stat-icon" style="background:#dcfce7;color:#15803d"><i class="bi bi-upload"></i></div><h5 class="fw-bold">Restore backup</h5><p class="text-muted small">Restore a previous JSON backup on this device.</p><button id="restoreBtn" class="btn btn-soft">Choose backup</button><div class="small text-danger mt-2">Restoring replaces current local data.</div></div></div></div>
  <div class="cardx p-3 mt-3"><strong>Privacy</strong><div class="small text-muted mt-1">TraHis stores data in this browser/device only. There is no cloud sync in this version.</div></div>`);
}
function renderAdmin(){
  if(user()?.role!=="admin"){go("dashboard");return}
  const pending=state.users.filter(u=>u.role!=="admin"&& !u.approved), all=state.users.filter(u=>u.role!=="admin");
  $("#main").html(`<div class="mb-3"><h1 class="page-title">Admin</h1><div class="page-subtitle">Approve registered users before they can log in.</div></div>
  <div class="hero mb-3"><div class="small opacity-75">Master admin</div><div style="font-size:22px;font-weight:900">${MASTER.username}</div><div class="small opacity-75 mt-1">Pending approvals: ${pending.length}</div></div>
  <div class="section-title">Registered users</div><div class="row g-3">${all.length?all.map(u=>`<div class="col-12 col-md-6"><div class="cardx admin-card"><div class="d-flex gap-3 align-items-center"><div class="avatar">${esc((u.name||u.username)[0].toUpperCase())}</div><div class="flex-grow-1"><strong>${esc(u.name)}</strong><div class="small text-muted">@${esc(u.username)}</div><div class="small mt-1">${u.approved?'<span class="text-success fw-bold">Approved</span>':'<span class="text-warning fw-bold">Pending</span>'}</div></div></div><div class="admin-actions mt-3">${u.approved?`<button class="btn btn-sm btn-outline-warning revokeUser" data-id="${u.id}">Revoke</button>`:`<button class="btn btn-sm btn-success approveUser" data-id="${u.id}">Approve</button>`}<button class="btn btn-sm btn-outline-danger deleteUser" data-id="${u.id}">Delete</button></div></div></div>`).join(""):`<div class="col-12"><div class="cardx empty">No registered users.</div></div>`}</div>`);
}

function doLogin(username,password,remember){
  const u=state.users.find(x=>x.username.toLowerCase()===username.toLowerCase());
  if(!u||u.password!==password) return "Invalid username or password.";
  if(!u.approved) return "Your account is waiting for master admin approval.";
  state.session=u.id; save();
  if(remember)localStorage.setItem("trahis_remember",JSON.stringify({username,password})); else localStorage.removeItem("trahis_remember");
  return "";
}
function logout(){
  if(!confirm("Are you sure you want to logout?")) return;
  state.session=null; save(); closeDrawer(); renderAuth();
}
function openDrawer(){ $("#appDrawer,#drawerOverlay").addClass("open"); resetHeaderTimer() }
function closeDrawer(){ $("#appDrawer,#drawerOverlay").removeClass("open") }
function resetHeaderTimer(){
  clearTimeout(headerTimer); $("#appHeader").removeClass("hidden");
  if(state.session) headerTimer=setTimeout(()=>$("#appHeader").addClass("hidden"),4000);
}
function headerActivity(){ $("#appHeader").removeClass("hidden"); resetHeaderTimer() }

function drawChart(canvas,list){
  if(!canvas)return; const ctx=canvas.getContext("2d"),dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  const days=7, vals=Array(days).fill(0); for(const t of list){if(t.kind!=="expense")continue;const age=Math.floor((Date.now()-new Date(t.date))/86400000);if(age>=0&&age<days)vals[days-1-age]+=t.amount}
  const max=Math.max(...vals,1), pad=24, bw=(w-pad*2)/days*.62, gap=(w-pad*2)/days;
  ctx.strokeStyle="#e2e8f0";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad,10);ctx.lineTo(pad,h-pad);ctx.lineTo(w-pad,h-pad);ctx.stroke();
  vals.forEach((v,i)=>{const bh=(h-pad-22)*(v/max),x=pad+i*gap+(gap-bw)/2,y=h-pad-bh;ctx.fillStyle="#4f46e5";ctx.roundRect(x,y,bw,bh,7);ctx.fill();ctx.fillStyle="#64748b";ctx.font="10px system-ui";ctx.textAlign="center";ctx.fillText(["6d","5d","4d","3d","2d","Yest","Today"][i],x+bw/2,h-7)});
}

$(document).on("click","[data-route]",function(e){e.preventDefault();go($(this).data("route"))});
$(document).on("click","[data-auth]",function(){ $(".auth-tabs button").removeClass("active");$(this).addClass("active");$(this).data("auth")==="login"?renderLogin():renderRegister() });
$(document).on("submit","#loginForm",function(e){e.preventDefault();const err=doLogin($("#loginUser").val().trim(),$("#loginPass").val(),$("#remember").prop("checked"));if(err)$("#authMsg").html(`<div class="alertx" style="background:#fff1f2;color:#be123c">${esc(err)}</div>`);else go("dashboard")});
$(document).on("submit","#registerForm",function(e){e.preventDefault();const name=$("#regName").val().trim(),username=$("#regUser").val().trim(),pass=$("#regPass").val(),pass2=$("#regPass2").val();if(pass!==pass2){$("#authMsg").html('<div class="alertx" style="background:#fff1f2;color:#be123c">Passwords do not match.</div>');return}if(state.users.some(u=>u.username.toLowerCase()===username.toLowerCase())){$("#authMsg").html('<div class="alertx" style="background:#fff1f2;color:#be123c">Username already exists.</div>');return}const id=uid();state.users.push({id,name,username,password:pass,role:"user",approved:false,createdAt:new Date().toISOString()});state.profiles[id]={name,username,cash:0,bank:0,upi:0};save();$("#authMsg").html('<div class="alertx" style="background:#ecfdf5;color:#166534">Registration submitted. Master admin approval is required.</div>');setTimeout(renderLogin,900)});
$(document).on("submit","#txForm",function(e){e.preventDefault();const t={id:editingId||uid(),userId:state.session,kind:$("#txKind").val(),method:$("#txMethod").val(),amount:Number($("#txAmount").val()),note:$("#txNote").val().trim(),date:new Date($("#txDate").val()).toISOString()};if(!(t.amount>0))return showToast("Enter a valid amount.","danger");const old=editingId?txs().find(x=>x.id===editingId):null;if(!applyTx(old,t)){showToast("Insufficient balance for this transaction.","danger");return}if(old)state.transactions=state.transactions.filter(x=>x.id!==old.id);state.transactions.push(t);save();editingId=null;showToast("Transaction saved");go("history")});
$(document).on("click","#cancelEdit",()=>{editingId=null;go("history")});
$(document).on("click",".editTx",function(){editingId=$(this).data("id");go("add")});
$(document).on("click",".deleteTx",function(){const id=$(this).data("id"),t=txs().find(x=>x.id===id);if(!t||!confirm("Delete this transaction? The balance will be reversed."))return;const p=profile();applyDelta(p,t,-1);state.transactions=state.transactions.filter(x=>x.id!==id);save();renderHistoryList();showToast("Transaction deleted")});
$(document).on("submit","#transferForm",function(e){e.preventDefault();const from=$("#from").val(),to=$("#to").val(),amount=Number($("#trAmount").val());if(from===to)return showToast("From and To must be different.","danger");if(!(amount>0))return showToast("Enter a valid amount.","danger");const p=profile();if(p[from]<amount)return showToast("Insufficient balance.","danger");p[from]-=amount;p[to]+=amount;state.transactions.push({id:uid(),userId:state.session,kind:"transfer",method:"bank",amount,note:$("#trNote").val().trim()||`${from} → ${to}`,date:new Date().toISOString(),from,to});save();showToast("Transfer completed");go("history")});
$(document).on("submit","#profileForm",function(e){e.preventDefault();const p=profile(),u=user();p.name=$("#pName").val().trim();p.cash=Number($("#pCash").val())||0;p.bank=Number($("#pBank").val())||0;p.upi=p.bank;u.name=p.name;save();showToast("Profile saved");shell();renderProfile()});
$(document).on("submit","#passForm",function(e){e.preventDefault();const u=user();if($("#oldPass").val()!==u.password)return showToast("Current password is incorrect.","danger");u.password=$("#newPass").val();save();showToast("Password changed")});
$(document).on("click","#exportBtn",function(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`trahis-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
$(document).on("click","#restoreBtn",()=>$("#restoreFile").click());
$(document).on("change","#restoreFile",function(){const f=this.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.users||!x.profiles||!x.transactions)throw Error();if(!confirm("Restore this backup? Current local data will be replaced."))return;state=x;save();if(!state.session||!user()){state.session=null;renderAuth()}else go("dashboard");showToast("Backup restored")}catch(e){showToast("Invalid backup file.","danger")}this.value=""};r.readAsText(f)});
$(document).on("click",".approveUser",function(){const u=state.users.find(x=>x.id===$(this).data("id"));if(u){u.approved=true;save();renderAdmin();showToast("User approved")}});
$(document).on("click",".revokeUser",function(){const u=state.users.find(x=>x.id===$(this).data("id"));if(u){u.approved=false;save();renderAdmin();showToast("User access revoked")}});
$(document).on("click",".deleteUser",function(){const id=$(this).data("id");if(!confirm("Delete this user and all their local records?"))return;state.users=state.users.filter(x=>x.id!==id);delete state.profiles[id];state.transactions=state.transactions.filter(t=>t.userId!==id);save();renderAdmin();showToast("User deleted")});
$("#headerMenuBtn").on("click",openDrawer);
$("#closeDrawer,#drawerOverlay").on("click",closeDrawer);
$("#logoutBtn").on("click",logout);
$(window).on("scroll touchstart mousemove keydown click",function(){
  const y=window.scrollY;
  if(y<lastScrollY-4){$("#appHeader").removeClass("hidden");}
  lastScrollY=y; resetHeaderTimer();
});
$(window).on("resize",()=>{if(currentRoute==="dashboard")renderDashboard()});

initPWA();
if(state.session && user() && user().approved){go("dashboard")}else{state.session=null;save();renderAuth()}
})();