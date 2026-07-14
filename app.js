"use strict";
const S = {
  a:0.20, L:0.40, f:0.11,
  V:24, Vref:24, copTravel:0.03,   // speed, reference speed, CoP aft-travel scale (metres)
  Wr:85, Wb:7.6,
  boardLen:1.55, boardCG:0.72, padCenter:0.82, padLen:0.42,
  trackLen:0.28, trackSetback:0.58,   // track length, and tail-to-aft-end-of-track (metres)
  trackFront:0.58, trackBack:0.86,    // derived: aft/fwd ends of track, from tail
  mastPos:0.64,
  rX:null   // rider position measured from tail (board frame), metres
};

// aft end of track = setback from tail; fwd end = setback + length
function recomputeTrack(){
  S.trackFront = S.trackSetback;
  S.trackBack  = S.trackSetback + S.trackLen;
}
const g = 9.81;
const $ = id => document.getElementById(id);
const svg = $("scene");

function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }

// ---- unit display (internal state stays metres / km/h; convert at the edge) ----
S.units = {len:"cm", spd:"kmh"};
try{ const u=JSON.parse(localStorage.getItem("fbf-units")); if(u&&u.len&&u.spd) S.units=u; }catch(e){}
const IN=0.0254;                                 // metres per inch
const trimNum=(x,dp)=>String(+x.toFixed(dp));    // toFixed without trailing zeros
function fmtLen(m,dp){                            // metres -> current length unit
  if(S.units.len==="ftin"){
    const inch=m/IN, sign=inch<0?"-":"", a=Math.abs(inch);
    if(a>=12){ const ft=Math.floor(a/12); return `${sign}${ft}′ ${(a-ft*12).toFixed(1)}″`; }
    return `${sign}${a.toFixed(1)}″`;
  }
  return trimNum(m*100,dp)+" cm";
}
function fmtSpd(kmh){                             // km/h -> current speed unit
  if(S.units.spd==="mph") return trimNum(kmh*0.621371,1)+" mph";
  if(S.units.spd==="kn")  return trimNum(kmh*0.539957,1)+" kn";
  return trimNum(kmh,1)+" km/h";
}
const lenToM   = x => S.units.len==="ftin" ? x*IN : x/100;   // input number -> metres
const mToLenNum= m => S.units.len==="ftin" ? m/IN : m*100;   // metres -> input number

// Front-wing centre of pressure drifts with angle of attack (i.e. speed): faster ->
// lower AoA -> CoP aft -> smaller effective offset. Ratio-based, so speed units cancel.
function effA(){
  const q = (S.Vref/S.V)**2;            // proportional to lift-coefficient ratio
  return S.a - S.copTravel*(1 - q);
}

function derive(){
  S.mastPos = clamp(S.mastPos, S.trackFront, S.trackBack);
  const W = S.Wr + S.Wb;
  const b = S.boardCG - S.mastPos;      // board CG fwd of mast base
  const a_eff = effA();                 // speed-adjusted front-wing lift point
  const u_CL = a_eff + S.f*S.L;         // net lift fwd of mast base
  const u_r_star = (W*u_CL - S.Wb*b)/S.Wr;
  const X_r_star = S.mastPos + u_r_star;
  const mastNeeded = S.padCenter - u_r_star;   // mast-from-tail to centre stance on pad
  return {W,b,a_eff,u_CL,u_r_star,X_r_star,mastNeeded,
    S_force:S.f*W, L_front:W*(1+S.f)};
}

// pixel mapping over the u-frame (forward of mast base), forward = +u = right
let MAP={};
function computeMap(){
  const tailU = -S.mastPos, noseU = S.boardLen - S.mastPos;
  const stabU = S.a - S.L;
  const lo = Math.min(tailU, stabU) - 0.06;
  const hi = Math.max(noseU, S.a) + 0.06;
  const marginL=54, marginR=36, Wpx=960;
  MAP.lo=lo; MAP.scale=(Wpx-marginL-marginR)/(hi-lo); MAP.marginL=marginL;
}
const px = u => MAP.marginL + (u-MAP.lo)*MAP.scale;
const inv = X => MAP.lo + (X-MAP.marginL)/MAP.scale;

const Y={deckTop:150, deck:168, boardBot:198, water:300, fuse:452, wing:452};

function arrow(x,y0,y1,color,w){
  const dir=y1<y0?-1:1, head=9;
  return `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`+
         `<path d="M ${x-6} ${y1+dir*head} L ${x} ${y1} L ${x+6} ${y1+dir*head} Z" fill="${color}"/>`;
}

