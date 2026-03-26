import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 CONFIG KAMU
const firebaseConfig = {
  apiKey: "AIzaSyD8LPcTPpM1ctJQuOQAaWGh232T5xJ4j-U",
  authDomain: "kasir-b0121.firebaseapp.com",
  projectId: "kasir-b0121",
};

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 EXPORT SEMUA
export {
  db,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
};