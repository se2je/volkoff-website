import { ACHIEVEMENTS, type AchievementKey } from '@volkoff/shared';
import { api } from '@/api/client';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import i18n from '@/i18n';

// Клиентские достижения: сначала копятся в браузере (можно открыть и без аккаунта),
// при входе — уезжают на бэк и остаются за человеком.
const KEY = 'vk_achievements';

const readLocal = (): AchievementKey[] => {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
        return [];
    }
};

const writeLocal = (keys: AchievementKey[]) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(keys));
    } catch {
        /* приватный режим — живём без памяти */
    }
};

const push = (keys: AchievementKey[]) => {
    if (!useAuth.getState().user || keys.length === 0) return;
    void api('/me/achievements', { body: { keys } }).catch(() => undefined);
};

export const unlock = (key: AchievementKey) => {
    const local = readLocal();
    if (local.includes(key)) return;
    writeLocal([...local, key]);
    const a = ACHIEVEMENTS.find((x) => x.key === key);
    if (a) toast(`[${a.icon}] ${i18n.t('achievements.unlocked')}: ${i18n.language.startsWith('en') ? a.title.en : a.title.ru}`, 'acid');
    push([key]);
};

/** После входа досылаем всё, что открыли до него */
export const syncAchievements = () => push(readLocal());

// Вошёл в аккаунт — досылаем открытое без него
useAuth.subscribe((s, prev) => {
    if (s.user && !prev.user) syncAchievements();
});
