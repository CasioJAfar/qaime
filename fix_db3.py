with open("src/db.ts", "r") as f:
    content = f.read()

content = content.replace("const configPath = path.join(process.cwd(), \"firebase-applet-config.json\");\nif (!fs.existsSync(configPath)) {\n  console.error(\"firebase-applet-config.json not found!\");\n}\nconst firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));", "import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };")

with open("src/db.ts", "w") as f:
    f.write(content)

with open("server.ts", "r") as f:
    content2 = f.read()
    
content2 = content2.replace("app.listen(PORT", "// Remove json parsing limit if any\n  app.listen(PORT")

with open("server.ts", "w") as f:
    f.write(content2)

