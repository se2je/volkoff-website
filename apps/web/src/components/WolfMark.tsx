import React from 'react';

// Знак VOLKOFF — пиксельный волк 9×9 (тот же, что в brand/wolf и фавиконках)
const WOLF = ['#_______#', '##_____##', '#########', '##_###_##', '#########', '_#######_', '__#####__', '___###___', '____#____'];

const PATH = WOLF.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `M${x} ${y}h1v1h-1z` : ''))).join('');

const WolfMark: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg
        viewBox="0 0 9 9"
        width={size}
        height={size}
        className={className}
        shapeRendering="crispEdges"
        aria-hidden="true"
        style={{ display: 'block', flex: `0 0 ${size}px` }}
    >
        <path d={PATH} fill="currentColor" />
    </svg>
);

export default WolfMark;
