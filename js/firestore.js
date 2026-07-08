import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
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


window.guardarRegistroFirebase = guardarRegistroFirebase;
window.leerRegistrosFirebase = leerRegistrosFirebase;