function render(){
  const d=derive();
  computeMap();
  if(S.rX===null) S.rX = d.X_r_star;

  const u_r = S.rX - S.mastPos;
  const W=d.W;
  const u_cg = (S.Wr*u_r + S.Wb*d.b)/W;
  const off = u_cg - d.u_CL;                 // + => CG fwd of lift => nose down
  const moment = W*g*off;
  const tiltDeg = clamp(off*100*3.0, -13, 13);

  const Lref = 78/S.Wr;
  const len = fN => Math.min(150, Math.max(16, fN*Lref));

  // key u positions
  const u_f=S.a, u_s=S.a-S.L, u_CL=d.u_CL, u_b=d.b;
  const tailU=-S.mastPos, noseU=S.boardLen-S.mastPos;
  const padHalf=S.padLen/2, padCU=S.padCenter-S.mastPos;
  const padAU=padCU-padHalf, padBU=padCU+padHalf;
  const trkAU=S.trackFront-S.mastPos, trkBU=S.trackBack-S.mastPos;

  const xf=px(u_f), xs=px(u_s), xcl=px(u_CL), xb=px(u_b), xr=px(u_r);
  const xfl=px(d.a_eff);   // where front-wing lift acts (centre of pressure, shifts with speed)
  const xmast=px(0);

  const pivX=xcl, pivY=Y.wing;
  const rad=tiltDeg*Math.PI/180, cA=Math.cos(rad), sA=Math.sin(rad);
  const rot=(x,y)=>[pivX+(x-pivX)*cA-(y-pivY)*sA, pivY+(x-pivX)*sA+(y-pivY)*cA];

  let g_="";
  // world layer
  g_+=`<rect x="0" y="${Y.water}" width="960" height="${560-Y.water}" fill="#eef5f6"/>`;
  for(let gx=54; gx<=924; gx+=42) g_+=`<line x1="${gx}" y1="120" x2="${gx}" y2="${Y.water}" stroke="var(--grid)" stroke-width="1"/>`;
  g_+=`<line x1="0" y1="${Y.water}" x2="960" y2="${Y.water}" stroke="var(--water)" stroke-width="2"/>`;
  g_+=`<text x="14" y="${Y.water-8}" class="mono" font-size="11" fill="var(--water)">WATERLINE</text>`;

  // rigid structure (rotates with pitch)
  const bt=px(tailU), bn=px(noseU);
  let body="";
  body+=`<path d="M ${bt} ${Y.deck}
      Q ${bt-6} ${Y.deckTop+4} ${bt+14} ${Y.deckTop}
      L ${bn-42} ${Y.deckTop}
      Q ${bn} ${Y.deckTop+2} ${bn} ${(Y.deckTop+Y.boardBot)/2}
      Q ${bn} ${Y.boardBot} ${bn-42} ${Y.boardBot}
      L ${bt+10} ${Y.boardBot}
      Q ${bt-4} ${Y.boardBot} ${bt} ${Y.deck} Z"
      fill="#fbfdfd" stroke="var(--ink)" stroke-width="1.6"/>`;
  // footpad zone on deck
  body+=`<rect x="${px(padAU)}" y="${Y.deckTop+2}" width="${px(padBU)-px(padAU)}" height="9" rx="3" fill="var(--pad)" opacity=".45"/>`;
  body+=`<text x="${px(padCU)}" y="${Y.deckTop-6}" text-anchor="middle" class="mono" font-size="10" fill="#8a7415">footpad</text>`;
  // track slot on board bottom
  body+=`<rect x="${px(trkAU)}" y="${Y.boardBot-4}" width="${px(trkBU)-px(trkAU)}" height="8" rx="4" fill="var(--track)"/>`;
  body+=`<text x="${(px(trkAU)+px(trkBU))/2}" y="${Y.boardBot+30}" text-anchor="middle" class="mono" font-size="10" fill="var(--track)">track</text>`;
  // nose/tail
  body+=`<text x="${bn-4}" y="${Y.deckTop-8}" text-anchor="end" class="mono" font-size="11" fill="var(--muted)">NOSE ▸</text>`;
  body+=`<text x="${bt+2}" y="${Y.deckTop-8}" class="mono" font-size="11" fill="var(--muted)">◂ TAIL</text>`;
  // mast (sits in the track at u=0)
  body+=`<rect x="${xmast-4}" y="${Y.boardBot-1}" width="8" height="${Y.fuse-Y.boardBot+1}" rx="3" fill="var(--ink)"/>`;
  body+=`<circle cx="${xmast}" cy="${Y.boardBot+3}" r="4.5" fill="var(--ink)"/>`;
  body+=`<text x="${xmast}" y="${Y.boardBot+16}" text-anchor="middle" class="mono" font-size="10" fill="var(--muted)">mast</text>`;
  // fuselage + wings
  body+=`<line x1="${xs}" y1="${Y.fuse}" x2="${xf}" y2="${Y.fuse}" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>`;
  body+=`<path d="M ${xf-22} ${Y.wing} Q ${xf} ${Y.wing+11} ${xf+22} ${Y.wing}" stroke="var(--lift)" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  body+=`<text x="${xf}" y="${Y.wing+30}" text-anchor="middle" class="mono" font-size="10" fill="var(--muted)">front wing</text>`;
  body+=`<path d="M ${xs-15} ${Y.wing} Q ${xs} ${Y.wing+7} ${xs+15} ${Y.wing}" stroke="var(--down)" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  body+=`<text x="${xs}" y="${Y.wing+30}" text-anchor="middle" class="mono" font-size="10" fill="var(--muted)">stab</text>`;
  g_+=`<g transform="rotate(${tiltDeg.toFixed(2)} ${pivX.toFixed(1)} ${pivY})">${body}</g>`;

  // force vectors (vertical, anchored to tilted structure)
  const [lx,ly]=rot(xfl,Y.wing-6);  g_+=arrow(lx,ly,ly-len(d.L_front),"var(--lift)",3);
  const [sx,sy]=rot(xs,Y.wing+6);  g_+=arrow(sx,sy,sy+len(d.S_force),"var(--down)",3);
  const [bx,by]=rot(xb,Y.deck);    g_+=arrow(bx,by,by+len(S.Wb*3.2),"var(--board)",2.5);
  g_+=`<circle cx="${bx}" cy="${by}" r="4" fill="var(--board)"/>`;
  g_+=`<text x="${bx}" y="${by+len(S.Wb*3.2)+14}" text-anchor="middle" class="mono" font-size="10" fill="var(--board)">board</text>`;
  const [rx0,ry0]=rot(xr,Y.deck-2); g_+=arrow(rx0,ry0,ry0+len(S.Wr),"var(--rider)",3.4);

  // guide lines
  g_+=`<line x1="${xcl}" y1="118" x2="${xcl}" y2="${Y.water}" stroke="var(--line)" stroke-width="1.4" stroke-dasharray="5 4" opacity=".85"/>`;
  g_+=`<text x="${xcl}" y="112" text-anchor="middle" class="mono" font-size="10" fill="var(--line)">net lift ↑</text>`;
  const cgx=px(u_cg); const [cxp,cyp]=rot(cgx,Y.deck);
  g_+=`<line x1="${cxp}" y1="128" x2="${cxp}" y2="${cyp}" stroke="var(--line)" stroke-width="1.4" stroke-dasharray="2 3" opacity=".7"/>`;
  g_+=`<circle cx="${cxp}" cy="${cyp}" r="3.5" fill="var(--line)"/>`;
  g_+=`<text x="${cxp}" y="124" text-anchor="middle" class="mono" font-size="10" fill="var(--line)">CG ↓</text>`;

  // rider handle
  const [hx,hy]=rot(xr,Y.deckTop-16);
  g_+=`<g id="riderHandle" style="cursor:grab">
      <circle cx="${hx}" cy="${hy}" r="12" fill="var(--rider)"/>
      <path d="M ${hx-4} ${hy} l 8 0 M ${hx} ${hy-4} l 0 8" stroke="#fff" stroke-width="2"/>
      <text x="${hx}" y="${hy-16}" text-anchor="middle" class="mono" font-size="10" fill="var(--rider)">you · drag</text>
    </g>`;

  if(Math.abs(tiltDeg)>0.4)
    g_+=`<text x="945" y="${Y.water-8}" text-anchor="end" class="mono" font-size="11" fill="${off>0?'var(--down)':'var(--water)'}">${off>0?'NOSE DOWN':'NOSE UP'} ${Math.abs(tiltDeg).toFixed(0)}°</text>`;

  svg.innerHTML=g_; attachDrag();

  // ---- trim readouts ---- (all lengths in metres internally; fmtLen picks the unit)
  $("ro-delta").textContent=fmtLen(d.u_r_star,1);
  $("ro-cur").textContent=fmtLen(u_r,1);
  const t=$("ro-trim");
  if(Math.abs(off)<0.004){t.textContent="level";t.className="tag level";}
  else if(off>0){t.textContent="nose down";t.className="tag up";}
  else {t.textContent="nose up";t.className="tag down";}
  $("ro-off").textContent=(off>=0?"+":"")+fmtLen(off,1);
  $("ro-mom").textContent=moment.toFixed(0)+" N·m";

  // ---- board-fit readouts ---- (metres; pad/track compared in metres)
  $("ro-fromtail").textContent=fmtLen(d.X_r_star,0);
  const padA=S.padCenter-S.padLen/2, padB=S.padCenter+S.padLen/2;
  $("ro-padzone").textContent=fmtLen(padA,0)+"–"+fmtLen(padB,0);
  const onpad=$("ro-onpad");
  const Xr=d.X_r_star;
  if(Xr>=padA && Xr<=padB){onpad.textContent="yes ✓";onpad.className="tag yes";}
  else {onpad.textContent=(Xr<padA?"off the back":"off the front")+" ✗";onpad.className="tag no";}
  $("ro-need").textContent=fmtLen(d.mastNeeded,0)+" from tail";
  const reach=$("ro-reach");
  const need=d.mastNeeded, tA=S.trackFront, tB=S.trackBack;
  if(need>=tA && need<=tB){reach.textContent="yes ✓";reach.className="tag yes";}
  else {
    const miss = need<tA ? (tA-need) : (need-tB);
    reach.textContent=`no — ${fmtLen(miss,0)} short ✗`; reach.className="tag no";
  }
}

