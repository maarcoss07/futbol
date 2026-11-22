// pizarra.js · Pizarra táctica en SVG puro (sin dependencias). ES Module.
export const VB={full:[1000,650],half:[650,520],free:[800,600]};
export const EMPTY=()=>({v:1,bg:'full',els:[],arrows:[]});
export const validBoard=D=>!!(D&&VB[D.bg]&&Array.isArray(D.els)&&Array.isArray(D.arrows));
const C={p1:'#ef4444',p2:'#3b82f6',p3:'#facc15',gk:'#f97316'},R={goal:50,mini:34,pole:28,num:22},ROT=['goal','mini','pole'];

/* ---------- Render (editor y miniaturas) ---------- */
function elSvg(o,sl){const t=o.t;let s='';
 if(C[t])s=`<circle r="17" fill="${C[t]}" stroke="${t=='p3'?'#7a5d00':'#fff'}" stroke-width="2.5"/>`+(t=='gk'?'<text y="6" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" font-family="sans-serif">P</text>':'');
 else if(t=='ball')s='<circle r="9" fill="#fff" stroke="#111" stroke-width="2"/><circle r="3.5" fill="#111"/>';
 else if(t=='cone')s='<path d="M0-13L11 9H-11Z" fill="#fb923c" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>';
 else if(t=='pole')s='<rect x="-3" y="-20" width="6" height="40" rx="2" fill="#eab308" stroke="#fff" stroke-width="1.5"/><rect x="-3" y="-8" width="6" height="8" fill="#ef4444"/>';
 else if(t=='goal')s='<rect x="-40" y="-13" width="80" height="26" fill="#ffffff44" stroke="#fff" stroke-width="4"/><path d="M-30-13V13M-20-13V13M-10-13V13M0-13V13M10-13V13M20-13V13M30-13V13" stroke="#ffffff99" stroke-width="1"/>';
 else if(t=='mini')s='<rect x="-22" y="-8" width="44" height="16" fill="#ffffff44" stroke="#fde68a" stroke-width="3"/>';
 else if(t=='num'){const n=o.n??1;s=`<circle r="13" fill="#fff" stroke="#111" stroke-width="2.5"/><text y="${n>9?5:6}" text-anchor="middle" font-size="${n>9?14:17}" font-weight="700" fill="#111" font-family="sans-serif">${n}</text>`}
 const r=R[t]||26;
 return `<g data-id="${o.id}" transform="translate(${o.x} ${o.y}) rotate(${o.r||0})"><circle r="${r}" fill="transparent"/>${s}${sl?`<circle r="${r}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6 5"/>`:''}</g>`}
function cutEnd(p,n){const q=p.map(x=>[...x]);
 while(q.length>1){const a=q[q.length-1],b=q[q.length-2],L=Math.hypot(a[0]-b[0],a[1]-b[1]);
  if(L>n){const f=n/L;q[q.length-1]=[+(a[0]+(b[0]-a[0])*f).toFixed(1),+(a[1]+(b[1]-a[1])*f).toFixed(1)];break}
  if(q.length==2){q[1]=[b[0]+(a[0]-b[0])*.05,b[1]+(a[1]-b[1])*.05];break}
  n-=L;q.pop()}
 return q}
 function aPath(a){const p=cutEnd(a.p,a.k=='drib'?17:13);
 if(a.k=='drib'){const o=[];let s=0;
  for(let i=1;i<p.length;i++){const[x0,y0]=p[i-1],[x1,y1]=p[i],dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
   for(let d=i==1?0:5;d<=L;d+=5){const w=7*Math.sin(2*Math.PI*(s+d)/26);o.push((x0+dx*d/L+nx*w).toFixed(1)+' '+(y0+dy*d/L+ny*w).toFixed(1))}
   s+=L}
  o.push(p[p.length-1].join(' '));return 'M'+o.join('L')}
 let d='M'+p[0].join(' ');
 for(let i=1;i<p.length-1;i++)d+=`Q${p[i].join(' ')} ${(p[i][0]+p[i+1][0])/2} ${(p[i][1]+p[i+1][1])/2}`;
 return d+'L'+p[p.length-1].join(' ')}
function head(p){const E=p[p.length-1];let P=p[0];
 for(let i=p.length-2;i>=0;i--){P=p[i];if(Math.hypot(E[0]-P[0],E[1]-P[1])>=22)break}
 const a=Math.atan2(E[1]-P[1],E[0]-P[0]),c=Math.cos(a),s=Math.sin(a),f=(u,v)=>(E[0]-u*c-v*s).toFixed(1)+','+(E[1]-u*s+v*c).toFixed(1);
 return `<polygon points="${E.join(',')} ${f(18,8)} ${f(18,-8)}" fill="#fff"/>`}
