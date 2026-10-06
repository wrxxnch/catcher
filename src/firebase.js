// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getFirestore,
  doc as fbDoc,
  setDoc as fbSetDoc,
  getDoc as fbGetDoc,
  collection as fbCollection,
  getDocs as fbGetDocs,
  query as fbQuery,
  where as fbWhere,
  orderBy as fbOrderBy,
  serverTimestamp as fbServerTimestamp,
  Timestamp as fbTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as fbRef,
  uploadString as fbUploadString,
  listAll as fbListAll,
  getDownloadURL as fbGetDownloadURL,
} from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || "",
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FB_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FB_APP_ID || "",
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID || ""
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "undefined"
);

// Initialize Firebase if configured
let app = null;
let firestore = null;
let storage = null;
let analytics = null;

if (hasFirebaseConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestore = getFirestore(app);
    storage = getStorage(app);
    if (typeof window !== "undefined") {
      isSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      }).catch((err) => {
        console.warn("Analytics error or not supported:", err);
      });
    }
  } catch (err) {
    console.warn("[Pega-Ladrão] Firebase init error, using local fallback:", err);
  }
}

// ----------------------------------------------------
// Mock / Local Storage Fallback Layer
// ----------------------------------------------------

export class MockTimestamp {
  constructor(seconds, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
    this._isTimestamp = true;
  }

  static fromDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return new MockTimestamp(
      Math.floor(d.getTime() / 1000),
      (d.getTime() % 1000) * 1e6
    );
  }

  static now() {
    return MockTimestamp.fromDate(new Date());
  }

  toDate() {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6));
  }
}

const Timestamp = fbTimestamp || MockTimestamp;

function serialize(val) {
  if (val === null || val === undefined) return val;
  if (typeof val.toDate === "function") {
    const d = val.toDate();
    return {
      _isTimestamp: true,
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: (d.getTime() % 1000) * 1e6,
    };
  }
  if (val instanceof Date) {
    return {
      _isTimestamp: true,
      seconds: Math.floor(val.getTime() / 1000),
      nanoseconds: 0,
    };
  }
  if (Array.isArray(val)) {
    return val.map(serialize);
  }
  if (typeof val === "object") {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = serialize(v);
    }
    return res;
  }
  return val;
}

function deserialize(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === "object" && val._isTimestamp) {
    return new MockTimestamp(val.seconds, val.nanoseconds || 0);
  }
  if (Array.isArray(val)) {
    return val.map(deserialize);
  }
  if (typeof val === "object") {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = deserialize(v);
    }
    return res;
  }
  return val;
}

