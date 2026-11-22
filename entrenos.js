// entrenos.js · Entrenos: lista, creador manual, generador automático y Modo campo
export function initEntrenos({app, DB, getList, PH, esc, toast, thumbSvg, onBack, setView}) {
  const BL = ['warm', 'main', 'final'], $ = s => document.querySelector(s), clone = o => JSON.parse(JSON.stringify(o));
  let sessions = [], unsub = null, cur = null, mode = '', bdirty = 0, wake = null, pickB = '', pickAll = false;
  const gen = {n: {warm: 1, main: 2, final: 1}, tags: []};
  const st = document.createElement('style');
  st.textContent = '.t-ov{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:60;overflow:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top,0px))}.t-row{display:flex;gap:8px;align-items:center}';
  document.head.appendChild(st);

  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const fmt = d => new Date(d + 'T00:00').toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'});
  const byId = id => getList().find(e => e.id == id);
  const mins = arr => arr.reduce((s, i) => s + (byId(i.id)?.min || 0), 0);
  const tabs = '<div class="flex gap-2 mb-3"><button class="chip" data-act="t-home">Ejercicios</button><button class="chip on">Entrenos</button></div>';
  const sync = () => { const d = $('#t-date'); if (d && cur && mode == 'build') { cur.date = d.value || today(); cur.name = $('#t-name').value.trim(); } };
  const wakeOn = async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch (e) {} };
  const release = () => { try { wake?.release(); } catch (e) {} wake = null; };
  const closeOv = () => document.querySelectorAll('.t-ov').forEach(o => o.remove());
  const ov = () => { closeOv(); const o = document.createElement('div'); o.className = 't-ov'; document.body.appendChild(o); return o; };

  function watch(on) {
    unsub?.(); unsub = null; sessions = [];
    if (on) unsub = DB.watchSessions(s => { sessions = s; if (mode == 'list') showSessions(); }, e => toast('Entrenos: ' + e.code));
  }

  /* ---------- Lista de entrenos ---------- */
  function showSessions() {
    mode = 'list'; setView('ent'); release(); closeOv();
    const r = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
    app.innerHTML = `<div class="max-w-3xl mx-auto p-3 pb-28">${tabs}<div class="grid gap-3">${r.length ? r.map(s => {
      const it = s.items || [];
      return `<div class="card p-3 cursor-pointer" data-act="t-open" data-id="${s.id}"><div class="flex items-center gap-2"><b class="mr-auto">${fmt(s.date)}${s.name ? ' · ' + esc(s.name) : ''}</b><span class="badge">${s.done ? '✓ Realizado' : 'Pendiente'}</span></div>
      <div class="text-xs mt-1" style="color:var(--mu)">${it.length} ejercicios · ${mins(it)} min</div>
      <div class="flex gap-2 mt-2">${s.done ? '' : `<button class="btn sm" data-act="t-edit" data-id="${s.id}">Editar</button>`}<button class="btn sm" data-act="t-del" data-id="${s.id}">🗑</button></div></div>`;
    }).join('') : '<p class="p-6 text-center" style="color:var(--mu)">Aún no hay entrenos. Crea el primero con ＋ (manual o generado).</p>'}</div></div>
    <button class="fab" data-act="t-new" title="Nuevo entreno">＋</button>`;
  }

  /* ---------- Creador manual + generador ---------- */
  const items = b => cur.items.filter(i => i.b == b);
  function row(i) {
    const e = byId(i.id), k = cur.items.indexOf(i);
    return `<div class="t-row"><div class="w-20 shrink-0 rounded overflow-hidden">${e ? thumbSvg(e.board) : ''}</div><div class="min-w-0 mr-auto">
    <div class="font-semibold leading-tight">${e ? esc(e.title) : '(ejercicio borrado)'}</div>
    <div class="text-xs" style="color:var(--mu)">${e ? (e.min || 0) + ' min · ' + (e.lastUsed ? fmt(e.lastUsed) : 'Nunca usado') : ''}</div>
    <div class="flex gap-1 mt-1">${['t-up|▲', 't-dn|▼', 't-rf|↻ Refrescar', 't-rm|✕'].map(x => { const [a, l] = x.split('|'); return `<button class="btn sm" data-act="${a}" data-k="${k}">${l}</button>`; }).join('')}</div></div></div>`;
  }
  function build() {
    const y = scrollY; mode = 'build'; setView('ent');
    const tags = [...new Set(getList().flatMap(e => e.tags || []))].sort((a, b) => a.localeCompare(b, 'es'));
    const blk = b => { const it = items(b); return `<div class="card p-3"><div class="flex items-center mb-2"><b class="mr-auto">${PH[b]}</b><span class="text-xs" style="color:var(--mu)">${mins(it)} min</span></div>
      <div class="grid gap-3">${it.map(row).join('') || '<p class="text-xs" style="color:var(--mu)">Vacío</p>'}</div><button class="btn sm mt-3" data-act="t-add" data-b="${b}">＋ Añadir ejercicio</button></div>`; };
    app.innerHTML = `<div class="max-w-3xl mx-auto p-3 pb-28 grid gap-3">
    <div class="flex items-center gap-2"><button class="btn" data-act="t-list">← Entrenos</button><b class="mr-auto">${cur.id ? 'Editar' : 'Nuevo'} entreno</b><span class="text-sm">${mins(cur.items)} min</span></div>
    <div class="grid grid-cols-2 gap-2"><input id="t-date" type="date" class="inp" value="${cur.date}"><input id="t-name" class="inp" placeholder="Nombre (opcional)" value="${esc(cur.name)}"></div>
    <div class="card p-3 grid gap-2"><b>🎲 Generador automático</b>
    ${BL.map(b => `<div class="flex items-center gap-2"><span class="mr-auto">${PH[b]}</span><button class="btn sm" data-act="t-gn" data-b="${b}" data-d="-1">−</button><b class="w-6 text-center">${gen.n[b]}</b><button class="btn sm" data-act="t-gn" data-b="${b}" data-d="1">＋</button></div>`).join('')}
    <div class="lbl mt-1">Filtrar por objetivos (opcional)</div><div class="flex flex-wrap gap-1.5">${tags.map(t => `<button class="chip${gen.tags.includes(t) ? ' on' : ''}" data-act="t-gt" data-v="${esc(t)}">${esc(t)}</button>`).join('') || '<span class="text-xs">Aún no hay etiquetas</span>'}</div>
    <button class="btn pri" data-act="t-gen">Generar entreno</button></div>
    ${BL.map(blk).join('')}</div><div class="bar"><button class="btn pri flex-1" data-act="t-save">Guardar entreno</button></div>`;
    scrollTo(0, y);
  }
  // Selección ponderada sin repetición (Efraimidis-Spirakis): más peso = más días sin usar (o nunca usado) y más etiquetas coincidentes
  function pick(b, n, ex) {
    const T = gen.tags, now = Date.now();
    return getList().filter(e => e.phase == b && !ex.has(e.id) && (!T.length || (e.tags || []).some(t => T.includes(t))))
      .map(e => {
        const days = e.lastUsed ? Math.min(365, (now - new Date(e.lastUsed + 'T00:00')) / 864e5) : 400, m = T.length ? (e.tags || []).filter(t => T.includes(t)).length : 0;
        return {e, k: Math.random() ** (1 / ((1 + days) * (1 + m)))};
      }).sort((a, b) => b.k - a.k).slice(0, n).map(x => x.e);
  }
  function generate() {
    sync();
    BL.forEach(b => {
      const n = gen.n[b]; if (!n) return;
      const rest = cur.items.filter(i => i.b != b), r = pick(b, n, new Set(rest.map(i => i.id)));
      if (r.length < n) toast(`Solo hay ${r.length} de ${PH[b]} con esos filtros`);
      cur.items = [...rest, ...r.map(e => ({id: e.id, b}))];
    });
    bdirty = 1; build();
  }
  function refresh(k) {
    sync(); const it = cur.items[k], r = pick(it.b, 1, new Set(cur.items.map(i => i.id)));
    if (!r.length) { toast('No hay más ejercicios para ese bloque'); return; }
    cur.items[k] = {id: r[0].id, b: it.b}; bdirty = 1; build();
  }
  function move(k, dir) {
    const b = cur.items[k].b, ix = cur.items.map((x, i) => x.b == b ? i : -1).filter(i => i >= 0), p = ix.indexOf(k) + dir;
    if (p < 0 || p >= ix.length) return;
    [cur.items[k], cur.items[ix[p]]] = [cur.items[ix[p]], cur.items[k]]; bdirty = 1; build();
  }
  function save() {
    sync(); if (!cur.items.length) { toast('Añade al menos un ejercicio'); return; }
    const items = BL.flatMap(b => items_(b)).map(({id, b}) => ({id, b}));
    DB.saveSession({...cur, items}).catch(e => toast('Error: ' + e.message)); toast('Entreno guardado'); showSessions();
  }
  const items_ = b => cur.items.filter(i => i.b == b);

  /* ---------- Selector de ejercicios del banco ---------- */
  function openPick(b) {
    pickB = b; pickAll = false; const o = ov(); o.id = 't-pick';
    o.innerHTML = `<div class="max-w-xl mx-auto card p-3 grid gap-2"><div class="flex gap-2"><input id="t-q" class="inp" placeholder="Buscar en ${PH[b]}…"><button class="btn" data-act="t-pclose">Listo</button></div>
    <label class="text-sm"><input type="checkbox" data-act="t-pall"> Mostrar todas las fases</label><div id="t-res" class="grid gap-2"></div></div>`;
    fillPick();
  }
  function fillPick() {
    const q = ($('#t-q')?.value || '').toLowerCase(), used = new Set(cur.items.map(i => i.id));
    const r = getList().filter(e => (pickAll || e.phase == pickB) && !used.has(e.id) && (!q || [e.title, ...(e.tags || [])].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (a.lastUsed || '').localeCompare(b.lastUsed || ''));
    $('#t-res').innerHTML = r.map(e => `<div class="card p-2 t-row cursor-pointer" data-act="t-pick" data-id="${e.id}"><div class="w-16 shrink-0">${thumbSvg(e.board)}</div>
      <div><b>${esc(e.title)}</b><div class="text-xs" style="color:var(--mu)">${e.min || 0} min · ${e.lastUsed ? fmt(e.lastUsed) : 'Nunca usado'}</div></div></div>`).join('') || '<p class="text-sm">Nada disponible.</p>';
  }

  /* ---------- Modo campo ---------- */
  function field(s) {
    mode = 'field'; setView('ent'); cur = s; wakeOn(); window.scrollTo(0, 0);
    const it = s.items || [], mat = [...new Set(it.flatMap(i => byId(i.id)?.material || []))];
    app.innerHTML = `<div class="max-w-2xl mx-auto p-3 pb-28 grid gap-3"><div class="flex items-center gap-2"><button class="btn" data-act="t-list">← Entrenos</button><b class="mr-auto">${fmt(s.date)}${s.name ? ' · ' + esc(s.name) : ''}</b></div>
    <div class="card p-4 text-center"><div class="text-4xl font-bold">⏱ ${mins(it)} min</div><div class="text-sm" style="color:var(--mu)">${it.length} ejercicios</div></div>
    <div class="card p-3"><div class="lbl">Material total</div><div class="flex flex-wrap gap-1.5">${mat.map(m => `<span class="chip on" style="cursor:default">${esc(m)}</span>`).join('') || '—'}</div></div>
    ${BL.map(b => { const g = it.filter(i => i.b == b); return g.length ? `<div><div class="font-bold text-lg mb-2">${PH[b]} · ${mins(g)} min</div><div class="grid gap-3">${g.map(i => { const e = byId(i.id);
      return e ? `<div class="card overflow-hidden"><div class="thumb" style="cursor:zoom-in" data-act="t-zoom" data-id="${e.id}">${thumbSvg(e.board)}</div><div class="p-3"><b class="text-lg">${esc(e.title)}</b>
      <div class="text-sm" style="color:var(--mu)">${e.min || 0} min${e.players ? ' · ' + esc(e.players) + ' jug.' : ''}</div>
      <div class="flex flex-wrap gap-1 my-1">${(e.tags || []).map(t => `<span class="tg">${esc(t)}</span>`).join('')}</div><p class="whitespace-pre-wrap">${esc(e.desc)}</p></div></div>` : ''; }).join('')}</div></div>` : ''; }).join('')}</div>
    <div class="bar">${s.done ? '<button class="btn flex-1" disabled>✓ Entreno realizado</button>' : `<button class="btn" data-act="t-edit" data-id="${s.id}">Editar</button><button class="btn pri flex-1" data-act="t-done" data-id="${s.id}">✓ Entreno realizado</button>`}</div>`;
  }
  function done(id) {
    const s = sessions.find(x => x.id == id); if (!s || s.done) return;
    const ids = [...new Set(s.items.map(i => i.id))].filter(byId);
    if (!confirm(`¿Marcar como realizado? Se actualizará el último uso y el contador de ${ids.length} ejercicios.`)) return;
    const t = today(), d = s.date < t ? s.date : t; // nunca una fecha futura
    DB.completeSession(s.id, ids.map(i => ({id: i, lastUsed: (byId(i).lastUsed || '') > d ? byId(i).lastUsed : d}))).catch(e => toast('Error: ' + e.message));
    toast('Entreno registrado ✓'); showSessions();
  }

  /* ---------- Eventos ---------- */
  const find = id => sessions.find(x => x.id == id);
  const A = {
    't-home': () => { mode = ''; release(); closeOv(); onBack(); },
    't-list': () => { if (mode == 'build' && bdirty && !confirm('¿Salir sin guardar?')) return; showSessions(); },
    't-new': () => { cur = {date: today(), name: '', items: [], done: false}; bdirty = 0; build(); },
    't-open': (b, id) => find(id) && field(find(id)),
    't-edit': (b, id) => { cur = clone(find(id)); cur.items = cur.items || []; bdirty = 0; closeOv(); build(); },
    't-del': (b, id) => { if (confirm('¿Borrar este entreno?')) DB.deleteSession(id).catch(e => toast('Error: ' + e.message)); },
    't-add': b => { sync(); openPick(b.dataset.b); },
    't-pick': (b, id) => { cur.items.push({id, b: pickB}); bdirty = 1; fillPick(); toast('Añadido'); },
    't-pall': b => { pickAll = b.checked; fillPick(); },
    't-pclose': () => { closeOv(); build(); },
    't-up': (b, id, k) => { sync(); move(+k, -1); }, 't-dn': (b, id, k) => { sync(); move(+k, 1); },
    't-rf': (b, id, k) => refresh(+k),
    't-rm': (b, id, k) => { sync(); cur.items.splice(+k, 1); bdirty = 1; build(); },
    't-gn': b => { sync(); const x = b.dataset.b; gen.n[x] = Math.max(0, Math.min(6, gen.n[x] + +b.dataset.d)); build(); },
    't-gt': b => { sync(); const v = b.dataset.v, i = gen.tags.indexOf(v); i < 0 ? gen.tags.push(v) : gen.tags.splice(i, 1); build(); },
    't-gen': generate, 't-save': save, 't-done': (b, id) => done(id),
    't-zoom': (b, id) => {
      const e = byId(id); if (!e) return; const o = ov(); o.dataset.act = 't-zclose';
      o.innerHTML = `<div class="max-w-4xl mx-auto"><div class="text-white font-bold text-lg mb-2">${esc(e.title)}</div>${thumbSvg(e.board).replace('<svg ', '<svg style="width:100%;max-height:78vh;border-radius:8px" ')}<p class="text-white text-center text-sm mt-2">Toca para cerrar</p></div>`;
    },
    't-zclose': closeOv
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-act^="t-"]'); if (b) A[b.dataset.act]?.(b, b.dataset.id, b.dataset.k); });
  document.addEventListener('input', e => { if (e.target.id == 't-q') fillPick(); else if (e.target.id == 't-date' || e.target.id == 't-name') bdirty = 1; });
  return {open: showSessions, watch};
}
