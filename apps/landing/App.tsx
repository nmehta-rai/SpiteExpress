import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gqlClient, ORDERS_QUERY, UPDATE_ORDER_MUTATION, type Order, type OrdersQueryResult, type SortDirection } from './src/lib/graphql';
import { supabase } from './src/lib/supabase';

// ─── Config ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const COLUMNS: Array<{
  id: keyof Order;
  label: string;
  align?: 'right' | 'center';
  width?: string;
  sortable?: boolean;
}> = [
  { id: 'customer_name',    label: 'Customer',      width: 'w-36',  sortable: true  },
  { id: 'order_date',       label: 'Order Date',    width: 'w-36',  sortable: true  },
  { id: 'product_category', label: 'Category',      width: 'w-28',  sortable: true  },
  { id: 'sku',              label: 'SKU',            width: 'w-28'                   },
  { id: 'quantity',         label: 'Qty',            width: 'w-16',  align: 'right', sortable: true },
  { id: 'unit_price',       label: 'Unit Price',     width: 'w-24',  align: 'right', sortable: true },
  { id: 'total_amount',     label: 'Total',          width: 'w-24',  align: 'right', sortable: true },
  { id: 'payment_method',   label: 'Payment',        width: 'w-28'                   },
  { id: 'discount_applied', label: 'Disc.',          width: 'w-12',  align: 'center' },
  { id: 'order_status',     label: 'Status',         width: 'w-24',  align: 'center', sortable: true },
];

const STATUS_STYLES: Record<string, string> = {
  Delivered:  'bg-green-900/40 text-green-400',
  Shipped:    'bg-blue-900/40 text-blue-400',
  Processing: 'bg-yellow-900/40 text-yellow-400',
  Pending:    'bg-gray-800 text-gray-400',
  Cancelled:  'bg-red-900/40 text-red-400',
};

