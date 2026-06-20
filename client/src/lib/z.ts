/**
 * z-index layer contract — mirrors CSS --z-* custom properties in editorial-base.css.
 * Use for `style={{ zIndex: Z.foo }}` when a Tailwind class isn't an option.
 * Keep in sync with :root in editorial-base.css.
 */
export const Z = {
  bottombar:    45,    // --z-bottombar   : un-bar sticky 底部隊列條
  fab:          50,    // --z-fab         : 右下 FAB stack、NowPlaying toast、PWA 安裝提示
  watermark:    55,    // --z-watermark   : 左下版本浮水印
  voteFeedback: 70,    // --z-vote-feedback: VoteOverlay 投票回饋
  queueModal:   80,    // --z-queue-modal : 隊列 modal、全螢幕看譜
  toast:        100,   // --z-toast       : shadcn toast、Tooltip、NetworkStatus banner
  modalOverlay: 120,   // --z-modal-overlay: modal 遮罩
  modalContent: 130,   // --z-modal-content: modal 內容
  overlayAnim:  9997,  // --z-overlay-anim : 慶祝動畫基礎（DarkHorse = +1, Credits = +2）
  updatePrompt: 10000, // --z-update-prompt: PWA 更新提示卡帶（蓋過所有動畫）
  print:        99999, // --z-print        : 列印模式遮層
} as const;
