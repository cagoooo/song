#!/usr/bin/env node
/**
 * 發版品質防線：package.json 的 version 必須等於 changelog.ts 最新（最上面）一筆的 version。
 *
 * 為什麼：UpdatePrompt 顯示的「版本號」來自 build stamp（= package version + git hash），
 * 而「更新內容」顯示的是 CHANGELOG[0]。兩者一旦脫鉤，就會出現使用者看到「版本號變了，
 * 但更新內容每次都長一樣」的窘況（實際發生過）。
 *
 * 在 prebuild 階段執行（見 package.json）。版本不一致就讓 build 失敗，
 * 強制每次 bump 版本都要補上對應的 changelog 條目（反之亦然）。
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_PATH = resolve(__dirname, '..', 'package.json');
const CHANGELOG_PATH = resolve(__dirname, '..', 'client', 'src', 'lib', 'changelog.ts');

const pkgVersion = JSON.parse(readFileSync(PKG_PATH, 'utf8')).version;
const src = readFileSync(CHANGELOG_PATH, 'utf8');

// 依檔案順序抓出所有 `version: '...'`（type 宣告 `version: string;` 沒有引號不會被誤抓）
const versions = [...src.matchAll(/version:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);

function fail(reason) {
    console.error(`\n✗ changelog 校驗失敗：${reason}`);
    console.error(`    package.json version = ${pkgVersion}`);
    console.error(`    changelog 最新版本   = ${versions[0] ?? '(無)'}`);
    console.error('\n  修法（擇一）：');
    console.error(`    1) 在 client/src/lib/changelog.ts 最上方新增一筆 version: '${pkgVersion}' 的條目；或`);
    console.error('    2) 把 package.json 的 version 調整為與最新 changelog 一致。\n');
    process.exit(1);
}

if (versions.length === 0) fail('找不到任何 changelog 條目');

const duplicate = versions.find((v, i) => versions.indexOf(v) !== i);
if (duplicate) fail(`changelog 有重複版本：${duplicate}`);

// 核心不變式：最新 changelog 條目必須等於 package version
if (versions[0] !== pkgVersion) {
    fail(`最新 changelog 版本（${versions[0]}）與 package.json version（${pkgVersion}）不一致`);
}

console.log(`✓ changelog 校驗通過：v${pkgVersion} 有對應的更新內容`);
