// Deterministic vector scenery; baked into the standalone HTML as data URLs.
const fs=require('fs');
let seed=7301;
const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
function scene(kind){
 const warm=kind==='combat',hangar=kind==='hangar'||warm;
 const accent=warm?'#df8554':'#8bbdb9',sun=warm?'#ffd49b':'#f9e6b4';
 let stars='';
 for(let i=0;i<210;i++){const x=Math.round(random()*1600),y=Math.round(random()*840),r=(random()*1.1+.25).toFixed(2),a=(random()*.5+.12).toFixed(2);stars+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#dde5dc" opacity="${a}"/>`;}
 let structures='';
 if(hangar){
  structures=`<path d="M0 0H1600L1440 140H160L0 0Z" fill="#090f13"/><path d="M0 0L160 140V680L0 1000Z M1600 0L1440 140V680L1600 1000Z" fill="#0a1116"/>
  <path d="M0 1000L360 650H1240L1600 1000Z" fill="url(#floor)"/><path d="M0 1000L360 650H1240L1600 1000M120 1000L420 650M360 1000L550 650M670 1000L710 650M930 1000L870 650M1240 1000L1040 650M1480 1000L1180 650M205 800H1395M90 910H1510M290 715H1310" fill="none" stroke="${accent}" stroke-opacity=".12"/>
  <path d="M130 0L280 140H1320L1470 0 M0 210L160 300 M1600 210L1440 300 M0 640L160 530 M1600 640L1440 530" fill="none" stroke="#8c9890" stroke-opacity=".12" stroke-width="16"/>
  <path d="M300 137H590M1010 137H1300 M154 320V490M1446 320V490" stroke="${sun}" stroke-width="3" opacity=".55"/>
  <path d="M300 137H590M1010 137H1300" stroke="${sun}" stroke-width="18" filter="url(#blur)" opacity=".18"/>
  <path d="M170 140L380 650H640L560 140Z M1040 140L960 650H1220L1430 140Z" fill="url(#beam)" opacity=".08"/>
  <path d="M360 650H1240" stroke="${accent}" stroke-opacity=".4"/>
  <g fill="#101a20" stroke="#788d8b" stroke-opacity=".2"><path d="M170 590H310L360 650H170Z"/><path d="M1290 590H1430V650H1240Z"/></g>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
 <defs>
 <linearGradient id="space" x2=".8" y2="1"><stop stop-color="#071017"/><stop offset=".5" stop-color="${warm?'#251a19':'#172932'}"/><stop offset="1" stop-color="#070c11"/></linearGradient>
 <radialGradient id="nebula"><stop stop-color="${accent}" stop-opacity=".19"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
 <radialGradient id="sun"><stop stop-color="${sun}" stop-opacity=".7"/><stop offset=".04" stop-color="${sun}" stop-opacity=".24"/><stop offset=".25" stop-color="${sun}" stop-opacity=".07"/><stop offset="1" stop-color="${sun}" stop-opacity="0"/></radialGradient>
 <radialGradient id="planet" cx=".35" cy=".08" r=".85"><stop stop-color="${warm?'#845b43':'#3c646b'}"/><stop offset=".25" stop-color="${warm?'#352b26':'#1a303b'}"/><stop offset=".65" stop-color="#0a131e"/><stop offset="1" stop-color="#050a10"/></radialGradient>
 <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#15232a"/><stop offset="1" stop-color="#070b0e"/></linearGradient>
 <linearGradient id="beam" x2="0" y2="1"><stop stop-color="${sun}"/><stop offset="1" stop-color="${sun}" stop-opacity="0"/></linearGradient>
 <radialGradient id="vignette"><stop offset=".3" stop-color="#020509" stop-opacity="0"/><stop offset="1" stop-color="#020509" stop-opacity=".8"/></radialGradient>
 <filter id="blur"><feGaussianBlur stdDeviation="12"/></filter>
 <filter id="cloud"><feTurbulence type="fractalNoise" baseFrequency=".007 .016" numOctaves="3" seed="17"/><feColorMatrix values="0 0 0 0 .31 0 0 0 0 .41 0 0 0 0 .44 0 0 0 .17 0"/></filter>
 <clipPath id="planetClip"><circle cx="1300" cy="1170" r="730"/></clipPath>
 </defs>
 <path fill="url(#space)" d="M0 0H1600V1000H0Z"/>
 <ellipse cx="1100" cy="320" rx="850" ry="520" fill="url(#nebula)"/>
 <path d="M100 650Q560 180 1500 230" fill="none" stroke="${accent}" stroke-width="180" opacity=".035" filter="url(#blur)"/>
 ${stars}
 <circle cx="1300" cy="1170" r="743" fill="none" stroke="${accent}" stroke-width="16" opacity=".12" filter="url(#blur)"/>
 <circle cx="1300" cy="1170" r="733" fill="url(#planet)" stroke="${accent}" stroke-opacity=".46" stroke-width="2"/>
 <g clip-path="url(#planetClip)"><path d="M500 730Q860 350 1600 590M480 800Q990 440 1700 690M540 860Q1000 590 1670 750" fill="none" stroke="${accent}" stroke-opacity=".065" stroke-width="18" filter="url(#blur)"/><rect x="550" y="440" width="1050" height="560" filter="url(#cloud)" opacity=".35"/></g>
 <ellipse cx="1260" cy="430" rx="400" ry="400" fill="url(#sun)"/>
 <path d="M1010 430H1550" stroke="${sun}" stroke-opacity=".12"/><path d="M1200 430H1320" stroke="${sun}" stroke-opacity=".3"/>
 <g fill="#080f15" stroke="${accent}" stroke-opacity=".22"><path d="M1060 272l67 -9 29 9 -29 5Z"/><path d="M1150 235l38 -5 20 5 -20 3Z"/><path d="M989 303l27 -4 14 4 -14 2Z"/></g>
 ${structures}
 <path fill="url(#vignette)" d="M0 0H1600V1000H0Z"/>
 </svg>`;
}
const uri=s=>'url("data:image/svg+xml,'+encodeURIComponent(s).replace(/'/g,'%27')+'")';
const textures={orbit:scene('orbit'),hangar:scene('hangar'),combat:scene('combat')};
let css='\n/* Cinematic environments: embedded vector artwork, no downloads. */\n:root{';
for(const [name,svg] of Object.entries(textures))css+=`--scene-${name}:${uri(svg)};`;
css+='}\n'+fs.readFileSync('.qa/atmosphere.css','utf8');
fs.writeFileSync('.qa/backgrounds.css',css);
console.log('Baked three offline environments ('+Math.round(css.length/1024)+' KB).');
