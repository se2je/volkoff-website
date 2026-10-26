// Полнолуние без API: возраст Луны от известного новолуния (06.01.2000 18:14 UTC)
const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export const moonAge = (at = Date.now()) => {
    const days = (at - KNOWN_NEW_MOON) / 86_400_000;
    return ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
};

/** Полнолуние — плюс-минус сутки от середины цикла */
export const isFullMoon = (at = Date.now()) => Math.abs(moonAge(at) - SYNODIC_DAYS / 2) < 1;
