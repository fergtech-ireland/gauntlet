/* ===================== generated media ===================== */
function runArt(){
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="#16294d"/>
    <g stroke="#22386a" stroke-width="1">${Array.from({length:11},(_,i)=>`<line x1="0" y1="${i*50}" x2="400" y2="${i*50}"/>`).join('')}
    ${Array.from({length:9},(_,i)=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="500"/>`).join('')}</g>
    <path d="M58 424 C 30 348, 96 320, 130 298 S 150 234 118 206 S 120 130 176 120 S 268 146 296 102 S 352 72 356 116 S 322 194 344 234 S 330 312 276 320 S 206 354 214 398"
      fill="none" stroke="${MARIGOLD}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="58" cy="424" r="7" fill="#fff"/><circle cx="214" cy="398" r="9" fill="${MARIGOLD}" stroke="#16294d" stroke-width="3"/></svg>`;
}
/* No macros logged means no ring. This used to fall back to a plausible looking
   set of numbers and draw them at 50px, which is a fabricated figure presented
   as a measurement. */
function mealArt(m){
  const tot=m? ((+m.p||0)+(+m.c||0)+(+m.f||0)) : 0;
  if(!tot) return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="${CLAY}"/>
    <circle cx="200" cy="212" r="126" fill="#e0d2b8"/>
    <circle cx="200" cy="212" r="102" fill="none" stroke="#cdbb9b" stroke-width="24"/>
    <text x="200" y="219" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="600" font-size="16" fill="#8a7358">nothing logged</text></svg>`;
  const mm=m, R=102, C=2*Math.PI*R;
  const seg=(v,off,col)=>`<circle cx="200" cy="212" r="${R}" fill="none" stroke="${col}" stroke-width="24"
     stroke-dasharray="${C*v/tot-6} ${C}" stroke-dashoffset="${-C*off/tot}" transform="rotate(-90 200 212)"/>`;
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="${CLAY}"/>
    <circle cx="200" cy="212" r="126" fill="#e0d2b8"/>${seg(mm.p,0,'#1b4a3c')}${seg(mm.c,mm.p,'#a8552a')}${seg(mm.f,mm.p+mm.c,'#161618')}
    <text x="200" y="204" text-anchor="middle" font-family="Archivo Black, sans-serif" font-size="50" fill="#161618">${mm.p}g</text>
    <text x="200" y="230" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="600" font-size="15" fill="#8a7358">protein</text></svg>`;
}
function workoutArt(steps){
  const rows=(steps||[]).slice(0,6).map((s,i)=>{
    const bars=Array.from({length:4},(_,j)=>`<rect x="${252+j*33}" y="${118+i*52}" width="25" height="25" rx="5" fill="${j<(3+i%2)?'#f3e7e9':'rgba(243,231,233,.22)'}"/>`).join('');
    return `<text x="32" y="${138+i*52}" font-family="Archivo, sans-serif" font-weight="600" font-size="15" fill="#f3e7e9" opacity=".94">${s.n.slice(0,20)}</text>${bars}`;
  }).join('');
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="#6e1f2e"/>
    <circle cx="368" cy="52" r="140" fill="#7d2434"/>${rows}</svg>`;
}
function fastArt(){
  const R=118,C=2*Math.PI*R;
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="#1b4a3c"/>
    <circle cx="200" cy="215" r="${R}" fill="none" stroke="rgba(234,223,203,.18)" stroke-width="22"/>
    <circle cx="200" cy="215" r="${R}" fill="none" stroke="${CLAY}" stroke-width="22" stroke-linecap="round"
      stroke-dasharray="${C*.666} ${C}" transform="rotate(-90 200 215)"/>
    <text x="200" y="208" text-anchor="middle" font-family="Archivo Black, sans-serif" font-size="58" fill="#fff">16h</text>
    <text x="200" y="238" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="600" font-size="15" fill="rgba(255,255,255,.7)">fasted, 8h fed</text></svg>`;
}
const artFor=p=>p.kind==='run'?runArt():p.kind==='meal'?mealArt(p.macros):p.kind==='workout'?workoutArt(p.session&&p.session.steps):fastArt();

