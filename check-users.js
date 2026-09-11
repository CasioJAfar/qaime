import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const docRef = doc(db, 'erp', 'main_db');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log(JSON.stringify(docSnap.data().users, null, 2));
  } else {
    console.log("No doc");
  }
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
