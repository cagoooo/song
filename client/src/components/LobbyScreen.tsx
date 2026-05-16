// 待開場大廳 · Lobby Screen
// 全螢幕 overlay；admin 設定 openingAt 後所有訪客看到倒數
// 開場（admin 設第一首 nowPlaying）或倒數歸零後自動關
// 對應原型：.handoff-tmp3/prototypes/lobby-screen.html
import { useEffect, useState } from 'react';

interface LobbyScreenProps {
    /** 預計開場時間（Firestore 來的） */
    openingAt: Date | null;
    /** 整場歌單總數 */
    setlistTotal?: number;
    /** 候選歌單總數 */
    catalogTotal?: number;
    /** 「先點幾首」CTA — 通常 setActiveTabForMobile('songs') + scroll */
    onPickSongs?: () => void;
    /** 「看今晚歌單」CTA — 通常開排行榜 tab */
    onViewSetlist?: () => void;
    /** 倒數歸零或被 admin 取消後呼叫 */
    onClose: () => void;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export function LobbyScreen({
    openingAt,
    setlistTotal,
    catalogTotal,
    onPickSongs,
    onViewSetlist,
    onClose,
}: LobbyScreenProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const remainingMs = openingAt ? openingAt.getTime() - now : -1;

    // 開場時間已過 → 自動關（useEffect 必須在所有 hooks 區塊之內、early return 之前）
    useEffect(() => {
        if (openingAt && remainingMs <= 0) {
            const t = window.setTimeout(onClose, 200);
            return () => window.clearTimeout(t);
        }
        return undefined;
    }, [openingAt, remainingMs, onClose]);

    if (!openingAt || remainingMs <= 0) return null;

    const totalSec = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;

    const isLow = totalSec <= 60 && totalSec > 10;
    const isImminent = totalSec <= 10;

    return (
        <div
            className={`lb ${isLow ? 'is-low' : ''} ${isImminent ? 'is-imminent' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="候場大廳"
        >
            <div className="lb-top">
                <span>Nº <em>12</em> &nbsp;·&nbsp; OPENING NIGHT</span>
                <b>阿凱彈唱之夜</b>
                <span className="r">
                    <span className="lb-top-dot" /> WAITING ROOM &nbsp;·&nbsp; SIDE A · 33⅓ RPM
                </span>
            </div>

            <div className="lb-main">
                <div className="lb-text">
                    <div className="lb-eb">
                        § 02 <span className="lb-eb-rule" /> CHAPTER <b>LOBBY</b> &nbsp;·&nbsp; WARMING UP
                    </div>
                    <h1 className="lb-h">
                        <em>快開場了，</em>
                        <br />
                        <span className="lb-h-ital">請點歌</span>
                        <span className="lb-h-smile">.</span>
                    </h1>
                    <p className="lb-sub">
                        阿凱還在後台調 capo，台下你先選好今晚想聽的那首。Side A 開場一過，<b>票數最高那首</b>就是今晚的第一首歌。
                    </p>
                    <div className="lb-cta-row">
                        {onPickSongs && (
                            <button type="button" className="lb-cta is-primary" onClick={onPickSongs}>
                                先點幾首歌等開場 →
                            </button>
                        )}
                        {onViewSetlist && (
                            <button type="button" className="lb-cta" onClick={onViewSetlist}>
                                看今晚歌單
                            </button>
                        )}
                    </div>
                    <div className="lb-meta-row">
                        {setlistTotal != null && <span>SIDE A · <b>{setlistTotal} TRACKS</b></span>}
                        {setlistTotal != null && catalogTotal != null && <span style={{ opacity: 0.4 }}>·</span>}
                        {catalogTotal != null && <span><em>{catalogTotal}</em> SONGS LISTED</span>}
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>TAIWAN · TAOYUAN · <b>SMES</b></span>
                    </div>
                </div>

                <div className="lb-right">
                    <div className="lb-cassette-eb">
                        <span className="lb-cassette-pulse" aria-hidden="true" /> NOW LOADING &nbsp;·&nbsp; <b>SIDE A</b>
                    </div>

                    <div className="lb-cassette" aria-hidden="true">
                        <span className="lb-cas-screw lb-cas-screw-bl" />
                        <span className="lb-cas-screw lb-cas-screw-br" />

                        <div className="lb-cas-top-label">
                            <span><b>Nº 12</b> · A</span>
                            <span style={{ textAlign: 'center' }}><em>★</em> 阿凱彈唱之夜 <em>★</em></span>
                            <span style={{ textAlign: 'right' }}>33⅓ RPM</span>
                        </div>

                        <div className="lb-cas-window">
                            <div className="lb-cas-tape" />
                            <div className="lb-cas-reel">
                                <div className="lb-cas-reel-disc" />
                            </div>
                            <div className="lb-cas-reel">
                                <div className="lb-cas-reel-disc" />
                            </div>
                            <div className="lb-cas-window-c">
                                <em>Warming up<small>SIDE A · TONIGHT</small></em>
                            </div>
                        </div>

                        <div className="lb-cas-bottom-label">
                            <span>HiFi · 60 min</span>
                            <span className="c"><em>Live in Taoyuan</em></span>
                            <span style={{ textAlign: 'right' }}>SMES · {new Date().getFullYear()}</span>
                        </div>
                    </div>

                    <div className="lb-countdown">
                        <div className="lb-countdown-lab">
                            OPENING IN &nbsp;·&nbsp; <b>{pad(minutes)}:{pad(seconds)}</b>
                        </div>
                        <div className="lb-countdown-num">
                            <span>{pad(minutes)}</span>
                            <span className="lb-countdown-sep">:</span>
                            <span>{pad(seconds)}</span>
                        </div>
                    </div>
                </div>

                {/* 黑膠堆疊 */}
                <div className="lb-stack" aria-hidden="true">
                    <div className="lb-disc lb-disc-1" />
                    <div className="lb-disc lb-disc-2" />
                    <div className="lb-disc lb-disc-3" />
                    <div className="lb-stack-cap">§ NEW RECORDS &nbsp;·&nbsp; <b>3 ALBUMS</b> on deck tonight</div>
                </div>

                {/* 觀眾人數 — 留位置但目前不顯示真實人數 */}
                <div className="lb-aud" aria-hidden="false">
                    <div className="lb-aud-lab">
                        <span className="lb-aud-dot" />HERE TONIGHT &nbsp;·&nbsp; WAITING ROOM
                    </div>
                    <div className="lb-aud-n">
                        <em>—</em>
                    </div>
                    <div className="lb-aud-from">
                        歡迎一起加入 <b>SIDE A</b>
                    </div>
                </div>
            </div>

            <div className="lb-bot" aria-hidden="true">
                <div className="lb-bot-track">
                    <span>
                        ★ 來自桃園 SMES <i>·</i> 阿凱彈唱之夜 <i>·</i> SIDE A <i>·</i> 33⅓ RPM <i>·</i>{' '}
                        Nº 12 OPENING NIGHT <i>·</i> 先點歌再等開場 <i>·</i> ALL TRACKS · COMING UP <i>·</i>
                    </span>
                    <span aria-hidden="true">
                        ★ 來自桃園 SMES <i>·</i> 阿凱彈唱之夜 <i>·</i> SIDE A <i>·</i> 33⅓ RPM <i>·</i>{' '}
                        Nº 12 OPENING NIGHT <i>·</i> 先點歌再等開場 <i>·</i> ALL TRACKS · COMING UP <i>·</i>
                    </span>
                </div>
            </div>
        </div>
    );
}

export default LobbyScreen;
