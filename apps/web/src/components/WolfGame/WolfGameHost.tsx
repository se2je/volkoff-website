import React, { Suspense, lazy, useEffect, useState } from 'react';
import { WOLF_GAME_EVENT } from '@/lib/wolfFun';

// Игра грузится отдельным чанком только когда её открыли
const WolfGame = lazy(() => import('./WolfGame'));

const WolfGameHost: React.FC = () => {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const show = () => setOpen(true);
        window.addEventListener(WOLF_GAME_EVENT, show);
        return () => window.removeEventListener(WOLF_GAME_EVENT, show);
    }, []);
    if (!open) return null;
    return (
        <Suspense fallback={null}>
            <WolfGame onClose={() => setOpen(false)} />
        </Suspense>
    );
};

export default WolfGameHost;
