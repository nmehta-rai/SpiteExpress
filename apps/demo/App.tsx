import React from 'react';
import { useSpiteGrid } from '@spite/core';

const sampleData = [
  { id: 1, name: 'Product A', price: 100, stock: 20 },
  { id: 2, name: 'Product B', price: 150, stock: 5 },
  { id: 3, name: 'Product C', price: 200, stock: 30 },
];

export default function App() {
  const { sorting, setSorting } = useSpiteGrid();

  // Mock DevExpress grid styling (simple red background for contrast)
  const devExpressGridStyle: React.CSSProperties = {
    backgroundColor: '#ff000030', // Red, slightly transparent
    border: '1px solid #ff0000',
    padding: '16px',
    borderRadius: '8px',
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold text-red-500 mb-6">Spite-off: DevExpress vs SpiteExpress</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">DevExpress Mock (Styled)</h2>
          <div style={devExpressGridStyle}>
            <p>Imagine a complex DevExpress grid here, fighting your styles.</p>
            <p>Data: {JSON.stringify(sampleData)}</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">SpiteExpress (Headless, Unstyled)</h2>
          <div className="border border-green-500 p-4 rounded-lg bg-gray-800">
            <p>This is where your beautifully styled SpiteExpress grid goes.</p>
            <p>Sorting: {JSON.stringify(sorting)}</p>
            <button
              className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => setSorting([{ id: 'price', desc: true }])}
            >
              Sort by Price (SpiteExpress)
            </button>
          </div>
        </div>
      </div>

      <p className="mt-8 text-gray-400">The goal of SpiteExpress is to let *you* control the styling, not the framework.</p>
    </div>
  );
}