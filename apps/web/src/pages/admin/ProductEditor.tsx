import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Trash2, Upload } from 'lucide-react';
import {
    PRODUCT_STATUSES,
    SIZE_PRESETS,
    type CategoryDto,
    type ProductDto,
    type ProductStatus,
    type ProductUpsertInput,
} from '@volkoff/shared';
import { api, ApiError } from '@/api/client';
import ProductCard from '@/components/ProductCard/ProductCard';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import { PRODUCT_STATUS_LABEL } from './labels';
import styles from './Admin.module.scss';

interface FormState {
    slug: string;
    code: string;
    nameRu: string;
    nameEn: string;
    descRu: string;
    descEn: string;
    /** в рублях / долларах — в копейки/центы переводим при сохранении */
    priceRub: string;
    priceUsd: string;
    categoryId: string;
    tags: string;
    status: ProductStatus;
    isFeatured: boolean;
    sortOrder: number;
    images: { id?: string; url: string; alt?: string | null }[];
    variants: { id?: string; size: string; stock: number }[];
}

const EMPTY: FormState = {
    slug: '',
    code: '',
    nameRu: '',
    nameEn: '',
    descRu: '',
    descEn: '',
    priceRub: '',
    priceUsd: '',
    categoryId: '',
    tags: '',
    status: 'DRAFT',
    isFeatured: false,
    sortOrder: 0,
    images: [],
    variants: [{ size: 'M', stock: 1 }],
};

const fromProduct = (p: ProductDto): FormState => ({
    slug: p.slug,
    code: p.code,
    nameRu: p.name.ru,
    nameEn: p.name.en,
    descRu: p.description.ru,
    descEn: p.description.en,
    priceRub: String(p.priceRub / 100),
    priceUsd: String(p.priceUsd / 100),
    categoryId: p.category?.id ?? '',
    tags: p.tags.map((t) => `#${t}`).join(' '),
    status: p.status,
    isFeatured: p.isFeatured,
    sortOrder: p.sortOrder,
    images: p.images,
    variants: p.variants.map((v) => ({ id: v.id, size: v.size, stock: v.stock })),
});

const toMinor = (v: string) => Math.round(Number(v.replace(',', '.').replace(/\s/g, '')) * 100) || 0;

