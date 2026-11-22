// db.js · Firebase modular por CDN (plan Spark): solo Auth + Firestore.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signOut} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,onSnapshot,addDoc,setDoc,deleteDoc,writeBatch,increment,getDocs} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ====== PEGA AQUÍ TU firebaseConfig (Consola Firebase → Configuración del proyecto → Tus apps) ======
export const firebaseConfig = {
  apiKey: "AIzaSyBbN1q77I3-8vO7FHR1MQl-POwZH_np-rU",
  authDomain: "futbol-8ff52.firebaseapp.com",
  projectId: "futbol-8ff52",
  storageBucket: "futbol-8ff52.firebasestorage.app",
  messagingSenderId: "802615686756",
  appId: "1:802615686756:web:af9b7b5250e57a22201171"
};
// ===================================================================================================

export const configured = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PEGA');
let auth, db;
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Caché offline persistente (funciona en el campo sin cobertura)
  db = initializeFirestore(app, {localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})});
}

// Firestore no admite arrays dentro de arrays: los puntos de las flechas se guardan planos [x1,y1,x2,y2,...]
const flat = b => ({...b, arrows: (b.arrows || []).map(a => ({...a, p: a.p.flat()}))});
const unflat = b => ({...b, arrows: (b.arrows || []).map(a => ({...a, p: a.p.reduce((r, v, i) => (i % 2 ? r[r.length - 1].push(v) : r.push([v]), r), [])}))});

// ====== EQUIPOS DEL CLUB: UID del 1.er entrenador → [UIDs de sus segundos entrenadores] ======
const EQUIPOS = {
  'aE4xgApvUbcVNqMNnU1OjRPJPb03': ['ZQsXAvAPgKYZApf03kv01oAAKQ32', 'UID_SEGUNDO_2']
  // , 'UID_PRIMERO_OTRO_EQUIPO': ['UID_SEGUNDO_3']
};
const EQUIPO = Object.fromEntries(Object.entries(EQUIPOS).flatMap(([p, ss]) => ss.map(s => [s, p])));
const carpeta = () => EQUIPO[auth.currentUser.uid] || auth.currentUser.uid;
export const miCarpeta = () => carpeta();

const col = () => collection(db, 'users', carpeta(), 'exercises');
const ref = id => doc(db, 'users', carpeta(), 'exercises', id);
export const onUser = cb => onAuthStateChanged(auth, cb);
export const loginGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const loginEmail = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const registerEmail = (e, p) => createUserWithEmailAndPassword(auth, e, p);
export const resetPass = e => sendPasswordResetEmail(auth, e);
export const logout = () => signOut(auth);

// Una sola escucha de toda la colección: lecturas mínimas y funciona offline
export const watchExercises = (cb, err) => onSnapshot(col(), s =>
  cb(s.docs.map(x => { const v = x.data(); return {...v, id: x.id, board: unflat(v.board || {})}; })), err);

const cref = id => doc(db, 'club_exercises', id);
// Un solo lote atómico: guarda en la carpeta privada y sincroniza con club_exercises según "public"
export function saveExercise(ex) {
  const {id, board, ...r} = ex;
  const data = {...r, board: flat(board), public: !!r.public, ts: r.ts || Date.now()};
  const rf = id ? ref(id) : doc(col()), b = writeBatch(db);
  b.set(rf, data);
  if (data.public) { const {uses, lastUsed, ...pub} = data; b.set(cref(rf.id), {...pub, owner: carpeta(), upd: Date.now()}); }
  else b.delete(cref(rf.id));
  return b.commit();
}
export function deleteExercise(id) { const b = writeBatch(db); b.delete(ref(id)); b.delete(cref(id)); return b.commit(); }
export const duplicateExercise = ex =>
  saveExercise({...ex, id: null, title: ex.title + ' (copia)', uses: 0, lastUsed: null, public: false, ts: Date.now()});

// ---- Entrenos (users/{carpeta}/sessions) ----
const scol = () => collection(db, 'users', carpeta(), 'sessions');
const sref = id => doc(db, 'users', carpeta(), 'sessions', id);
export const watchSessions = (cb, err) => onSnapshot(scol(), s => cb(s.docs.map(x => ({...x.data(), id: x.id}))), err);
export function saveSession(s) {
  const {id, ...r} = s, data = {...r, ts: r.ts || Date.now()};
  return id ? setDoc(sref(id), data) : addDoc(scol(), data);
}
export const deleteSession = id => deleteDoc(sref(id));
export function completeSession(id, ups) {
  const b = writeBatch(db);
  ups.forEach(u => b.update(ref(u.id), {lastUsed: u.lastUsed, uses: increment(1)}));
  b.update(sref(id), {done: true, doneAt: Date.now()});
  return b.commit();
}

// ---- Copia de seguridad ----
export async function exportAll() {
  const g = async c => (await getDocs(c)).docs.map(x => ({id: x.id, ...x.data()}));
  return {app: 'banco-ejercicios', v: 1, date: new Date().toISOString(), exercises: await g(col()), sessions: await g(scol())};
}
export async function importAll(D) {
  if (!D || D.app != 'banco-ejercicios' || !Array.isArray(D.exercises) || !Array.isArray(D.sessions)) throw new Error('Archivo no válido');
  if (!navigator.onLine) throw new Error('Necesitas conexión para importar');
  const ops = [...D.exercises.map(x => [ref(x.id), x]), ...D.sessions.map(x => [sref(x.id), x]),
    ...D.exercises.filter(x => x.public).map(({id, uses, lastUsed, ...p}) => [cref(id), {...p, owner: carpeta()}])];
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach(([r, {id, ...data}]) => b.set(r, data));
    await b.commit();
  }
  return ops.length;
}

// ---- Club ----
export const watchClub = (cb, err) => onSnapshot(collection(db, 'club_exercises'), s =>
  cb(s.docs.map(x => { const v = x.data(); return {...v, id: x.id, board: unflat(v.board || {})}; })), err);
export const copyFromClub = e => saveExercise({title: e.title, desc: e.desc || '', phase: e.phase, tags: e.tags || [], min: e.min || 0,
  players: e.players || '', material: e.material || [], age: e.age || '', board: e.board, uses: 0, lastUsed: null, public: false});