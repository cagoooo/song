// 歌曲詳情頁 — Editorial 雜誌風全螢幕 modal
// 設計來源：Claude Design handoff (jysVMA2ORq0BqZjZyW2p6Q)，sd-page.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import type { Song } from '@/lib/firestore';
import { ChordSvg } from './ChordSvg';
import { getSongDetail, findSimilarSongs } from './data';
import {
    transposeChordSymbol, transposeProgression, transposeLyricBlocks,
    preferFlatForKey, isChordSymbol,
} from '@/lib/transpose';
import { getRememberedSteps, rememberSteps } from '@/lib/transposeMemory';
import { getFingerings } from './chordShapes';

interface SongDetailModalProps {
    song: Song | null;
    /** 整批歌單，用來找相似歌 */
    allSongs?: Song[];
    onClose: () => void;
    /** 點「我要點」時的回呼（外部會做實際投票），若不傳則只跳 toast */
    onVote?: (song: Song) => void | Promise<void>;
    /** 點相似歌切換顯示 */
    onSelectSimilar?: (song: Song) => void;
}

export function SongDetailModal({ song, allSongs = [], onClose, onVote, onSelectSimilar }: SongDetailModalProps) {
    const [voted, setVoted] = useState(false);
    const [voteBump, setVoteBump] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    /** 轉調位移（半音）：0 = 原調，每按一次 −/＋ 移 1 半音 */
    const [transposeSteps, setTransposeSteps] = useState(0);
    const btnRef = useRef<HTMLButtonElement>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 每次切歌都重置投票狀態；轉調套用「上次記住的調」（慣用調記憶）
    useEffect(() => {
        setVoted(false);
        setVoteBump(false);
        setTransposeSteps(song ? (getRememberedSteps('song:' + song.id) ?? 0) : 0);
    }, [song?.id]);

    // 使用者實際操作轉調時才存記憶（切歌的自動設定不經過這裡，避免誤存）。
    // functional updater 讀最新值，快速連點也不丟。
    const changeTranspose = useCallback((next: number | ((s: number) => number)) => {
        setTransposeSteps((prev) => {
            const raw = typeof next === 'function' ? next(prev) : next;
            const clamped = Math.max(-11, Math.min(11, raw));
            if (song) rememberSteps('song:' + song.id, clamped);
            return clamped;
        });
    }, [song]);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 1800);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const detail = useMemo(() => (song ? getSongDetail(song) : null), [song]);

    // ===== 自動轉調（91 譜式即時轉調） =====
    // 依轉調後的目標調決定整份譜 #/b 拼法，再轉 key / 進行 / 歌詞和弦行
    const view = useMemo(() => {
        if (!detail) return null;
        if (transposeSteps === 0) {
            return { key: detail.key, progression: detail.progression, lyrics: detail.lyrics };
        }
        const preferFlat = preferFlatForKey(transposeChordSymbol(detail.key, transposeSteps));
        const opts = { preferFlat };
        return {
            key: transposeChordSymbol(detail.key, transposeSteps, opts),
            progression: transposeProgression(detail.progression, transposeSteps, opts),
            lyrics: transposeLyricBlocks(detail.lyrics, transposeSteps, opts),
        };
    }, [detail, transposeSteps]);

    // 指型卡改從「目前顯示的調」推導：進行 + 歌詞和弦行的所有和弦，查不到才退回預設 6 卡
    const fingerings = useMemo(() => {
        if (!detail || !view) return [];
        const lyricChords = view.lyrics.flatMap((b) =>
            b.rows.flatMap((r) => (r.chord ? r.chord.trim().split(/\s+/).filter(isChordSymbol) : []))
        );
        const cards = getFingerings([...view.progression, ...lyricChords], 6);
        return cards.length > 0 ? cards : detail.fingerings;
    }, [detail, view]);

    // Capo 等效提示：升 n 半音（1-7）= 夾 Capo n 彈原調指型
    const capoHint = useMemo(() => {
        const n = ((transposeSteps % 12) + 12) % 12;
        return n >= 1 && n <= 7 ? n : null;
    }, [transposeSteps]);

    const similar = useMemo(() => {
        if (!song) return [];
        if (detail && detail.similar.length > 0) return detail.similar;
        return findSimilarSongs(song, allSongs);
    }, [song, detail, allSongs]);

    const voteCount = (song?.voteCount || 0) + (voted ? 1 : 0);

    const handleCopyChord = (name: string) => {
        if (navigator.clipboard) navigator.clipboard.writeText(name).catch(() => {});
        showToast(`已複製和弦名 ${name}`);
    };

    const handleVote = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (voted || !song) return;
        setVoted(true);
        setVoteBump(true);
        setTimeout(() => setVoteBump(false), 500);

        // 漣漪動畫
        const rect = e.currentTarget.getBoundingClientRect();
        const r = document.createElement('span');
        r.className = 'sdp-ripple';
        const size = Math.max(rect.width, rect.height);
        r.style.width = r.style.height = size + 'px';
        r.style.left = (e.clientX - rect.left - size / 2) + 'px';
        r.style.top = (e.clientY - rect.top - size / 2) + 'px';
        e.currentTarget.appendChild(r);
        setTimeout(() => r.remove(), 700);

        // 觸發實際投票（如果父層有提供）
        onVote?.(song);
        showToast('✓ 已點播 + 1，下一首可能就是你選的');
    };

    if (!song || !detail || !view) return null;

    return (
        <Dialog open={!!song} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent
                className="max-w-[1280px] w-[96vw] h-[92vh] p-0 overflow-hidden bg-white border-[rgba(17,17,17,0.18)] flex flex-col"
            >
                <DialogTitle className="sr-only">
                    {song.title} · {song.artist} — 歌曲詳情頁
                </DialogTitle>
                <DialogDescription className="sr-only">
                    包含和弦進行、6 個指型圖、歌詞和弦對照、阿凱筆記、相似推薦歌曲。
                </DialogDescription>

                <div className="sd-page flex-1 overflow-y-auto" style={{ padding: '0 32px' }}>
                    {/* 1 — Top nav */}
                    <nav className="sdp-nav">
                        <div className="sdp-nav-l">
                            <button className="sdp-back" onClick={onClose} aria-label="返回歌單">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m15 18-6-6 6-6" />
                                </svg>
                                返回歌單
                            </button>
                        </div>
                        <div className="sdp-nav-c">Nº 12 · CHAPTER 07 · 點歌系統</div>
                        <div className="sdp-nav-r">
                            <span>SHARE QR</span>
                            <span>·</span>
                            <span>{detail.length}</span>
                        </div>
                    </nav>

                    {/* 2 — Hero */}
                    <section className="sdp-hero">
                        <div>
                            <div className="sdp-eyebrow">
                                <span>★ TONIGHT&apos;S PICK</span>
                                <span className="dim">·</span>
                                <span className="dim">{voteCount} 票</span>
                                {song.isPlayed && (
                                    <>
                                        <span className="dim">·</span>
                                        <span className="dim">已彈奏</span>
                                    </>
                                )}
                            </div>
                            <h1 className="sdp-title">{song.title}</h1>
                            <div className="sdp-artist">{song.artist}</div>

                            <div className="sdp-meta">
                                <div className="sdp-meta-cell">
                                    <div className="sdp-meta-l">CAPO</div>
                                    <div className="sdp-meta-v">{detail.capo}</div>
                                </div>
                                <div className="sdp-meta-cell">
                                    <div className="sdp-meta-l">KEY</div>
                                    <div className="sdp-meta-v">
                                        {view.key}
                                        {transposeSteps !== 0 && (
                                            <span className="sdp-meta-orig">原 {detail.key}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="sdp-meta-cell">
                                    <div className="sdp-meta-l">BPM</div>
                                    <div className="sdp-meta-v">{detail.bpm}</div>
                                </div>
                                <div className="sdp-meta-cell">
                                    <div className="sdp-meta-l">LENGTH</div>
                                    <div className="sdp-meta-v">{detail.length}</div>
                                </div>
                            </div>
                        </div>

                        <div className="sdp-vinyl-wrap">
                            <div className="sdp-vinyl" aria-hidden="true">
                                <div className="sdp-vinyl-label">
                                    <div className="sdp-vinyl-t">{song.title}</div>
                                    <div className="sdp-vinyl-s">SIDE A · {song.artist}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3 — Chord progression + fingerings */}
                    <section className="sdp-section">
                        <div className="sdp-section-h">
                            <span className="chap">No. 01 / 和弦</span>
                            <span className="ttl">彈這幾個和弦就夠了</span>
                            <span className="meta">{view.progression.length} STEPS</span>
                        </div>

                        {/* 自動轉調控制列 — 91 譜式即時轉調 */}
                        <div className="sdp-transpose" role="group" aria-label="自動轉調">
                            <span className="sdp-trans-label">轉調 TRANSPOSE</span>
                            <button
                                className="sdp-trans-btn"
                                onClick={() => changeTranspose((s) => s - 1)}
                                disabled={transposeSteps <= -11}
                                aria-label="降半音"
                            >
                                −
                            </button>
                            <span className="sdp-trans-key" aria-live="polite">
                                {view.key}
                                <span className="sdp-trans-steps">
                                    {transposeSteps === 0 ? '原調' : (transposeSteps > 0 ? `+${transposeSteps}` : `${transposeSteps}`)}
                                </span>
                            </span>
                            <button
                                className="sdp-trans-btn"
                                onClick={() => changeTranspose((s) => s + 1)}
                                disabled={transposeSteps >= 11}
                                aria-label="升半音"
                            >
                                ＋
                            </button>
                            {transposeSteps !== 0 && (
                                <button
                                    className="sdp-trans-reset"
                                    onClick={() => changeTranspose(0)}
                                    aria-label={`回到原調 ${detail.key}`}
                                >
                                    ↺ 回原調 {detail.key}
                                </button>
                            )}
                            {capoHint !== null && (
                                <span className="sdp-trans-capo">
                                    或夾 CAPO {capoHint} 彈 {detail.key} 指型
                                </span>
                            )}
                        </div>

                        <div className="sdp-prog">
                            {view.progression.map((c, i) => (
                                <div key={`prog-${i}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <button
                                        className="sdp-prog-pill"
                                        onClick={() => handleCopyChord(c)}
                                        aria-label={`複製和弦名 ${c}`}
                                    >
                                        {c}
                                    </button>
                                    {i < view.progression.length - 1 && (
                                        <span className="sdp-prog-arrow" aria-hidden="true">→</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="sdp-chord-grid">
                            {fingerings.map((f) => (
                                <div
                                    key={f.name}
                                    className="sdp-chord-card"
                                    onClick={() => handleCopyChord(f.name)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCopyChord(f.name); }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`複製和弦 ${f.label}`}
                                >
                                    <div className="sdp-chord-name">{f.name}</div>
                                    <ChordSvg dots={f.dots} baseFret={f.baseFret} />
                                    <div className="sdp-chord-label">{f.label}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 4 — Lyrics */}
                    <section className="sdp-section">
                        <div className="sdp-section-h">
                            <span className="chap">No. 02 / 歌詞</span>
                            <span className="ttl">跟著彈，跟著唱</span>
                            <span className="meta">{view.lyrics.length} SECTIONS</span>
                        </div>

                        <div className="sdp-lyrics">
                            {view.lyrics.map((b, i) => (
                                <div key={i} className={'sdp-lyr-block' + (b.chorus ? ' chorus' : '')}>
                                    <div className="sdp-lyr-sec">[{b.sec}]</div>
                                    {b.rows.map((r, j) => (
                                        <div key={j} className="sdp-lyr-row">
                                            <div className="sdp-lyr-chord">{r.chord}</div>
                                            {r.line && <div className="sdp-lyr-line">{r.line}</div>}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 5 — Editor note */}
                    <section className="sdp-section">
                        <div className="sdp-section-h">
                            <span className="chap">No. 03 / 阿凱筆記</span>
                            <span className="ttl">主理人的提醒</span>
                            <span className="meta">EDITOR&apos;S NOTE</span>
                        </div>

                        <div className="sdp-note">
                            <p className="sdp-note-q">{detail.note}</p>
                            <div className="sdp-note-by">— 阿凱老師 · 主理人</div>
                        </div>
                    </section>

                    {/* 6 — Similar songs */}
                    {similar.length > 0 && (
                        <section className="sdp-section">
                            <div className="sdp-section-h">
                                <span className="chap">No. 04 / 推薦</span>
                                <span className="ttl">彈完這首再接著彈</span>
                                <span className="meta">{similar.length} TRACKS</span>
                            </div>

                            <div className="sdp-similar">
                                {similar.map((s, i) => (
                                    <div
                                        key={`sim-${i}`}
                                        className="sdp-sim-card"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            const found = allSongs.find(x => x.title === s.title && x.artist === s.artist);
                                            if (found && onSelectSimilar) onSelectSimilar(found);
                                            else showToast(`「${s.title}」還沒在歌單裡`);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                const found = allSongs.find(x => x.title === s.title && x.artist === s.artist);
                                                if (found && onSelectSimilar) onSelectSimilar(found);
                                            }
                                        }}
                                    >
                                        <div className="sdp-sim-vinyl" aria-hidden="true" />
                                        <div className="sdp-sim-meta">
                                            <div className="sdp-sim-title">{s.title}</div>
                                            <div className="sdp-sim-artist">
                                                {s.artist}{s.year > 0 ? ` · ${s.year}` : ''}
                                            </div>
                                            <span className="sdp-sim-pill">{s.pill}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 7 — Sticky CTA */}
                    <div className="sdp-cta">
                        <div className="sdp-cta-l">
                            <button
                                ref={btnRef}
                                className={'sdp-cta-btn' + (voted ? ' voted' : '')}
                                onClick={handleVote}
                                disabled={voted}
                                aria-label={voted ? '已點播' : '點播這首歌'}
                            >
                                {voted ? '✓ 已點播這首' : '+ 我要點這首'}
                                <span className={'v sdp-bump-num' + (voteBump ? ' go' : '')}>{voteCount}</span>
                            </button>
                        </div>
                        <div className="sdp-cta-info">
                            <b>{voteCount} 票</b> · 今晚已被點 <b>{detail.playedTimes}</b> 次
                        </div>
                    </div>
                </div>

                {toast && (
                    <div className="sdp-toast">
                        <span className="sdp-ok">✓</span>
                        {toast}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
