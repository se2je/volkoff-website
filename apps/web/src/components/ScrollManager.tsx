import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const keyOf = (k: string) => `vk-scroll:${k}`;

const store = (key: string, y: number) => {
    try {
        sessionStorage.setItem(keyOf(key), String(Math.round(y)));
    } catch {
        /* приватный режим */
    }
};

const load = (key: string) => {
    try {
        return Number(sessionStorage.getItem(keyOf(key)) ?? 0) || 0;
    } catch {
        return 0;
    }
};

/**
 * Запоминает позицию скролла для каждой записи истории и восстанавливает её при «назад/вперёд».
 * Новый переход (PUSH) — наверх; смена фильтров (REPLACE) — скролл не трогаем.
 */
const ScrollManager: React.FC = () => {
    const location = useLocation();
    const navType = useNavigationType();
    // Первая запись истории всегда имеет key «default» — добавляем путь, чтобы разные страницы не путались
    const entryKey = `${location.key}:${location.pathname}${location.search}`;
    const currentKey = useRef(entryKey);
    const lastY = useRef(0);

    useEffect(() => {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        const onScroll = () => {
            lastY.current = window.scrollY;
            store(currentKey.current, lastY.current);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        // Страховка: любой переход начинается с клика — фиксируем позицию до смены страницы
        // (события scroll приходят раз в кадр и могут не успеть)
        document.addEventListener('click', onScroll, { capture: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('click', onScroll, { capture: true });
        };
    }, []);

    useLayoutEffect(() => {
        // Сохраняем позицию уходящей страницы до того, как новая страница её «обрежет»
        if (currentKey.current !== entryKey) store(currentKey.current, lastY.current);
        currentKey.current = entryKey;

        if (navType === 'PUSH') {
            window.scrollTo({ top: 0, behavior: 'instant' });
            lastY.current = 0;
            return;
        }
        if (navType !== 'POP') return;

        const target = load(entryKey);
        // Контент (каталог, картинки) может дорисовываться — повторяем, пока не доскроллим,
        // но сдаёмся, если пользователь сам начал скроллить, или через ~2 секунды
        let cancelled = false;
        let tries = 0;
        let timer = 0;
        const stop = () => {
            cancelled = true;
        };
        const attempt = () => {
            if (cancelled) return;
            window.scrollTo({ top: target, behavior: 'instant' });
            if (Math.abs(window.scrollY - target) > 2 && tries++ < 60) timer = window.setTimeout(attempt, 33);
        };
        window.addEventListener('wheel', stop, { passive: true, once: true });
        window.addEventListener('touchstart', stop, { passive: true, once: true });
        attempt();
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            window.removeEventListener('wheel', stop);
            window.removeEventListener('touchstart', stop);
        };
    }, [entryKey, navType]);

    return null;
};

export default ScrollManager;
