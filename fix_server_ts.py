import re

with open("server.ts", "r") as f:
    content = f.read()

# Fix leftover catch from writeDB
content = re.sub(r' catch \(error\) \{\s*console\.error\("DB Yazılmasında xəta:", error\);\s*\}\s*\}', '', content)

# Fix async function await addLog
content = content.replace("async function await addLog", "async function addLog")

with open("server.ts", "w") as f:
    f.write(content)
