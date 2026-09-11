with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore();", "export const db = getFirestore(app);")
content = content.replace("db.settings({ databaseId: firebaseConfig.firestoreDatabaseId, ignoreUndefinedProperties: true });", "db.settings({ ignoreUndefinedProperties: true });")

with open("src/db.ts", "w") as f:
    f.write(content)

