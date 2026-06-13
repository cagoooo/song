// 和弦指型字典 + 封閉和弦（barre）自動產生
//
// 📐 設計文件：docs/design/T5-transpose.md
//
// 轉調後的和弦（例 C→Db）開放把位彈不出來，需要封閉和弦指型。
// 查表順序：
//   1. OPEN_SHAPES 開放和弦字典（最好彈的版本）
//   2. E-shape / A-shape 封閉和弦自動產生（'' / m / 7 / m7 / maj7 五種品質）
//   3. 都沒有 → null（呈現端直接略過該卡，不畫錯誤指型誤導使用者）

import { parseChord, noteToSemitone } from '@/lib/transpose';
import type { ChordFingering } from './data';

type Dots = ChordFingering['dots'];

/** 把 'x32010' 字串寫法轉 dots（6 弦 → 1 弦，好維護） */
function shape(s: string): Dots {
    // s[0] = 第 6 弦（低音 E）… s[5] = 第 1 弦
    const v = (ch: string): number | 'x' => (ch === 'x' ? 'x' : parseInt(ch, 10));
    return { 6: v(s[0]), 5: v(s[1]), 4: v(s[2]), 3: v(s[3]), 2: v(s[4]), 1: v(s[5]) };
}

/**
 * 開放和弦字典 — key 為「root + 正規化品質」。
 * 全部 baseFret = 1（dots 直接是絕對 fret）。
 */
const OPEN_SHAPES: Record<string, Dots> = {
    // 大三和弦
    'C': shape('x32010'),
    'D': shape('xx0232'),
    'E': shape('022100'),
    'F': shape('133211'),
    'G': shape('320003'),
    'A': shape('x02220'),
    // 小三和弦
    'Am': shape('x02210'),
    'Dm': shape('xx0231'),
    'Em': shape('022000'),
    // 屬七
    'A7': shape('x02020'),
    'B7': shape('x21202'),
    'C7': shape('x32310'),
    'D7': shape('xx0212'),
    'E7': shape('020100'),
    'G7': shape('320001'),
    // 小七
    'Am7': shape('x02010'),
    'Dm7': shape('xx0211'),
    'Em7': shape('020000'),
    // 大七
    'Cmaj7': shape('x32000'),
    'Dmaj7': shape('xx0222'),
    'Emaj7': shape('021100'),
    'Fmaj7': shape('xx3210'),
    'Gmaj7': shape('320002'),
    'Amaj7': shape('x02120'),
    // sus / add
    'Dsus4': shape('xx0233'),
    'Asus4': shape('x02230'),
    'Esus4': shape('022200'),
    'Dsus2': shape('xx0230'),
    'Asus2': shape('x02200'),
    'Cadd9': shape('x32030'),
};

/**
 * 封閉和弦模板 — dots 是「相對 baseFret 的格數」（1 = 封閉那格）。
 * E-shape root 在第 6 弦、A-shape root 在第 5 弦。
 */
const BARRE_TEMPLATES: Record<'E' | 'A', Partial<Record<string, Dots>>> = {
    E: {
        '': { 6: 1, 5: 3, 4: 3, 3: 2, 2: 1, 1: 1 },      // F 型
        'm': { 6: 1, 5: 3, 4: 3, 3: 1, 2: 1, 1: 1 },     // Fm 型
        '7': { 6: 1, 5: 3, 4: 1, 3: 2, 2: 1, 1: 1 },     // F7 型
        'm7': { 6: 1, 5: 3, 4: 1, 3: 1, 2: 1, 1: 1 },    // Fm7 型
        'maj7': { 6: 1, 5: 3, 4: 2, 3: 2, 2: 1, 1: 1 },  // Fmaj7 型
    },
    A: {
        '': { 6: 'x', 5: 1, 4: 3, 3: 3, 2: 3, 1: 1 },    // B 型
        'm': { 6: 'x', 5: 1, 4: 3, 3: 3, 2: 2, 1: 1 },   // Bm 型
        '7': { 6: 'x', 5: 1, 4: 3, 3: 1, 2: 3, 1: 1 },   // B7 型
        'm7': { 6: 'x', 5: 1, 4: 3, 3: 1, 2: 2, 1: 1 },  // Bm7 型
        'maj7': { 6: 'x', 5: 1, 4: 3, 3: 2, 2: 3, 1: 1 },// Bmaj7 型
    },
};

