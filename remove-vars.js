import fs from 'fs';

let tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
tsConfig.compilerOptions.noUnusedLocals = false;
tsConfig.compilerOptions.noUnusedParameters = false;
fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));
