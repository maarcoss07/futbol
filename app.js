// app.js · Interfaz: login, listado con filtros y formulario de ejercicio
import {createBoard, thumbSvg, EMPTY} from './pizarra.js';
import * as DB from './db.js';
import {initEntrenos} from './entrenos.js';

const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const PH = {warm: 'Calentamiento', main: 'Parte Principal', final: 'Finalización'};
const DT = ['Presión', 'Finalización / chute', 'Pase y control', 'Conducción', 'Rondos / posesión', 'Defensa', 'Amplitud', '1 contra 1', 'Coordinación'];
const DM = ['Conos', 'Petos', 'Balones', 'Minis porterías', 'Picas', 'Aros'];
const ERR = {'auth/invalid-credential': 'Email o contraseña incorrectos', 'auth/invalid-email': 'Email no válido', 'auth/email-already-in-use': 'Ese email ya tiene cuenta',
  'auth/weak-password': 'Contraseña demasiado corta (mínimo 6)', 'auth/popup-blocked': 'Ventana de Google bloqueada: usa email y contraseña',
  'auth/popup-closed-by-user': '', 'auth/operation-not-allowed': 'Activa ese método en Firebase → Authentication'};

let user = null, list = [], view = '', F = {q: '', ph: '', tag: '', mat: '', sort: 'old'}, d = null, board = null, dirty = false, unsub = null;

function toast(m) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
const uniq = (def, key, extra = []) => [...new Set([...def, ...list.flatMap(e => e[key] || []), ...extra])].sort((a, b) => a.localeCompare(b, 'es'));
const last = e => {
  if (!e.lastUsed) return 'Nunca usado';
  const n = Math.floor((Date.now() - new Date(e.lastUsed + 'T00:00')) / 864e5);
  return n <= 0 ? 'Usado hoy' : n < 14 ? `hace ${n} d` : `hace ${Math.round(n / 7)} sem`;
};
const T = initEntrenos({app, DB, getList: () => list, PH, esc, toast, thumbSvg, onBack: () => showList(), setView: v => view = v});

/* ---------- Login ---------- */
function login() {
  view = 'login';
  app.innerHTML = `<div class="max-w-sm mx-auto p-5 pt-16"><h1 class="text-2xl font-bold mb-1">⚽ Banco de ejercicios</h1>
  <p class="mb-5" style="color:var(--mu)">Inicia sesión para continuar</p>
  <div class="card p-4 grid gap-3"><input id="em" type="email" autocomplete="email" placeholder="Email" class="inp">
  <input id="pw" type="password" autocomplete="current-password" placeholder="Contraseña" class="inp">
  <div id="err" class="text-sm text-red-500"></div>
  <button class="btn pri" data-act="login">Entrar</button><button class="btn" data-act="register">Crear cuenta</button>
  <button class="btn" data-act="google">Continuar con Google</button>
  <button class="text-sm underline p-2" data-act="reset">Olvidé mi contraseña</button></div></div>`;
}
async function auth(kind) {
  const em = $('#em').value.trim(), pw = $('#pw').value;
  try {
    if (kind == 'google') await DB.loginGoogle();
    else if (kind == 'reset') { if (!em) throw {message: 'Escribe tu email primero'}; await DB.resetPass(em); toast('Email de recuperación enviado'); }
    else await DB[kind == 'login' ? 'loginEmail' : 'registerEmail'](em, pw);
  } catch (e) { $('#err').textContent = ERR[e.code] ?? e.message; }
}

