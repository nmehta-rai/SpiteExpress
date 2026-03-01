import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-5xl font-bold text-red-600">SpiteExpress 👹</h1>
      <p className="text-xl mt-4">Because styling DevExpress components makes you want to flip tables.</p>
      <div className="mt-12 p-6 border border-red-900 rounded-lg">
        <h2 className="text-2xl mb-4">Core Pillars</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Headless Core - total UI freedom</li>
          <li>2D Virtualization - zero-lag infinite scroll</li>
          <li>AI Vibe Coding Friendly - steerable by LLMs</li>
        </ul>
      </div>
    </div>
  );
}