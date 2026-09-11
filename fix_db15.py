with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("initializeApp({\n    projectId: firebaseConfig.projectId\n  });", "initializeApp({\n    projectId: firebaseConfig.projectId,\n    credential: cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'))\n  });")

with open("src/db.ts", "w") as f:
    f.write(content)
