import json

with open("firebase-applet-config.json", "r") as f:
    config = json.load(f)
database_id = config.get("firestoreDatabaseId", "(default)")

with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace(f"export const db = getFirestore();\n// export const db = getFirestore('{database_id}');", f"export const db = getFirestore();\ndb.settings({{ databaseId: '{database_id}' }});")

with open("src/db.ts", "w") as f:
    f.write(content)

