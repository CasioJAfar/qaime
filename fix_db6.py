with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("export async function authenticateServer() {\n  return; // bypass auth", "export async function authenticateServer() {\n  // Bypass")

with open("src/db.ts", "w") as f:
    f.write(content)
