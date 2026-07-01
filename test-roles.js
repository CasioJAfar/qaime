import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function run() {
  try {
    const docRef = db.collection('erp').doc('main_db');
    await docRef.set({ test: 1 });
    console.log("Write SUCCESS");
    const snap = await docRef.get();
    console.log("Read SUCCESS", snap.data());
  } catch (e) {
    console.error("ERROR", e);
  }
}

run();
