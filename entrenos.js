// entrenos.js · Entrenos: lista, creador manual, generador automático, bloques Postas/simultáneo y Modo campo
export function initEntrenos({app, DB, getList, getTags, PH, esc, toast, thumbSvg, onBack, setView}) {
  const BL = ['warm', 'main', 'final'], $ = s => document.querySelector(s), clone = o => JSON.parse(JSON.stringify(o));
  let sessions = [], unsub = null, cur = null, mode = '', bdirty = 0, wake = null, pickB = '', pickM = -1, pickAll = false, tabs = {};
  const gen = {n: {warm: 1, main: 2, final: 1}, tags: []};
  const st = document.createElement('style');
  st.textContent = '.t-ov{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:60;overflow:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top,0px))}.t-row{display:flex;gap:8px;align-items:center}';
  document.head.appendChild(st);

  /* Modelo de sesión (compatible con sesiones antiguas):
     items: [ {id, b}                                                      ← ejercicio normal
            , {multi:true, b, title, min, rot, items:[{exId, label}]} ]    ← bloque Postas / simultáneo */
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const fmt = d => new Date(d + 'T00:00').toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'});
  const byId = id => getList().find(e => e.id == id);
  const exIds = i => i.multi ? i.items.map(x => x.exId) : [i.id];
  const allIds = arr => arr.flatMap(exIds);
  const nEx = arr => arr.reduce((n, i) => n + (i.multi ? i.items.length : 1), 0);
  // En un bloque multi cuenta SOLO su tiempo total, no la suma de los ejercicios de dentro
  const mins = arr => arr.reduce((s, i) => s + (i.multi ? (+i.min || 0) : (byId(i.id)?.min || 0)), 0);
  const mtime = i => `${+i.min || 0} min${+i.rot ? ` · rotar cada ${+i.rot}'` : ''}`;
  const tg = e => (e.tags || []).map(t => `<span class="tg">${esc(t)}</span>`).join('');
  const items = b => cur.items.filter(i => i.b == b);
  const tabsHtml = '<div class="flex gap-2 mb-3"><button class="chip" data-act="t-home">Ejercicios</button><button class="chip on">Entrenos</button></div>';
  const wakeOn = async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch (e) {} };
  const release = () => { try { wake?.release(); } catch (e) {} wake = null; };
  const closeOv = () => document.querySelectorAll('.t-ov').forEach(o => o.remove());
  const ov = () => { closeOv(); const o = document.createElement('div'); o.className = 't-ov'; document.body.appendChild(o); return o; };

  // Vuelca los campos escritos (fecha, nombre, datos de los bloques de postas) al borrador antes de re-renderizar
  function sync() {
    if (!cur || mode != 'build') return;
    const d = $('#t-date'); if (d) { cur.date = d.value || today(); cur.name = $('#t-name').value.trim(); }
    app.querySelectorAll('[data-mf]').forEach(el => {
      const [k, f, j] = el.dataset.mf.split('|'), it = cur.items[+k]; if (!it || !it.multi) return;
      if (f == 't') it.title = el.value.trim();
      else if (f == 'm') it.min = Math.max(0, +el.value || 0);
      else if (f == 'r') it.rot = Math.max(0, +el.value || 0);
      else if (f == 'l' && it.items[+j]) it.items[+j].label = el.value.trim();
    });
  }

  function watch(on) {
    unsub?.(); unsub = null; sessions = [];
    if (on) unsub = DB.watchSessions(s => { sessions = s; if (mode == 'list') showSessions(); }, e => toast('Entrenos: ' + e.code));
  }

  /* ---------- Lista de entrenos ---------- */
  function showSessions() {
    mode = 'list'; setView('ent'); release(); closeOv();
    const r = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
    app.innerHTML = `<div class="max-w-3xl mx-auto p-3 pb-28">${tabsHtml}<div class="grid gap-3">${r.length ? r.map(s => {
      const it = s.items || [];
      return `<div class="card p-3 cursor-pointer" data-act="t-open" data-id="${s.id}"><div class="flex items-center gap-2"><b class="mr-auto">${fmt(s.date)}${s.name ? ' · ' + esc(s.name) : ''}</b><span class="badge">${s.done ? '✓ Realizado' : 'Pendiente'}</span></div>
      <div class="text-xs mt-1" style="color:var(--mu)">${nEx(it)} ejercicios · ${mins(it)} min</div>
      <div class="flex gap-2 mt-2">${s.done ? '' : `<button class="btn sm" data-act="t-edit" data-id="${s.id}">Editar</button>`}<button class="btn sm" data-act="t-del" data-id="${s.id}">🗑</button></div></div>`;
    }).join('') : '<p class="p-6 text-center" style="color:var(--mu)">Aún no hay entrenos. Crea el primero con ＋ (manual o generado).</p>'}</div></div>
    <button class="fab" data-act="t-new" title="Nuevo entreno">＋</button>`;
  }

  /* ---------- Creador manual + generador ---------- */
  function row(i) {
    const e = byId(i.id), k = cur.items.indexOf(i);
    return `<div class="t-row"><div class="w-20 shrink-0 rounded overflow-hidden">${e ? thumbSvg(e.board) : ''}</div><div class="min-w-0 mr-auto">
    <div class="font-semibold leading-tight">${e ? esc(e.title) : '(ejercicio borrado)'}</div>
    <div class="text-xs" style="color:var(--mu)">${e ? (e.min || 0) + ' min · ' + (e.lastUsed ? fmt(e.lastUsed) : 'Nunca usado') : ''}</div>
    <div class="flex gap-1 mt-1">${['t-up|▲', 't-dn|▼', 't-rf|↻ Refrescar', 't-rm|✕'].map(x => { const [a, l] = x.split('|'); return `<button class="btn sm" data-act="${a}" data-k="${k}">${l}</button>`; }).join('')}</div></div></div>`;
  }
  function mrow(i) {
    const k = cur.items.indexOf(i), btn = (a, l, j) => `<button class="btn sm" data-act="${a}" data-k="${k}"${j == null ? '' : ` data-j="${j}"`}>${l}</button>`;
    return `<div class="rounded-lg p-2 grid gap-2" style="border:2px dashed var(--ac)">
    <div class="flex items-center gap-1"><b class="mr-auto">🔀 Postas / simultáneo <span class="text-xs font-normal" style="color:var(--mu)">${mtime(i)}</span></b>${btn('t-up', '▲')}${btn('t-dn', '▼')}${btn('t-rm', '✕')}</div>
    <input class="inp" data-mf="${k}|t" placeholder="Título (ej. Postas, Trabajo simultáneo)" value="${esc(i.title)}">
    <div class="grid grid-cols-2 gap-2"><div><span class="lbl">Tiempo total (min)</span><input class="inp" type="number" inputmode="numeric" data-mf="${k}|m" value="${i.min ?? ''}"></div>
    <div><span class="lbl">Rotar cada (min, opcional)</span><input class="inp" type="number" inputmode="numeric" data-mf="${k}|r" value="${i.rot || ''}"></div></div>
    ${i.items.map((x, j) => { const e = byId(x.exId);
      return `<div class="t-row"><div class="w-16 shrink-0 rounded overflow-hidden">${e ? thumbSvg(e.board) : ''}</div><div class="min-w-0 mr-auto grid gap-1">
      <input class="inp" style="padding:5px 8px;font-size:14px" data-mf="${k}|l|${j}" placeholder="Posta ${j + 1}" value="${esc(x.label)}">
      <div class="text-sm font-semibold leading-tight">${e ? esc(e.title) : '(ejercicio borrado)'}</div>
      <div class="flex gap-1">${btn('t-mup', '▲', j)}${btn('t-mdn', '▼', j)}${btn('t-mrf', '↻', j)}${btn('t-mrm', '✕', j)}</div></div></div>`; }).join('') || '<p class="text-xs" style="color:var(--mu)">Sin ejercicios todavía</p>'}
    <div>${btn('t-madd', '＋ Añadir ejercicio al bloque')}</div></div>`;
  }
  function build() {
    const y = scrollY; mode = 'build'; setView('ent');
    const tags = getTags();
    const blk = b => { const it = items(b); return `<div class="card p-3"><div class="flex items-center mb-2"><b class="mr-auto">${PH[b]}</b><span class="text-xs" style="color:var(--mu)">${mins(it)} min</span></div>
      <div class="grid gap-3">${it.map(i => i.multi ? mrow(i) : row(i)).join('') || '<p class="text-xs" style="color:var(--mu)">Vacío</p>'}</div>
      <div class="flex gap-2 flex-wrap mt-3"><button class="btn sm" data-act="t-add" data-b="${b}">＋ Añadir ejercicio</button><button class="btn sm" data-act="t-addm" data-b="${b}">＋ Postas / simultáneo</button></div></div>`; };
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
      const rest = cur.items.filter(i => i.b != b || i.multi), r = pick(b, n, new Set(allIds(rest))); // los bloques de postas se conservan
      if (r.length < n) toast(`Solo hay ${r.length} de ${PH[b]} con esos filtros`);
      cur.items = [...rest, ...r.map(e => ({id: e.id, b}))];
    });
    bdirty = 1; build();
  }
  function refresh(k) {
    sync(); const it = cur.items[k], r = pick(it.b, 1, new Set(allIds(cur.items)));
    if (!r.length) { toast('No hay más ejercicios para ese bloque'); return; }
    cur.items[k] = {id: r[0].id, b: it.b}; bdirty = 1; build();
  }
  function mrefresh(k, j) {
    const it = cur.items[k], r = pick(it.b, 1, new Set(allIds(cur.items)));
    if (!r.length) { toast('No hay más ejercicios para ese bloque'); return; }
    it.items[j].exId = r[0].id; bdirty = 1; build();
  }
  function move(k, dir) {
    const b = cur.items[k].b, ix = cur.items.map((x, i) => x.b == b ? i : -1).filter(i => i >= 0), p = ix.indexOf(k) + dir;
    if (p < 0 || p >= ix.length) return;
    [cur.items[k], cur.items[ix[p]]] = [cur.items[ix[p]], cur.items[k]]; bdirty = 1; build();
  }
  function mmove(k, j, dir) {
    const a = cur.items[k].items, p = j + dir; if (p < 0 || p >= a.length) return;
    [a[j], a[p]] = [a[p], a[j]]; bdirty = 1; build();
  }
  function save() {
    sync(); if (!cur.items.length) { toast('Añade al menos un ejercicio'); return; }
    if (cur.items.some(i => i.multi && !i.items.length)) { toast('Hay un bloque de postas sin ejercicios'); return; }
    const out = BL.flatMap(b => items(b)).map(i => i.multi
      ? {multi: true, b: i.b, title: i.title || '', min: +i.min || 0, rot: +i.rot || 0, items: i.items.map(x => ({exId: x.exId, label: x.label || ''}))}
      : {id: i.id, b: i.b});
    DB.saveSession({...cur, items: out}).catch(e => toast('Error: ' + e.message)); toast('Entreno guardado'); showSessions();
  }

  /* ---------- Selector de ejercicios del banco (para bloque normal o para un bloque de postas) ---------- */
  function openPick(b, mk = -1) {
    pickB = b; pickM = mk; pickAll = false; const o = ov(); o.id = 't-pick';
    o.innerHTML = `<div class="max-w-xl mx-auto card p-3 grid gap-2"><div class="flex gap-2"><input id="t-q" class="inp" placeholder="Buscar en ${PH[b]}…"><button class="btn" data-act="t-pclose">Listo</button></div>
    <label class="text-sm"><input type="checkbox" data-act="t-pall"> Mostrar todas las fases</label><div id="t-res" class="grid gap-2"></div></div>`;
    fillPick();
  }
  function fillPick() {
    const q = ($('#t-q')?.value || '').toLowerCase(), used = new Set(allIds(cur.items));
    const r = getList().filter(e => (pickAll || e.phase == pickB) && !used.has(e.id) && (!q || [e.title, ...(e.tags || [])].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (a.lastUsed || '').localeCompare(b.lastUsed || ''));
    $('#t-res').innerHTML = r.map(e => `<div class="card p-2 t-row cursor-pointer" data-act="t-pick" data-id="${e.id}"><div class="w-16 shrink-0">${thumbSvg(e.board)}</div>
      <div><b>${esc(e.title)}</b><div class="text-xs" style="color:var(--mu)">${e.min || 0} min · ${e.lastUsed ? fmt(e.lastUsed) : 'Nunca usado'}</div></div></div>`).join('') || '<p class="text-sm">Nada disponible.</p>';
  }

  /* ---------- Modo campo ---------- */
  function ncard(e) {
    return `<div class="card overflow-hidden"><div class="thumb" style="cursor:zoom-in" data-act="t-zoom" data-id="${e.id}">${thumbSvg(e.board)}</div><div class="p-3"><b class="text-lg">${esc(e.title)}</b>
    <div class="text-sm" style="color:var(--mu)">${e.min || 0} min${e.players ? ' · ' + esc(e.players) + ' jug.' : ''}</div>
    <div class="flex flex-wrap gap-1 my-1">${tg(e)}</div><p class="whitespace-pre-wrap">${esc(e.desc)}</p></div></div>`;
  }
  // Pestañas grandes (Posta 1, Posta 2…) y el ejercicio seleccionado del bloque
  function mBody(k) {
    const it = cur.items[k], n = it.items.length;
    if (!n) return '<p class="p-3 text-sm">Bloque vacío</p>';
    const j = Math.min(tabs[k] || 0, n - 1), e = byId(it.items[j].exId);
    return `<div class="flex gap-2 px-3 py-2 overflow-x-auto">${it.items.map((y, i) => `<button class="chip${i == j ? ' on' : ''}" style="font-size:16px;padding:8px 18px;min-height:48px;flex:none" data-act="t-tab" data-k="${k}" data-j="${i}">${esc(y.label || 'Posta ' + (i + 1))}</button>`).join('')}</div>` +
      (e ? `<div class="thumb" style="cursor:zoom-in" data-act="t-zoom" data-id="${e.id}">${thumbSvg(e.board)}</div><div class="p-3"><b class="text-lg">${esc(e.title)}</b>
      <div class="text-sm" style="color:var(--mu)">${e.players ? esc(e.players) + ' jug.' : ''}</div><div class="flex flex-wrap gap-1 my-1">${tg(e)}</div><p class="whitespace-pre-wrap">${esc(e.desc)}</p></div>` : '<p class="p-3 text-sm">Ejercicio no disponible</p>');
  }
  const mcard = (i, k) => `<div class="card overflow-hidden" style="border:2px solid var(--ac)"><div class="p-3"><b class="text-lg">🔀 ${esc(i.title || 'Trabajo simultáneo')}</b>
    <div class="text-2xl font-bold">⏱ ${mtime(i)}</div></div><div id="mb-${k}">${mBody(k)}</div></div>`;
  function field(s) {
    mode = 'field'; setView('ent'); cur = s; tabs = {}; wakeOn(); window.scrollTo(0, 0);
    const it = s.items || [], mat = [...new Set(allIds(it).flatMap(id => byId(id)?.material || []))];
    app.innerHTML = `<div class="max-w-2xl mx-auto p-3 pb-28 grid gap-3"><div class="flex items-center gap-2"><button class="btn" data-act="t-list">← Entrenos</button><b class="mr-auto">${fmt(s.date)}${s.name ? ' · ' + esc(s.name) : ''}</b></div>
    <div class="card p-4 text-center"><div class="text-4xl font-bold">⏱ ${mins(it)} min</div><div class="text-sm" style="color:var(--mu)">${nEx(it)} ejercicios</div></div>
    <div class="card p-3"><div class="lbl">Material total</div><div class="flex flex-wrap gap-1.5">${mat.map(m => `<span class="chip on" style="cursor:default">${esc(m)}</span>`).join('') || '—'}</div></div>
    ${BL.map(b => { const g = it.filter(i => i.b == b); return g.length ? `<div><div class="font-bold text-lg mb-2">${PH[b]} · ${mins(g)} min</div><div class="grid gap-3">${g.map(i => {
      if (i.multi) return mcard(i, it.indexOf(i));
      const e = byId(i.id); return e ? ncard(e) : ''; }).join('')}</div></div>` : ''; }).join('')}</div>
    <div class="bar">${s.done ? '<button class="btn flex-1" disabled>✓ Entreno realizado</button>' : `<button class="btn" data-act="t-edit" data-id="${s.id}">Editar</button><button class="btn pri flex-1" data-act="t-done" data-id="${s.id}">✓ Entreno realizado</button>`}</div>`;
  }
  function done(id) {
    const s = sessions.find(x => x.id == id); if (!s || s.done) return;
    const ids = [...new Set(allIds(s.items || []))].filter(byId); // todos los ejercicios reales, también los de dentro de las postas, sin repetir
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
    't-addm': b => { sync(); cur.items.push({multi: true, b: b.dataset.b, title: '', min: 15, rot: 0, items: []}); bdirty = 1; openPick(b.dataset.b, cur.items.length - 1); },
    't-madd': (b, id, k) => { sync(); openPick(cur.items[+k].b, +k); },
    't-pick': (b, id) => {
      if (pickM >= 0 && cur.items[pickM]?.multi) cur.items[pickM].items.push({exId: id, label: ''}); else cur.items.push({id, b: pickB});
      bdirty = 1; fillPick(); toast('Añadido');
    },
    't-pall': b => { pickAll = b.checked; fillPick(); },
    't-pclose': () => { closeOv(); build(); },
    't-up': (b, id, k) => { sync(); move(+k, -1); }, 't-dn': (b, id, k) => { sync(); move(+k, 1); },
    't-rf': (b, id, k) => refresh(+k),
    't-rm': (b, id, k) => { sync(); cur.items.splice(+k, 1); bdirty = 1; build(); },
    't-mup': (b, id, k) => { sync(); mmove(+k, +b.dataset.j, -1); }, 't-mdn': (b, id, k) => { sync(); mmove(+k, +b.dataset.j, 1); },
    't-mrf': (b, id, k) => { sync(); mrefresh(+k, +b.dataset.j); },
    't-mrm': (b, id, k) => { sync(); cur.items[+k].items.splice(+b.dataset.j, 1); bdirty = 1; build(); },
    't-tab': (b, id, k) => { tabs[k] = +b.dataset.j; $('#mb-' + k).innerHTML = mBody(+k); },
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
  document.addEventListener('input', e => {
    if (e.target.id == 't-q') fillPick();
    else if (e.target.id == 't-date' || e.target.id == 't-name' || e.target.dataset.mf) bdirty = 1;
  });
  return {open: showSessions, watch};
}
