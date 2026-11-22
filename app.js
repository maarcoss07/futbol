// app.js · Interfaz: login, listado con filtros y formulario de ejercicio
import {createBoard, thumbSvg, EMPTY} from './pizarra.js';
import * as DB from './db.js';
import {initEntrenos} from './entrenos.js';
import {initClub} from './club.js';
import {initIA} from './ia.js';

const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const PH = {warm: 'Calentamiento', main: 'Parte Principal', final: 'Finalización'};
const DT = ['Presión', 'Finalización / chute', 'Pase y control', 'Conducción', 'Rondos / posesión', 'Defensa', 'Amplitud', '1 contra 1', 'Coordinación'];
const DM = ['Conos', 'Petos', 'Balones', 'Minis porterías', 'Picas', 'Aros'];
const AGES = ['S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'Infantil', 'Cadete', 'Juvenil'];
const ERR = {'auth/invalid-credential': 'Email o contraseña incorrectos', 'auth/invalid-email': 'Email no válido', 'auth/email-already-in-use': 'Ese email ya tiene cuenta',
  'auth/weak-password': 'Contraseña demasiado corta (mínimo 6)', 'auth/popup-blocked': 'Ventana de Google bloqueada: usa email y contraseña',
  'auth/popup-closed-by-user': '', 'auth/operation-not-allowed': 'Activa ese método en Firebase → Authentication'};

let user = null, list = [], view = '', F = {q: '', ph: [], tag: [], mat: [], age: [], sort: 'old', scope: 'mine'}, fopen = '', d = null, board = null, dirty = false, unsub = null;
const toggleF = (k, v) => { const a = F[k], i = a.indexOf(v); i < 0 ? a.push(v) : a.splice(i, 1); };

function toast(m) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
const uniq = (def, key, extra = []) => [...new Set([...def, ...list.flatMap(e => e[key] || []), ...extra])].sort((a, b) => a.localeCompare(b, 'es'));
const last = e => {
  if (!e.lastUsed) return 'Nunca usado';
  const n = Math.floor((Date.now() - new Date(e.lastUsed + 'T00:00')) / 864e5);
  return n <= 0 ? 'Usado hoy' : n < 14 ? `hace ${n} d` : `hace ${Math.round(n / 7)} sem`;
};
const T = initEntrenos({app, DB, getList: () => list, getTags: () => uniq(DT, 'tags'), PH, esc, toast, thumbSvg, onBack: () => showList(), setView: v => view = v});
const C = initClub({DB, PH, esc, toast, thumbSvg, onChange: () => { if (view == 'list' && F.scope == 'club') renderList(); }});
const IA = initIA({AGES, PH, getTags: () => uniq(DT, 'tags'), getMats: () => uniq(DM, 'material'), esc, toast, onLoad: d => { edit(d); dirty = true; }});

/* ---------- Login ---------- */
function login() {
  view = 'login';
  app.innerHTML = `<div class="max-w-sm mx-auto p-5 pt-16"><h1 class="text-2xl font-bold mb-1">⚽ Banco de ejercicios</h1>
  <p class="mb-5" style="color:var(--mu)">Inicia sesión para continuar</p>
  <div class="card p-4 grid gap-3"><input id="em" type="email" autocomplete="email" placeholder="Email" class="inp">
  <input id="pw" type="password" autocomplete="current-password" placeholder="Contraseña" class="inp">
  <div id="err" class="text-sm text-red-500"></div>
  <button class="btn pri" data-act="login">Entrar</button>
  <button class="text-sm underline p-2" data-act="reset">Olvidé mi contraseña</button></div></div>`;
}
async function auth(kind) {
  const em = $('#em').value.trim(), pw = $('#pw').value;
  try {
    if (kind == 'reset') { if (!em) throw {message: 'Escribe tu email primero'}; await DB.resetPass(em); toast('Email de recuperación enviado'); }
    else await DB.loginEmail(em, pw);
  } catch (e) { $('#err').textContent = ERR[e.code] ?? e.message; }
}

/* ---------- Listado ---------- */
function showList() {
  view = 'list';
  app.innerHTML = `<div class="max-w-5xl mx-auto p-3 pb-28"><div class="flex items-center gap-2 mb-3">
  <button class="chip on">Ejercicios <span id="cnt" class="text-xs"></span></button><button class="chip" data-act="goT">Entrenos</button><span class="mr-auto"></span><button class="btn sm" data-act="logout">Salir</button></div>
  <div class="card p-3 grid gap-2 mb-3"><div class="flex gap-1.5 items-center">
  <button class="chip${F.scope == 'mine' ? ' on' : ''}" data-act="scope" data-v="mine">Mi equipo</button><button class="chip${F.scope == 'club' ? ' on' : ''}" data-act="scope" data-v="club">Club</button>
  <span class="mr-auto"></span><button class="btn sm" data-act="ia">✨ Crear con IA</button></div>
  <input id="q" class="inp" placeholder="Buscar…" value="${esc(F.q)}"><div class="flex gap-1.5 flex-wrap" id="phs"></div>
  <div class="flex gap-1.5 flex-wrap" id="fb"></div><div class="flex gap-1.5 flex-wrap" id="fp"></div>
  <div class="flex gap-2 items-center"><select id="fs" class="inp"></select><button class="btn sm whitespace-nowrap" id="fc" data-act="fclear" hidden>Limpiar filtros</button></div></div>
  <div id="list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
  <div class="text-xs mt-6 flex flex-wrap items-center gap-2" style="color:var(--mu)"><span>UID: ${esc(user.uid)}</span><button class="btn sm" data-act="exp">Exportar copia</button><button class="btn sm" data-act="imp">Importar copia</button><input type="file" id="imp-f" accept=".json,application/json" hidden></div></div>
  <button class="fab" data-act="new" title="Nuevo ejercicio">＋</button>`;
  renderList();
}
function card(e) {
  const mat = (e.material || []).join(', ');
  return `<div class="card overflow-hidden cursor-pointer" data-act="edit" data-id="${e.id}"><div class="thumb">${thumbSvg(e.board)}</div>
  <div class="p-3 grid gap-1.5"><div class="flex items-start gap-2"><b class="mr-auto leading-tight">${esc(e.title)}</b>${e.age ? `<span class="badge">${esc(e.age)}</span>` : ''}${e.public ? '<span class="badge">🌐</span>' : ''}<span class="badge">${PH[e.phase] || ''}</span></div>
  <div class="flex flex-wrap gap-1">${(e.tags || []).map(t => `<span class="tg">${esc(t)}</span>`).join('')}</div>
  <div class="text-xs" style="color:var(--mu)">${e.min ? e.min + ' min · ' : ''}${e.players ? esc(e.players) + ' jug. · ' : ''}${esc(mat)}</div>
  <div class="flex items-center gap-2 text-xs"><span class="mr-auto">${last(e)} · ${e.uses || 0} usos</span>
  <button class="btn sm" data-act="dup" data-id="${e.id}">Duplicar</button><button class="btn sm" data-act="del" data-id="${e.id}">🗑</button></div></div></div>`;
}
function renderList() {
  const club = F.scope == 'club', src = club ? C.items() : list;
  const cx = club ? {tag: src.flatMap(e => e.tags || []), mat: src.flatMap(e => e.material || [])} : {tag: [], mat: []};
  // las opciones activas siempre se muestran, para poder desmarcarlas aunque no existan en esta vista
  const opts = {age: AGES, tag: uniq(DT, 'tags', [...cx.tag, ...F.tag]), mat: uniq(DM, 'material', [...cx.mat, ...F.mat])};
  const LB = {age: 'Edad', tag: 'Etiquetas', mat: 'Material'};
  const chip = (act, k, v, on, l = v) => `<button class="chip${on ? ' on' : ''}" data-act="${act}" data-k="${k}" data-v="${esc(v)}">${esc(l)}</button>`;
  $('#phs').innerHTML = chip('fph', 'ph', '', !F.ph.length, 'Todas') + Object.entries(PH).map(([k, l]) => chip('fph', 'ph', k, F.ph.includes(k), l)).join('');
  $('#fb').innerHTML = ['age', 'tag', 'mat'].map(k => `<button class="chip${F[k].length ? ' on' : ''}" data-act="fopen" data-k="${k}">${LB[k]}${F[k].length ? ` (${F[k].length})` : ''} ${fopen == k ? '▴' : '▾'}</button>`).join('');
  $('#fp').innerHTML = fopen ? opts[fopen].map(v => chip('fchip', fopen, v, F[fopen].includes(v))).join('') : '';
  $('#fp').style.display = fopen ? '' : 'none';
  $('#fc').hidden = !(F.ph.length + F.tag.length + F.mat.length + F.age.length);
  const sorts = club
    ? {new: (a, b) => (b.ts || 0) - (a.ts || 0), az: (a, b) => a.title.localeCompare(b.title, 'es')}
    : {old: (a, b) => (a.lastUsed || '').localeCompare(b.lastUsed || ''), new: (a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || ''),
       az: (a, b) => a.title.localeCompare(b.title, 'es'), most: (a, b) => (b.uses || 0) - (a.uses || 0)};
  const sk = sorts[F.sort] ? F.sort : Object.keys(sorts)[0];
  const sopt = club ? [['new', 'Más recientes'], ['az', 'A-Z']] : [['old', 'Más tiempo sin usar'], ['new', 'Usados hace poco'], ['az', 'A-Z'], ['most', 'Más usados']];
  $('#fs').innerHTML = sopt.map(([v, l]) => `<option value="${v}"${sk == v ? ' selected' : ''}>${l}</option>`).join('');
  // AND entre categorías, OR dentro de cada una
  const q = F.q.toLowerCase(), any = (sel, arr) => !sel.length || arr.some(x => sel.includes(x));
  const r = src.filter(e => (!F.ph.length || F.ph.includes(e.phase)) && (!F.age.length || F.age.includes(e.age)) &&
    any(F.tag, e.tags || []) && any(F.mat, e.material || []) &&
    (!q || [e.title, e.desc, ...(e.tags || []), ...(e.material || [])].join(' ').toLowerCase().includes(q)));
  r.sort(sorts[sk]);
  $('#cnt').textContent = `(${r.length}/${src.length})`;
  document.querySelectorAll('.fab').forEach(b => b.style.display = club ? 'none' : '');
  $('#list').innerHTML = r.length ? r.map(club ? C.card : card).join('') :
    `<p class="p-6 text-center sm:col-span-2 lg:col-span-3" style="color:var(--mu)">${src.length ? 'Nada con esos filtros.' : club ? 'El club aún no tiene ejercicios públicos.' : 'Aún no hay ejercicios. Pulsa ＋ para crear el primero.'}</p>`;
}

/* ---------- Formulario ---------- */
const chips = (act, arr, sel) => arr.map(t => `<button class="chip${sel.includes(t) ? ' on' : ''}" data-act="${act}" data-v="${esc(t)}">${esc(t)}</button>`).join('');
function drawChips() {
  $('#c-tags').innerHTML = chips('tg', uniq(DT, 'tags', d.tags), d.tags);
  $('#c-mat').innerHTML = chips('mt', uniq(DM, 'material', d.material), d.material);
  $('#f-ph').innerHTML = Object.entries(PH).map(([k, v]) => `<button class="chip flex-1${d.phase == k ? ' on' : ''}" data-act="ph" data-v="${k}">${v}</button>`).join('');
}
function edit(ex, prev) {
  view = 'edit'; dirty = false;
  d = ex ? clone(ex) : {title: '', desc: '', phase: prev?.phase || 'main', tags: [...(prev?.tags || [])], min: prev?.min ?? 15, players: prev?.players || '',
    material: [...(prev?.material || [])], age: prev?.age || '', public: false, lastUsed: null, uses: 0, board: EMPTY()};
  d.tags = d.tags || []; d.material = d.material || [];
  app.innerHTML = `<div class="max-w-3xl mx-auto p-3 pb-28 grid gap-3">
  <div class="flex gap-2 items-center"><button class="btn" data-act="back">← Volver</button><h1 class="font-bold">${d.id ? 'Editar' : 'Nuevo'} ejercicio</h1></div>
  <input id="f-t" class="inp" placeholder="Título" value="${esc(d.title)}">
  <div class="flex gap-1.5" id="f-ph"></div>
  <div><span class="lbl">Etiquetas / objetivos</span><div id="c-tags" class="flex flex-wrap gap-1.5"></div>
  <div class="flex gap-2 mt-2"><input id="n-tag" class="inp" placeholder="Nueva etiqueta"><button class="btn" data-act="addTag">＋</button></div></div>
  <div class="grid grid-cols-2 gap-2"><div><span class="lbl">Duración (min)</span><input id="f-m" type="number" inputmode="numeric" class="inp" value="${d.min ?? ''}">
  <div class="flex gap-1 mt-1">${[5, 10, 15, 20].map(n => `<button class="chip" style="padding:4px 10px;min-height:30px" data-act="min" data-n="${n}">${n}</button>`).join('')}</div></div>
  <div><span class="lbl">Jugadores</span><input id="f-p" class="inp" inputmode="numeric" placeholder="ej. 8" value="${esc(d.players)}"></div></div>
  <div class="grid grid-cols-2 gap-2"><div><span class="lbl">Edad / categoría</span><select id="f-a" class="inp"><option value="">—</option>${AGES.map(a => `<option${d.age == a ? ' selected' : ''}>${a}</option>`).join('')}</select></div>
  <label class="flex items-center gap-2 text-sm pt-5"><input type="checkbox" id="f-pub" class="w-5 h-5"${d.public ? ' checked' : ''}> Compartir con el club (público)</label></div>
  <div id="board" class="card overflow-hidden" style="height:72vh;min-height:420px"></div>
  <div><span class="lbl">Descripción (objetivo, explicación, variantes, puntos clave)</span><textarea id="f-d" rows="6" class="inp">${esc(d.desc)}</textarea></div>
  <div><span class="lbl">Material necesario</span><div id="c-mat" class="flex flex-wrap gap-1.5"></div>
  <div class="flex gap-2 mt-2"><input id="n-mat" class="inp" placeholder="Nuevo material"><button class="btn" data-act="addMat">＋</button></div></div>
  <div class="grid grid-cols-2 gap-2"><div><span class="lbl">Último uso</span><input id="f-l" type="date" class="inp" value="${d.lastUsed || ''}"></div>
  <div><span class="lbl">Veces usado</span><input id="f-u" type="number" inputmode="numeric" class="inp" value="${d.uses || 0}"></div></div></div>
  <div class="bar"><button class="btn" data-act="back">Cancelar</button><button class="btn pri flex-1" data-act="save">Guardar</button>
  ${d.id ? '' : '<button class="btn" data-act="saveNew">Guardar y otro</button>'}</div>`;
  board = createBoard($('#board'), {data: d.board, onChange: () => dirty = true});
  drawChips(); window.scrollTo(0, 0);
}
function save(more) {
  const ex = {...d, title: $('#f-t').value.trim(), desc: $('#f-d').value.trim(), min: +$('#f-m').value || 0, players: $('#f-p').value.trim(),
    age: $('#f-a').value, public: $('#f-pub').checked, lastUsed: $('#f-l').value || null, uses: +$('#f-u').value || 0, board: board.getData()};
  if (!ex.title) { toast('Pon un título'); $('#f-t').focus(); return; }
  DB.saveExercise(ex).catch(e => toast('Error al guardar: ' + e.message)); // sin await: funciona offline
  toast('Guardado'); board.destroy(); board = null;
  more ? edit(null, ex) : showList();
}
function addItem(inp, arr) {
  const v = $(inp).value.trim(); if (v && !arr.includes(v)) arr.push(v);
  $(inp).value = ''; dirty = true; drawChips();
}
const toggle = (arr, v) => { const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); dirty = true; drawChips(); };
async function exportar() {
  try {
    const D = await DB.exportAll(), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(D)], {type: 'application/json'}));
    a.download = `copia-ejercicios-${D.date.slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(`Copia: ${D.exercises.length} ejercicios, ${D.sessions.length} entrenos`);
  } catch (e) { toast('Error: ' + e.message); }
}
async function importar(f) {
  try {
    const D = JSON.parse(await f.text());
    if (!confirm(`¿Restaurar ${D.exercises?.length || 0} ejercicios y ${D.sessions?.length || 0} entrenos? Los que tengan el mismo id se sobrescribirán.`)) return;
    toast('Importando…'); toast(`Restaurados ${await DB.importAll(D)} elementos`);
  } catch (e) { toast('Error: ' + e.message); }
}
/* ---------- Eventos ---------- */
app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, v = b.dataset.v, ex = () => list.find(x => x.id == id);
  ({
    login: () => auth('login'), reset: () => auth('reset'), logout: () => DB.logout(),
    new: () => edit(), edit: () => edit(ex()),
    goT: () => T.open(),
    scope: () => { F.scope = v; if (v == 'club') C.watch(true); showList(); },
    ia: () => IA.open(),
    exp: exportar, imp: () => $('#imp-f').click(),
    dup: () => { DB.duplicateExercise(ex()).catch(err => toast('Error: ' + err.message)); toast('Duplicado'); },
    del: () => { const x = ex(); if (x && confirm(`¿Borrar "${x.title}"?`)) DB.deleteExercise(id).catch(err => toast('Error: ' + err.message)); },
    back: () => { if (dirty && !confirm('¿Descartar los cambios?')) return; board?.destroy(); board = null; showList(); },
    save: () => save(), saveNew: () => save(1),
    ph: () => { d.phase = v; dirty = true; drawChips(); }, tg: () => toggle(d.tags, v), mt: () => toggle(d.material, v),
    addTag: () => addItem('#n-tag', d.tags), addMat: () => addItem('#n-mat', d.material),
    min: () => { $('#f-m').value = b.dataset.n; dirty = true; },
    fph: () => { v ? toggleF('ph', v) : F.ph = []; renderList(); },
    fopen: () => { const k = b.dataset.k; fopen = fopen == k ? '' : k; renderList(); },
    fchip: () => { toggleF(b.dataset.k, v); renderList(); },
    fclear: () => { F.ph = []; F.tag = []; F.mat = []; F.age = []; renderList(); }
  })[a]?.();
});
app.addEventListener('input', e => { if (e.target.id == 'q') { F.q = e.target.value; renderList(); } else if (view == 'edit') dirty = true; });
app.addEventListener('change', e => {
  if (e.target.id == 'imp-f') { const f = e.target.files[0]; e.target.value = ''; f && importar(f); return; }
  if (e.target.id == 'fs') { F.sort = e.target.value; renderList(); }
});
app.addEventListener('keydown', e => {
  if (e.key == 'Enter' && e.target.id == 'n-tag') addItem('#n-tag', d.tags);
  if (e.key == 'Enter' && e.target.id == 'n-mat') addItem('#n-mat', d.material);
});
const off = document.createElement('div');
off.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);right:8px;z-index:70;background:#b45309;color:#fff;font-size:12px;padding:3px 10px;border-radius:99px;display:none;pointer-events:none';
off.textContent = 'Sin conexión · usando caché'; document.body.appendChild(off);
const net = () => off.style.display = navigator.onLine ? 'none' : 'block';
addEventListener('online', net); addEventListener('offline', net); net();
/* ---------- Arranque ---------- */
if (!DB.configured) {
  app.innerHTML = `<div class="max-w-sm mx-auto p-5 pt-16"><div class="card p-4"><b>Falta configurar Firebase</b><p class="mt-2 text-sm">Abre <code>db.js</code> y pega tu <code>firebaseConfig</code> en el bloque marcado.</p></div></div>`;
} else {
  DB.onUser(u => {
    user = u; unsub?.(); unsub = null; list = [];
    if (!u) { T.watch(false); C.watch(false); board?.destroy(); board = null; login(); return; }
    unsub = DB.watchExercises(arr => { list = arr; if (view == 'list') renderList(); },
      err => toast('Sin acceso a Firestore: revisa las reglas y tu UID (' + err.code + ')'));
    T.watch(true);
    showList();
  });
}