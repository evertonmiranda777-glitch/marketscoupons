// Replace " — " (em-dash with surrounding spaces) by ", " across the site.
// Skips git, node_modules, memory, .firecrawl, .playwright-mcp, data/preview, dist artifacts.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', '.vercel', '.firecrawl', '.playwright-mcp', 'memory']);
const SKIP_PATH_FRAGMENTS = ['data/preview', '/memory/', '\\memory\\'];
const ALLOWED_EXT = new Set(['.html', '.js', '.mjs', '.cjs', '.json', '.css', '.md', '.txt', '.xml', '.ts']);

const TARGET = ' — '; // U+2014 em-dash with spaces
const REPLACE = ', ';

let files = 0, changes = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const norm = full.replace(/\\/g, '/');
      if (SKIP_PATH_FRAGMENTS.some(s => norm.includes(s.replace(/\\/g, '/')))) continue;
      walk(full);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) continue;
      const norm = full.replace(/\\/g, '/');
      if (SKIP_PATH_FRAGMENTS.some(s => norm.includes(s.replace(/\\/g, '/')))) continue;
      // skip this very script
      if (norm.endsWith('/scripts/remove-em-dash.mjs')) continue;
      try {
        const s = fs.readFileSync(full, 'utf8');
        if (!s.includes(TARGET)) continue;
        const occurrences = s.split(TARGET).length - 1;
        const out = s.split(TARGET).join(REPLACE);
        fs.writeFileSync(full, out, 'utf8');
        files++; changes += occurrences;
        console.log(`${norm}: ${occurrences}`);
      } catch (e) {
        console.error(`SKIP ${full}: ${e.message}`);
      }
    }
  }
}

walk(ROOT);
console.log(`\nTotal: ${changes} replacements across ${files} files.`);
