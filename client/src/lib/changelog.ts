/**
 * changelog.ts — 每次發版時更新此清單即可；UpdatePrompt 會自動顯示最新幾條。
 * 格式：{ version, date, items[] }，items 最多建議 3-4 條，保持簡短。
 */
export interface ChangelogEntry {
    version: string;
    date: string;
    items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '4.14.0',
        date: '2026-06-23',
        items: [
            '系統載入畫面全新改版為擬物化復古卡帶 (Cassette Tape) 風格',
            '載入中齒輪會持續運轉，且磁帶卷大小會隨載入進度動態捲動',
            '系統進度條整合老式 LED 三位數計數器，並完美符合 RWD 響應式排版',
        ],
    },
    {
        version: '4.13.0',
        date: '2026-06-23',
        items: [
            '「建議新歌」送出更穩定，網路不佳也不再卡住',
            '修正相似歌名誤判（例：「再見的時候」不再被當成「再見」）',
            '手機端建議表單可正常捲動，送出鈕固定在底部看得見',
            '關閉建議表單更靈敏，手機點一下即關',
        ],
    },
    {
        version: '4.12.0',
        date: '2026-06-20',
        items: [
            '卡帶按鈕管理優化，右下角不再重疊',
            '列印節目單關閉預覽更可靠（加入關閉按鈕＋Esc）',
            '返回頂部按鈕改為往上捲時才出現',
        ],
    },
    {
        version: '4.11.5',
        date: '2026-06-13',
        items: [
            'AI 辨識完成後自動捲到控制列',
            '手機轉調結果移至原譜上方，邊切調邊看',
            'AI 辨識上傳前自動壓縮，速度提升 9 倍',
        ],
    },
    {
        version: '4.11.0',
        date: '2026-06-13',
        items: [
            '新增 AI Vision 譜圖辨識（反白標籤也能正確辨識）',
            '轉調結果支援下載 PNG / PDF',
        ],
    },
];

/** 取最新一個版本的 changelog */
export function getLatestChangelog(): ChangelogEntry | undefined {
    return CHANGELOG[0];
}
