#!/usr/bin/env node
/**
 * 在 build 時把 client/public/sw.js 內的 __SW_VERSION__ placeholder
 * 取代成「<package version>-<git short hash>-<build epoch>」
 *
 * 為什麼三段:
 *   - package version: 人類看得懂 (v4.2.0)
 *   - git short hash: 同 version 不同 commit 可區分 (a1b2c3d)
 *   - build epoch (短): 同 hash 重 build 也會換 (避免 cache 卡住)
 *
 * 結果範例: 4.2.0-a1b2c3d-okt7
 *
 * 在 prebuild 步驟執行 (見 package.json)。
 * 實際取代後檔案不寫回 client/public/sw.js (避免 git diff 噪音),
 * 而是寫入 dist/sw.js — 但因為 vite build 會在這之後從 client/public
 * 複製過去, 所以實際做法是: 暫時改 client/public/sw.js, build 完成
 * 後不還原 (留在那裡無傷, 下次 build 會重新印)。
 *
 * 為避免 git diff 干擾, 把改完的 sw.js 視為 build artifact, 加進
 * .gitignore 反而比較複雜 (檔案需要 commit 一份原始模板)。
 * 採用方案: build 結束後還原 placeholder。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SW_PATH = resolve(__dirname, '..', 'client', 'public', 'sw.js');
const PKG_PATH = resolve(__dirname, '..', 'package.json');
const PLACEHOLDER = '__SW_VERSION__';

function shortGitHash() {
    try {
        return execSync('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
            .toString().trim();
    } catch {
        return 'nogit';
    }
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
const version = pkg.version ?? '0.0.0';
const hash = shortGitHash();
const epoch = Date.now().toString(36).slice(-4); // 4 chars 夠區分同分鐘 build
const fullVersion = `${version}-${hash}-${epoch}`;

let sw = readFileSync(SW_PATH, 'utf8');

// 把 placeholder 或舊的版本字串都替換
const PATTERN = /(['"`])(?:__SW_VERSION__|\d+\.\d+\.\d+(?:-[\w.]+)?)\1/;
const before = sw;
sw = sw.replace(`'${PLACEHOLDER}'`, `'${fullVersion}'`);
if (sw === before) {
    // placeholder 已被取代過, 嘗試用 regex 換上次的版本
    sw = sw.replace(/const CACHE_VERSION = '[^']+'/, `const CACHE_VERSION = '${fullVersion}'`);
}
writeFileSync(SW_PATH, sw);
console.log(`✓ sw.js CACHE_VERSION 已更新為 ${fullVersion}`);
