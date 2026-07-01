import re

with open("server.ts", "r") as f:
    content = f.read()

# Add imports at top
content = 'import { authenticateServer, readDBFromFirestore, writeDBToFirestore } from "./src/db";\n' + content

# Fix routes to be async
content = re.sub(r'app\.get\("([^"]+)",\s*\(req,\s*res\)\s*=>\s*{', r'app.get("\1", async (req, res) => {', content)
content = re.sub(r'app\.post\("([^"]+)",\s*\(req,\s*res\)\s*=>\s*{', r'app.post("\1", async (req, res) => {', content)
content = re.sub(r'app\.delete\("([^"]+)",\s*\(req,\s*res\)\s*=>\s*{', r'app.delete("\1", async (req, res) => {', content)

# Routes with middleware (adminOnly, adminOrUser)
content = re.sub(r'app\.get\("([^"]+)",\s*adminOnly,\s*\(req,\s*res\)\s*=>\s*{', r'app.get("\1", adminOnly, async (req, res) => {', content)
content = re.sub(r'app\.post\("([^"]+)",\s*adminOnly,\s*\(req,\s*res\)\s*=>\s*{', r'app.post("\1", adminOnly, async (req, res) => {', content)
content = re.sub(r'app\.delete\("([^"]+)",\s*adminOnly,\s*\(req,\s*res\)\s*=>\s*{', r'app.delete("\1", adminOnly, async (req, res) => {', content)

content = re.sub(r'app\.get\("([^"]+)",\s*adminOrUser,\s*\(req,\s*res\)\s*=>\s*{', r'app.get("\1", adminOrUser, async (req, res) => {', content)
content = re.sub(r'app\.post\("([^"]+)",\s*adminOrUser,\s*\(req,\s*res\)\s*=>\s*{', r'app.post("\1", adminOrUser, async (req, res) => {', content)
content = re.sub(r'app\.delete\("([^"]+)",\s*adminOrUser,\s*\(req,\s*res\)\s*=>\s*{', r'app.delete("\1", adminOrUser, async (req, res) => {', content)

# Fix addLog to be async
content = content.replace("function addLog(", "async function addLog(")
content = content.replace("addLog(", "await addLog(")

# Remove old readDB and writeDB definitions
content = re.sub(r'function readDB\(\): DBState \{[\s\S]*?return seedDB;\n\}', '', content)
content = re.sub(r'// Helper to write database state\nfunction writeDB\(state: DBState\) \{[\s\S]*?\}', '', content)

# Initialize Firebase in startServer
content = content.replace("async function startServer() {", "async function startServer() {\n  await authenticateServer();\n")

with open("server.ts", "w") as f:
    f.write(content)

