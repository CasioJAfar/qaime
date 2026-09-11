with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore();\ndb.settings({ databaseId: '(default)' });", "export const db = getFirestore();")

with open("src/db.ts", "w") as f:
    f.write(content)

