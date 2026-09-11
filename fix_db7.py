with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export async function authenticateServer() {\n  // Bypass\n", "export async function authenticateServer() {\n  return;\n  // Bypass\n")

with open("src/db.ts", "w") as f:
    f.write(content)
