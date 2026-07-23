import { useCallback, useEffect, useRef, useState } from 'react';

interface SwState {
    updateAvailable: boolean;
    currentVersion: string | null;
}

type SwWithRegistration = ServiceWorker & { __registration?: ServiceWorkerRegistration };
const RELOAD_FALLBACK_MS = 5000;

function isSupported() {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/** 解析 SW 版本字串「4.19.13-c0080e9-ab3x」→ semver 三段 + git hash */
function parseSwVersion(v: string): { semver: [number, number, number]; hash: string } | null {
    const m = v.match(/^(\d+)\.(\d+)\.(\d+)-([0-9a-z]+)/i);
    if (!m) return null;
    return { semver: [Number(m[1]), Number(m[2]), Number(m[3])], hash: m[4] };
}

/**
 * waiting SW 是否為「真的新版本」。
 *
 * 為什麼要比對：sw.js 每次 build 都含唯一時間戳，位元組必定不同 —
 * GitHub Pages CDN 若吐出殘留的舊版 sw.js、或同一 commit 重 build，
 * 瀏覽器都會當成「更新」裝進 waiting，造成「按了立即更新又跳出來」的無限循環。
 * 判準：
 * - 版本字串完全相同 → 不是新版
 * - semver 較舊 → CDN 殘留舊版 → 不是新版
 * - semver 相同：git hash 不同才算新版（只差時間戳 = 同 code 重 build）
 * - 解析不了（格式外）→ 寬鬆放行，保底不擋真更新
 */
export function isNewerSwVersion(waitingVer: string, activeVer: string): boolean {
    if (waitingVer === activeVer) return false;
    const w = parseSwVersion(waitingVer);
    const a = parseSwVersion(activeVer);
    if (!w || !a) return true;
    for (let i = 0; i < 3; i++) {
        if (w.semver[i] > a.semver[i]) return true;
        if (w.semver[i] < a.semver[i]) return false;
    }
    return w.hash !== a.hash;
}

/** 向指定 SW（active 或 waiting 皆可）查詢版本；1.5 秒沒回應回 null（fail-open） */
function getWorkerVersion(worker: ServiceWorker): Promise<string | null> {
    return new Promise((resolve) => {
        try {
            const channel = new MessageChannel();
            const timer = setTimeout(() => resolve(null), 1500);
            channel.port1.onmessage = (e) => {
                clearTimeout(timer);
                resolve(typeof e.data?.version === 'string' ? e.data.version : null);
            };
            worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
        } catch {
            resolve(null);
        }
    });
}

export function useServiceWorkerUpdate(): SwState & { applyUpdate: () => Promise<void>; dismissUpdate: () => void } {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const waitingWorkerRef = useRef<SwWithRegistration | null>(null);
    const reloadFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isSupported()) return;

        let cancelled = false;
        let refreshing = false;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        const unregisterFns: Array<() => void> = [];

        const reveal = (worker: ServiceWorker | null, registration?: ServiceWorkerRegistration) => {
            if (cancelled) return;
            if (worker) {
                const taggedWorker = worker as SwWithRegistration;
                taggedWorker.__registration = registration;
                waitingWorkerRef.current = taggedWorker;
            }
            setDismissed(false);
            setUpdateAvailable(true);
        };

        const showUpdate = (worker: ServiceWorker | null, registration?: ServiceWorkerRegistration) => {
            if (cancelled) return;
            const active = registration?.active || navigator.serviceWorker.controller;
            if (!worker || !active) {
                reveal(worker, registration);
                return;
            }
            // 顯示前先比對 waiting vs active 版本 — 擋掉 CDN 殘留舊版 /
            // 同 code 重 build 造成的「假更新」，避免按了更新又跳出來的循環
            void Promise.all([getWorkerVersion(worker), getWorkerVersion(active)])
                .then(([waitingVer, activeVer]) => {
                    if (cancelled) return;
                    if (waitingVer && activeVer && !isNewerSwVersion(waitingVer, activeVer)) {
                        // 假更新：不顯示、也不動它。
                        // （不能默默 SKIP_WAITING — 會觸發 controllerchange 的自動 reload，
                        //   使用者頁面會無預警重新整理，比多一顆 waiting worker 更糟。）
                        return;
                    }
                    reveal(worker, registration);
                });
        };

        const watchWorker = (worker: ServiceWorker | null, registration: ServiceWorkerRegistration) => {
            if (!worker) return;
            const onStateChange = () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                    showUpdate(worker, registration);
                }
            };
            worker.addEventListener('statechange', onStateChange);
            unregisterFns.push(() => worker.removeEventListener('statechange', onStateChange));
        };

        const readVersion = (registration: ServiceWorkerRegistration) => {
            const worker = registration.active || navigator.serviceWorker.controller;
            if (!worker) return;
            const channel = new MessageChannel();
            channel.port1.onmessage = (e) => {
                if (e.data?.version && !cancelled) setCurrentVersion(e.data.version);
            };
            worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
        };

        const inspectRegistration = (registration: ServiceWorkerRegistration | null | undefined) => {
            if (!registration || cancelled) return;
            readVersion(registration);

            if (registration.waiting && navigator.serviceWorker.controller) {
                showUpdate(registration.waiting, registration);
            }

            watchWorker(registration.installing, registration);

            const onUpdateFound = () => {
                watchWorker(registration.installing, registration);
            };
            registration.addEventListener('updatefound', onUpdateFound);
            unregisterFns.push(() => registration.removeEventListener('updatefound', onUpdateFound));
        };

        const checkForUpdate = () => {
            navigator.serviceWorker.getRegistration()
                .then((registration) => registration?.update().then(() => registration) ?? null)
                .then(inspectRegistration)
                .catch(() => {});
        };

        navigator.serviceWorker.ready.then(inspectRegistration).catch(() => {});
        navigator.serviceWorker.getRegistration().then(inspectRegistration).catch(() => {});

        window.setTimeout(checkForUpdate, 5000);
        intervalId = setInterval(checkForUpdate, 3 * 60 * 1000);

        const onFocus = () => checkForUpdate();
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') checkForUpdate();
        };
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) checkForUpdate();
        };
        const onOnline = () => checkForUpdate();
        const onControllerChange = () => {
            if (refreshing) return;
            refreshing = true;
            if (reloadFallbackRef.current) {
                clearTimeout(reloadFallbackRef.current);
                reloadFallbackRef.current = null;
            }
            window.location.reload();
        };
        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === 'SW_ACTIVATED' && event.data?.version) {
                setCurrentVersion(event.data.version);
            }
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('online', onOnline);
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        navigator.serviceWorker.addEventListener('message', onMessage);

        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
            unregisterFns.forEach((fn) => fn());
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('online', onOnline);
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            navigator.serviceWorker.removeEventListener('message', onMessage);
            if (reloadFallbackRef.current) {
                clearTimeout(reloadFallbackRef.current);
                reloadFallbackRef.current = null;
            }
        };
    }, []);

    const applyUpdate = useCallback(async () => {
        if (!isSupported()) {
            window.location.reload();
            return;
        }

        if (reloadFallbackRef.current) clearTimeout(reloadFallbackRef.current);
        // iOS Safari 偶爾不送 controllerchange；不能讓更新 UI 永久等待。
        reloadFallbackRef.current = setTimeout(() => {
            reloadFallbackRef.current = null;
            window.location.reload();
        }, RELOAD_FALLBACK_MS);

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) await registration.update().catch(() => registration);

            const referencedWorker = waitingWorkerRef.current;
            const waitingWorker = registration?.waiting
                ?? (referencedWorker?.state === 'installed' ? referencedWorker : null);

            if (waitingWorker) {
                waitingWorkerRef.current = waitingWorker as SwWithRegistration;
                waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                return;
            }

            // waiting worker 已經自行啟用、但 Safari 漏掉事件時，直接重載即可接上新版。
            window.location.reload();
        } catch {
            window.location.reload();
        }
    }, []);

    const dismissUpdate = useCallback(() => {
        setDismissed(true);
    }, []);

    return { updateAvailable: updateAvailable && !dismissed, currentVersion, applyUpdate, dismissUpdate };
}
