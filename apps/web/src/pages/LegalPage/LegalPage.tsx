import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import type { LegalInfo } from '@volkoff/shared';
import { SITE_URL } from '@/config/site';
import { useSiteSettings } from '@/api/queries';
import { toLocale } from '@/lib/format';
import NotFoundPage from '../NotFoundPage';
import styles from './LegalPage.module.scss';

const docs = import.meta.glob('../../content/legal/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    string
>;

const DOCS = ['offer', 'privacy', 'consent', 'cookies'] as const;

const fill = (md: string, legal: LegalInfo) => {
    const values: Record<string, string> = { ...legal, SITE_URL };
    return md.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => values[key] || `[заполнить: ${key}]`);
};

const LegalPage: React.FC = () => {
    const { doc } = useParams();
    const { t, i18n } = useTranslation();
    const locale = toLocale(i18n.language);
    const { legal } = useSiteSettings();

    const content = useMemo(() => {
        const raw = docs[`../../content/legal/${locale}/${doc}.md`] ?? docs[`../../content/legal/ru/${doc}.md`];
        return raw ? fill(raw, legal) : null;
    }, [doc, locale, legal]);

    if (!content) return <NotFoundPage text={t('legal.notFound')} />;

    return (
        <div className={`container ${styles.page}`}>
            <nav className={styles.tabs}>
                {DOCS.map((d) => (
                    <Link key={d} to={`/legal/${d}`} className={`tag-btn ${d === doc ? 'is-active' : ''}`}>
                        {t(`footer.${d}`)}
                    </Link>
                ))}
            </nav>
            <article className={styles.doc}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Внутренние ссылки на сайт — через роутер
                        a: ({ href, children }) => {
                            const internal = href?.replace(SITE_URL, '');
                            return internal?.startsWith('/') ? (
                                <Link to={internal}>{children}</Link>
                            ) : (
                                <a href={href} target="_blank" rel="noopener noreferrer">
                                    {children}
                                </a>
                            );
                        },
                    }}
                >
                    {content}
                </ReactMarkdown>
            </article>
        </div>
    );
};

export default LegalPage;
