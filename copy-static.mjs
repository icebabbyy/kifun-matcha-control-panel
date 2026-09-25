import { copyFileSync, cpSync } from 'node:fs';
for (const file of ['app.js','buying-data.js','buying-board.js','buying-data.json']) copyFileSync(file, `dist/${file}`);
cpSync('supplier-sources', 'dist/supplier-sources', {recursive:true});
