with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("import { initializeApp, cert, getApps } from 'firebase-admin/app';", "import { initializeApp, getApps } from 'firebase-admin/app';")
content = content.replace("const app = getApps().length === 0 ? initializeApp({\n  projectId: firebaseConfig.projectId,\n  credential: cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'))\n}) : getApps()[0];", "const app = getApps().length === 0 ? initializeApp({\n  projectId: firebaseConfig.projectId\n}) : getApps()[0];")

with open("src/db.ts", "w") as f:
    f.write(content)