// dragging
let dragging=false;
function attachDrag(){
  const h=$("riderHandle"); if(!h)return;
  h.addEventListener("pointerdown",e=>{dragging=true;h.setPointerCapture(e.pointerId);h.style.cursor="grabbing";});
}
svg.addEventListener("pointermove",e=>{
  if(!dragging)return;
  const rect=svg.getBoundingClientRect();
  const X=(e.clientX-rect.left)*(960/rect.width);
  let u=inv(X);
  const rX=clamp(u+S.mastPos, 0.1, S.boardLen-0.1);
  S.rX=rX; render();
});
window.addEventListener("pointerup",()=>{dragging=false;});

// controls. fmt receives the stored value (metres for lengths, km/h for speed);
// each label updater is registered so switching units can relabel without re-input.
const refreshers=[];
function fmtSlider(id,key,factor,fmt){
  const el=$(id), out=$("v-"+id);
  const upd=()=>{ out.textContent=fmt(S[key]); };
  el.addEventListener("input",()=>{ S[key]=parseFloat(el.value)*factor; upd(); render(); });
  refreshers.push(upd);
}
fmtSlider("a","a",0.01, m=>fmtLen(m,1));
fmtSlider("f","f",0.01, f=>trimNum(f*100,0)+"%");
fmtSlider("L","L",0.01, m=>fmtLen(m,1));
fmtSlider("speed","V",1, fmtSpd);
fmtSlider("speedRef","Vref",1, fmtSpd);
fmtSlider("cop","copTravel",0.01, m=>fmtLen(m,1));
fmtSlider("Wr","Wr",1, w=>trimNum(w,1));
fmtSlider("Wb","Wb",1, w=>trimNum(w,1));
fmtSlider("padCenter","padCenter",0.01, m=>fmtLen(m,0));
fmtSlider("padLen","padLen",0.01, m=>fmtLen(m,0));
fmtSlider("boardLen","boardLen",0.01, m=>fmtLen(m,0));
fmtSlider("boardCG","boardCG",0.01, m=>fmtLen(m,0));
fmtSlider("mastPos","mastPos",0.01, m=>fmtLen(m,0));