const CATEGORY_STYLES: Record<string, string> = {
  Electronics:    'text-cyan-400',
  Apparel:        'text-pink-400',
  Beauty:         'text-purple-400',
  Books:          'text-amber-400',
  'Home & Garden':'text-lime-400',
  Sports:         'text-orange-400',
  Toys:           'text-rose-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' });
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [rows, setRows]           = useState<Order[]>([]);
  const [totalCount, setTotal]    = useState(0);
  const [page, setPage]           = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [sortCol, setSortCol]     = useState<keyof Order>('order_date');
  const [sortDir, setSortDir]     = useState<SortDirection>('DescNullsLast');
  const [liveFlash, setFlash]     = useState<Set<string>>(new Set());
  const [liveCount, setLiveCount] = useState(0);

  const debouncedSearch = useDebounce(search, 350);

  // ── GraphQL fetch ──────────────────────────────────────────────────────────

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, unknown> = {};
      if (debouncedSearch) {
        filter.customer_name = { ilike: `%${debouncedSearch}%` };
      }
      if (statusFilter) {
        filter.order_status = { eq: statusFilter };
      }

      const vars = {
        first:   PAGE_SIZE,
        offset:  page * PAGE_SIZE,
        orderBy: [{ [sortCol]: sortDir }],
        ...(Object.keys(filter).length ? { filter } : {}),
      };

      const data = await gqlClient.request<OrdersQueryResult>(ORDERS_QUERY, vars);
      setRows(data.ordersCollection.edges.map(e => e.node));
      setTotal(data.ordersCollection.totalCount);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, sortCol, sortDir]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  // Reset to page 0 when filters/sort change
  useEffect(() => { setPage(0); }, [debouncedSearch, statusFilter, sortCol, sortDir]);

  // ── Supabase Realtime ──────────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        setLiveCount(c => c + 1);

        // Flash the changed row if it's on the current page
        const id = (payload.new as Order | undefined)?.transaction_id
                ?? (payload.old as Order | undefined)?.transaction_id;
        if (id) {
          setFlash(prev => new Set(prev).add(id));
          setTimeout(() => setFlash(prev => { const s = new Set(prev); s.delete(id); return s; }), 1200);
        }

        // Refetch to stay in sync
        fetchPage();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPage]);

  // ── Inline editing ─────────────────────────────────────────────────────────

  const editingRef = useRef<{ id: string; field: keyof Order } | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Order } | null>(null);

  const commitEdit = async (id: string, field: keyof Order, raw: string) => {
    setEditingCell(null);
    editingRef.current = null;

    let value: string | number | boolean = raw;
    if (field === 'quantity')   value = parseInt(raw, 10);
    if (field === 'unit_price') value = parseFloat(raw);
    if (field === 'total_amount') value = parseFloat(raw);

    // Optimistic update
    setRows(prev => prev.map(r => r.transaction_id === id ? { ...r, [field]: value } : r));

    try {
      await gqlClient.request(UPDATE_ORDER_MUTATION, { id, set: { [field]: value } });
    } catch {
      fetchPage(); // rollback on error
    }
  };

  // ── Sort handler ───────────────────────────────────────────────────────────

  const handleSort = (col: keyof Order) => {
    if (col === sortCol) {
      setSortDir(d => d === 'AscNullsLast' ? 'DescNullsLast' : 'AscNullsLast');
    } else {
      setSortCol(col);
      setSortDir('DescNullsLast');
    }
  };

  const sortIcon = (col: keyof Order) => {
    if (col !== sortCol) return <span className="ml-1 opacity-20 text-xs">↕</span>;
    return <span className="ml-1 text-red-400 text-xs">{sortDir === 'DescNullsLast' ? '↓' : '↑'}</span>;
  };

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const pageButtons = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 2) pages.push('...');
      for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
      if (page < totalPages - 3) pages.push('...');
      pages.push(totalPages - 1);
    }
    return pages;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#08080f] text-white font-mono flex flex-col">

      {/* Header */}
      <div className="border-b border-red-900/30 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-red-500">Spite</span>Express
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">headless data grid · server-side · realtime</p>
        </div>
        <div className="flex items-center gap-3">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {liveCount} live update{liveCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-gray-600">{totalCount.toLocaleString()} orders</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-800/50 flex gap-3 items-center shrink-0">
        <input
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#111118] border border-gray-700 text-sm text-white px-3 py-1.5 rounded focus:outline-none focus:border-red-500 w-52"
        />
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          className="bg-[#111118] border border-gray-700 text-sm text-white px-3 py-1.5 rounded focus:outline-none focus:border-red-500"
        >
          <option value="">All statuses</option>
          {['Delivered', 'Shipped', 'Processing', 'Pending', 'Cancelled'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {loading && <span className="text-xs text-gray-500 animate-pulse">fetching...</span>}
        <span className="ml-auto text-xs text-gray-600">
          page {page + 1} of {totalPages || 1} · {PAGE_SIZE} rows/page · GraphQL + Realtime
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0e0e18] border-b border-gray-800">
              {COLUMNS.map(col => (
                <th
                  key={col.id}
                  onClick={col.sortable ? () => handleSort(col.id) : undefined}
                  className={[
                    'px-3 py-2.5 font-medium text-gray-400 whitespace-nowrap select-none',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.sortable ? 'cursor-pointer hover:text-white' : '',
                    col.width ?? '',
                  ].join(' ')}
                >
                  {col.label}{col.sortable && sortIcon(col.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isFlashing = liveFlash.has(row.transaction_id);
              return (
                <tr
                  key={row.transaction_id}
                  className={[
                    'border-b border-gray-800/40 hover:bg-white/[0.02] transition-colors',
                    isFlashing ? 'bg-green-900/20' : '',
                  ].join(' ')}
                >
                  {/* Customer */}
                  <td className="px-3 py-2 text-gray-200">{row.customer_name}</td>

                  {/* Order Date */}
                  <td className="px-3 py-2 text-gray-400">{fmtDate(row.order_date)}</td>

                  {/* Category */}
                  <td className={`px-3 py-2 ${CATEGORY_STYLES[row.product_category] ?? 'text-gray-300'}`}>
                    {row.product_category}
                  </td>

                  {/* SKU */}
                  <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">{row.sku}</td>

                  {/* Quantity — editable */}
                  <EditableCell
                    value={String(row.quantity)}
                    editing={editingCell?.id === row.transaction_id && editingCell.field === 'quantity'}
                    onDoubleClick={() => setEditingCell({ id: row.transaction_id, field: 'quantity' })}
                    onCommit={v => commitEdit(row.transaction_id, 'quantity', v)}
                    onCancel={() => setEditingCell(null)}
                    align="right"
                  />

                  {/* Unit Price — editable */}
                  <EditableCell
                    value={fmt(row.unit_price)}
                    rawValue={String(row.unit_price)}
                    editing={editingCell?.id === row.transaction_id && editingCell.field === 'unit_price'}
                    onDoubleClick={() => setEditingCell({ id: row.transaction_id, field: 'unit_price' })}
                    onCommit={v => commitEdit(row.transaction_id, 'unit_price', v)}
                    onCancel={() => setEditingCell(null)}
                    align="right"
                  />

                  {/* Total */}
                  <td className="px-3 py-2 text-right text-gray-300">{fmt(row.total_amount)}</td>

                  {/* Payment */}
                  <td className="px-3 py-2 text-gray-400">{row.payment_method}</td>

                  {/* Discount */}
                  <td className="px-3 py-2 text-center">
                    {row.discount_applied
                      ? <span className="text-green-400">✓</span>
                      : <span className="text-gray-700">—</span>}
                  </td>

                  {/* Status — editable */}
                  <td className="px-3 py-2 text-center">
                    {editingCell?.id === row.transaction_id && editingCell.field === 'order_status' ? (
                      <select
                        autoFocus
                        defaultValue={row.order_status}
                        className="bg-[#1a1a24] border border-red-500/50 text-white text-xs rounded px-1 py-0.5 focus:outline-none"
                        onBlur={e => commitEdit(row.transaction_id, 'order_status', e.target.value)}
                        onChange={e => commitEdit(row.transaction_id, 'order_status', e.target.value)}
                      >
                        {['Delivered', 'Shipped', 'Processing', 'Pending', 'Cancelled'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${STATUS_STYLES[row.order_status] ?? ''}`}
                        onDoubleClick={() => setEditingCell({ id: row.transaction_id, field: 'order_status' })}
                        title="Double-click to edit"
                      >
                        {row.order_status}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-gray-600">
                  No orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-gray-800/50 px-6 py-3 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setPage(0)}
          disabled={page === 0}
          className="px-2 py-1 text-xs text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          «
        </button>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-2 py-1 text-xs text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>

        {pageButtons().map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="px-1 text-gray-600 text-xs">…</span>
            : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={[
                  'px-2.5 py-1 text-xs rounded transition-colors',
                  p === page
                    ? 'bg-red-900/50 text-red-300 border border-red-800/50'
                    : 'text-gray-500 hover:text-white',
                ].join(' ')}
              >
                {(p as number) + 1}
              </button>
            )
        )}

        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="px-2 py-1 text-xs text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
        <button
          onClick={() => setPage(totalPages - 1)}
          disabled={page >= totalPages - 1}
          className="px-2 py-1 text-xs text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          »
        </button>

        <span className="ml-auto text-xs text-gray-600">
          {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, totalCount).toLocaleString()} of {totalCount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── EditableCell ─────────────────────────────────────────────────────────────

function EditableCell({
  value,
  rawValue,
  editing,
  onDoubleClick,
  onCommit,
  onCancel,
  align,
}: {
  value: string;
  rawValue?: string;
  editing: boolean;
  onDoubleClick: () => void;
  onCommit: (v: string) => void;
  onCancel: () => void;
  align?: 'right';
}) {
  return (
    <td className={`px-3 py-2 ${align === 'right' ? 'text-right' : ''} text-gray-300`} onDoubleClick={onDoubleClick}>
      {editing ? (
        <input
          autoFocus
          defaultValue={rawValue ?? value}
          className="bg-[#1a1a24] border border-red-500/50 text-white text-xs px-1 py-0.5 rounded w-20 text-right focus:outline-none"
          onBlur={e => onCommit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') onCancel();
          }}
        />
      ) : (
        <span title="Double-click to edit" className="cursor-default">{value}</span>
      )}
    </td>
  );
}