const ProductEditor: React.FC = () => {
    const { id } = useParams();
    const isNew = !id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInput = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(0);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const { data: product, isError } = useQuery({
        queryKey: ['admin', 'product', id],
        queryFn: () => api<ProductDto>(`/admin/products/${id}`),
        enabled: !isNew,
    });
    const { data: categories } = useQuery({
        queryKey: ['admin', 'categories'],
        queryFn: () => api<CategoryDto[]>('/admin/categories'),
    });

    useEffect(() => {
        if (product) setForm(fromProduct(product));
    }, [product]);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

    const payload: ProductUpsertInput = {
        slug: form.slug || undefined,
        code: form.code || undefined,
        name: { ru: form.nameRu, en: form.nameEn },
        description: { ru: form.descRu, en: form.descEn },
        priceRub: toMinor(form.priceRub),
        priceUsd: toMinor(form.priceUsd),
        categoryId: form.categoryId || null,
        tags: form.tags
            .split(/[\s,]+/)
            .map((t) => t.replace(/^#/, '').trim())
            .filter(Boolean),
        status: form.status,
        isFeatured: form.isFeatured,
        sortOrder: Number(form.sortOrder) || 0,
        images: form.images.map((i) => ({ url: i.url, alt: i.alt ?? null })),
        variants: form.variants.filter((v) => v.size.trim()).map((v) => ({ size: v.size.trim(), stock: Number(v.stock) || 0 })),
    };

    // Превью карточки в реальном времени — то, что увидит покупатель
    const preview: ProductDto = useMemo(() => {
        const category = categories?.find((c) => c.id === form.categoryId) ?? null;
        return {
            id: product?.id ?? 'preview',
            slug: form.slug || 'preview',
            code: form.code || 'VK-???',
            name: payload.name,
            description: payload.description,
            priceRub: payload.priceRub,
            priceUsd: payload.priceUsd,
            category,
            tags: payload.tags,
            status: form.status,
            isFeatured: form.isFeatured,
            sortOrder: payload.sortOrder,
            images: form.images.map((img, i) => ({ id: img.id ?? String(i), url: img.url, alt: img.alt ?? null })),
            variants: payload.variants.map((v, i) => ({ id: String(i), ...v })),
            inStock: payload.variants.some((v) => v.stock > 0),
            createdAt: '',
            updatedAt: '',
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, categories, product]);

    const upload = async (files: FileList | null) => {
        if (!files?.length) return;
        for (const file of Array.from(files)) {
            setUploading((n) => n + 1);
            try {
                const fd = new FormData();
                fd.append('file', file);
                const { url } = await api<{ url: string }>('/admin/uploads', { form: fd });
                setForm((f) => ({ ...f, images: [...f.images, { url, alt: f.nameEn || null }] }));
            } catch (err) {
                toast(`${file.name}: ${errorText(i18n.t, err)}`, 'error');
            } finally {
                setUploading((n) => n - 1);
            }
        }
        if (fileInput.current) fileInput.current.value = '';
    };

    const moveImage = (i: number, dir: -1 | 1) =>
        setForm((f) => {
            const images = [...f.images];
            const j = i + dir;
            if (j < 0 || j >= images.length) return f;
            [images[i], images[j]] = [images[j], images[i]];
            return { ...f, images };
        });

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            const saved = await api<ProductDto>(isNew ? '/admin/products' : `/admin/products/${id}`, {
                method: isNew ? 'POST' : 'PUT',
                body: payload,
            });
            toast(`сохранено: ${saved.code} ${saved.name.ru}`, 'acid');
            void queryClient.invalidateQueries({ queryKey: ['admin'] });
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            void queryClient.invalidateQueries({ queryKey: ['facets'] });
            void queryClient.invalidateQueries({ queryKey: ['categories'] });
            if (isNew) navigate(`/admin/products/${saved.id}`, { replace: true });
            else setForm(fromProduct(saved));
        } catch (err) {
            if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
                const details = err.details as { fieldErrors?: Record<string, string[]> } | undefined;
                setErrors(details?.fieldErrors ?? {});
            }
            toast(errorText(i18n.t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!confirm('Удалить вещь? Если по ней были заказы — она уйдёт в архив.')) return;
        try {
            const res = await api<{ archived: boolean }>(`/admin/products/${id}`, { method: 'DELETE' });
            toast(res.archived ? 'есть заказы — перенесено в архив' : 'удалено');
            void queryClient.invalidateQueries({ queryKey: ['admin'] });
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            navigate('/admin/products');
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        }
    };

    const err = (key: string) => errors[key]?.length ? <span className="error-text">{errors[key].join(', ')}</span> : null;

    if (!isNew && isError) return <p className="error-text">не удалось загрузить товар</p>;
    if (!isNew && !product) return <div className="spinner">…</div>;

    return (
        <form onSubmit={save} className={styles.editor}>
            <div className={styles.titleRow}>
                <h1 className={styles.title}>{isNew ? 'новая вещь' : `${form.code} — ${form.nameRu}`}</h1>
                <div className={styles.actionsRow}>
                    {!isNew && (
                        <>
                            <a href={`/product/${form.slug}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                                на сайте ↗
                            </a>
                            <button type="button" className="btn btn--danger btn--sm" onClick={remove}>
                                удалить
                            </button>
                        </>
                    )}
                    <button className="btn btn--acid" disabled={busy || uploading > 0}>
                        {busy ? 'сохраняем…' : 'сохранить'}
                    </button>
                </div>
            </div>

            <div className={styles.editorGrid}>
                <div className={styles.editorMain}>
                    <section className="card-box">
                        <h2 className={styles.h2}>название и описание</h2>
                        <div className={styles.bilingual}>
                            <label className="field">
                                <span className="field__label">🇷🇺 название</span>
                                <input className="input" required value={form.nameRu} onChange={(e) => set('nameRu', e.target.value)} />
                            </label>
                            <label className="field">
                                <span className="field__label">🇬🇧 name</span>
                                <input className="input" required value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} />
                            </label>
                            <label className="field">
                                <span className="field__label">🇷🇺 описание</span>
                                <textarea className="input" rows={7} value={form.descRu} onChange={(e) => set('descRu', e.target.value)} />
                            </label>
                            <label className="field">
                                <span className="field__label">🇬🇧 description</span>
                                <textarea className="input" rows={7} value={form.descEn} onChange={(e) => set('descEn', e.target.value)} />
                            </label>
                        </div>
                        {err('name')}
                    </section>

                    <section className="card-box">
                        <h2 className={styles.h2}>фото</h2>
                        <p className="muted mono" style={{ fontSize: 12, margin: '0 0 12px' }}>
                            первое фото — обложка, второе показывается при наведении. png / jpg / webp, до 10 МБ. лучше на белом фоне.
                        </p>
                        <div className={styles.images}>
                            {form.images.map((img, i) => (
                                <div key={img.url} className={styles.imageItem}>
                                    <img src={img.url} alt="" />
                                    <span className={styles.imageIdx}>{i === 0 ? 'обложка' : `[${String.fromCharCode(65 + i)}]`}</span>
                                    <div className={styles.imageBtns}>
                                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} title="левее">
                                            <ArrowLeft size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveImage(i, 1)}
                                            disabled={i === form.images.length - 1}
                                            title="правее"
                                        >
                                            <ArrowRight size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => set('images', form.images.filter((_, j) => j !== i))}
                                            title="убрать"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <label
                                className={styles.dropzone}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    void upload(e.dataTransfer.files);
                                }}
                            >
                                <Upload size={20} />
                                <span>{uploading ? `грузим ${uploading}…` : 'закинуть фото'}</span>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/avif"
                                    multiple
                                    hidden
                                    onChange={(e) => void upload(e.target.files)}
                                />
                            </label>
                        </div>
                    </section>

                    <section className="card-box">
                        <h2 className={styles.h2}>размеры и остатки</h2>
                        <div className={styles.variants}>
                            {form.variants.map((v, i) => (
                                <div key={i} className={styles.variant}>
                                    <input
                                        className="input"
                                        list="size-presets"
                                        placeholder="размер"
                                        value={v.size}
                                        onChange={(e) =>
                                            set('variants', form.variants.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))
                                        }
                                    />
                                    <input
                                        className="input"
                                        type="number"
                                        min={0}
                                        value={v.stock}
                                        onChange={(e) =>
                                            set(
                                                'variants',
                                                form.variants.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)),
                                            )
                                        }
                                    />
                                    <span className="muted mono">шт.</span>
                                    <button
                                        type="button"
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => set('variants', form.variants.filter((_, j) => j !== i))}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <datalist id="size-presets">
                                {SIZE_PRESETS.map((s) => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => set('variants', [...form.variants, { size: '', stock: 1 }])}
                            >
                                + размер
                            </button>
                        </div>
                        {err('variants')}
                    </section>
                </div>

                <div className={styles.editorSide}>
                    <section className="card-box">
                        <h2 className={styles.h2}>цена и статус</h2>
                        <div className={styles.sideFields}>
                            <label className="field">
                                <span className="field__label">цена, ₽</span>
                                <input
                                    className="input"
                                    inputMode="decimal"
                                    required
                                    value={form.priceRub}
                                    onChange={(e) => set('priceRub', e.target.value)}
                                />
                            </label>
                            <label className="field">
                                <span className="field__label">цена, $ (и крипта)</span>
                                <input
                                    className="input"
                                    inputMode="decimal"
                                    required
                                    value={form.priceUsd}
                                    onChange={(e) => set('priceUsd', e.target.value)}
                                />
                            </label>
                            <label className="field">
                                <span className="field__label">статус</span>
                                <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as ProductStatus)}>
                                    {PRODUCT_STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {PRODUCT_STATUS_LABEL[s]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field">
                                <span className="field__label">категория</span>
                                <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                                    <option value="">— без категории —</option>
                                    {categories?.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name.ru}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field">
                                <span className="field__label">хэштеги (через пробел)</span>
                                <input className="input" placeholder="#leather #kurabo" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
                            </label>
                            <label className="check">
                                <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
                                закрепить наверху каталога
                            </label>
                            <label className="field">
                                <span className="field__label">порядок (меньше — выше)</span>
                                <input
                                    className="input"
                                    type="number"
                                    value={form.sortOrder}
                                    onChange={(e) => set('sortOrder', Number(e.target.value))}
                                />
                            </label>
                            <details>
                                <summary className="mono muted" style={{ fontSize: 12, cursor: 'pointer' }}>
                                    код и адрес страницы
                                </summary>
                                <div className={styles.sideFields} style={{ marginTop: 12 }}>
                                    <label className="field">
                                        <span className="field__label">код (пусто — авто)</span>
                                        <input className="input" placeholder="VK-021" value={form.code} onChange={(e) => set('code', e.target.value)} />
                                    </label>
                                    <label className="field">
                                        <span className="field__label">slug (пусто — из англ. названия)</span>
                                        <input className="input" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
                                    </label>
                                    {err('slug')}
                                </div>
                            </details>
                        </div>
                    </section>

                    <section>
                        <h2 className={styles.h2}>превью</h2>
                        <div className={styles.preview}>
                            <ProductCard product={preview} variant="big" preview />
                        </div>
                    </section>
                </div>
            </div>
        </form>
    );
};

export default ProductEditor;
