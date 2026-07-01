import os
import json
with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore();", f"export const db = getFirestore();\ndb.settings({{ databaseId: '{json.load(open('firebase-applet-config.json'))['firestoreDatabaseId']}' }});")

with open("src/db.ts", "w") as f:
    f.write(content)