function getLocalData(collectionName) {
  try {
    const raw = localStorage.getItem(`pl_${collectionName}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function setLocalData(collectionName, data) {
  try {
    localStorage.setItem(`pl_${collectionName}`, JSON.stringify(data));
  } catch (_) {}
}

function generateRandomId() {
  return "doc_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ----------------------------------------------------
// Exported Firestore API (with graceful fallback)
// ----------------------------------------------------

export function collection(db, collectionName) {
  if (hasFirebaseConfig && (db || firestore)) {
    try {
      return fbCollection(db || firestore, collectionName);
    } catch (_) {}
  }
  return {
    _isMock: true,
    type: "collection",
    collectionName,
  };
}

export function doc(first, second, third) {
  if (hasFirebaseConfig && first && !first._isMock) {
    try {
      if (third !== undefined) {
        return fbDoc(first, second, third);
      }
      if (second !== undefined) {
        return fbDoc(first, second);
      }
      return fbDoc(first);
    } catch (_) {}
  }

  if (first && (first.type === "collection" || first._isMock)) {
    const collName = first.collectionName || "comprovantes";
    const newId = second || generateRandomId();
    return {
      _isMock: true,
      id: newId,
      collectionName: collName,
      path: `${collName}/${newId}`,
    };
  }

  const coll = second || "comprovantes";
  const id = third || generateRandomId();
  return {
    _isMock: true,
    id,
    collectionName: coll,
    path: `${coll}/${id}`,
  };
}

export async function setDoc(docRef, data) {
  const collName = docRef.collectionName || (docRef.path ? docRef.path.split("/")[0] : "comprovantes");
  const id = docRef.id || generateRandomId();
  docRef.id = id;

  if (hasFirebaseConfig && docRef && !docRef._isMock) {
    try {
      await fbSetDoc(docRef, data);
    } catch (err) {
      console.warn("[Pega-Ladrão] Cloud setDoc error, persisting local backup:", err);
    }
  }

  // Also persist locally for offline/instant availability
  const store = getLocalData(collName);
  store[id] = serialize({ ...data, id });
  setLocalData(collName, store);
  return Promise.resolve();
}

export async function getDoc(docRef) {
  const id = docRef.id || "";
  const collName = docRef.collectionName || (docRef.path ? docRef.path.split("/")[0] : "comprovantes");

  if (hasFirebaseConfig && docRef && !docRef._isMock) {
    try {
      const snap = await fbGetDoc(docRef);
      if (snap.exists()) {
        return snap;
      }
    } catch (err) {
      console.warn("[Pega-Ladrão] Cloud getDoc error, reading local backup:", err);
    }
  }

  const store = getLocalData(collName);
  const exists = Boolean(store[id]);
  const docData = exists ? deserialize(store[id]) : null;

  return {
    id,
    exists: () => exists,
    data: () => (docData ? { ...docData, id } : undefined),
  };
}

export function query(collectionRef, ...queryConstraints) {
  try {
    if (collectionRef && !collectionRef._isMock) {
      return fbQuery(collectionRef, ...queryConstraints);
    }
  } catch (_) {}

  return {
    _isMock: true,
    collectionName: collectionRef.collectionName || (collectionRef.path ? collectionRef.path.split("/")[0] : "acessos"),
    constraints: queryConstraints,
  };
}

export function where(field, opStr, value) {
  try {
    return fbWhere(field, opStr, value);
  } catch (_) {
    return { type: "where", field, opStr, value };
  }
}

export function orderBy(field, direction = "asc") {
  try {
    return fbOrderBy(field, direction);
  } catch (_) {
    return { type: "orderBy", field, direction };
  }
}

export async function getDocs(queryOrColl) {
  if (queryOrColl && !queryOrColl._isMock) {
    try {
      const snap = await fbGetDocs(queryOrColl);
      if (!snap.empty) {
        return snap;
      }
    } catch (err) {
      console.warn("[Pega-Ladrão] Cloud getDocs error, querying local backup:", err);
    }
  }

  const collName = queryOrColl.collectionName || (queryOrColl.path ? queryOrColl.path.split("/")[0] : "acessos");
  const store = getLocalData(collName);
  let items = Object.entries(store).map(([id, val]) => ({
    id,
    ...deserialize(val),
  }));

  const constraints = queryOrColl.constraints || [];
  for (const c of constraints) {
    if (c.type === "where") {
      items = items.filter((item) => {
        if (c.opStr === "==") return item[c.field] === c.value;
        if (c.opStr === "!=") return item[c.field] !== c.value;
        if (c.opStr === ">") return item[c.field] > c.value;
        if (c.opStr === "<") return item[c.field] < c.value;
        return true;
      });
    }
    if (c.type === "orderBy") {
      items.sort((a, b) => {
        const valA = a[c.field];
        const valB = b[c.field];
        let compA = valA && typeof valA.toDate === "function" ? valA.toDate().getTime() : valA;
        let compB = valB && typeof valB.toDate === "function" ? valB.toDate().getTime() : valB;
        if (compA < compB) return c.direction === "desc" ? 1 : -1;
        if (compA > compB) return c.direction === "desc" ? -1 : 1;
        return 0;
      });
    }
  }

  const docs = items.map((item) => ({
    id: item.id,
    data: () => ({ ...item }),
  }));

  return {
    docs,
    forEach: (callback) => docs.forEach(callback),
    empty: docs.length === 0,
    size: docs.length,
  };
}

export function serverTimestamp() {
  try {
    return fbServerTimestamp();
  } catch (_) {
    return MockTimestamp.now();
  }
}

// ----------------------------------------------------
// Exported Storage API (with graceful fallback)
// ----------------------------------------------------

export function ref(storageInstance, pathString) {
  try {
    return fbRef(storageInstance || storage, pathString);
  } catch (_) {
    return {
      _isMock: true,
      fullPath: pathString,
      name: pathString ? pathString.split("/").pop() : "",
    };
  }
}

export async function uploadString(storageRef, dataUrlString, format = "data_url") {
  try {
    if (storageRef && !storageRef._isMock) {
      await fbUploadString(storageRef, dataUrlString, format);
    }
  } catch (err) {
    console.warn("[Pega-Ladrão] Cloud uploadString error, saving locally:", err);
  }

  const path = storageRef.fullPath || storageRef.path || String(Date.now());
  const capturas = getLocalData("capturas_storage");
  capturas[path] = dataUrlString;
  setLocalData("capturas_storage", capturas);
  return Promise.resolve({ ref: storageRef });
}

export async function listAll(storageRef) {
  if (storageRef && !storageRef._isMock) {
    try {
      const res = await fbListAll(storageRef);
      if (res.prefixes.length > 0 || res.items.length > 0) {
        return res;
      }
    } catch (err) {
      console.warn("[Pega-Ladrão] Cloud listAll error, listing locally:", err);
    }
  }

  const targetPath = (storageRef.fullPath || storageRef.path || "").replace(/^\/+|\/+$/g, "");
  const capturas = getLocalData("capturas_storage");
  const allKeys = Object.keys(capturas);

  const prefixSet = new Set();
  const itemSet = new Set();

  for (const key of allKeys) {
    const cleanKey = key.replace(/^\/+/, "");
    if (cleanKey.startsWith(targetPath)) {
      const rest = cleanKey.slice(targetPath.length).replace(/^\/+/, "");
      const segments = rest.split("/");
      if (segments.length > 1) {
        prefixSet.add(segments[0]);
      } else if (segments.length === 1 && segments[0]) {
        itemSet.add(segments[0]);
      }
    }
  }

  const prefixes = Array.from(prefixSet).map((name) => ({
    name,
    fullPath: `${targetPath}/${name}`,
  }));

  const items = Array.from(itemSet).map((name) => ({
    name,
    fullPath: `${targetPath}/${name}`,
  }));

  return { prefixes, items };
}

export async function getDownloadURL(itemRef) {
  if (itemRef && !itemRef._isMock) {
    try {
      return await fbGetDownloadURL(itemRef);
    } catch (err) {
      console.warn("[Pega-Ladrão] Cloud getDownloadURL error, loading locally:", err);
    }
  }

  const path = itemRef.fullPath || itemRef.path || "";
  const capturas = getLocalData("capturas_storage");
  const found = capturas[path] || capturas["/" + path] || capturas[path.replace(/^\/+/, "")];
  return Promise.resolve(found || "");
}

export { app, analytics, firestore, storage, Timestamp };
