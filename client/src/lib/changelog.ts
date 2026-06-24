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
        version: '4.18.1',
        date: '2026-06-24',
        items: [
            '開場儀式不再每次重新整理就自動跳出，改由主理人需要時手動開場。',
        ],
    },
    {
        version: '4.18.0',
        date: '2026-06-23',
        items: [
            '你推薦的歌在現場被彈出來時，會跳出慶祝提醒，謝謝你的好品味！',
        ],
    },
    {
        version: '4.17.0',
        date: '2026-06-23',
        items: [
            '推薦送出後自動展開清單並高亮你的歌，一鍵「+1 揪人」找大家一起點',
        ],
    },
    {
        version: '4.16.0',
        date: '2026-06-23',
        items: [
            '推薦表單會記住你的稱呼，下次自動帶回，免每次重打',
            '相似歌名只柔性提示、不再硬擋送出（只有完全相同才會跳確認）',
        ],
    },
    {
        version: '4.15.0',
        date: '2026-06-23',
        items: [
            '網路不穩時送出的推薦會自動暫存，恢復連線後自動補送，免重填',
            '送出當下若離線，會明確提示「已暫存」，不再讓人以為沒送出',
        ],
    },
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