function updateMastBounds(){
  const el=$("mastPos");
  el.min=(S.trackFront*100).toFixed(0); el.max=(S.trackBack*100).toFixed(0);
  S.mastPos=clamp(S.mastPos, S.trackFront, S.trackBack);
  el.value=(S.mastPos*100).toFixed(1);
  $("v-mastPos").textContent=fmtLen(S.mastPos,0);
}
["trackLen","trackSetback"].forEach(id=>{
  const out=$("v-"+id);
  const upd=()=>{ out.textContent=fmtLen(S[id],0); };
  $(id).addEventListener("input",()=>{
    S[id]=parseFloat($(id).value)/100;
    upd(); recomputeTrack(); updateMastBounds(); render();
  });
  refreshers.push(upd);
});

// board / foil name labels feed the header kicker
function updateNames(){
  const bn=$("boardName").value.trim(), fn=$("foilName").value.trim();
  const parts=[fn,bn].filter(Boolean);
  $("kicker").textContent = parts.length ? parts.join(" · ")+" · track fit" : "Wing foil · trim & track fit";
}
["boardName","foilName"].forEach(id=>$(id).addEventListener("input",updateNames));

$("snap").addEventListener("click",()=>{ S.rX=derive().X_r_star; render(); });
$("reset").addEventListener("click",()=>{
  // Object.assign leaves S.units untouched — reset restores values, not the unit choice.
  Object.assign(S,{a:0.20,L:0.40,f:0.11,V:24,Vref:24,copTravel:0.03,Wr:85,Wb:7.6,boardLen:1.55,boardCG:0.72,
    padCenter:0.82,padLen:0.42,trackLen:0.28,trackSetback:0.58,trackFront:0.58,trackBack:0.86,mastPos:0.64,rX:null});
  const setv=(id,v)=>{ $(id).value=v; };   // slider values are native cm/km-h regardless of display unit
  setv("a",20);setv("f",11);setv("L",40);setv("Wr",85);setv("Wb",7.6);
  setv("speed",24);setv("speedRef",24);setv("cop",3);
  setv("padCenter",82);setv("padLen",42);setv("boardLen",155);setv("boardCG",72);
  setv("trackLen",28);setv("trackSetback",58);
  recomputeTrack(); updateMastBounds(); refreshers.forEach(fn=>fn()); render();
});

