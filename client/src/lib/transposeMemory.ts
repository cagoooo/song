// 個人慣用調記憶 — localStorage 記每首歌 / 每份譜上次轉到的半音位移
//
// 📐 設計文件：docs/design/G-toolbox-roadmap.md（P0-2）
//
// 現場翻歌單時，每首歌打開都自動套上次轉到的調，免每次重設。
// 純前端、零後端；隱私模式 / 寫滿 → 靜默失敗（記憶只是加分，壞了不影響轉調）。

const STORAGE_KEY = 'guitar:transpose-memory:v1';

type Store = Record<string, number>;

function read(): Store {
    try {
        if (typeof localStorage === 'undefined') return {};
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed as Store : {};
    } catch {
        return {};
    }
}

function write(store: Store): void {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // 隱私模式 / quota 滿 → 靜默
    }
}

/** 讀某 id 記住的半音位移；無記錄回 null */
export function getRememberedSteps(id: string): number | null {
    if (!id) return null;
    const v = read()[id];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** 記住某 id 的位移（0 = 刪除記錄省空間，回原調不需記） */
export function rememberSteps(id: string, steps: number): void {
    if (!id) return;
    const store = read();
    if (!steps) {
        if (id in store) {
            delete store[id];
            write(store);
        }
        return;
    }
    store[id] = steps;
    write(store);
}

/**
 * 把譜文字正規化成穩定記憶 key（忽略空白差異與大小寫）。
 * 同一份譜重貼（即使空白/大小寫略不同）仍對得上。
 */
export function sheetMemoryKey(text: string): string {
    const norm = text.replace(/\s+/g, ' ').trim().toLowerCase();
    let h = 0;
    for (let i = 0; i < norm.length; i++) {
        h = ((h << 5) - h + norm.charCodeAt(i)) | 0;
    }
    return 'sheet:' + (h >>> 0).toString(36);
}
