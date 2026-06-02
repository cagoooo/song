#!/usr/bin/env node
// 無依賴 CHANGELOG 產生器 —— 從 git conventional commits 分組產出 Markdown。
//
// 用法：
//   node scripts/gen-changelog.mjs            # 全部歷史
//   node scripts/gen-changelog.mjs v4.6.0     # 從某個 tag/ref 之後
//   npm run changelog                          # 同上（全部）
//
// 設計：純讀 git log，不裝 conventional-changelog 套件（避免新增 dependency）。
// 輸出到 stdout；要寫檔自行重導： node scripts/gen-changelog.mjs > CHANGELOG.generated.md
import { execSync } from 'node:child_process';

const fromRef = process.argv[2];
const range = fromRef ? `${fromRef}..HEAD` : '';

// 用罕見分隔符避免 commit 訊息內含特殊字元造成解析錯誤
const SEP = '';
const raw = execSync(`git log ${range} --no-merges --pretty=format:%s${SEP}%h`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
});

// conventional commit 類型 → 中文標題
const GROUPS = [
    ['feat', '✨ 新功能 Features'],
    ['fix', '🐛 修正 Fixes'],
    ['perf', '⚡ 效能 Performance'],
    ['refactor', '♻️ 重構 Refactor'],
    ['test', '🧪 測試 Tests'],
    ['ci', '🤖 CI / 建置'],
    ['docs', '📝 文件 Docs'],
    ['style', '💄 樣式 Style'],
    ['chore', '🔧 雜項 Chore'],
];

const buckets = new Map(GROUPS.map(([k]) => [k, []]));
const other = [];

for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const [subject, hash] = line.split(SEP);
    const m = subject.match(/^(\w+)(?:\([^)]*\))?(!)?:\s*(.+)$/);
    if (m && buckets.has(m[1])) {
        buckets.get(m[1]).push({ desc: m[3], hash });
    } else {
        other.push({ desc: subject, hash });
    }
}

const out = [];
out.push(`# 變更紀錄（自動產生）`);
out.push('');
out.push(`> 由 \`scripts/gen-changelog.mjs\` 從 git conventional commits 產生${fromRef ? `（${fromRef} 之後）` : ''}。`);
out.push('');

for (const [key, title] of GROUPS) {
    const items = buckets.get(key);
    if (!items.length) continue;
    out.push(`## ${title}`);
    out.push('');
    for (const it of items) out.push(`- ${it.desc} (\`${it.hash}\`)`);
    out.push('');
}
if (other.length) {
    out.push('## 其他');
    out.push('');
    for (const it of other) out.push(`- ${it.desc} (\`${it.hash}\`)`);
    out.push('');
}

process.stdout.write(out.join('\n'));
