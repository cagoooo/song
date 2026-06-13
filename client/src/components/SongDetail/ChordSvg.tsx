// 和弦指型圖 — 6 弦 × 5 格 SVG，依照設計檔 sd-page.jsx 規格
import type { ChordFingering } from './data';

interface ChordSvgProps {
    dots: ChordFingering['dots'];
    /** 把位：dots 的 1 = 第 baseFret 格；>1 時頂線改細線並標示把位數字 */
    baseFret?: number;
}

/**
 * 弦索引：6 = 低音 E（最左/粗）→ 1 = 高音 E（最右/細）
 * dots 值：number = fret 數（1-5）/ 0 = 開放弦 / 'x' = 不彈
 */
export function ChordSvg({ dots, baseFret = 1 }: ChordSvgProps) {
    const W = 80;
    const H = 100;
    const left = baseFret > 1 ? 20 : 8; // 高把位左側留空標把位數字
    const right = W - 8;
    const top = 18;
    const bottom = 88;
    const strings = 6;
    const frets = 5;

    const stringX = (s: number) => left + ((6 - s) / (strings - 1)) * (right - left);
    const fretY = (f: number) => top + (f / frets) * (bottom - top);

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="sdp-chord-svg"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
        >
            {/* nut (頂部粗黑線)；高把位時改細線 + 把位數字 */}
            <line
                className="sdp-nut"
                x1={left} y1={top}
                x2={right} y2={top}
                stroke="#111"
                strokeWidth={baseFret > 1 ? 1 : 3}
                opacity={baseFret > 1 ? 0.5 : 1}
                strokeLinecap="butt"
            />
            {baseFret > 1 && (
                <text
                    x={left - 4}
                    y={top + ((0.5) / frets) * (bottom - top) + 3}
                    textAnchor="end"
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="9"
                    fontWeight="600"
                    fill="#111"
                >
                    {baseFret}
                </text>
            )}
            {/* fret lines */}
            {Array.from({ length: frets }).map((_, i) => (
                <line
                    key={`fret-${i}`}
                    x1={left} y1={fretY(i + 1)}
                    x2={right} y2={fretY(i + 1)}
                    stroke="#111"
                    strokeWidth="1"
                    opacity="0.5"
                />
            ))}
            {/* strings (6 條) */}
            {Array.from({ length: strings }).map((_, i) => (
                <line
                    key={`string-${i}`}
                    x1={stringX(i + 1)} y1={top}
                    x2={stringX(i + 1)} y2={bottom}
                    stroke="#111"
                    strokeWidth="1"
                    opacity="0.5"
                />
            ))}
            {/* 標示：x / 0 / fret 數 */}
            {([1, 2, 3, 4, 5, 6] as const).map((s) => {
                const v = dots[s];
                const x = stringX(s);
                if (v === 'x') {
                    return (
                        <text
                            key={`m-${s}`}
                            x={x} y={top - 5}
                            textAnchor="middle"
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="10"
                            fontWeight="500"
                            fill="#111"
                        >
                            ×
                        </text>
                    );
                }
                if (v === 0) {
                    return (
                        <circle
                            key={`o-${s}`}
                            className="sdp-open"
                            cx={x} cy={top - 7}
                            r={3.5}
                            fill="transparent"
                            stroke="#111"
                            strokeWidth="1.4"
                        />
                    );
                }
                // fretted (1-5)
                const y = top + ((v - 0.5) / frets) * (bottom - top);
                return (
                    <circle
                        key={`d-${s}`}
                        className="sdp-dot"
                        cx={x} cy={y}
                        r={5}
                        fill="#2b4dff"
                    />
                );
            })}
        </svg>
    );
}
