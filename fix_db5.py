with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);", "export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');")

with open("src/db.ts", "w") as f:
    f.write(content)
