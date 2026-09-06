#!/usr/bin/env node
/**
 * sync-changelog-md.mjs —— 把 CHANGELOG.md 與 client/src/lib/changelog.ts 對齊。
 *
 * 為什麼需要這支：
 *   本專案有兩份變更紀錄，但只有一份受到保護。
 *     - client/src/lib/changelog.ts：站內 UpdatePrompt 顯示用，
 *       由 scripts/check-changelog.mjs 在 prebuild 強制與 package.json version 一致 → 不會過期。
 *     - CHANGELOG.md：對外的完整紀錄，沒有任何機制盯著它。
 *   結果 CHANGELOG.md 在 2026-06-02 建立（收到 v4.7.3）之後就再也沒更新，
 *   而 changelog.ts 已經推進到 v4.19.28，中間 35 個版本在對外文件上完全看不到。
 *
 * 作法：
 *   以 changelog.ts 為單一事實來源重建 CHANGELOG.md 的新版本區塊，
 *   並原封不動保留 changelog.ts 尚未涵蓋的早期歷史（v4.7.3 以前，當初手寫的分類條目）。
 *   不從 git commit 推測、不補寫任何 changelog.ts 沒有的內容。
 *
 * 用法：node scripts/sync-changelog-md.mjs [--check]
 *   --check 只檢查是否同步（不寫檔），不同步時以 exit 1 結束，方便掛進 CI。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TS_PATH = resolve(ROOT, 'client', 'src', 'lib', 'changelog.ts');
const MD_PATH = resolve(ROOT, 'CHANGELOG.md');
const CHECK_ONLY = process.argv.includes('--check');

/** 從 changelog.ts 解析出 { version, date, items[] }，不 import TS、純文字解析 */
function parseChangelogTs(src) {
  const entries = [];
  const blockRe = /\{\s*version:\s*['"`]([^'"`]+)['"`],\s*date:\s*['"`]([^'"`]+)['"`],\s*items:\s*\[([\s\S]*?)\],\s*\}/g;
  for (const m of src.matchAll(blockRe)) {
    const items = [...m[3].matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map((i) =>
      i[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, '`').replace(/\\\\/g, '\\'),
    );
    entries.push({ version: m[1], date: m[2], items });
  }
  return entries;
}

const cmp = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
};

const tsEntries = parseChangelogTs(readFileSync(TS_PATH, 'utf8'));
if (tsEntries.length === 0) {
  console.error('✗ 無法從 changelog.ts 解析出任何條目');
  process.exit(1);
}
const oldest = tsEntries.map((e) => e.version).sort(cmp)[0];

const md = readFileSync(MD_PATH, 'utf8');

// 檔頭（第一個 "## v" 之前的說明區）原樣保留
const firstEntryIdx = md.search(/^## v/m);
if (firstEntryIdx < 0) {
  console.error('✗ CHANGELOG.md 找不到任何 "## v" 條目，格式與預期不符，中止');
  process.exit(1);
}
const header = md.slice(0, firstEntryIdx);

// 保留 changelog.ts 未涵蓋的早期歷史（版本 < changelog.ts 最舊的那筆）
const legacyBlocks = [];
const parts = md.slice(firstEntryIdx).split(/(?=^## v)/m);
for (const p of parts) {
  const m = p.match(/^## v([\d.]+)/);
  if (m && cmp(m[1], oldest) < 0) legacyBlocks.push(p.trimEnd());
}

const rendered = tsEntries
  .map((e) => `## v${e.version} — ${e.date}\n${e.items.map((i) => `- ${i}`).join('\n')}`)
  .join('\n\n');

const next = `${header}${rendered}\n\n${legacyBlocks.join('\n\n')}\n`;

if (CHECK_ONLY) {
  if (next !== md) {
    console.error('\n✗ CHANGELOG.md 與 changelog.ts 不同步');
    console.error(`    changelog.ts 最新 = v${tsEntries[0].version}`);
    console.error(`    修法：npm run changelog:md\n`);
    process.exit(1);
  }
  console.log(`✓ CHANGELOG.md 已與 changelog.ts 同步（最新 v${tsEntries[0].version}）`);
  process.exit(0);
}

if (next === md) {
  console.log(`✓ CHANGELOG.md 已是最新（v${tsEntries[0].version}），無需變更`);
} else {
  writeFileSync(MD_PATH, next, 'utf8');
  console.log(`✅ CHANGELOG.md 已同步：${tsEntries.length} 筆來自 changelog.ts（最新 v${tsEntries[0].version}）` +
    `，另保留 ${legacyBlocks.length} 筆早期手寫歷史`);
}
