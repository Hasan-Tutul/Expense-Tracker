/* Shared data layer: local storage + optional Google Sheet sync */
(function(){
'use strict';
const KEY='hasan-expenses-v1',CK='hasan-sync-v1',WARN=2;
const CATS=['খাবার','বাজার','যাতায়াত','বাসা ভাড়া','বিল','মোবাইল ও ইন্টারনেট','বিজনেস','স্বাস্থ্য','বিনোদন','অন্যান্য'];
const MONTHS=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const $=id=>document.getElementById(id);
const bn=n=>Math.round(n).toLocaleString('bn-BD');
const money=n=>'৳'+bn(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+p2(d.getMonth()+1);
const todayStr=()=>{const d=new Date();return ymd(d)+'-'+p2(d.getDate())};
const daysLeft=s=>Math.round((new Date(s+'T00:00:00')-new Date(todayStr()+'T00:00:00'))/864e5);
const fmtDate=s=>{const d=new Date(s+'T00:00:00');return d.getDate().toLocaleString('bn-BD')+' '+MONTHS[d.getMonth()]+' '+d.getFullYear().toLocaleString('bn-BD',{useGrouping:false})};

const norm=o=>{const s=Object.assign({expenses:[],recurring:[],dues:[],budget:0,updated:0},o||{});['expenses','recurring','dues'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[]});return s};
let S,C={url:'',key:''};
try{S=norm(JSON.parse(localStorage.getItem(KEY)))}catch(e){S=norm()}
try{Object.assign(C,JSON.parse(localStorage.getItem(CK)))}catch(e){}

function local(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){alert('সেভ করা যায়নি। ব্রাউজারের স্টোরেজ বন্ধ থাকতে পারে।')}}
function status(t,bad){const el=$('sync');if(el){el.textContent=t;el.className='sync'+(bad?' bad':'')}}
const OK='✓ গুগল শিটের সাথে সিঙ্ক ঠিক আছে';
async function call(opts,q){
  const r=await fetch(C.url+(q||''),opts);
  const j=await r.json();
  if(j.error)throw new Error(j.error==='wrong key'?'পাসওয়ার্ড (গোপন কী) মেলেনি':j.error);
  return j;
}
let pt,rerender=()=>{};
function push(){clearTimeout(pt);if(C.url&&C.key)pt=setTimeout(pushNow,600)}
async function pushNow(){
  status('সিঙ্ক হচ্ছে…');
  try{await call({method:'POST',body:JSON.stringify({key:C.key,data:S})});status(OK)}
  catch(e){status('সিঙ্ক হয়নি: '+e.message+' (ডেটা এই ডিভাইসে সেভ আছে)',1)}
}
async function pull(){
  if(!C.url||!C.key){status('শুধু এই ডিভাইসে সেভ হচ্ছে');return}
  status('সিঙ্ক হচ্ছে…');
  try{
    const j=await call({},'?key='+encodeURIComponent(C.key));
    const ru=(j.data&&j.data.updated)||0;
    if(ru>(S.updated||0)){S=norm(j.data);local();rerender();badge();status(OK)}
    else if(!j.data||(S.updated||0)>ru){if(!S.updated){S.updated=Date.now();local()}await pushNow()}
    else status(OK);
  }catch(e){status('সিঙ্ক হয়নি: '+e.message,1)}
}
function badge(){
  const e=$('dotn');if(!e)return;
  const n=urgent().length;e.textContent=n?bn(n):'';e.style.display=n?'inline-block':'none';
}
function commit(){S.updated=Date.now();local();push();badge()}
const urgent=()=>S.dues.filter(d=>!d.done&&daysLeft(d.due)<=WARN);
function monthItems(key){
  const a=S.expenses.filter(e=>e.date.startsWith(key));
  S.recurring.forEach(r=>{
    if(r.from<=key&&(!r.to||key<=r.to))a.push({id:'r'+r.id,rid:r.id,amt:r.amt,cat:r.cat,note:r.note,date:key+'-'+p2(Math.min(r.day||1,28)),rec:true});
  });
  return a;
}
let tt;
function toast(msg){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),3200)}

