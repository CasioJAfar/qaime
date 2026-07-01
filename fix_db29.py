with open("src/db.ts", "r") as f:
    content = f.read()

content = "import { cert } from 'firebase-admin/app';\n" + content

with open("src/db.ts", "w") as f:
    f.write(content)

