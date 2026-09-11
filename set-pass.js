import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const docRef = doc(db, 'erp', 'main_db');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    let data = docSnap.data();
    let admin = data.users.find(u => u.username === "admin");
    if (admin) {
        admin.password = "195";
        await setDoc(docRef, data);
        console.log("Password reset to 195");
    }
  } else {
    console.log("No doc");
  }
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
