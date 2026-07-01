const fs = require('fs');
const content = `import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
  projectId: firebaseConfig.projectId
});

export const db = getFirestore(app);

export async function authenticateServer() {
  return;
}

export async function readDBFromFirestore() {
  try {
    const docRef = db.collection('erp').doc('main_db');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (!data.users || data.users.length === 0) {
        data.users = [
          { username: "admin", password: "195", role: "admin" },
          { username: "user", password: "user", role: "user" },
          { username: "cefer", password: "1", role: "user" }
        ];
        await writeDBToFirestore(data);
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

export async function writeDBToFirestore(state) {
  try {
    const docRef = db.collection('erp').doc('main_db');
    await docRef.set(state);
  } catch (err) {
    console.error("writeDBToFirestore error:", err);
    throw err;
  }
}
`;
fs.writeFileSync('src/db.ts', content);
