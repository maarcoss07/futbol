// ia.js · Asistente "✨ Crear con IA": genera un prompt para copiar/pegar en cualquier IA gratuita y carga el JSON devuelto
import {VB} from './pizarra.js';

export function initIA({AGES, PH, getTags, getMats, esc, toast, onLoad}) {
  const TP = ['p1', 'p2', 'p3', 'gk', 'ball', 'cone', 'pole', 'goal', 'mini', 'num'], KD = ['pass', 'run', 'drib'];
  const $ = s => document.querySelector(s), uid = () => Math.random().toString(36).slice(2, 8);
  let sel = [];
  const st = document.createElement('style');
  st.textContent = '.ia-ov{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:65;overflow:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top,0px));padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}';
  document.head.appendChild(st);
  const close = () => $('#ia-ov')?.remove();
  const chips = () => getTags().map(t => `<button class="chip${sel.includes(t) ? ' on' : ''}" data-act="i-tag" data-v="${esc(t)}">${esc(t)}</button>`).join('');

  function open() {
    close(); sel = [];
    const o = document.createElement('div'); o.className = 'ia-ov'; o.id = 'ia-ov'; document.body.appendChild(o);
    o.innerHTML = `<div class="max-w-xl mx-auto card p-3 grid gap-3">
    <div class="flex items-center gap-2"><b class="mr-auto">✨ Crear ejercicio con IA</b><button class="btn sm" data-act="i-close">✕</button></div>
    <div class="lbl" style="margin:0">Paso 1 · Prepara el prompt</div>
    <div class="grid grid-cols-2 gap-2"><select id="i-age" class="inp">${AGES.map(a => `<option${a == 'S8' ? ' selected' : ''}>${a}</option>`).join('')}</select>
    <input id="i-pl" class="inp" inputmode="numeric" placeholder="Jugadores" value="8">
    <select id="i-ph" class="inp">${Object.entries(PH).map(([k, v]) => `<option value="${k}"${k == 'main' ? ' selected' : ''}>${v}</option>`).join('')}</select>
    <input id="i-min" type="number" inputmode="numeric" class="inp" placeholder="Minutos" value="15"></div>
    <div class="flex flex-wrap gap-1.5" id="i-tags">${chips()}</div>
    <textarea id="i-note" rows="2" class="inp" placeholder="Nota opcional (ej. espacio reducido, sin porterías…)"></textarea>
    <button class="btn pri" data-act="i-copy">Copiar prompt</button>
    <textarea id="i-p" rows="3" class="inp" readonly hidden></textarea>
    <div class="lbl" style="margin:0">Paso 2 · Pega aquí la respuesta de la IA (ChatGPT, Gemini, Claude…)</div>
    <textarea id="i-json" rows="6" class="inp" placeholder='{ "title": "…", "board": {…} }'></textarea>
    <div id="i-err" class="text-sm text-red-500"></div>
    <button class="btn pri" data-act="i-load">Cargar en editor</button></div>`;
  }

  function buildPrompt() {
    const g = s => $(s).value.trim(), ph = g('#i-ph'), note = g('#i-note');
    return [
      'Eres un entrenador experto de fútbol base. Diseña UN ejercicio de entrenamiento con estos datos:',
      `- Edad/categoría: ${g('#i-age')}`, `- Jugadores: ${g('#i-pl') || '8'}`, `- Fase del entreno: ${PH[ph]} (valor "${ph}")`,
      `- Duración: ${g('#i-min') || '15'} minutos`, `- Objetivos: ${sel.length ? sel.join(', ') : 'a tu criterio'}`, note ? `- Nota: ${note}` : '',
      '', 'Devuelve SOLO un JSON válido (sin explicaciones, sin comentarios, sin texto antes ni después) con esta estructura exacta:',
      '{"title":"Nombre corto","phase":"warm|main|final","tags":["..."],"min":15,"players":"8","age":"S8","material":["Conos","Petos"],',
      '"desc":"Objetivo. Explicación breve. Variantes. Puntos clave a corregir.",',
      '"board":{"v":1,"bg":"free","els":[{"id":"a1","t":"p1","x":250,"y":300,"r":0},{"id":"a2","t":"p2","x":550,"y":300,"r":0},{"id":"b1","t":"ball","x":300,"y":300,"r":0},{"id":"c1","t":"cone","x":100,"y":100,"r":0},{"id":"n1","t":"num","x":400,"y":250,"r":0,"n":1}],',
      '"arrows":[{"id":"f1","k":"pass","p":[[260,300],[540,300]]},{"id":"f2","k":"run","p":[[550,300],[650,450]]}]}}',
      '', 'Reglas del campo "board" (pizarra táctica):',
      '- "bg": "full" (campo completo, 1000x650), "half" (medio campo, 650x520, portería arriba centrada en x=325, y≈20) o "free" (rectángulo 800x600, ideal para rondos y espacios reducidos).',
      '- Las coordenadas x,y están en las unidades del propio "bg" (x entre 30 y ancho-30; y entre 30 y alto-30). En "full" las porterías están en x≈20 y x≈980, y≈325 (usa r=90).',
      '- "els": "t" puede ser "p1" (jugador rojo), "p2" (azul), "p3" (amarillo), "gk" (portero), "ball", "cone", "pole" (pica), "goal" (portería 80x26), "mini" (miniportería 44x16) o "num" (número de paso, con "n":1,2,3…). "r" = rotación en grados (0, 45, 90…).',
      '- "arrows": "k" = "pass" (pase, línea continua), "run" (desmarque/carrera sin balón, discontinua) o "drib" (conducción, ondulada). "p" = lista de 2 a 4 puntos [x,y]; el último es la punta de la flecha.',
      '- Cada elemento y cada flecha lleva un "id" único corto. Usa entre 6 y 20 elementos. Separa los jugadores al menos 45 unidades entre sí.',
      `- En "tags" usa preferentemente: ${getTags().join(', ')}.`, `- En "material" usa preferentemente: ${getMats().join(', ')}.`,
      '- "phase" solo puede ser "warm", "main" o "final". "players" es texto (ej. "8" o "6-8").', '', 'Responde únicamente con el JSON.'
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  }
  async function copyP() {
    const p = buildPrompt(), ta = $('#i-p'); ta.value = p; ta.hidden = false; ta.select();
    let ok = false;
    try { await navigator.clipboard.writeText(p); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) {} }
    toast(ok ? 'Prompt copiado. Pégalo en tu IA y vuelve con la respuesta' : 'Copia el texto del recuadro a mano');
  }

  // Tolera ```json ... ``` y texto alrededor; valida y normaliza datos y pizarra
  function parse(txt) {
    let t = txt.trim(); const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) t = fence[1];
    const i = t.indexOf('{'), j = t.lastIndexOf('}'); if (i < 0 || j < i) throw new Error('No encuentro ningún JSON en el texto');
    let o; try { o = JSON.parse(t.slice(i, j + 1)); } catch (e) { throw new Error('JSON no válido: ' + e.message); }
    if (!o.title || typeof o.title != 'string') throw new Error('Falta el título ("title")');
    const b = o.board || {}, bg = VB[b.bg] ? b.bg : 'free', [w, h] = VB[bg], seen = new Set();
    const cl = (v, mx) => Math.round(Math.max(8, Math.min(mx - 8, +v)));
    const id = x => { const s = typeof x == 'string' && x && !seen.has(x) ? x : uid(); seen.add(s); return s; };
    const els = (Array.isArray(b.els) ? b.els : []).filter(e => e && TP.includes(e.t) && isFinite(e.x) && isFinite(e.y)).map(e => {
      const r = {id: id(e.id), t: e.t, x: cl(e.x, w), y: cl(e.y, h), r: +e.r || 0}; if (e.t == 'num') r.n = Math.max(1, Math.round(+e.n) || 1); return r; });
    const arrows = (Array.isArray(b.arrows) ? b.arrows : []).filter(a => a && KD.includes(a.k) && Array.isArray(a.p) && a.p.length >= 2 && a.p.every(q => Array.isArray(q) && isFinite(q[0]) && isFinite(q[1])))
      .map(a => ({id: id(a.id), k: a.k, p: a.p.map(q => [cl(q[0], w), cl(q[1], h)])}));
    const lo = String(o.phase || '').toLowerCase(), arr = a => (Array.isArray(a) ? a : []).map(s => String(s).trim()).filter(Boolean);
    return {title: o.title.trim(), desc: String(o.desc || '').trim(), min: +o.min || 15, players: String(o.players ?? '').trim(), age: AGES.includes(o.age) ? o.age : '',
      phase: ['warm', 'main', 'final'].includes(lo) ? lo : /calent/.test(lo) ? 'warm' : /final|l[uú]dic/.test(lo) ? 'final' : 'main',
      tags: arr(o.tags), material: arr(o.material), public: false, lastUsed: null, uses: 0, board: {v: 1, bg, els, arrows}};
  }
  function load() {
    try { const d = parse($('#i-json').value); close(); onLoad(d); toast('Revisa la pizarra, retoca y guarda'); }
    catch (e) { $('#i-err').textContent = e.message; }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act^="i-"]'); if (!b) return; const a = b.dataset.act;
    if (a == 'i-close') close(); else if (a == 'i-copy') copyP(); else if (a == 'i-load') load();
    else if (a == 'i-tag') { const v = b.dataset.v, k = sel.indexOf(v); k < 0 ? sel.push(v) : sel.splice(k, 1); $('#i-tags').innerHTML = chips(); }
  });
  return {open};
}
