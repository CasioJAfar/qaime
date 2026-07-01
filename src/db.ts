import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export async function authenticateServer() {
  return;
}

export async function readDBFromFirestore(): Promise<any> {
  try {
    const docRef = doc(collection(db, 'erp'), 'main_db');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!data || !data.users || data.users.length === 0) {
        if(data) {
          data.users = [
            { username: "admin", password: "195", role: "admin" },
            { username: "user", password: "user", role: "user" },
            { username: "cefer", password: "1", role: "user" }
          ];
          await writeDBToFirestore(data);
        }
      }
      return data;
    } else {
      const initialDB = {
        customers: [],
        invoices: [],
        payments: [],
        logs: [],
        users: [
          { username: "admin", password: "195", role: "admin" },
          { username: "user", password: "user", role: "user" },
          { username: "cefer", password: "1", role: "user" }
        ]
      };
      await writeDBToFirestore(initialDB);
      return initialDB;
    }
  } catch (err) {
    console.error("readDBFromFirestore error:", err);
    throw err;
  }
}

export async function writeDBToFirestore(state: any) {
  try {
    const docRef = doc(collection(db, 'erp'), 'main_db');
    await setDoc(docRef, state);
  } catch (err) {
    console.error("writeDBToFirestore error:", err);
    throw err;
  }
}
