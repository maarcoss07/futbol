// db.js · Firebase modular por CDN (plan Spark): solo Auth + Firestore.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signOut} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,onSnapshot,addDoc,setDoc,deleteDoc,writeBatch,increment} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
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

const col = () => collection(db, 'users', auth.currentUser.uid, 'exercises');
const ref = id => doc(db, 'users', auth.currentUser.uid, 'exercises', id);

export const onUser = cb => onAuthStateChanged(auth, cb);
export const loginGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const loginEmail = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const registerEmail = (e, p) => createUserWithEmailAndPassword(auth, e, p);
export const resetPass = e => sendPasswordResetEmail(auth, e);
export const logout = () => signOut(auth);

// Una sola escucha de toda la colección: lecturas mínimas y funciona offline
export const watchExercises = (cb, err) => onSnapshot(col(), s =>
  cb(s.docs.map(x => { const v = x.data(); return {...v, id: x.id, board: unflat(v.board || {})}; })), err);

// No hacer await en la UI: offline la promesa tarda hasta tener conexión, pero la caché local ya se actualiza
export function saveExercise(ex) {
  const {id, board, ...r} = ex;
  const data = {...r, board: flat(board), ts: r.ts || Date.now()};
  return id ? setDoc(ref(id), data) : addDoc(col(), data);
}
export const deleteExercise = id => deleteDoc(ref(id));
export const duplicateExercise = ex =>
  saveExercise({...ex, id: null, title: ex.title + ' (copia)', uses: 0, lastUsed: null, ts: Date.now()});
// ---- Entrenos (users/{uid}/sessions) ----
const scol = () => collection(db, 'users', auth.currentUser.uid, 'sessions');
export const watchSessions = (cb, err) => onSnapshot(scol(), s => cb(s.docs.map(x => ({...x.data(), id: x.id}))), err);
export function saveSession(s) {
  const {id, ...r} = s, data = {...r, ts: r.ts || Date.now()};
  return id ? setDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', id), data) : addDoc(scol(), data);
}
export const deleteSession = id => deleteDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', id));
// Un solo lote atómico: marca la sesión y actualiza último uso (+1 uso) de cada ejercicio
export function completeSession(id, ups) {
  const b = writeBatch(db);
  ups.forEach(u => b.update(ref(u.id), {lastUsed: u.lastUsed, uses: increment(1)}));
  b.update(doc(db, 'users', auth.currentUser.uid, 'sessions', id), {done: true, doneAt: Date.now()});
  return b.commit();
}