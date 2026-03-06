import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gqlClient, ORDERS_QUERY, UPDATE_ORDER_MUTATION, type Order, type OrdersQueryResult, type SortDirection } from './src/lib/graphql';
import { supabase } from './src/lib/supabase';

// ─── Config ───────────────────────────────────────────────────────────────────

const PAGE_SIZE_PRESETS = [10, 15, 25, 50];

type ColDef = {
  id: keyof Order;
  label: string;
  align?: 'right' | 'center';
  defaultWidth: number;
  sortable?: boolean;
};

const COLUMNS: ColDef[] = [
  { id: 'customer_name',    label: 'Customer',    defaultWidth: 160, sortable: true  },
  { id: 'order_date',       label: 'Order Date',  defaultWidth: 120, sortable: true  },
  { id: 'product_category', label: 'Category',    defaultWidth: 120, sortable: true  },
  { id: 'sku',              label: 'SKU',          defaultWidth: 130                  },
  { id: 'quantity',         label: 'Qty',          defaultWidth: 65,  align: 'right', sortable: true },
  { id: 'unit_price',       label: 'Unit Price',   defaultWidth: 105, align: 'right', sortable: true },
  { id: 'total_amount',     label: 'Total',        defaultWidth: 105, align: 'right', sortable: true },
  { id: 'payment_method',   label: 'Payment',      defaultWidth: 115                  },
  { id: 'discount_applied', label: 'Disc.',        defaultWidth: 55,  align: 'center' },
  { id: 'order_status',     label: 'Status',       defaultWidth: 110, align: 'center', sortable: true },
];

const COL_MAP = Object.fromEntries(COLUMNS.map(c => [c.id, c])) as Record<keyof Order, ColDef>;

