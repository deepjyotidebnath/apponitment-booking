/* ---------- Config: edit doctors here. days: 0=Sun ... 6=Sat. hours in 24h "HH:MM" ---------- */
const DOCTORS=[
 {id:'d1',name:'Dr. Anil Sharma',spec:'General Physician',fee:500,days:[1,2,3,4,5,6],win:[['10:00','13:00'],['17:00','20:00']],slot:15},
 {id:'d2',name:'Dr. Priya Mukherjee',spec:'Gynaecologist',fee:800,days:[1,3,5],win:[['10:00','14:00']],slot:20},
 {id:'d3',name:'Dr. Rajesh Gupta',spec:'Cardiologist',fee:1000,days:[2,4,6],win:[['11:00','15:00']],slot:20},
 {id:'d4',name:'Dr. Sneha Das',spec:'Paediatrician',fee:600,days:[1,2,3,4,5,6],win:[['16:00','20:00']],slot:15},
 {id:'d5',name:'Dr. Amit Roy',spec:'Orthopaedic',fee:700,days:[1,2,3,4,5],win:[['09:30','12:30']],slot:20}];
const DAYS_AHEAD=21, ADMIN_PIN='1234', KEY='appt_bookings_v2';
const DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ---------- Storage ---------- */
let mem=[];
const load=()=>{try{const r=localStorage.getItem(KEY);return r?JSON.parse(r):mem}catch(e){return mem}};
const save=l=>{mem=l;try{localStorage.setItem(KEY,JSON.stringify(l))}catch(e){}};

/* ---------- Helpers ---------- */
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const mins=s=>{const[h,m]=s.split(':').map(Number);return h*60+m};
const fmt=m=>{const h=Math.floor(m/60),ap=h>=12?'PM':'AM';return `${h%12||12}:${pad(m%60)} ${ap}`};
const rupee=n=>'₹'+n.toLocaleString('en-IN');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const docOf=id=>DOCTORS.find(d=>d.id===id);
const longDate=s=>new Date(s+'T00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
const daysText=d=>d.days.length===6&&!d.days.includes(0)?'Mon–Sat':d.days.map(x=>DN[x]).join(', ');
const timesText=d=>d.win.map(w=>`${fmt(mins(w[0]))} – ${fmt(mins(w[1]))}`).join(' & ');
const st={doc:null,date:null,time:null};

/* ---------- Availability ---------- */
const isTaken=(docId,date,start)=>load().some(b=>b.doctor===docId&&b.date===date&&b.start===start);
const nowMinutes=date=>{const n=new Date();return iso(n)===date?n.getHours()*60+n.getMinutes():-1};
function slotsFor(d){
  const out=[];
  d.win.forEach(w=>{for(let t=mins(w[0]);t+d.slot<=mins(w[1]);t+=d.slot)out.push(t)});
  return out;
}

/* ---------- Render: booking ---------- */
function renderDocs(){
  $('docs').innerHTML=DOCTORS.map(d=>`<button class="doc ${st.doc===d.id?'on':''}" data-id="${d.id}">
    <b>${d.name}</b><span class="sp">${d.spec}</span><br>
    <span class="fee">Fee ${rupee(d.fee)}</span>
    <small>${daysText(d)}</small><small>${timesText(d)}</small></button>`).join('');
  $('docs').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    st.doc=b.dataset.id;st.time=null;
    const d=docOf(st.doc);if(st.date&&!d.days.includes(new Date(st.date+'T00:00').getDay()))st.date=null;
    renderDocs();renderDates();renderSlots();renderSummary();
  });
}
function renderDates(){
  const box=$('dates');
  if(!st.doc){box.innerHTML='';$('dateHint').style.display='';return}
  $('dateHint').style.display='none';
  const d0=docOf(st.doc),base=new Date();base.setHours(0,0,0,0);let html='';
  for(let i=0;i<DAYS_AHEAD;i++){
    const x=new Date(base);x.setDate(base.getDate()+i);
    const off=!d0.days.includes(x.getDay());
    html+=`<button class="date ${st.date===iso(x)?'on':''}" data-d="${iso(x)}" ${off?'disabled title="Doctor not available"':''}><small>${DN[x.getDay()]}</small><strong>${x.getDate()}</strong><small>${x.toLocaleDateString('en-IN',{month:'short'})}</small></button>`;
  }
  box.innerHTML=html;
  box.querySelectorAll('button:not(:disabled)').forEach(b=>b.onclick=()=>{st.date=b.dataset.d;st.time=null;renderDates();renderSlots();renderSummary()});
}
function renderSlots(){
  const box=$('slots');
  if(!st.doc||!st.date){box.innerHTML='';$('slotHint').style.display='';return}
  $('slotHint').style.display='none';
  const d=docOf(st.doc),now=nowMinutes(st.date);
  box.innerHTML=slotsFor(d).map(t=>{
    const off=isTaken(d.id,st.date,t)||t<=now;
    return `<button class="slot ${st.time===t?'on':''}" data-t="${t}" ${off?'disabled':''}>${fmt(t)}</button>`}).join('');
  box.querySelectorAll('button:not(:disabled)').forEach(b=>b.onclick=()=>{st.time=+b.dataset.t;renderSlots();renderSummary()});
}
function renderSummary(){
  const el=$('summary');
  if(st.doc&&st.date&&st.time!=null){
    const d=docOf(st.doc);el.classList.remove('hidden');
    el.innerHTML=`<b>${d.name}</b> (${d.spec})<br>${longDate(st.date)}, ${fmt(st.time)}<br>Consultation fee: <b>${rupee(d.fee)}</b> (pay at the clinic)`;
  }else el.classList.add('hidden');
}

