import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LayoutGrid, Rows3, X } from 'lucide-react';
import { useCategories, useFacets, useProducts } from '@/api/queries';
import ProductCard from '@/components/ProductCard/ProductCard';
import NewsSlider from '@/components/NewsSlider/NewsSlider';
import { useFmt, useSiteText } from '@/lib/format';
import { usePrefs } from '@/store/prefs';
import styles from './CatalogPage.module.scss';

const SORTS = ['manual', 'new', 'price_asc', 'price_desc'] as const;

const CatalogPage: React.FC = () => {
    const { t } = useTranslation();
    const { l, currency } = useFmt();
    const { view, setView } = usePrefs();
    const text = useSiteText();
    const [params, setParams] = useSearchParams();

    const category = params.get('category') ?? undefined;
    const size = params.get('size') ?? undefined;
    const q = params.get('q') ?? '';
    const sort = params.get('sort') ?? 'manual';
    const inStock = params.get('inStock') === '1';
    const min = params.get('min') ? Number(params.get('min')) : undefined;
    const max = params.get('max') ? Number(params.get('max')) : undefined;

    // Сколько «дополнительных» фильтров активно — показываем на кнопке «фильтры»
    const activeFilters = [size, inStock || undefined, min, max, sort !== 'manual' ? sort : undefined].filter(Boolean).length;
    // Панель фильтров свёрнута; если пришли по ссылке с фильтрами — сразу открыта
    const [filtersOpen, setFiltersOpen] = useState(activeFilters > 0);

    const [search, setSearch] = useState(q);
    useEffect(() => setSearch(q), [q]);

    const update = (patch: Record<string, string | undefined>) => {
        const next = new URLSearchParams(params);
        for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '') next.delete(k);
            else next.set(k, v);
        }
        setParams(next, { replace: true });
    };

    // Поиск с небольшой задержкой, чтобы не дёргать API на каждую букву
    useEffect(() => {
        if (search === q) return;
        const id = setTimeout(() => update({ q: search || undefined }), 300);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const { data: categories } = useCategories();
    const { data: facets } = useFacets();
    const { data: products, isLoading, isFetching } = useProducts({ category, size, q, min, max, inStock, sort, currency });

    const hasFilters = !!(category || size || q || inStock || min || max || sort !== 'manual');
    const symbol = currency === 'RUB' ? '₽' : '$';

    return (
        <div className={`container ${styles.page}`}>
            <NewsSlider />
            <header className={styles.hero}>
                <h1 className={styles.bigWord}>
                    {t('catalog.title')}
                    <sup>{products?.length ?? ''}</sup>
                </h1>
                <p className={styles.lead}>{text('catalog.lead')}</p>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.cats}>
                    <button className={`tag-btn ${!category ? 'is-active' : ''}`} onClick={() => update({ category: undefined })}>
                        {t('catalog.all')}
                    </button>
                    {categories?.map((c) => (
                        <button
                            key={c.id}
                            className={`tag-btn ${category === c.slug ? 'is-active' : ''}`}
                            onClick={() => update({ category: category === c.slug ? undefined : c.slug })}
                        >
                            {l(c.name)}
                            {c.productCount ? <sup>{c.productCount}</sup> : null}
                        </button>
                    ))}
                </div>

                <div className={styles.tools}>
                    <input
                        className={`input ${styles.search}`}
                        placeholder={t('catalog.search')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label={t('catalog.search')}
                    />
                    <button
                        className={`${styles.filterToggle} ${filtersOpen ? styles.filterToggleOn : ''}`}
                        onClick={() => setFiltersOpen((v) => !v)}
                        aria-expanded={filtersOpen}
                    >
                        {t('catalog.filters')}
                        {activeFilters > 0 && <sup>{activeFilters}</sup>}
                        <ChevronDown size={14} strokeWidth={1.5} className={styles.chevron} />
                    </button>
                    <div className={styles.viewToggle}>
                        <button
                            className={view === 'grid' ? styles.on : ''}
                            onClick={() => setView('grid')}
                            title={t('catalog.viewGrid')}
                            aria-label={t('catalog.viewGrid')}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            className={view === 'big' ? styles.on : ''}
                            onClick={() => setView('big')}
                            title={t('catalog.viewBig')}
                            aria-label={t('catalog.viewBig')}
                        >
                            <Rows3 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={`${styles.filters} ${filtersOpen ? styles.filtersOpen : ''}`}>
                <div className={styles.group}>
                    <span className={styles.groupLabel}>{t('catalog.sizes')}</span>
                    {facets?.sizes.map((s) => (
                        <button
                            key={s}
                            className={`tag-btn ${size === s ? 'is-active' : ''}`}
                            onClick={() => update({ size: size === s ? undefined : s })}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className={styles.group}>
                    <span className={styles.groupLabel}>
                        {t('catalog.price')}, {symbol}
                    </span>
                    <input
                        className={`input ${styles.priceInput}`}
                        type="number"
                        min={0}
                        placeholder={`${t('catalog.from')} ${facets?.priceRange[currency][0] ?? ''}`}
                        value={min ?? ''}
                        onChange={(e) => update({ min: e.target.value || undefined })}
                    />
                    <span>—</span>
                    <input
                        className={`input ${styles.priceInput}`}
                        type="number"
                        min={0}
                        placeholder={`${t('catalog.to')} ${facets?.priceRange[currency][1] ?? ''}`}
                        value={max ?? ''}
                        onChange={(e) => update({ max: e.target.value || undefined })}
                    />
                </div>
                <label className="check">
                    <input type="checkbox" checked={inStock} onChange={(e) => update({ inStock: e.target.checked ? '1' : undefined })} />
                    {t('catalog.inStock')}
                </label>
                <div className={styles.group}>
                    {SORTS.map((s) => (
                        <button
                            key={s}
                            className={`tag-btn ${sort === s ? 'is-active' : ''}`}
                            onClick={() => update({ sort: s === 'manual' ? undefined : s })}
                        >
                            {t(`catalog.sort.${s}`)}
                        </button>
                    ))}
                </div>
                {hasFilters && (
                    <button className={styles.reset} onClick={() => setParams({}, { replace: true })}>
                        <X size={14} /> {t('catalog.reset')}
                    </button>
                )}
            </div>

            <div className={styles.meta}>
                <span>{products ? t('catalog.count', { count: products.length }) : ' '}</span>
                {isFetching && !isLoading && <span className={styles.fetching}>///</span>}
            </div>

            {isLoading ? (
                <div className="spinner">{t('common.loading')}</div>
            ) : products?.length === 0 ? (
                <div className={styles.empty}>
                    <span>😡</span>
                    <p>{t('catalog.empty')}</p>
                    <button className="btn btn--ghost" onClick={() => setParams({}, { replace: true })}>
                        {t('catalog.reset')}
                    </button>
                </div>
            ) : (
                <div className={view === 'big' ? styles.gridBig : styles.grid}>
                    {products?.map((p, i) => (
                        <ProductCard key={p.id} product={p} variant={view} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CatalogPage;
