import { useEffect, useState } from 'react';
import { subscribeLobbyState, type LobbyStateInfo } from '@/lib/firestore';

export function useLobbyState(): LobbyStateInfo | null {
    const [state, setState] = useState<LobbyStateInfo | null>(null);
    useEffect(() => {
        const unsub = subscribeLobbyState(setState);
        return () => unsub();
    }, []);
    return state;
}