const STATUS_STYLES: Record<string, string> = {
  Delivered:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Shipped:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  Pending:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Cancelled:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

const CATEGORY_STYLES: Record<string, string> = {
  Electronics:    'text-cyan-600 dark:text-cyan-400',
  Apparel:        'text-pink-600 dark:text-pink-400',
  Beauty:         'text-purple-600 dark:text-purple-400',
  Books:          'text-amber-600 dark:text-amber-400',
  'Home & Garden':'text-lime-600 dark:text-lime-400',
  Sports:         'text-orange-600 dark:text-orange-400',
  Toys:           'text-rose-600 dark:text-rose-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' });
}
function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SunIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>;
}
function MoonIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
}
function ColumnsIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('se-theme');
    const isDark = saved ? saved === 'dark' : true;
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return isDark;
  });
  useEffect(() => {
    dark ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
  }, [dark]);
  const toggleTheme = () => setDark(d => { localStorage.setItem('se-theme', d ? 'light' : 'dark'); return !d; });

  // ── Data state ─────────────────────────────────────────────────────────────
  const [rows, setRows]         = useState<Order[]>([]);
  const [totalCount, setTotal]  = useState(0);
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSizeRaw] = useState(50);
  const [pageSizeInput, setPSInput] = useState('50');
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sortCol, setSortCol]   = useState<keyof Order>('order_date');
  const [sortDir, setSortDir]   = useState<SortDirection>('DescNullsLast');
  const [liveFlash, setFlash]   = useState<Set<string>>(new Set());
  const [liveCount, setLiveCount] = useState(0);

  const setPageSize = (n: number) => {
    const c = Math.min(500, Math.max(1, n));
    setPageSizeRaw(c); setPSInput(String(c)); setPage(0);
  };
  const debouncedSearch = useDebounce(search, 350);

  // ── Column state ───────────────────────────────────────────────────────────
  const [colOrder, setColOrder]   = useState<(keyof Order)[]>(COLUMNS.map(c => c.id));
  const [colWidths, setColWidths] = useState<Record<string, number>>(
    Object.fromEntries(COLUMNS.map(c => [c.id, c.defaultWidth]))
  );
  const [visibleCols, setVisibleCols] = useState<Set<keyof Order>>(
    new Set(COLUMNS.map(c => c.id))
  );
  const [showChooser, setShowChooser] = useState(false);
  const chooserRef = useRef<HTMLDivElement>(null);

  // Derived: ordered visible columns
  const activeCols = colOrder.filter(id => visibleCols.has(id)).map(id => COL_MAP[id]);

  // Close chooser on outside click
  useEffect(() => {
    if (!showChooser) return;
    const handler = (e: MouseEvent) => {
      if (chooserRef.current && !chooserRef.current.contains(e.target as Node)) setShowChooser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showChooser]);

  // ── Column resize ──────────────────────────────────────────────────────────
  const resizeState = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  const startResize = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = { colId, startX: e.clientX, startWidth: colWidths[colId] };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeState.current) return;
      const { colId, startX, startWidth } = resizeState.current;
      const newWidth = Math.max(40, startWidth + (e.clientX - startX));
      setColWidths(prev => ({ ...prev, [colId]: newWidth }));
    };
    const onUp = () => {
      resizeState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── Column reorder (drag & drop) ───────────────────────────────────────────
  const [dragColId, setDragColId]       = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, colId: string) => {
    setDragColId(colId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (colId !== dragColId) setDragOverColId(colId);
  };
  const onDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!dragColId || dragColId === targetColId) { setDragColId(null); setDragOverColId(null); return; }
    setColOrder(prev => {
      const arr = [...prev];
      const from = arr.indexOf(dragColId as keyof Order);
      const to   = arr.indexOf(targetColId as keyof Order);
      arr.splice(from, 1);
      arr.splice(to, 0, dragColId as keyof Order);
      return arr;
    });
    setDragColId(null);
    setDragOverColId(null);
  };
  const onDragEnd = () => { setDragColId(null); setDragOverColId(null); };

  // ── GraphQL fetch ──────────────────────────────────────────────────────────
  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, unknown> = {};
      if (debouncedSearch) filter.customer_name = { ilike: `%${debouncedSearch}%` };
      const vars = {
        first:   pageSize,
        offset:  page * pageSize,
        orderBy: [{ [sortCol]: sortDir }],
        ...(Object.keys(filter).length ? { filter } : {}),
      };
      const data = await gqlClient.request<OrdersQueryResult>(ORDERS_QUERY, vars);
      setRows(data.ordersCollection.edges.map(e => e.node));
      setTotal(data.ordersCollection.totalCount);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, sortCol, sortDir]);

  useEffect(() => { fetchPage(); }, [fetchPage]);
  useEffect(() => { setPage(0); }, [debouncedSearch, sortCol, sortDir, pageSize]);

  // ── Supabase Realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        setLiveCount(c => c + 1);
        const id = (payload.new as Order | undefined)?.transaction_id ?? (payload.old as Order | undefined)?.transaction_id;
        if (id) {
          setFlash(prev => new Set(prev).add(id));
          setTimeout(() => setFlash(prev => { const s = new Set(prev); s.delete(id); return s; }), 1200);
        }
        fetchPage();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPage]);

  // ── Inline editing ─────────────────────────────────────────────────────────
  const editingRef = useRef<{ id: string; field: keyof Order } | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Order } | null>(null);

  const commitEdit = async (id: string, field: keyof Order, raw: string) => {
    setEditingCell(null); editingRef.current = null;
    let value: string | number | boolean = raw;
    if (field === 'quantity')     value = parseInt(raw, 10);
    if (field === 'unit_price')   value = parseFloat(raw);
    if (field === 'total_amount') value = parseFloat(raw);
    setRows(prev => prev.map(r => r.transaction_id === id ? { ...r, [field]: value } : r));
    try { await gqlClient.request(UPDATE_ORDER_MUTATION, { id, set: { [field]: value } }); }
    catch { fetchPage(); }
  };

  // ── Sort ───────────────────────────────────────────────────────────────────
  const handleSort = (col: keyof Order) => {
    if (col === sortCol) setSortDir(d => d === 'AscNullsLast' ? 'DescNullsLast' : 'AscNullsLast');
    else { setSortCol(col); setSortDir('DescNullsLast'); }
  };
  const sortIcon = (col: keyof Order) => {
    if (col !== sortCol) return <span className="ml-1 opacity-20 text-xs">↕</span>;
    return <span className="ml-1 text-red-500 text-xs">{sortDir === 'DescNullsLast' ? '↓' : '↑'}</span>;
  };

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / pageSize);
  const pageButtons = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) { for (let i = 0; i < totalPages; i++) pages.push(i); }
    else {
      pages.push(0);
      if (page > 2) pages.push('...');
      for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
      if (page < totalPages - 3) pages.push('...');
      pages.push(totalPages - 1);
    }
    return pages;
  };

  // ── Cell renderer ──────────────────────────────────────────────────────────
  const renderCell = (row: Order, col: ColDef) => {
    const cellBase = 'px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap';
    const align = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '';

    switch (col.id) {
      case 'customer_name':
        return <td key={col.id} className={`${cellBase} ${align} text-gray-800 dark:text-gray-200`}>{row.customer_name}</td>;
      case 'order_date':
        return <td key={col.id} className={`${cellBase} ${align} text-gray-500 dark:text-gray-400`}>{fmtDate(row.order_date)}</td>;
      case 'product_category':
        return <td key={col.id} className={`${cellBase} ${align} ${CATEGORY_STYLES[row.product_category] ?? 'text-gray-600 dark:text-gray-300'}`}>{row.product_category}</td>;
      case 'sku':
        return <td key={col.id} className={`${cellBase} ${align} text-gray-400 dark:text-gray-500 font-mono text-[11px]`}>{row.sku}</td>;
      case 'quantity':
        return (
          <EditableCell key={col.id} align="right"
            value={String(row.quantity)}
            editing={editingCell?.id === row.transaction_id && editingCell.field === 'quantity'}
            onDoubleClick={() => setEditingCell({ id: row.transaction_id, field: 'quantity' })}
            onCommit={v => commitEdit(row.transaction_id, 'quantity', v)}
            onCancel={() => setEditingCell(null)} />
        );
      case 'unit_price':
        return (
          <EditableCell key={col.id} align="right"
            value={fmt(row.unit_price)} rawValue={String(row.unit_price)}
            editing={editingCell?.id === row.transaction_id && editingCell.field === 'unit_price'}
            onDoubleClick={() => setEditingCell({ id: row.transaction_id, field: 'unit_price' })}
            onCommit={v => commitEdit(row.transaction_id, 'unit_price', v)}
            onCancel={() => setEditingCell(null)} />
        );
      case 'total_amount':
        return <td key={col.id} className={`${cellBase} ${align} text-gray-600 dark:text-gray-300`}>{fmt(row.total_amount)}</td>;
      case 'payment_method':
        return <td key={col.id} className={`${cellBase} ${align} text-gray-500 dark:text-gray-400`}>{row.payment_method}</td>;
      case 'discount_applied':
        return (
          <td key={col.id} className={`${cellBase} ${align}`}>
            {row.discount_applied ? <span className="text-green-600 dark:text-green-400">✓</span> : <span className="text-gray-300 dark:text-gray-700">—</span>}
          </td>
        );
      case 'order_status':
        return (
          <td key={col.id} className={`${cellBase} ${align}`}>
            {editingCell?.id === row.transaction_id && editingCell.field === 'order_status' ? (
              <select autoFocus defaultValue={row.order_status}
                className="bg-white dark:bg-[#1a1a24] border border-red-400 dark:border-red-500/50 text-gray-900 dark:text-white text-xs rounded px-1 py-0.5 focus:outline-none"
                onBlur={e => commitEdit(row.transaction_id, 'order_status', e.target.value)}
                onChange={e => commitEdit(row.transaction_id, 'order_status', e.target.value)}>
                {['Delivered', 'Shipped', 'Processing', 'Pending', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <span className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${STATUS_STYLES[row.order_status] ?? ''}`}
                onDoubleClick={() => setEditingCell({ id: row.transaction_id, field: 'order_status' })}
                title="Double-click to edit">
                {row.order_status}
              </span>
            )}
          </td>
        );
      default:
        return <td key={col.id} className={`${cellBase} ${align} text-gray-500 dark:text-gray-400`}>{String((row as Record<string, unknown>)[col.id] ?? '')}</td>;
    }
  };

  // ── Table width ────────────────────────────────────────────────────────────
  const tableWidth = activeCols.reduce((sum, c) => sum + colWidths[c.id], 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#08080f] text-gray-900 dark:text-white font-mono flex flex-col">

      {/* Header */}
      <div className="border-b border-red-200 dark:border-red-900/30 bg-white dark:bg-[#08080f] px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-red-500">Spite</span><span className="text-gray-900 dark:text-white">Express</span>
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">headless data grid · server-side · realtime</p>
        </div>
        <div className="flex items-center gap-4">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
              {liveCount} live update{liveCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-600">{totalCount.toLocaleString()} orders</span>
          <button onClick={toggleTheme}
            className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500"
            title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-2.5 border-b border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#08080f] flex items-center gap-2 shrink-0">

        {/* Column chooser */}
        <div className="relative" ref={chooserRef}>
          <button
            onClick={() => setShowChooser(v => !v)}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors',
              showChooser
                ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500',
            ].join(' ')}
            title="Choose columns"
          >
            <ColumnsIcon />
            Columns
            <span className="text-gray-400 dark:text-gray-600 ml-0.5">
              {visibleCols.size}/{COLUMNS.length}
            </span>
          </button>

          {showChooser && (
            <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-white dark:bg-[#111118] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
              <div className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 mb-1">
                Show / hide columns
              </div>
              {COLUMNS.map(col => (
                <label key={col.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04] text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.id)}
                    onChange={() => setVisibleCols(prev => {
                      if (prev.size === 1 && prev.has(col.id)) return prev; // keep at least 1
                      const s = new Set(prev);
                      s.has(col.id) ? s.delete(col.id) : s.add(col.id);
                      return s;
                    })}
                    className="accent-red-500"
                  />
                  {col.label}
                </label>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-800 mt-1 px-3 py-1.5">
                <button
                  onClick={() => setVisibleCols(new Set(COLUMNS.map(c => c.id)))}
                  className="text-[11px] text-red-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  Show all
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">fetching…</span>}

        {/* Search — right side */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-600">
            page {page + 1} of {totalPages || 1} · GraphQL + Realtime
          </span>
          <input
            type="text"
            placeholder="Search customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-50 dark:bg-[#111118] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 px-3 py-1.5 rounded focus:outline-none focus:border-red-400 dark:focus:border-red-500 w-48"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="text-xs" style={{ tableLayout: 'fixed', width: tableWidth, minWidth: '100%' }}>
          <colgroup>
            {activeCols.map(col => <col key={col.id} style={{ width: colWidths[col.id] }} />)}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 dark:bg-[#0e0e18] border-b border-gray-200 dark:border-gray-800">
              {activeCols.map(col => {
                const isDragOver = dragOverColId === col.id && dragColId !== col.id;
                const isDragging = dragColId === col.id;
                return (
                  <th
                    key={col.id}
                    draggable
                    onDragStart={e => onDragStart(e, col.id)}
                    onDragOver={e => onDragOver(e, col.id)}
                    onDrop={e => onDrop(e, col.id)}
                    onDragEnd={onDragEnd}
                    className={[
                      'relative px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap select-none overflow-hidden',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      isDragging ? 'opacity-40' : '',
                      isDragOver ? 'bg-red-50 dark:bg-red-900/20' : '',
                    ].join(' ')}
                    style={{ width: colWidths[col.id] }}
                  >
                    {/* Drop indicator */}
                    {isDragOver && (
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-red-500" />
                    )}

                    {/* Label + sort */}
                    <span
                      onClick={col.sortable ? () => handleSort(col.id) : undefined}
                      className={[
                        'inline-flex items-center gap-0.5 cursor-grab active:cursor-grabbing',
                        col.sortable ? 'hover:text-gray-900 dark:hover:text-white' : '',
                      ].join(' ')}
                      title="Drag to reorder"
                    >
                      {col.label}
                      {col.sortable && sortIcon(col.id)}
                    </span>

                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-3 flex items-center justify-center cursor-col-resize group z-10"
                      onMouseDown={e => startResize(e, col.id)}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 group-hover:bg-red-400 group-hover:h-full" />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isFlashing = liveFlash.has(row.transaction_id);
              const isEven = idx % 2 === 0;
              return (
                <tr key={row.transaction_id}
                  className={[
                    'hover:brightness-95 dark:hover:brightness-125',
                    isFlashing ? 'bg-green-50 dark:bg-green-900/20'
                      : isEven ? 'bg-white dark:bg-[#0d0d14]'
                      : 'bg-gray-50/70 dark:bg-[#0a0a11]',
                  ].join(' ')}>
                  {activeCols.map(col => renderCell(row, col))}
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={activeCols.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-600">
                  No orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#08080f] px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">Rows per page</span>
          <div className="flex gap-1">
            {PAGE_SIZE_PRESETS.map(n => (
              <button key={n} onClick={() => setPageSize(n)}
                className={[
                  'px-2 py-1 text-xs rounded',
                  n === pageSize
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-800/50'
                    : 'text-gray-500 border border-gray-200 dark:border-gray-800 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-600',
                ].join(' ')}>
                {n}
              </button>
            ))}
          </div>
          <input type="number" min={1} max={500} value={pageSizeInput}
            onChange={e => setPSInput(e.target.value)}
            onBlur={() => { const n = parseInt(pageSizeInput, 10); if (!isNaN(n)) setPageSize(n); else setPSInput(String(pageSize)); }}
            onKeyDown={e => { if (e.key === 'Enter') { const n = parseInt(pageSizeInput, 10); if (!isNaN(n)) setPageSize(n); else setPSInput(String(pageSize)); (e.target as HTMLInputElement).blur(); } }}
            className="w-14 bg-gray-50 dark:bg-[#111118] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white px-2 py-1 rounded focus:outline-none focus:border-red-400 dark:focus:border-red-500 text-center" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap mr-1">
            {totalCount === 0 ? '0' : (page * pageSize + 1).toLocaleString()}–{Math.min((page + 1) * pageSize, totalCount).toLocaleString()} of {totalCount.toLocaleString()}
          </span>
          {[
            { label: '«', act: () => setPage(0),                                dis: page === 0 },
            { label: '‹', act: () => setPage(p => Math.max(0, p - 1)),          dis: page === 0 },
          ].map(b => <button key={b.label} onClick={b.act} disabled={b.dis} className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">{b.label}</button>)}

          {pageButtons().map((p, i) =>
            p === '...'
              ? <span key={`e${i}`} className="px-1 text-gray-400 dark:text-gray-600 text-xs">…</span>
              : <button key={p} onClick={() => setPage(p as number)}
                  className={['px-2.5 py-1 text-xs rounded', p === page ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-800/50' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'].join(' ')}>
                  {(p as number) + 1}
                </button>
          )}

          {[
            { label: '›', act: () => setPage(p => Math.min(totalPages - 1, p + 1)), dis: page >= totalPages - 1 },
            { label: '»', act: () => setPage(totalPages - 1),                        dis: page >= totalPages - 1 },
          ].map(b => <button key={b.label} onClick={b.act} disabled={b.dis} className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">{b.label}</button>)}
        </div>
      </div>
    </div>
  );
}

// ─── EditableCell ─────────────────────────────────────────────────────────────

function EditableCell({ value, rawValue, editing, onDoubleClick, onCommit, onCancel, align }: {
  value: string; rawValue?: string; editing: boolean;
  onDoubleClick: () => void; onCommit: (v: string) => void; onCancel: () => void; align?: 'right';
}) {
  return (
    <td className={`px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap ${align === 'right' ? 'text-right' : ''} text-gray-600 dark:text-gray-300`} onDoubleClick={onDoubleClick}>
      {editing ? (
        <input autoFocus defaultValue={rawValue ?? value}
          className="bg-white dark:bg-[#1a1a24] border border-red-400 dark:border-red-500/50 text-gray-900 dark:text-white text-xs px-1 py-0.5 rounded w-20 text-right focus:outline-none"
          onBlur={e => onCommit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') onCancel(); }} />
      ) : (
        <span title="Double-click to edit" className="cursor-default">{value}</span>
      )}
    </td>
  );
}
