import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDM8KVIJVCJ5H96N5x5wEW23vOeEaGEt1s",
  authDomain: "agrosig-cadet.firebaseapp.com",
  projectId: "agrosig-cadet",
  storageBucket: "agrosig-cadet.firebasestorage.app",
  messagingSenderId: "157649317566",
  appId: "1:157649317566:web:9fef1c90cee3b6cb76b8ef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("✅ Firebase conectado");

export { db };