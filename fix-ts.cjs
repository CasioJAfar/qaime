const fs = require('fs');
const errors = fs.readFileSync('tsc-errors.txt', 'utf8').split('\n');

for (const line of errors) {
  const match = line.match(/^([^:]+)\(\d+,\d+\): error TS6133: '([^']+)' is declared but its value is never read./);
  if (match) {
    const [, file, variable] = match;
    try {
      let content = fs.readFileSync(file, 'utf8');
      
      // Attempt to remove unused import from an import statement
      const importRegex = new RegExp(`(import\\s+(?:{[^}]*?)?\\s*)?\\b${variable}\\b(?:\\s*,\\s*)?(\\s*(?:}[^;]*)?\\s*from\\s+['"][^'"]+['"];?)`, 'g');
      
      content = content.replace(importRegex, (match, prefix, suffix) => {
        if (!prefix && !suffix) return match;
        
        let newMatch = match.replace(new RegExp(`\\b${variable}\\b\\s*,?\\s*`), '');
        newMatch = newMatch.replace(/{\s*,/, '{').replace(/,\s*}/, '}').replace(/{\s*}/, '');
        
        if (newMatch.match(/import\s+from/)) {
          return ''; // Entire import is empty
        }
        return newMatch;
      });
      
      fs.writeFileSync(file, content);
      console.log(`Fixed ${variable} in ${file}`);
    } catch (e) {
      console.log(`Failed for ${variable} in ${file}`);
    }
  }
}
