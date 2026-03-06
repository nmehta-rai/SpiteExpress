import React, { useEffect, useState } from 'react';
import { useSpiteGrid, type Row } from '@spite/core';

const DEMO_DATA: Row[] = [
  { id: 1, name: 'Alice Chen',     role: 'Engineer',   salary: 120000, active: true  },
  { id: 2, name: 'Bob Martinez',   role: 'Designer',   salary: 95000,  active: true  },
  { id: 3, name: 'Carol White',    role: 'Manager',    salary: 145000, active: false },
  { id: 4, name: 'David Kim',      role: 'Engineer',   salary: 130000, active: true  },
  { id: 5, name: 'Eve Okafor',     role: 'Designer',   salary: 98000,  active: true  },
  { id: 6, name: 'Frank Liu',      role: 'Engineer',   salary: 115000, active: false },
  { id: 7, name: 'Grace Patel',    role: 'Manager',    salary: 160000, active: true  },
  { id: 8, name: 'Henry Nguyen',   role: 'Engineer',   salary: 125000, active: true  },
];

const COLUMNS = [
  { id: 'id',     label: '#',       align: 'right'  },
  { id: 'name',   label: 'Name',    align: 'left'   },
  { id: 'role',   label: 'Role',    align: 'left'   },
  { id: 'salary', label: 'Salary',  align: 'right'  },
  { id: 'active', label: 'Status',  align: 'center' },
];

export default function App() {
  const { data, setData, sorting, setSorting, filtering, setFiltering } = useSpiteGrid();
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const { updateCell } = useSpiteGrid();

  useEffect(() => {
    setData(DEMO_DATA);
  }, []);

  const handleSort = (colId: string) => {
    const existing = sorting.find((s) => s.id === colId);
    if (!existing) {
      setSorting([{ id: colId, desc: false }]);
    } else if (!existing.desc) {
      setSorting([{ id: colId, desc: true }]);
    } else {
      setSorting([]);
    }
  };

  const sortIcon = (colId: string) => {
    const s = sorting.find((s) => s.id === colId);
    if (!s) return <span className="ml-1 opacity-20">↕</span>;
    return <span className="ml-1 text-red-400">{s.desc ? '↓' : '↑'}</span>;
  };

  const filterValue = filtering.find((f) => f.id === 'name')?.value ?? '';

  let displayData = [...data];
  if (filterValue) {
    displayData = displayData.filter((row) =>
      String(row.name).toLowerCase().includes(String(filterValue).toLowerCase())
    );
  }
  if (sorting.length > 0) {
    const { id, desc } = sorting[0];
    displayData.sort((a, b) => {
      const av = a[id] ?? '';
      const bv = b[id] ?? '';
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      {/* Header */}
      <div className="border-b border-red-900/40 px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-red-500">Spite</span>Express
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              headless data grid — total UI freedom
            </p>
          </div>
          <div className="flex gap-2">
            {['headless', 'virtualized', 'LLM-friendly'].map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs border border-red-900/50 text-red-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Demo */}
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Live demo — sort, filter, and edit cells. All state managed by{' '}
            <code className="text-red-400">useSpiteGrid()</code>.
          </p>
          <input
            type="text"
            placeholder="Filter by name..."
            value={String(filterValue)}
            onChange={(e) =>
              setFiltering(e.target.value ? [{ id: 'name', value: e.target.value }] : [])
            }
            className="bg-[#111118] border border-gray-700 text-sm text-white px-3 py-1.5 rounded focus:outline-none focus:border-red-500 w-48"
          />
        </div>

        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111118] border-b border-gray-800">
                {COLUMNS.map((col) => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.id)}
                    className={`px-4 py-3 font-medium text-gray-400 cursor-pointer hover:text-white select-none text-${col.align}`}
                  >
                    {col.label}
                    {sortIcon(col.id)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, rowIdx) => (
                <tr
                  key={String(row.id)}
                  className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors"
                >
                  {COLUMNS.map((col) => {
                    const isEditing =
                      editingCell?.row === rowIdx && editingCell?.col === col.id;
                    const value = row[col.id];

                    if (col.id === 'active') {
                      return (
                        <td key={col.id} className="px-4 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              value
                                ? 'bg-green-900/40 text-green-400'
                                : 'bg-gray-800 text-gray-500'
                            }`}
                          >
                            {value ? 'active' : 'inactive'}
                          </span>
                        </td>
                      );
                    }

                    if (col.id === 'salary') {
                      return (
                        <td key={col.id} className="px-4 py-2.5 text-right text-gray-300">
                          ${Number(value).toLocaleString()}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.id}
                        className={`px-4 py-2.5 text-${col.align} ${
                          col.id === 'id' ? 'text-gray-600' : 'text-gray-200'
                        }`}
                        onDoubleClick={() => setEditingCell({ row: rowIdx, col: col.id })}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            defaultValue={String(value)}
                            className="bg-[#1a1a24] border border-red-500/50 text-white px-1 py-0.5 rounded w-full focus:outline-none"
                            onBlur={(e) => {
                              updateCell(rowIdx, col.id, e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          <span title="Double-click to edit">{String(value)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {displayData.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-gray-600">
                    No rows match the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-600">
          {displayData.length} of {data.length} rows shown — double-click any cell to edit
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800/50 px-8 py-6 mt-8">
        <div className="max-w-5xl mx-auto text-xs text-gray-600 flex justify-between">
          <span>SpiteExpress — because DevExpress made us do this</span>
          <a
            href="https://github.com/nmehta-rai/SpiteExpress"
            className="hover:text-red-400 transition-colors"
          >
            github
          </a>
        </div>
      </div>
    </div>
  );
}