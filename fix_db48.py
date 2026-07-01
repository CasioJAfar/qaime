with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore('(default)');", "export const db = getFirestore();\ndb.settings({ databaseId: '(default)' });")

with open("src/db.ts", "w") as f:
    f.write(content)

