import React, { useMemo } from 'react';
import { avatarDataUri } from '@volkoff/shared';

interface Props {
    seed: string;
    size?: number;
    className?: string;
    title?: string;
}

const Avatar: React.FC<Props> = ({ seed, size = 32, className, title }) => {
    const src = useMemo(() => avatarDataUri(seed), [seed]);
    return (
        <img
            src={src}
            width={size}
            height={size}
            alt={title ?? ''}
            title={title}
            className={className}
            style={{ imageRendering: 'pixelated', border: '1px solid #0b0b0b', flex: `0 0 ${size}px` }}
        />
    );
};

export default Avatar;
