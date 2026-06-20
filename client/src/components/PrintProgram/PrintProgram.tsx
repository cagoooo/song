// 節目單列印版 — A4 直式雜誌風 setlist 列印頁
// 設計策略：用 window.print() + @media print CSS，不依賴 html2pdf / jsPDF
// 📐 設計文件：docs/design/D3-pdf-print.md
//
// 觸發機制（在 Home.tsx）：
//   document.body.classList.add('print-mode');
//   window.print();
//   // 'afterprint' 事件移除 class
//
// 預設只渲染在 .print-mode body 下，平常 display:none，
// 列印預覽 / 列印當下才整版顯示。
import type { Song } from '@/lib/firestore';
import type { VoterStat } from '@/hooks/useVoterLeaderboard';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PrintProgramProps {
    songs: Song[];
    /** 總票數 — 由父層傳，避免重算 */
    totalVotes: number;
    /** 不同 voter 數 — 由父層傳 */
    totalVoters: number;
    /** 催歌王 Top N — 由父層傳，避免在元件內訂閱 Firestore */
    topVoters: VoterStat[];
    /** 雜誌期數，預設 12 */
    issueNumber?: number;
    /** 期刊標題，預設「阿凱彈唱之夜」 */
    issueTitle?: string;
    /** Side A / B */
    sideLabel?: 'A' | 'B';
    /** 顯示前 N 首歌，預設 20 */
    topN?: number;
    /** 阿凱主理人寄語 */
    kaiNote?: string;
    /** 關閉螢幕列印預覽（不影響實際列印；@media print 時自動隱藏按鈕） */
    onClose?: () => void;
}

function formatTodayZh(d: Date): string {
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

const DEFAULT_KAI_NOTE =
    '副歌前的那個關鍵和弦卡半拍給它，整首歌的張力就出來了。\n' +
    '感謝今晚每個跟著哼唱、跟著點歌的你。';

export function PrintProgram({
    songs,
    totalVotes,
    totalVoters,
    topVoters,
    issueNumber = 12,
    issueTitle = '阿凱彈唱之夜',
    sideLabel = 'A',
    topN = 20,
    kaiNote = DEFAULT_KAI_NOTE,
    onClose,
}: PrintProgramProps) {
    const today = formatTodayZh(new Date());
    const ranked = [...songs]
        .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
        .slice(0, topN);

    const issueNo = `Nº ${issueNumber}`;
    const setlistCount = songs.length;

    const program = (
      <>
        {onClose && (
            <button
                type="button"
                className="pp-close no-print"
                onClick={onClose}
                aria-label="關閉列印預覽"
                data-testid="print-close"
            >
                <X aria-hidden="true" />
                <span>關閉預覽</span>
            </button>
        )}
        <div className="print-program" aria-hidden="true" data-testid="print-program">
            {/* 頂條：期數 / Side / 日期 */}
            <header className="pp-flag">
                <div className="pp-flag-l">
                    <div className="pp-flag-no">{issueNo}</div>
                    <div className="pp-flag-side">SIDE {sideLabel}</div>
                </div>
                <div className="pp-flag-r">
                    <div className="pp-flag-brand">阿凱 · Guitar Singalong</div>
                    <div className="pp-flag-date">{today}</div>
                </div>
            </header>

            {/* 大標 */}
            <section className="pp-hero">
                <div className="pp-chap">CHAPTER 01 · TONIGHT&apos;S SETLIST</div>
                <h1 className="pp-h">
                    今晚的<em>節目單</em>
                </h1>
                <p className="pp-sub">{issueTitle} · 共 {setlistCount} 首歌</p>
            </section>

            {/* KPI 表格欄 */}
            <section className="pp-kpis">
                <div className="pp-kpi">
                    <div className="pp-kpi-n">{totalVotes}</div>
                    <div className="pp-kpi-l">總票數</div>
                </div>
                <div className="pp-kpi">
                    <div className="pp-kpi-n">{totalVoters}</div>
                    <div className="pp-kpi-l">歌迷數</div>
                </div>
                <div className="pp-kpi">
                    <div className="pp-kpi-n">{setlistCount}</div>
                    <div className="pp-kpi-l">歌單長度</div>
                </div>
                <div className="pp-kpi">
                    <div className="pp-kpi-n">{ranked.length}</div>
                    <div className="pp-kpi-l">列印 Top</div>
                </div>
            </section>

            <hr className="pp-rule" />

            {/* Top N 歌單 */}
            <section className="pp-setlist">
                <div className="pp-section-h">
                    <span className="pp-section-no">№ 02</span>
                    <h2>Top {ranked.length} 排行榜</h2>
                </div>
                {ranked.length > 0 ? (
                    <ol className="pp-list">
                        {ranked.map((s, i) => (
                            <li key={s.id} className="pp-row">
                                <span className="pp-row-rank">{String(i + 1).padStart(2, '0')}.</span>
                                <span className="pp-row-title">{s.title}</span>
                                <span className="pp-row-artist">{s.artist}</span>
                                <span className="pp-row-votes">{s.voteCount || 0} 票</span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="pp-empty">尚無投票紀錄</p>
                )}
            </section>

            <hr className="pp-rule" />

            {/* 催歌王 */}
            {topVoters.length > 0 && (
                <section className="pp-voters">
                    <div className="pp-section-h">
                        <span className="pp-section-no">№ 03</span>
                        <h2>催歌王</h2>
                    </div>
                    <ul className="pp-voters-list">
                        {topVoters.slice(0, 3).map((v, i) => {
                            const medal = ['🥇', '🥈', '🥉'][i] ?? '';
                            return (
                                <li key={v.sessionId}>
                                    <span className="pp-medal">{medal}</span>
                                    <span className="pp-voter-id">{v.displayName}</span>
                                    <span className="pp-voter-count">{v.count} 票</span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <hr className="pp-rule" />

            {/* 阿凱主理人 */}
            <section className="pp-note">
                <div className="pp-section-h">
                    <span className="pp-section-no">№ 04</span>
                    <h2>主理人寄語</h2>
                </div>
                <blockquote className="pp-quote">
                    {kaiNote.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </blockquote>
            </section>

            <hr className="pp-rule" />

            {/* Footer — 阿凱老師署名 + 學校 */}
            <footer className="pp-foot">
                <div className="pp-foot-l">Made with ❤️ by 阿凱老師</div>
                <div className="pp-foot-c">桃園市龍潭區石門國民小學</div>
                <div className="pp-foot-r">{today} 印</div>
            </footer>
        </div>
      </>
    );

    return createPortal(program, document.body);
}

export default PrintProgram;
