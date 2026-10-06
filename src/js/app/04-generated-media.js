/* ===================== generated media ===================== */
function runArt(){
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="var(--hero)"/>
    <g stroke="var(--hero-chip)" stroke-width="1">${Array.from({length:11},(_,i)=>`<line x1="0" y1="${i*50}" x2="400" y2="${i*50}"/>`).join('')}
    ${Array.from({length:9},(_,i)=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="500"/>`).join('')}</g>
    <path d="M58 424 C 30 348, 96 320, 130 298 S 150 234 118 206 S 120 130 176 120 S 268 146 296 102 S 352 72 356 116 S 322 194 344 234 S 330 312 276 320 S 206 354 214 398"
      fill="none" stroke="${MARIGOLD}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="58" cy="424" r="7" fill="var(--hero-ink)"/><circle cx="214" cy="398" r="9" fill="${MARIGOLD}" stroke="var(--hero)" stroke-width="3"/></svg>`;
}
/* No macros logged means no ring. This used to fall back to a plausible looking
   set of numbers and draw them at 50px, which is a fabricated figure presented
   as a measurement. */
function mealArt(m){
  const tot=m? ((+m.p||0)+(+m.c||0)+(+m.f||0)) : 0;
  if(!tot) return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="${CLAY}"/>
    <circle cx="200" cy="212" r="126" fill="var(--surface)"/>
    <circle cx="200" cy="212" r="102" fill="none" stroke="var(--line)" stroke-width="24"/>
    <text x="200" y="219" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="600" font-size="16" fill="var(--mute)">nothing logged</text></svg>`;
  const mm=m, R=102, C=2*Math.PI*R;
  const seg=(v,off,col)=>`<circle cx="200" cy="212" r="${R}" fill="none" stroke="${col}" stroke-width="24"
     stroke-dasharray="${C*v/tot-6} ${C}" stroke-dashoffset="${-C*off/tot}" transform="rotate(-90 200 212)"/>`;
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="${CLAY}"/>
    <circle cx="200" cy="212" r="126" fill="var(--surface)"/>${seg(mm.p,0,'var(--coral)')}${seg(mm.c,mm.p,'var(--carbs)')}${seg(mm.f,mm.p+mm.c,'var(--fat)')}
    <text x="200" y="204" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="58" fill="var(--ink)">${mm.p}g</text>
    <text x="200" y="230" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="600" font-size="15" fill="var(--mute)">protein</text></svg>`;
}
function workoutArt(steps){
  const rows=(steps||[]).slice(0,6).map((s,i)=>{
    const bars=Array.from({length:4},(_,j)=>`<rect x="${252+j*33}" y="${118+i*52}" width="25" height="25" rx="5" fill="var(--hero-ink)" opacity="${j<(3+i%2)?1:.22}"/>`).join('');
    return `<text x="32" y="${138+i*52}" font-family="Figtree, sans-serif" font-weight="600" font-size="15" fill="var(--hero-ink)" opacity=".94">${s.n.slice(0,20)}</text>${bars}`;
  }).join('');
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="var(--hero)"/>
    <circle cx="368" cy="52" r="140" fill="var(--hero-chip)"/>${rows}</svg>`;
}
function fastArt(){
  const R=118,C=2*Math.PI*R;
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="var(--hero)"/>
    <circle cx="200" cy="215" r="${R}" fill="none" stroke="var(--hero-chip)" stroke-width="22"/>
    <circle cx="200" cy="215" r="${R}" fill="none" stroke="var(--mint)" stroke-width="22" stroke-linecap="round"
      stroke-dasharray="${C*.666} ${C}" transform="rotate(-90 200 215)"/>
    <text x="200" y="208" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="66" fill="var(--hero-ink)">16h</text>
    <text x="200" y="238" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="600" font-size="15" fill="var(--hero-sub)">fasted, 8h fed</text></svg>`;
}
const artFor=p=>p.kind==='run'?runArt():p.kind==='meal'?mealArt(p.macros):p.kind==='workout'?workoutArt(p.session&&p.session.steps):fastArt();

