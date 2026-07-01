with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("import fs from 'fs';\nimport path from 'path';\n", "")

with open("src/db.ts", "w") as f:
    f.write(content)