/** E-shape root（第 6 弦空弦 = E = 4）/ A-shape root（第 5 弦空弦 = A = 9） */
const E_STRING = 4;
const A_STRING = 9;

/**
 * 品質正規化 — 把字典查得到的品質湊出來。
 * 'min7' → 'm7'、'M7'/'Δ7' → 'maj7'，其餘原樣。
 */
function normalizeQuality(suffix: string): string {
    return suffix
        .replace(/^min/, 'm')
        .replace(/^M7/, 'maj7')
        .replace(/^Δ7?/, 'maj7');
}

/** 中文品質標籤（卡片下方的 label 用） */
function qualityLabel(root: string, quality: string): string {
    const map: Record<string, string> = {
        '': 'Major', 'm': 'Minor', '7': 'Dom 7th', 'm7': 'Minor 7th', 'maj7': 'Major 7th',
        'sus4': 'Sus 4', 'sus2': 'Sus 2', 'add9': 'Add 9',
    };
    return `${root} ${map[quality] ?? quality}`;
}

/**
 * 查單一和弦的指型。分數和弦用本體查（C/G 畫 C 的指型，名稱保留 C/G）。
 * 查不到（罕見品質 + 沒模板）→ null。
 */
export function getFingering(chordName: string): ChordFingering | null {
    const parsed = parseChord(chordName);
    if (!parsed) return null;
    const quality = normalizeQuality(parsed.suffix);
    const semitone = noteToSemitone(parsed.root);
    if (semitone === null) return null;

    // 1) 開放和弦字典 — 用「拼法無關」的 semitone 比對（Db 查 C# 的表也要中）
    for (const [name, dots] of Object.entries(OPEN_SHAPES)) {
        const p = parseChord(name)!;
        if (noteToSemitone(p.root) === semitone && normalizeQuality(p.suffix) === quality) {
            return { name: chordName, label: qualityLabel(parsed.root, quality), dots };
        }
    }

    // 2) 封閉和弦：E-shape / A-shape 選把位低的（fret 1-9）
    const eFret = ((semitone - E_STRING) % 12 + 12) % 12;
    const aFret = ((semitone - A_STRING) % 12 + 12) % 12;
    const candidates: Array<{ shape: 'E' | 'A'; fret: number }> = [];
    if (eFret >= 1 && eFret <= 9 && BARRE_TEMPLATES.E[quality]) candidates.push({ shape: 'E', fret: eFret });
    if (aFret >= 1 && aFret <= 9 && BARRE_TEMPLATES.A[quality]) candidates.push({ shape: 'A', fret: aFret });
    if (candidates.length === 0) return null;
    candidates.sort((x, y) => x.fret - y.fret);
    const pick = candidates[0];
    const template = BARRE_TEMPLATES[pick.shape][quality]!;

    if (pick.fret === 1) {
        // 第 1 把位的封閉和弦（F / Bb…）dots 即絕對 fret，不用 baseFret
        return { name: chordName, label: qualityLabel(parsed.root, quality), dots: template };
    }
    return {
        name: chordName,
        label: qualityLabel(parsed.root, quality),
        dots: template,
        baseFret: pick.fret,
    };
}

/**
 * 從和弦名列表產生指型卡（去重、保序、查不到的略過、最多 maxCards 張）。
 * 分數和弦去重以「本體」計（C 和 C/G 只出一張 C 卡 — 後出現的 C/G 略過）。
 */
export function getFingerings(chordNames: string[], maxCards = 8): ChordFingering[] {
    const out: ChordFingering[] = [];
    const seen = new Set<string>();
    for (const name of chordNames) {
        const parsed = parseChord(name);
        if (!parsed) continue;
        const dedupeKey = `${noteToSemitone(parsed.root)}|${normalizeQuality(parsed.suffix)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const f = getFingering(name);
        if (f) out.push(f);
        if (out.length >= maxCards) break;
    }
    return out;
}