const CSS=`:root{--bg:#eef3f1;--card:#fff;--ink:#12201b;--mute:#5d6f68;--line:#d9e3df;--g:#0b5d46;--g2:#d8eee6;--red:#d9402a;--onG:#fff;--hero:#0b5d46;--onHero:#fff;--fill:#fff;--r:14px}
@media(prefers-color-scheme:dark){:root{--bg:#0d1714;--card:#15231f;--ink:#e6f0ec;--mute:#92a89f;--line:#26382f;--g:#4fd1a1;--g2:#173a2e;--red:#ff7a63;--onG:#07201a;--hero:#173a2e;--onHero:#e6f0ec;--fill:#4fd1a1}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Hind Siliguri",system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:16px 16px 80px}
nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 0 12px}
nav a{padding:7px 13px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--ink);text-decoration:none;font-size:14px;font-weight:500}
nav a.on{background:var(--g);color:var(--onG);border-color:var(--g)}
.dot{background:var(--red);color:#fff;border-radius:99px;font-size:12px;padding:0 6px;margin-left:5px;display:none}
.sync{font-size:12px;color:var(--mute);width:100%}.sync.bad{color:var(--red)}
header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0 14px}
h1{font-size:20px;margin:0;font-weight:700}h2{font-size:16px;margin:0 0 12px}
.month{display:flex;align-items:center;gap:6px}
.month button{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:18px;cursor:pointer}
.month b{min-width:110px;text-align:center}
.hero{background:var(--hero);color:var(--onHero);border-radius:var(--r);padding:22px 20px}
.hero small{opacity:.8;font-size:14px}
.total{font-size:clamp(40px,12vw,64px);font-weight:700;line-height:1.1;margin:2px 0 12px}
.bar{height:8px;border-radius:8px;background:rgba(128,128,128,.3);overflow:hidden}
.bar i{display:block;height:100%;background:var(--fill);border-radius:8px;transition:width .3s}
.hero.over .bar i{background:#ffb4a6}
.hero .row{display:flex;justify-content:space-between;font-size:14px;margin-top:8px;gap:8px;flex-wrap:wrap}
.hero button{background:none;border:0;color:inherit;text-decoration:underline;cursor:pointer;font:inherit;padding:0}
section,.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px;margin-top:14px}
.banner{display:block;margin-bottom:14px;padding:12px 14px;border-radius:var(--r);background:var(--red);color:#fff;text-decoration:none;font-weight:600}
form{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.full{grid-column:1/-1}
label{font-size:13px;color:var(--mute);display:block;margin-bottom:2px}
input,select{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit}
input:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--g);outline-offset:2px}
.add{background:var(--g);color:var(--onG);border:0;border-radius:10px;padding:12px;font:inherit;font-weight:600;cursor:pointer}
.ghost{background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:12px;font:inherit;cursor:pointer}
.tabs{display:flex;gap:6px;margin-bottom:12px}
.tabs button{flex:1;padding:9px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;cursor:pointer}
.tabs button.on{background:var(--g2);border-color:var(--g);font-weight:600}
.cat{display:grid;grid-template-columns:96px 1fr auto;gap:10px;align-items:center;margin:8px 0;font-size:14px}
.cat .t{height:10px;background:var(--g2);border-radius:10px;overflow:hidden}
.cat .t i{display:block;height:100%;background:var(--g);border-radius:10px}
.item{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line)}
.item:first-of-type{border-top:0}
.item .n{font-weight:500}.item .m{font-size:13px;color:var(--mute)}
.item .a{font-weight:600;white-space:nowrap;text-align:right}
.item button,.lnk{background:none;border:0;color:var(--red);cursor:pointer;font:inherit;font-size:13px;padding:0}
.tag{font-size:11px;background:var(--g2);color:var(--g);border-radius:6px;padding:1px 6px;margin-left:4px}
.item.new{animation:flash 1.6s}
@keyframes flash{0%,60%{background:var(--g2)}100%{background:transparent}}
.empty{color:var(--mute);text-align:center;padding:18px 0}
.tools{display:flex;gap:8px;flex-wrap:wrap}
.tools button,.tools label{padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit;font-size:14px;cursor:pointer;margin:0}
.note{font-size:13px;color:var(--mute);margin:10px 0 0}
.toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,80px);background:var(--g);color:var(--onG);padding:12px 18px;border-radius:12px;font-weight:600;opacity:0;transition:.25s;z-index:9;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw;text-align:center}
.toast.show{transform:translate(-50%,0);opacity:1}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px}
.stat small{display:block;font-size:13px;color:var(--mute)}.stat b{font-size:24px}
.stat.get b{color:var(--g)}.stat.pay b{color:var(--red)}
.due{padding:12px 0;border-top:1px solid var(--line)}
.due:first-of-type{border-top:0}
.due .top{display:flex;justify-content:space-between;gap:10px}
.due .who{font-weight:600}.due .amt{font-weight:700;white-space:nowrap}
.due .m{font-size:13px;color:var(--mute)}
.due .st{display:inline-block;font-size:12px;border-radius:6px;padding:1px 8px;margin-top:4px;background:var(--g2);color:var(--g)}
.due.warn .st{background:#ffe3a3;color:#6b4a00}
.due.bad .st{background:var(--red);color:#fff}
.due .acts{display:flex;gap:12px;margin-top:6px;flex-wrap:wrap}
.due .acts button{background:none;border:0;color:var(--g);cursor:pointer;font:inherit;font-size:14px;padding:0;font-weight:500}
.due .acts button.x{color:var(--red);font-weight:400}
.pri{border:2px solid var(--red)}.pri h2{color:var(--red)}
details summary{cursor:pointer;font-weight:600}
dialog{border:1px solid var(--line);border-radius:var(--r);background:var(--card);color:var(--ink);max-width:340px;width:90vw}
dialog::backdrop{background:rgba(0,0,0,.45)}
.chart{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;align-items:end;height:170px}
.col{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:0}
.col i{display:block;width:100%;background:var(--g);border-radius:6px 6px 0 0;min-height:2px}
.col.top i{background:var(--red)}
.col span{font-size:11px;color:var(--mute);margin-top:4px;white-space:nowrap}
.stat.big{grid-column:1/-1;background:var(--hero);color:var(--onHero);border:0}
.stat.big small{color:inherit;opacity:.8}.stat.big b{font-size:clamp(36px,10vw,52px);line-height:1.15}
@media(prefers-reduced-motion:reduce){.item.new{animation:none}.toast,.bar i{transition:none}}`;

function start(fn){
  const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap';document.head.appendChild(l);
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const p=location.pathname,pg=p.endsWith('dues.html')?1:p.endsWith('report.html')?2:0;
  const nav=document.createElement('nav');
  nav.innerHTML=[['index.html','খাতা'],['dues.html','লেনদেন'],['report.html','রিপোর্ট']].map((x,i)=>`<a href="${x[0]}"${i===pg?' class="on"':''}>${x[1]}${i===1?'<span class="dot" id="dotn"></span>':''}</a>`).join('')+'<span class="sync" id="sync"></span>';
  document.querySelector('main').prepend(nav);
  const t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t);
  rerender=()=>{fn();badge()};
  rerender();
  pull();
}
window.Store={get S(){return S},set(o){S=norm(o)},commit,CATS,MONTHS,WARN,$,bn,money,esc,p2,ymd,todayStr,daysLeft,fmtDate,monthItems,urgent,start,toast,sync:pull,cfg:()=>C,setCfg(u,k){C={url:String(u).trim(),key:String(k).trim()};try{localStorage.setItem(CK,JSON.stringify(C))}catch(e){}}};
})();
