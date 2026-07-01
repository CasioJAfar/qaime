with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export const db = getFirestore(app);\ndb.settings({ ignoreUndefinedProperties: true });", "export const db = getFirestore();\ndb.settings({ ignoreUndefinedProperties: true });")

with open("src/db.ts", "w") as f:
    f.write(content)