function arSvg(a,sl){const d=aPath(a),da=a.k=='run'?' stroke-dasharray="12 9"':'',b=`<path d="${d}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
 return `<g data-id="${a.id}">${sl?b+' stroke="#38bdf8" stroke-opacity=".6" stroke-width="13"/>':''}${b} stroke="#0006" stroke-width="7"${da}/>${b} stroke="#fff" stroke-width="4"${da}/>${head(a.p)}<path d="${d}" fill="none" stroke="transparent" stroke-width="30"/></g>`}
function bgSvg(b){const[w,h]=VB[b];let s=`<rect width="${w}" height="${h}" fill="#2f7d32"/>`,l='';
 if(b=='free')l=`<rect x="14" y="14" width="${w-28}" height="${h-28}"/>`;
 else{
  for(let i=0;i<(b=='full'?10:8);i+=2)s+=b=='full'?`<rect x="${i*100}" width="100" height="${h}" fill="#ffffff12"/>`:`<rect y="${i*65}" width="${w}" height="65" fill="#ffffff12"/>`;
  if(b=='full')l='<rect x="20" y="20" width="960" height="610"/><path d="M500 20V630"/><circle cx="500" cy="325" r="87"/><circle cx="500" cy="325" r="4" fill="#fff"/><rect x="20" y="133.5" width="157" height="383"/><rect x="20" y="238" width="52" height="174"/><circle cx="125" cy="325" r="4" fill="#fff"/><path d="M177 255.25A87 87 0 0 1 177 394.75"/><rect x="823" y="133.5" width="157" height="383"/><rect x="948" y="238" width="52" height="174"/><circle cx="875" cy="325" r="4" fill="#fff"/><path d="M823 255.25A87 87 0 0 0 823 394.75"/>';
  else l='<rect x="20" y="20" width="610" height="480"/><rect x="133.5" y="20" width="383" height="157"/><rect x="238" y="20" width="174" height="52"/><circle cx="325" cy="125" r="4" fill="#fff"/><path d="M255.25 177A87 87 0 0 0 394.75 177"/><path d="M238 500A87 87 0 0 1 412 500"/><circle cx="325" cy="500" r="4" fill="#fff"/>'}
 return s+`<g fill="none" stroke="#fff" stroke-width="3" opacity=".85">${l}</g>`}
function inner(D,sl){const lo=['goal','mini','pole','cone'];let s=bgSvg(D.bg);
 D.els.filter(o=>lo.includes(o.t)).forEach(o=>s+=elSvg(o,o.id==sl));
 D.arrows.forEach(a=>s+=arSvg(a,a.id==sl));
 D.els.filter(o=>!lo.includes(o.t)).forEach(o=>s+=elSvg(o,o.id==sl));return s}
export const thumbSvg=D=>{D=validBoard(D)?D:EMPTY();return `<svg viewBox="0 0 ${VB[D.bg][0]} ${VB[D.bg][1]}">${inner(D)}</svg>`};

/* ---------- Estilos (se inyectan una vez; usan las variables del host si existen) ---------- */
let cssDone=0;
function css(){if(cssDone)return;cssDone=1;const s=document.createElement('style');s.textContent=`
.pz{display:flex;flex-direction:column;height:100%;min-height:340px;background:var(--bg,#f4f5f7);color:var(--fg,#161a1f);--pzp:var(--pn,#fff);--pzl:var(--ln,#d5d9df);--pza:var(--ac,#0ea5e9);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.pz button{font:inherit;color:inherit;background:var(--pzp);border:1px solid var(--pzl);border-radius:8px;padding:6px 12px;min-height:40px;cursor:pointer}
.pz button:disabled{opacity:.3}.pz [hidden]{display:none!important}
.pz-h{display:flex;gap:6px;align-items:center;padding:6px;background:var(--pzp);border-bottom:1px solid var(--pzl)}
.pz-seg{display:flex;border:1px solid var(--pzl);border-radius:8px;overflow:hidden;margin-right:auto}.pz-seg button{border:0;border-radius:0}.pz-seg .on{background:var(--pza);color:#fff}
.pz .pz-big{width:56px;min-height:48px;font-size:26px;line-height:1;padding:0}
.pz-b{position:relative;flex:1;min-height:0}
.pz-sv{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
.pz-ctx{position:absolute;top:8px;left:8px;display:none;gap:6px;flex-wrap:wrap;max-width:calc(100% - 96px)}.pz-ctx.v{display:flex}
.pz-n{display:flex;align-items:center;gap:4px}.pz-nv{min-width:26px;text-align:center;font-weight:700;background:var(--pzp);border-radius:8px;padding:8px 4px}
.pz .pz-rz{position:absolute;top:8px;right:8px;opacity:.85;min-height:32px;padding:2px 8px;font-size:12px}
.pz-hint{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);background:rgba(0,0,0,.65);color:#fff;padding:4px 10px;border-radius:99px;font-size:12px;pointer-events:none;white-space:nowrap}
.pz-t{display:flex;gap:6px;padding:6px;overflow-x:auto;background:var(--pzp);border-top:1px solid var(--pzl)}
.pz .pz-tb{flex:none;width:62px;padding:3px 0 2px;display:flex;flex-direction:column;align-items:center;font-size:10px;gap:2px;min-height:0}
.pz-tb svg{width:52px;height:40px;border-radius:6px;background:#2f7d32;display:block}.pz .pz-tb.act{outline:3px solid var(--pza);outline-offset:-1px}`;
document.head.appendChild(s)}

/* ---------- Editor ---------- */
const T=[['sel','Mover'],['place:p1','Rojo'],['place:p2','Azul'],['place:p3','Amarillo'],['place:gk','Portero'],['place:ball','Balón'],['place:cone','Cono'],['place:pole','Pica'],['place:goal','Portería'],['place:mini','Miniport.'],['place:num','Nº paso'],['arrow:pass','Pase'],['arrow:run','Desmarque'],['arrow:drib','Conducción']];
const ic=k=>{const[a,b]=k.split(':');return k=='sel'?'<text y="12" text-anchor="middle" font-size="34">✋</text>':a=='place'?elSvg({t:b,x:0,y:0,r:0,id:'',n:1}):arSvg({k:b,p:[[-34,16],[34,-16]]})};
const uid=()=>Math.random().toString(36).slice(2,8),cl=(v,m)=>Math.round(Math.max(8,Math.min(m-8,v))),clone=o=>JSON.parse(JSON.stringify(o));
function rdp(p,e){if(p.length<3)return p;const a=p[0],b=p[p.length-1],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;let m=0,k=0;
 for(let i=1;i<p.length-1;i++){const d=Math.abs((b[0]-a[0])*(a[1]-p[i][1])-(a[0]-p[i][0])*(b[1]-a[1]))/L;if(d>m){m=d;k=i}}
 return m>e?rdp(p.slice(0,k+1),e).slice(0,-1).concat(rdp(p.slice(k),e)):[a,b]}

export function createBoard(root,{data,onChange}={}){
 css();root.classList.add('pz');
 root.innerHTML=`<div class="pz-h"><div class="pz-seg"><button data-bg="full">Campo</button><button data-bg="half">Medio</button><button data-bg="free">Libre</button></div>
 <button class="pz-big" data-a="un" title="Deshacer">↩</button><button class="pz-big" data-a="re" title="Rehacer">↪</button><button data-a="clr" title="Limpiar pizarra">🧹</button></div>
 <div class="pz-b"><svg class="pz-sv"></svg>
  <div class="pz-ctx"><button data-a="rot">⟳ Rotar</button><button data-a="dup">⧉ Duplicar</button><button data-a="del">🗑 Borrar</button><span class="pz-n"><button data-a="nm">−</button><b class="pz-nv"></b><button data-a="np">+</button></span></div>
  <button class="pz-rz" data-a="rz" hidden>⤢ Reset</button><div class="pz-hint"></div></div>
 <div class="pz-t">${T.map(([k,l])=>`<button class="pz-tb" data-t="${k}"><svg viewBox="-44 -34 88 68">${ic(k)}</svg>${l}</button>`).join('')}</div>`;
 const q=s=>root.querySelector(s),sv=q('.pz-sv');
 let S=validBoard(data)?clone(data):EMPTY(),sel=null,tool='sel',drag=null,hist=[JSON.stringify(S)],hi=0,view={x:0,y:0,k:1},raf=0,pinch=null;
 const ptrs=new Map(),find=id=>S.els.find(o=>o.id==id)||S.arrows.find(o=>o.id==id);
 const pt=e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(sv.getScreenCTM().inverse());return[p.x,p.y]};
 function setVB(){const[w,h]=VB[S.bg],vw=w/view.k,vh=h/view.k;view.x=Math.max(0,Math.min(w-vw,view.x));view.y=Math.max(0,Math.min(h-vh,view.y));sv.setAttribute('viewBox',`${view.x} ${view.y} ${vw} ${vh}`)}
 function paint(){setVB();let s=inner(S,sel);
  if(drag&&drag.type=='draw'&&drag.pts.length>1)s+=arSvg({k:tool.split(':')[1],p:drag.pts},false);
  const a=sel&&S.arrows.find(x=>x.id==sel);
  if(a)a.p.forEach((p,i)=>s+=`<g data-h="${i}"><circle cx="${p[0]}" cy="${p[1]}" r="${24/view.k}" fill="transparent"/><circle cx="${p[0]}" cy="${p[1]}" r="${9/view.k}" fill="#fff" stroke="#0ea5e9" stroke-width="${3/view.k}"/></g>`);
  sv.innerHTML=s;ui()}
 const draw=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;paint()})};
 function ui(){const o=find(sel);q('.pz-ctx').classList.toggle('v',!!o);q('[data-a=rot]').hidden=!(o&&ROT.includes(o.t));
  q('.pz-n').hidden=!(o&&o.t=='num');q('.pz-nv').textContent=o&&o.n!=null?o.n:'';
  q('[data-a=un]').disabled=hi<1;q('[data-a=re]').disabled=hi>=hist.length-1;q('.pz-rz').hidden=view.k<1.01;
  root.querySelectorAll('.pz-tb').forEach(b=>b.classList.toggle('act',b.dataset.t==tool));
  root.querySelectorAll('[data-bg]').forEach(b=>b.classList.toggle('on',b.dataset.bg==S.bg));
  q('.pz-hint').textContent=tool=='sel'?'Arrastra para mover · 2 dedos: zoom':tool.startsWith('place')?'Toca el campo para colocar (✋ para mover)':'Arrastra para dibujar (✋ para mover)'}
 function commit(){hist=hist.slice(0,hi+1);hist.push(JSON.stringify(S));if(hist.length>100)hist.shift();hi=hist.length-1;onChange&&onChange()}
 function undo(n){const i=hi+n;if(i<0||i>=hist.length)return;hi=i;S=JSON.parse(hist[hi]);if(!find(sel))sel=null;onChange&&onChange();paint()}
 function add(t,p){const o={id:uid(),t,x:cl(p[0],VB[S.bg][0]),y:cl(p[1],VB[S.bg][1]),r:0};
  if(t=='num')o.n=1+Math.max(0,...S.els.filter(x=>x.t=='num').map(x=>x.n||0));S.els.push(o);sel=o.id;commit()}
 function delSel(){if(!sel)return;S.els=S.els.filter(o=>o.id!=sel);S.arrows=S.arrows.filter(o=>o.id!=sel);sel=null;commit();paint()}
 function dupSel(){const o=find(sel);if(!o)return;const n=clone(o);n.id=uid();
  if(n.p)n.p=n.p.map(p=>[p[0]+30,p[1]+30]);else{n.x+=30;n.y+=30;if(n.t=='num')n.n=1+Math.max(...S.els.filter(x=>x.t=='num').map(x=>x.n||0))}
  (n.p?S.arrows:S.els).push(n);sel=n.id;commit();paint()}
 function rotSel(){const o=find(sel);if(o&&ROT.includes(o.t)){o.r=((o.r||0)+45)%360;commit();paint()}}
 function numAdd(d){const o=find(sel);if(o&&o.t=='num'){o.n=Math.max(1,(o.n||1)+d);commit();paint()}}
 function setBg(b){S.bg=b;const[w,h]=VB[b];view={x:0,y:0,k:1};S.els.forEach(o=>{o.x=Math.min(o.x,w-8);o.y=Math.min(o.y,h-8)});
  S.arrows.forEach(a=>a.p=a.p.map(p=>[Math.min(p[0],w-8),Math.min(p[1],h-8)]));commit();paint()}
 const cancel=()=>{if(drag){drag=null;S=JSON.parse(hist[hi])}};

 sv.onpointerdown=e=>{e.preventDefault();ptrs.set(e.pointerId,[e.clientX,e.clientY]);try{sv.setPointerCapture(e.pointerId)}catch(_){}
  if(ptrs.size==2){cancel();const[a,b]=[...ptrs.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1])||1,k:view.k,w0:pt({clientX:(a[0]+b[0])/2,clientY:(a[1]+b[1])/2})};paint();return}
  if(ptrs.size>2||drag)return;
  const p=pt(e),t=e.target.closest('[data-h],[data-id]');
  if(t&&t.dataset.h!==undefined){drag={id:e.pointerId,type:'handle',idx:+t.dataset.h};return}
  if(tool.startsWith('arrow')){sel=null;drag={id:e.pointerId,type:'draw',pts:[p]};draw();return}
  if(t&&t.dataset.id&&find(t.dataset.id)){sel=t.dataset.id;drag={id:e.pointerId,type:'move',s:p,o:clone(find(sel))};paint();return}
  if(tool.startsWith('place')){add(tool.split(':')[1],p);paint();return}
  sel=null;paint()};
 sv.onpointermove=e=>{if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(pinch&&ptrs.size>=2){const[a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),m={clientX:(a[0]+b[0])/2,clientY:(a[1]+b[1])/2};
   view.k=Math.max(1,Math.min(5,pinch.k*d/pinch.d));setVB();const w=pt(m);view.x+=pinch.w0[0]-w[0];view.y+=pinch.w0[1]-w[1];draw();return}
  if(!drag||e.pointerId!=drag.id)return;const p=pt(e),[w,h]=VB[S.bg];
  if(drag.type=='draw'){const l=drag.pts[drag.pts.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>5/view.k)drag.pts.push(p)}
  else if(drag.type=='handle'){find(sel).p[drag.idx]=[cl(p[0],w),cl(p[1],h)];drag.moved=1}
  else{const dx=p[0]-drag.s[0],dy=p[1]-drag.s[1],o=find(sel),g=drag.o;
   if(o.p)o.p=g.p.map(q=>[Math.round(q[0]+dx),Math.round(q[1]+dy)]);else{o.x=cl(g.x+dx,w);o.y=cl(g.y+dy,h)}drag.moved=1}
  draw()};
 sv.onlostpointercapture=sv.onpointerup=sv.onpointercancel=e=>{ptrs.delete(e.pointerId);
  if(pinch){if(ptrs.size<2)pinch=null;paint();return}
  if(!drag||e.pointerId!=drag.id)return;const d=drag;drag=null;
  if(d.type=='draw'){let L=0;for(let i=1;i<d.pts.length;i++)L+=Math.hypot(d.pts[i][0]-d.pts[i-1][0],d.pts[i][1]-d.pts[i-1][1]);
   if(L>=16/view.k){const a={id:uid(),k:tool.split(':')[1],p:rdp(d.pts,10/view.k).map(p=>[Math.round(p[0]),Math.round(p[1])])};S.arrows.push(a);sel=a.id;commit()}}
  else if(d.moved)commit();
  paint()};
 sv.onwheel=e=>{e.preventDefault();const w0=pt(e);view.k=Math.max(1,Math.min(5,view.k*(e.deltaY<0?1.15:1/1.15)));setVB();const w=pt(e);view.x+=w0[0]-w[0];view.y+=w0[1]-w[1];paint()};
 sv.oncontextmenu=e=>e.preventDefault();

 root.onclick=e=>{const b=e.target.closest('button');if(!b)return;const{a,bg,t}=b.dataset;
  if(bg)setBg(bg);else if(t){tool=t;if(t!='sel')sel=null;paint()}
  else if(a)({un:()=>undo(-1),re:()=>undo(1),clr:()=>{S.els=[];S.arrows=[];sel=null;commit();paint()},rot:rotSel,dup:dupSel,del:delSel,np:()=>numAdd(1),nm:()=>numAdd(-1),rz:()=>{view={x:0,y:0,k:1};paint()}})[a]()};
 const key=e=>{if(!root.offsetParent||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const k=e.key.toLowerCase(),m=e.ctrlKey||e.metaKey;
  if(k=='delete'||k=='backspace'){delSel();e.preventDefault()}
  else if(m&&k=='z'){undo(e.shiftKey?1:-1);e.preventDefault()}else if(m&&k=='y'){undo(1);e.preventDefault()}
  else if(m&&k=='d'){dupSel();e.preventDefault()}else if(k=='r'&&!m)rotSel();else if(k=='escape'){sel=null;tool='sel';paint()}};
 addEventListener('keydown',key);paint();
 return{getData:()=>clone(S),
  setData(d){S=validBoard(d)?clone(d):EMPTY();sel=null;tool='sel';view={x:0,y:0,k:1};hist=[JSON.stringify(S)];hi=0;paint()},
  destroy(){removeEventListener('keydown',key);root.innerHTML=''}}}