/* ---------- Submit ---------- */
$('submit').onclick=()=>{
  const name=$('name').value.trim(),age=$('age').value.trim(),phone=$('phone').value.trim();
  const err=m=>{$('err').textContent=m};
  if(!st.doc)return err('Choose a doctor.');
  if(!st.date)return err('Pick a date.');
  if(st.time==null)return err('Pick a time.');
  if(name.length<2)return err('Enter the patient name.');
  if(!age||+age<0||+age>120)return err('Enter a valid age.');
  if(!/^[6-9]\d{9}$/.test(phone))return err('Enter a valid 10-digit Indian mobile number.');
  if(isTaken(st.doc,st.date,st.time)){renderSlots();return err('That slot was just taken. Pick another.')}
  const b={id:'B'+Date.now().toString(36).toUpperCase(),doctor:st.doc,date:st.date,start:st.time,name,age,phone,note:$('note').value.trim(),created:Date.now()};
  const l=load();l.push(b);save(l);err('');
  const d=docOf(b.doctor);
  $('confirm').innerHTML=`<div class="ok" role="status"><b>Booking confirmed, ${esc(name)}.</b><br>${d.name} (${d.spec}) on ${longDate(b.date)} at ${fmt(b.start)}.<br>Fee: ${rupee(d.fee)}. Reference: <b>${b.id}</b>.<br>To view or cancel, use My bookings with +91 ${esc(phone)}.</div>`;
  st.time=null;['name','age','phone','note'].forEach(i=>$(i).value='');
  renderSlots();renderSummary();window.scrollTo({top:0,behavior:'smooth'});
};

/* ---------- Lists ---------- */
function rowHtml(b,admin){
  const d=docOf(b.doctor);
  return `<div class="row"><div><b>${d.name}</b> · ${longDate(b.date)}, ${fmt(b.start)}<br><small>${admin?esc(b.name)+', '+esc(b.age)+' yrs · +91 '+esc(b.phone)+(b.note?' · '+esc(b.note):'')+' · ':''}${rupee(d.fee)} · Ref ${b.id}${admin?'<br>Placed '+new Date(b.created).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):''}</small></div><button class="btn ghost" data-cancel="${b.id}">Cancel</button></div>`;
}
const byAppt=(a,b)=>a.date===b.date?a.start-b.start:a.date<b.date?-1:1;
function wireCancel(el,refresh){
  el.querySelectorAll('[data-cancel]').forEach(btn=>btn.onclick=()=>{
    if(!confirm('Cancel this appointment?'))return;
    save(load().filter(b=>b.id!==btn.dataset.cancel));refresh();renderSlots();
  });
}
function renderMine(){
  const p=$('lookup').value.trim();
  const l=load().filter(b=>b.phone===p).sort(byAppt);
  $('mineList').innerHTML=!p?'':l.length?l.map(b=>rowHtml(b,false)).join(''):'<div class="empty">No bookings found for that number.</div>';
  wireCancel($('mineList'),renderMine);
}
function renderAdmin(){
  const mode=$('sortBy').value,f=$('fDoc').value;
  const l=load().filter(b=>f==='all'||b.doctor===f).sort((a,b)=>
    mode==='placedAsc'?a.created-b.created:mode==='apptAsc'?byAppt(a,b):b.created-a.created);
  $('adminList').innerHTML=l.length?l.map(b=>rowHtml(b,true)).join(''):'<div class="empty">No bookings yet.</div>';
  wireCancel($('adminList'),renderAdmin);
}
$('fDoc').innerHTML='<option value="all">All doctors</option>'+DOCTORS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
$('fDoc').onchange=renderAdmin;
$('sortBy').onchange=renderAdmin;
$('find').onclick=renderMine;
$('enter').onclick=()=>{
  if($('pin').value===ADMIN_PIN){$('login').classList.add('hidden');$('panel').classList.remove('hidden');$('pinErr').textContent='';renderAdmin()}
  else $('pinErr').textContent='Wrong PIN. Try again.';
};
$('wipe').onclick=()=>{if(confirm('Delete every booking? This cannot be undone.')){save([]);renderAdmin();renderSlots()}};

/* ---------- Tabs ---------- */
['book','mine','admin'].forEach(k=>$('t-'+k).onclick=()=>{
  ['book','mine','admin'].forEach(x=>{$('v-'+x).classList.toggle('hidden',x!==k);$('t-'+x).classList.toggle('on',x===k)});
  if(k==='book')renderSlots();
});

renderDocs();renderDates();renderSlots();