/* ---------- Listado ---------- */
function showList() {
  view = 'list';
  app.innerHTML = `<div class="max-w-5xl mx-auto p-3 pb-28"><div class="flex items-center gap-2 mb-3">
  <button class="chip on">Ejercicios <span id="cnt" class="text-xs"></span></button><button class="chip" data-act="goT">Entrenos</button><span class="mr-auto"></span><button class="btn sm" data-act="logout">Salir</button></div>
  <div class="grid gap-2 mb-3"><input id="q" type="search" class="inp" placeholder="Buscar ejercicio..." value="${esc(F.q)}"><div id="phs" class="flex flex-wrap gap-1.5"></div>
  <div class="grid grid-cols-3 gap-2"><select id="ft" class="inp"></select><select id="fm" class="inp"></select><select id="fs" class="inp"></select></div></div>
  <div id="list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
  <p class="text-xs mt-6" style="color:var(--mu)">Tu UID (para las reglas de Firestore): ${esc(user.uid)}</p></div>
  <button class="fab" data-act="new" title="Nuevo ejercicio">＋</button>`;
  renderList();
}
function card(e) {
  const mat = (e.material || []).join(', ');
  return `<div class="card overflow-hidden cursor-pointer" data-act="edit" data-id="${e.id}"><div class="thumb">${thumbSvg(e.board)}</div>
  <div class="p-3 grid gap-1.5"><div class="flex items-start gap-2"><b class="mr-auto leading-tight">${esc(e.title)}</b><span class="badge">${PH[e.phase] || ''}</span></div>
  <div class="flex flex-wrap gap-1">${(e.tags || []).map(t => `<span class="tg">${esc(t)}</span>`).join('')}</div>
  <div class="text-xs" style="color:var(--mu)">${e.min ? e.min + ' min · ' : ''}${e.players ? esc(e.players) + ' jug. · ' : ''}${esc(mat)}</div>
  <div class="flex items-center gap-2 text-xs"><span class="mr-auto">${last(e)} · ${e.uses || 0} usos</span>
  <button class="btn sm" data-act="dup" data-id="${e.id}">Duplicar</button><button class="btn sm" data-act="del" data-id="${e.id}">🗑</button></div></div></div>`;
}
function renderList() {
  const tags = uniq(DT, 'tags'), mats = uniq(DM, 'material');
  $('#phs').innerHTML = [['', 'Todas'], ...Object.entries(PH)].map(([v, l]) => `<button class="chip${F.ph == v ? ' on' : ''}" data-act="fph" data-v="${v}">${l}</button>`).join('');
  const opt = (arr, v, ph) => `<option value="">${ph}</option>` + arr.map(x => `<option${x == v ? ' selected' : ''}>${esc(x)}</option>`).join('');
  $('#ft').innerHTML = opt(tags, F.tag, 'Etiqueta'); $('#fm').innerHTML = opt(mats, F.mat, 'Material');
  $('#fs').innerHTML = [['old', 'Más tiempo sin usar'], ['new', 'Usados hace poco'], ['az', 'A-Z'], ['most', 'Más usados']].map(([v, l]) => `<option value="${v}"${F.sort == v ? ' selected' : ''}>${l}</option>`).join('');
  const q = F.q.toLowerCase();
  const r = list.filter(e => (!F.ph || e.phase == F.ph) && (!F.tag || (e.tags || []).includes(F.tag)) && (!F.mat || (e.material || []).includes(F.mat)) &&
    (!q || [e.title, e.desc, ...(e.tags || []), ...(e.material || [])].join(' ').toLowerCase().includes(q)));
  r.sort({old: (a, b) => (a.lastUsed || '').localeCompare(b.lastUsed || ''), new: (a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || ''),
    az: (a, b) => a.title.localeCompare(b.title, 'es'), most: (a, b) => (b.uses || 0) - (a.uses || 0)}[F.sort]);
  $('#cnt').textContent = `(${r.length}/${list.length})`;
  $('#list').innerHTML = r.length ? r.map(card).join('') :
    `<p class="p-6 text-center sm:col-span-2 lg:col-span-3" style="color:var(--mu)">${list.length ? 'Nada con esos filtros.' : 'Aún no hay ejercicios. Pulsa ＋ para crear el primero.'}</p>`;
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
    material: [...(prev?.material || [])], lastUsed: null, uses: 0, board: EMPTY()};
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
    lastUsed: $('#f-l').value || null, uses: +$('#f-u').value || 0, board: board.getData()};
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

/* ---------- Eventos ---------- */
app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, v = b.dataset.v, ex = () => list.find(x => x.id == id);
  ({
    login: () => auth('login'), register: () => auth('register'), google: () => auth('google'), reset: () => auth('reset'), logout: () => DB.logout(),
    new: () => edit(), edit: () => edit(ex()),
    goT: () => T.open(),
    dup: () => { DB.duplicateExercise(ex()).catch(err => toast('Error: ' + err.message)); toast('Duplicado'); },
    del: () => { const x = ex(); if (x && confirm(`¿Borrar "${x.title}"?`)) DB.deleteExercise(id).catch(err => toast('Error: ' + err.message)); },
    back: () => { if (dirty && !confirm('¿Descartar los cambios?')) return; board?.destroy(); board = null; showList(); },
    save: () => save(), saveNew: () => save(1),
    ph: () => { d.phase = v; dirty = true; drawChips(); }, tg: () => toggle(d.tags, v), mt: () => toggle(d.material, v),
    addTag: () => addItem('#n-tag', d.tags), addMat: () => addItem('#n-mat', d.material),
    min: () => { $('#f-m').value = b.dataset.n; dirty = true; }, fph: () => { F.ph = v; renderList(); }
  })[a]?.();
});
app.addEventListener('input', e => { if (e.target.id == 'q') { F.q = e.target.value; renderList(); } else if (view == 'edit') dirty = true; });
app.addEventListener('change', e => { const m = {ft: 'tag', fm: 'mat', fs: 'sort'}[e.target.id]; if (m) { F[m] = e.target.value; renderList(); } });
app.addEventListener('keydown', e => {
  if (e.key == 'Enter' && e.target.id == 'n-tag') addItem('#n-tag', d.tags);
  if (e.key == 'Enter' && e.target.id == 'n-mat') addItem('#n-mat', d.material);
});

/* ---------- Arranque ---------- */
if (!DB.configured) {
  app.innerHTML = `<div class="max-w-sm mx-auto p-5 pt-16"><div class="card p-4"><b>Falta configurar Firebase</b><p class="mt-2 text-sm">Abre <code>db.js</code> y pega tu <code>firebaseConfig</code> en el bloque marcado.</p></div></div>`;
} else {
  DB.onUser(u => {
    user = u; unsub?.(); unsub = null; list = [];
    if (!u) { T.watch(false); board?.destroy(); board = null; login(); return; }
    unsub = DB.watchExercises(arr => { list = arr; if (view == 'list') renderList(); },
      err => toast('Sin acceso a Firestore: revisa las reglas y tu UID (' + err.code + ')'));
      T.watch(true);
    showList();
  });
}
