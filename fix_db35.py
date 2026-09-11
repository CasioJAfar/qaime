import json

with open("firebase-applet-config.json", "r") as f:
    config = json.load(f)
database_id = config.get("firestoreDatabaseId", "(default)")

with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore();\n// db.settings({ databaseId: 'aistudio-erp' });", f"export const db = getFirestore('{database_id}');")

with open("src/db.ts", "w") as f:
    f.write(content)

