with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore(app);\ndb.settings({ databaseId: 'aistudio-erp' });", "export const db = getFirestore(app);\n// db.settings({ databaseId: 'aistudio-erp' });")

with open("src/db.ts", "w") as f:
    f.write(content)

