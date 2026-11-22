// club.js · Vista "Club": ejercicios públicos de todos los equipos (solo lectura) y copia a la carpeta propia
export function initClub({DB, PH, esc, toast, thumbSvg, onChange}) {
  let items = [], unsub = null, mine = '';
  const st = document.createElement('style');
  st.textContent = '.c-ov{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:60;overflow:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top,0px));padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}';
  document.head.appendChild(st);
  const by = id => items.find(e => e.id == id), closeOv = () => document.querySelectorAll('.c-ov').forEach(o => o.remove());
  const tags = e => (e.tags || []).map(t => `<span class="tg">${esc(t)}</span>`).join('');
  const meta = e => `${e.min ? e.min + ' min · ' : ''}${e.players ? esc(e.players) + ' jug. · ' : ''}${esc((e.material || []).join(', '))}`;

  // La escucha solo se abre al entrar en "Club" (ahorra lecturas del plan gratuito)
  function watch(on) {
    if (on && !unsub) { mine = DB.miCarpeta(); unsub = DB.watchClub(a => { items = a; onChange(); }, e => toast('Club: ' + e.code)); }
    else if (!on) { unsub?.(); unsub = null; items = []; closeOv(); }
  }
  function card(e) {
    const own = e.owner == mine;
    return `<div class="card overflow-hidden cursor-pointer" data-act="c-open" data-id="${e.id}"><div class="thumb">${thumbSvg(e.board)}</div>
    <div class="p-3 grid gap-1.5"><div class="flex items-start gap-2"><b class="mr-auto leading-tight">${esc(e.title)}</b>${e.age ? `<span class="badge">${esc(e.age)}</span>` : ''}<span class="badge">${PH[e.phase] || ''}</span></div>
    <div class="flex flex-wrap gap-1">${tags(e)}</div><div class="text-xs" style="color:var(--mu)">${meta(e)}</div>
    <div class="flex items-center gap-2"><span class="text-xs mr-auto" style="color:var(--mu)">${own ? 'Tu equipo' : 'Otro equipo'}</span>
    ${own ? '' : `<button class="btn sm" data-act="c-copy" data-id="${e.id}">Copiar a mi equipo</button>`}</div></div></div>`;
  }
  function open(id) {
    const e = by(id); if (!e) return; closeOv();
    const o = document.createElement('div'); o.className = 'c-ov'; document.body.appendChild(o);
    o.innerHTML = `<div class="max-w-3xl mx-auto grid gap-3"><div class="flex gap-2"><button class="btn" data-act="c-close">← Cerrar</button>
    ${e.owner == mine ? '' : `<button class="btn pri flex-1" data-act="c-copy" data-id="${e.id}">Copiar a mi equipo</button>`}</div>
    <div class="card overflow-hidden">${thumbSvg(e.board).replace('<svg ', '<svg style="width:100%;max-height:68vh;display:block" ')}
    <div class="p-3 grid gap-2"><div class="flex items-center gap-2 flex-wrap"><b class="text-lg mr-auto">${esc(e.title)}</b>${e.age ? `<span class="badge">${esc(e.age)}</span>` : ''}<span class="badge">${PH[e.phase] || ''}</span></div>
    <div class="flex flex-wrap gap-1">${tags(e)}</div><div class="text-sm" style="color:var(--mu)">${meta(e)}</div><p class="whitespace-pre-wrap">${esc(e.desc)}</p></div></div></div>`;
  }
  function copy(id) {
    const e = by(id); if (!e) return;
    DB.copyFromClub(e).catch(err => toast('Error: ' + err.message));
    toast('Copiado a tu equipo (míralo en "Mi equipo")'); closeOv();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act^="c-"]'); if (!b) return; const a = b.dataset.act;
    if (a == 'c-open') open(b.dataset.id); else if (a == 'c-copy') copy(b.dataset.id); else if (a == 'c-close') closeOv();
  });
  return {items: () => items, watch, card};
}
