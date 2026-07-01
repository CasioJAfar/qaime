import json
with open("firebase.json", "r") as f:
    config = json.load(f)

config['firestore']['rules'] = "firestore.rules"

with open("firebase.json", "w") as f:
    json.dump(config, f, indent=2)

with open("firestore.rules", "w") as f:
    f.write("""rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
""")
