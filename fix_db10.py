with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("if (getApps().length === 0) {\n  initializeApp({\n    projectId: firebaseConfig.projectId\n  });\n}\n\nexport const db = getFirestore(app);", "const app = getApps().length === 0 ? initializeApp({ projectId: firebaseConfig.projectId }) : getApps()[0];\nexport const db = getFirestore(app);")

with open("src/db.ts", "w") as f:
    f.write(content)
