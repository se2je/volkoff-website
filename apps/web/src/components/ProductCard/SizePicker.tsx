import React from 'react';
import { compareSizes, type ProductVariantDto } from '@volkoff/shared';

interface Props {
    variants: ProductVariantDto[];
    value: string | null;
    onChange: (size: string) => void;
    compact?: boolean;
}

/** Размеры — квадратные ячейки, как на размерной бирке. Распроданные перечёркнуты. */
const SizePicker: React.FC<Props> = ({ variants, value, onChange, compact }) => {
    const sorted = [...variants].sort((a, b) => compareSizes(a.size, b.size));
    return (
        <div className={`size-row ${compact ? 'size-row--compact' : ''}`}>
            {sorted.map((v) => {
                const out = v.stock <= 0;
                return (
                    <button
                        key={v.id}
                        type="button"
                        className={`size-cell ${value === v.size ? 'is-active' : ''} ${out ? 'is-out' : ''}`}
                        onClick={() => !out && onChange(v.size)}
                        disabled={out}
                        aria-pressed={value === v.size}
                        title={out ? 'sold out' : v.size}
                    >
                        {v.size === 'ONE SIZE' ? 'OS' : v.size}
                    </button>
                );
            })}
        </div>
    );
};

export default SizePicker;
