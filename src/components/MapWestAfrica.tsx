import React from 'react';

interface MapProps {
  data: Record<string, { reached: number; count: number }>;
  onSelect: (country: string) => void;
  selected?: string | null;
}

// Simple SVG map approximation using dots positioned for West African countries used in the app.
export default function MapWestAfrica({ data, onSelect, selected }: MapProps) {
  const countries = [
    { id: 'Senegal', x: 80, y: 110 },
    { id: 'Cote d\'Ivoire', x: 200, y: 200 },
    { id: 'Liberia', x: 280, y: 240 },
    { id: 'Ghana', x: 230, y: 220 },
    { id: 'Togo', x: 260, y: 200 },
    { id: 'Benin', x: 300, y: 190 },
  ];

  return (
    <div className="w-full h-64 bg-white rounded-2xl border border-brand-border p-4">
      <svg viewBox="0 0 420 300" className="w-full h-full">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.12" />
          </filter>
        </defs>
        {/* Background plate - roughly the coastline */}
        <rect x={0} y={0} width={420} height={300} fill="transparent" />

        {/* Dots for each country */}
        {countries.map((c) => {
          const entry = data[c.id] || { reached: 0, count: 0 };
          const isSelected = selected === c.id;
          return (
            <g key={c.id} className="cursor-pointer" onClick={() => onSelect(c.id)}>
              <circle
                cx={c.x}
                cy={c.y}
                r={isSelected ? 10 : 7}
                fill={isSelected ? '#0f766e' : '#12815F'}
                stroke="#ffffff"
                strokeWidth={2}
                style={{ filter: 'url(#shadow)' }}
              />
              <text x={c.x + 14} y={c.y + 4} fontSize={11} fill="#0f2b22" fontWeight={700}>
                {c.id}
              </text>
              <text x={c.x + 14} y={c.y + 18} fontSize={10} fill="#47585a">
                {entry.count} recs · {entry.reached.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
