console.log("🔥 firestore.js cargado");

import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

async function guardarRegistroFirebase(registro) {
  try {
    const docRef = await addDoc(collection(db, "monitoreos"), {
      ...registro,
      creadoEn: serverTimestamp()
    });

    console.log("Registro guardado en Firestore:", docRef.id);
    return docRef.id;

  } catch (error) {
    console.error("Error al guardar en Firestore:", error);
    throw error;
  }
}

async function leerRegistrosFirebase() {

    try {

        const snapshot = await getDocs(collection(db, "monitoreos"));

        const registros = [];

        snapshot.forEach(doc => {

            registros.push({
                id: doc.id,
                ...doc.data()
            });

        });

        console.log("Registros leídos:", registros.length);

        return registros.reverse();

    } catch (error) {

        console.error("Error al leer Firestore:", error);
        return [];

    }

}

function escucharRegistrosFirebase(callback) {
  const q = query(
    collection(db, "monitoreos"),
    orderBy("creadoEn", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const registros = [];

    snapshot.forEach((documento) => {
      registros.push({
        id: documento.id,
        ...documento.data()
      });
    });

    console.log("Historial actualizado en tiempo real:", registros.length);
    callback(registros);
  });
}

async function eliminarRegistroFirebase(id) {

    try {

        await deleteDoc(doc(db, "monitoreos", id));

        console.log("Registro eliminado:", id);

    } catch (error) {

        console.error("Error eliminando registro:", error);

    }

}

window.guardarRegistroFirebase = guardarRegistroFirebase;
window.leerRegistrosFirebase = leerRegistrosFirebase;
window.eliminarRegistroFirebase = eliminarRegistroFirebase;
window.escucharRegistrosFirebase = escucharRegistrosFirebase;

console.log("✅ funciones Firebase disponibles");
window.dispatchEvent(new Event("firebaseListo"));