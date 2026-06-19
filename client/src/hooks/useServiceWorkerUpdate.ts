import { useCallback, useEffect, useRef, useState } from 'react';

interface SwState {
    updateAvailable: boolean;
    currentVersion: string | null;
}

type SwWithRegistration = ServiceWorker & { __registration?: ServiceWorkerRegistration };

function isSupported() {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function useServiceWorkerUpdate(): SwState & { applyUpdate: () => void; dismissUpdate: () => void } {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const waitingWorkerRef = useRef<SwWithRegistration | null>(null);

    useEffect(() => {
        if (!isSupported()) return;

        let cancelled = false;
        let refreshing = false;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        const unregisterFns: Array<() => void> = [];

        const showUpdate = (worker: ServiceWorker | null, registration?: ServiceWorkerRegistration) => {
            if (cancelled) return;
            if (worker) {
                const taggedWorker = worker as SwWithRegistration;
                taggedWorker.__registration = registration;
                waitingWorkerRef.current = taggedWorker;
            }
            setDismissed(false);
            setUpdateAvailable(true);
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
        };
    }, []);

    const applyUpdate = useCallback(() => {
        const waitingWorker = waitingWorkerRef.current;
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            return;
        }

        navigator.serviceWorker?.getRegistration()
            .then((registration) => {
                if (registration?.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                } else {
                    window.location.reload();
                }
            })
            .catch(() => window.location.reload());
    }, []);

    const dismissUpdate = useCallback(() => {
        setDismissed(true);
    }, []);

    return { updateAvailable: updateAvailable && !dismissed, currentVersion, applyUpdate, dismissUpdate };
}
