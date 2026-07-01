import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const auth = getAuth(app);

signInAnonymously(auth).then(() => console.log("Success")).catch(e => console.error(e));
