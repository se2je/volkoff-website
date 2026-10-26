import React, { Suspense, lazy, useEffect, useState } from 'react';
import { WOLF_GAME_EVENT, type WolfGameMode } from '@/lib/wolfFun';

// Игра грузится отдельным чанком только когда её открыли
const WolfGame = lazy(() => import('./WolfGame'));

const WolfGameHost: React.FC = () => {
    const [mode, setMode] = useState<WolfGameMode | null>(null);
    useEffect(() => {
        const show = (e: Event) => setMode((e as CustomEvent<WolfGameMode>).detail ?? 'run');
        window.addEventListener(WOLF_GAME_EVENT, show);
        return () => window.removeEventListener(WOLF_GAME_EVENT, show);
    }, []);
    if (!mode) return null;
    return (
        <Suspense fallback={null}>
            <WolfGame key={mode} mode={mode} onClose={() => setMode(null)} />
        </Suspense>
    );
};

export default WolfGameHost;
