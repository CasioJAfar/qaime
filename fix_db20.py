with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore();", "export const db = getFirestore();")
content = content.replace("if (getApps().length === 0) {\n  initializeApp({\n    projectId: firebaseConfig.projectId\n  });\n}", "if (getApps().length === 0) {\n  initializeApp({\n    projectId: firebaseConfig.projectId,\n    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`\n  });\n}")


with open("src/db.ts", "w") as f:
    f.write(content)

