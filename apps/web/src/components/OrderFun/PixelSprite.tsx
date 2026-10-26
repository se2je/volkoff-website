import React from 'react';

/** Пиксельная картинка из сетки строк ('#' — закрашено), тем же способом, что знак волка */
const PixelSprite: React.FC<{ grid: readonly string[]; cell?: number; className?: string }> = ({ grid, cell = 3, className }) => {
    const d = grid.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `M${x} ${y}h1v1h-1z` : ''))).join('');
    const w = grid[0].length;
    const h = grid.length;
    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            width={w * cell}
            height={h * cell}
            className={className}
            shapeRendering="crispEdges"
            aria-hidden="true"
            style={{ display: 'block' }}
        >
            <path d={d} fill="currentColor" />
        </svg>
    );
};

export default PixelSprite;
