#!/usr/bin/env node
// Plain-Node equivalent of the .claude/commands/handoff.md slash command,
// for anyone verifying their setup without Claude Code. Keep both in sync.

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const line = () => console.log('-'.repeat(60));

function section(title) {
  console.log('');
  line();
  console.log(title);
  line();
}

// 1. Toolchain
section('1. Toolchain');
try {
  console.log('node:', execSync('node -v').toString().trim());
  console.log('npm: ', execSync('npm -v').toString().trim());
} catch (e) {
  console.log('Could not determine node/npm versions:', e.message);
}

// 2. Environment file
section('2. Environment file');
const envPath = path.join(ROOT, '.env.local');
const REQUIRED_VARS = ['VERTEX_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const PLACEHOLDERS = new Set(['your-key-here', 'your-supabase-project-url', 'your-supabase-anon-key']);

let envOk = false;
if (!fs.existsSync(envPath)) {
  console.log('.env.local does NOT exist.');
  console.log('Run: cp .env.example .env.local, then fill in the three keys below.');
} else {
  const content = fs.readFileSync(envPath, 'utf8');
  const values = {};
  content.split(/\r?\n/).forEach((l) => {
    const m = l.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (m) values[m[1]] = m[2].trim();
  });

  let allGood = true;
  for (const key of REQUIRED_VARS) {
    const v = values[key];
    let status;
    if (!v) status = 'MISSING';
    else if (PLACEHOLDERS.has(v)) status = 'PLACEHOLDER (not filled in)';
    else status = 'present';
    if (status !== 'present') allGood = false;
    console.log(`${key}: ${status}`);
  }
  envOk = allGood;
}

if (!envOk) {
  console.log('\nStopping here — fill in .env.local, then re-run `npm run handoff`.');
  printNextSteps();
  process.exit(0);
}

// 3. Install and build
section('3. Install and build');
console.log('Running npm install...');
let result = spawnSync('npm', ['install'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (result.status !== 0) {
  console.log('\nnpm install FAILED.');
  process.exit(1);
}
console.log('\nRunning npm run build...');
result = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (result.status !== 0) {
  console.log('\nBuild FAILED — see output above.');
  process.exit(1);
}
console.log('\nBuild PASSED.');

// 4. Architecture summary
section('4. Architecture summary');
console.log(`
Quick Build is a Next.js 14 (App Router) app. A host runs the game on one
device; a projector view at /audience mirrors it in real time via Supabase.

- AI: Vertex AI REST API (Gemini 2.5 Flash) — live commentary, judging, TTS
- Database: Supabase (Postgres + Realtime + Storage) — game state, photo sync
- Game phases: setup -> playing -> judging -> results (state machine in app/page.tsx)

Full detail: docs/system-architecture.md
`.trim());

// 5. Known issues
section('5. Known issues');
const pendingPath = path.join(ROOT, 'docs', 'pending-tasks.md');
if (fs.existsSync(pendingPath)) {
  const text = fs.readFileSync(pendingPath, 'utf8');
  const lines = text.split('\n');

  function printSectionItems(headingMatch, { unfinishedOnly } = {}) {
    const startIdx = lines.findIndex((l) => headingMatch.test(l));
    if (startIdx === -1) return;
    const headingLevel = (lines[startIdx].match(/^#+/) || ['##'])[0].length;
    console.log(lines[startIdx].replace(/^#+\s*/, '') + ':');
    for (let i = startIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      const nextHeadingLevel = (l.match(/^#+/) || [''])[0].length;
      if (nextHeadingLevel > 0 && nextHeadingLevel <= headingLevel) break;
      const isItem = /^\s*-\s*\[( |x)\]/.test(l);
      if (isItem) {
        const isUnchecked = /^\s*-\s*\[ \]/.test(l);
        if (!unfinishedOnly || isUnchecked) console.log(' ', l.trim());
      }
    }
    console.log('');
  }

  printSectionItems(/^##\s*High Priority/i);
  printSectionItems(/^###\s*Deployment/i, { unfinishedOnly: true });
} else {
  console.log('docs/pending-tasks.md not found.');
}

// 6. Next steps
function printNextSteps() {
  section('6. Next steps');
  console.log(`
- If .env.local was missing or had placeholders: fill it in, then re-run \`npm run handoff\`.
- Read SETUP.md for full local setup and deploy steps if you haven't already.
- New team taking ownership of this repo? Read HANDOVER.md for the end-to-end
  fork -> accounts -> deploy walkthrough.
- Read docs/pending-tasks.md in full before starting new work.
`.trim());
}
printNextSteps();
