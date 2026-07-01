with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore(app, '(default)');", "export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);")

with open("src/db.ts", "w") as f:
    f.write(content)
