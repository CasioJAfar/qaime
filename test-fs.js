import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);

async function test(dbId) {
  console.log("Testing dbId:", dbId);
  const db = getFirestore(app, dbId);
  try {
    const docRef = doc(db, "test/connection");
    await getDoc(docRef);
    console.log("SUCCESS for", dbId);
  } catch (e) {
    console.error("ERROR for", dbId, e.code, e.message);
  }
}

async function run() {
  await test('(default)');
  await test(config.firestoreDatabaseId);
  process.exit(0);
}

run();