$("calib").addEventListener("click",()=>{
  const meas=lenToM(parseFloat($("meas").value)||0);   // the meas field is in the current length unit
  const W=S.Wr+S.Wb, b=S.boardCG-S.mastPos;
  let f=(S.Wr*meas + S.Wb*b - W*effA())/(W*S.L);
  const note=$("calib-note");
  if(f<0||f>0.30){
    note.style.color="var(--warn)";
    note.textContent=`Implied download ${(f*100).toFixed(0)}% is outside 0–25% — your effective front-wing offset likely differs. Nudge "front wing ahead of mast base" and retry.`;
    f=clamp(f,0,0.30);
  }else{
    note.style.color="var(--muted)";
    note.textContent=`Matched: stab download set to ${(f*100).toFixed(1)}%. Now slide the mast or edit a candidate board's track/pad to test the fit.`;
  }
  S.f=f; $("f").value=(f*100).toFixed(1); $("v-f").textContent=(f*100).toFixed(0)+"%";
  S.rX=null; render();
});

// tabs: Setup (describe board+foil) / Experiment (tune the fit)
const TABS=[["tab-setup","panel-setup"],["tab-experiment","panel-experiment"]];
function selectTab(tabId){
  TABS.forEach(([t,p])=>{
    const on=t===tabId;
    $(t).setAttribute("aria-selected", on?"true":"false");
    $(p).hidden=!on;
  });
  if(tabId==="tab-experiment") render();   // scene was hidden; refresh now it's laid out
}
TABS.forEach(([t])=>$(t).addEventListener("click",()=>selectTab(t)));
$("goExperiment").addEventListener("click",()=>selectTab("tab-experiment"));

// units selector — relabels everything without changing the underlying (metric) state
function saveUnits(){ try{ localStorage.setItem("fbf-units",JSON.stringify(S.units)); }catch(e){} }
function measUnitLabel(){ $("meas-unit").textContent = S.units.len==="ftin" ? "in" : "cm"; }
function applyUnits(len,spd){
  const measM=lenToM(parseFloat($("meas").value)||0);   // read the field in the OLD unit first
  S.units={len,spd};
  $("meas").value=trimNum(mToLenNum(measM),1);           // re-express it in the NEW unit
  measUnitLabel(); saveUnits();
  refreshers.forEach(fn=>fn()); render();
}
$("unitLen").addEventListener("change",()=>applyUnits($("unitLen").value,$("unitSpd").value));
$("unitSpd").addEventListener("change",()=>applyUnits($("unitLen").value,$("unitSpd").value));

recomputeTrack();
updateNames();
updateMastBounds();
// reflect any persisted unit choice on load (HTML authored in cm, so convert the meas field once)
$("unitLen").value=S.units.len; $("unitSpd").value=S.units.spd;
$("meas").value=trimNum(mToLenNum((parseFloat($("meas").value)||0)/100),1);
measUnitLabel();
refreshers.forEach(fn=>fn());
render();
