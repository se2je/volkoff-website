import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import type { ProductDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { SITE_URL } from '@/config/site';
import { qrSvg } from '@/lib/qr';
import styles from './Admin.module.scss';
import qr from './QrPage.module.scss';

type Mode = 'single' | 'sheet';
type BrandFont = 'display' | 'mono' | 'body';

const FONTS: { key: BrandFont; label: string; family: string }[] = [
    { key: 'display', label: 'как в логотипе', family: "'Norway', 'Manrope', sans-serif" },
    { key: 'mono', label: 'моно', family: "'IBM Plex Mono', 'Courier New', monospace" },
    { key: 'body', label: 'гротеск', family: "'Manrope', sans-serif" },
];
const familyOf = (key: BrandFont) => FONTS.find((f) => f.key === key)!.family;

/** Выпадашка шрифта */
const FontSelect: React.FC<{ label: string; value: BrandFont; onChange: (v: BrandFont) => void }> = ({ label, value, onChange }) => (
    <label className="field">
        <span className="field__label">{label}</span>
        <select className="input" value={value} onChange={(e) => onChange(e.target.value as BrandFont)}>
            {FONTS.map((f) => (
                <option key={f.key} value={f.key}>
                    {f.label}
                </option>
            ))}
        </select>
    </label>
);

const PRESETS = [
    { label: 'главная', path: '/' },
    { label: 'каталог', path: '/catalog' },
    { label: 'новинки', path: '/catalog?sort=new' },
    { label: 'стая', path: '/pack' },
    { label: 'новости', path: '/news' },
];

// A4 с полями 10 мм — сколько наклеек влезает
const PAGE = { w: 190, h: 277 };
const STICKER_GAP = 6;

/** Ползунок с числом рядом */
const Range: React.FC<{ label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }> = ({
    label,
    value,
    min,
    max,
    step = 1,
    unit,
    onChange,
}) => (
    <label className="field">
        <span className="field__label">
            {label}: {value}
            {unit && ` ${unit}`}
        </span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
);

/** QR-код с волком: один крупный с названием бренда или лист наклеек на A4 */
const QrPage: React.FC = () => {
    const [mode, setMode] = useState<Mode>('single');
    const [url, setUrl] = useState(`${SITE_URL}/`);
    const [brand, setBrand] = useState('VOLKOFF');
    const [showUrl, setShowUrl] = useState(true);
    const [singleCm, setSingleCm] = useState(12);
    const [stickerCm, setStickerCm] = useState(4);
    const [caption, setCaption] = useState('VOLKOFF_');
    // тонкая настройка надписей
    const [brandMm, setBrandMm] = useState(26);
    const [brandFont, setBrandFont] = useState<BrandFont>('display');
    const [line, setLine] = useState('');
    const [lineMm, setLineMm] = useState(4);
    const [gapMm, setGapMm] = useState(6);
    const [captionSize, setCaptionSize] = useState(2.6);
    const [lineFont, setLineFont] = useState<BrandFont>('mono');
    const [captionFont, setCaptionFont] = useState<BrandFont>('mono');

    const { data: products } = useQuery({ queryKey: ['admin', 'products'], queryFn: () => api<ProductDto[]>('/admin/products') });

    const target = url.trim() || `${SITE_URL}/`;
    const single = useMemo(() => qrSvg(target), [target]);
    const sticker = useMemo(() => qrSvg(target, { caption: caption.trim(), captionSize, captionFont: familyOf(captionFont) }), [target, caption, captionSize, captionFont]);

    const mm = stickerCm * 10;
    const cols = Math.max(1, Math.floor((PAGE.w + STICKER_GAP) / (mm + STICKER_GAP)));
    const rows = Math.max(1, Math.floor((PAGE.h + STICKER_GAP) / (mm * sticker.aspect + STICKER_GAP)));
    const count = cols * rows;

    const download = () => {
        const blob = new Blob([single.svg], { type: 'image/svg+xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `volkoff-qr-${target.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '')}.svg`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const shortUrl = target.replace(/^https?:\/\//, '').replace(/\/$/, '');

    return (
        <>
            <div className={styles.titleRow}>
                <h1 className={styles.title}>qr-код</h1>
                <div className={qr.actions}>
                    <button className="btn btn--ghost" onClick={download}>
                        <Download size={14} /> svg
                    </button>
                    <button className="btn" onClick={() => window.print()}>
                        <Printer size={14} /> печать
                    </button>
                </div>
            </div>

            <div className={qr.layout}>
                <section className={`card-box ${qr.controls}`} style={{ background: '#fff' }}>
                    <div className={qr.modes}>
                        <button className={`tag-btn ${mode === 'single' ? 'is-active' : ''}`} onClick={() => setMode('single')}>
                            один + название
                        </button>
                        <button className={`tag-btn ${mode === 'sheet' ? 'is-active' : ''}`} onClick={() => setMode('sheet')}>
                            лист наклеек
                        </button>
                    </div>

                    <label className="field">
                        <span className="field__label">куда ведёт</span>
                        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
                    </label>
                    <div className={qr.presets}>
                        {PRESETS.map((p) => (
                            <button key={p.path} className="tag-btn" onClick={() => setUrl(`${SITE_URL}${p.path}`)}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <label className="field">
                        <span className="field__label">или на товар</span>
                        <select className="input" value="" onChange={(e) => e.target.value && setUrl(`${SITE_URL}/product/${e.target.value}`)}>
                            <option value="">— выбрать —</option>
                            {products?.map((p) => (
                                <option key={p.id} value={p.slug}>
                                    {p.code} · {p.name.ru}
                                </option>
                            ))}
                        </select>
                    </label>

                    {mode === 'single' ? (
                        <>
                            <label className="field">
                                <span className="field__label">название под кодом</span>
                                <input className="input" maxLength={40} value={brand} onChange={(e) => setBrand(e.target.value)} />
                            </label>
                            <label className="field">
                                <span className="field__label">размер кода</span>
                                <select className="input" value={singleCm} onChange={(e) => setSingleCm(Number(e.target.value))}>
                                    {[6, 8, 12, 16].map((c) => (
                                        <option key={c} value={c}>
                                            {c} см
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <Range label="размер названия" value={brandMm} min={6} max={60} unit="мм" onChange={setBrandMm} />
                            <FontSelect label="шрифт названия" value={brandFont} onChange={setBrandFont} />
                            <label className="check">
                                <input type="checkbox" checked={showUrl} onChange={(e) => setShowUrl(e.target.checked)} />
                                строка под названием
                            </label>
                            {showUrl && (
                                <>
                                    <label className="field">
                                        <span className="field__label">текст строки (пусто — адрес ссылки)</span>
                                        <input className="input" maxLength={60} placeholder={shortUrl} value={line} onChange={(e) => setLine(e.target.value)} />
                                    </label>
                                    <FontSelect label="шрифт строки" value={lineFont} onChange={setLineFont} />
                                    <Range label="размер строки" value={lineMm} min={2} max={16} step={0.5} unit="мм" onChange={setLineMm} />
                                </>
                            )}
                            <Range label="отступ от кода" value={gapMm} min={0} max={30} unit="мм" onChange={setGapMm} />
                        </>
                    ) : (
                        <>
                            <label className="field">
                                <span className="field__label">подпись под каждым (можно пусто)</span>
                                <input className="input" maxLength={24} value={caption} onChange={(e) => setCaption(e.target.value)} />
                            </label>
                            <label className="field">
                                <span className="field__label">размер наклейки</span>
                                <select className="input" value={stickerCm} onChange={(e) => setStickerCm(Number(e.target.value))}>
                                    {[2.5, 3, 4, 5, 6].map((c) => (
                                        <option key={c} value={c}>
                                            {c} см
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {caption.trim() && (
                                <>
                                    <FontSelect label="шрифт подписи" value={captionFont} onChange={setCaptionFont} />
                                    <Range label="размер подписи" value={captionSize} min={1.5} max={5} step={0.1} unit="" onChange={setCaptionSize} />
                                </>
                            )}
                            <p className="mono muted" style={{ fontSize: 12, margin: 0 }}>
                                на листе A4: {count} шт. ({cols} × {rows})
                            </p>
                        </>
                    )}
                    <p className="mono muted" style={{ fontSize: 11, margin: 0 }}>
                        меньше 2,5 см телефоны читают хуже. перед тиражом проверь камерой распечатку.
                    </p>
                </section>

                {/* превью = то, что уйдёт на печать (A4 в масштабе) */}
                <div className={qr.paperWrap}>
                    <div className={`${qr.paper} ${qr.printArea}`}>
                        {mode === 'single' ? (
                            <div className={qr.single} style={{ gap: `${gapMm}mm` }}>
                                <div className={qr.code} style={{ width: `${singleCm * 10}mm` }} dangerouslySetInnerHTML={{ __html: single.svg }} />
                                {brand.trim() && (
                                    <div className={`${qr.brand} ${qr[`font_${brandFont}`]}`} style={{ fontSize: `${brandMm}mm` }}>
                                        {brand}
                                    </div>
                                )}
                                {showUrl && (
                                    <div className={`${qr.url} ${qr[`font_${lineFont}`]}`} style={{ fontSize: `${lineMm}mm`, marginTop: `${-gapMm / 2}mm` }}>
                                        {line.trim() || shortUrl}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={qr.sheet} style={{ gridTemplateColumns: `repeat(${cols}, ${mm}mm)`, gap: `${STICKER_GAP}mm` }}>
                                {Array.from({ length: count }, (_, i) => (
                                    <div key={i} className={qr.code} style={{ width: `${mm}mm` }} dangerouslySetInnerHTML={{ __html: sticker.svg }} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default QrPage;
