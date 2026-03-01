export type SpiteGridState = {
  sorting: Array<{ id: string; desc: boolean }>;
  filtering: Array<{ id: string; value: any }>;
  pagination: { pageIndex: number; pageSize: number };
};

export type SpiteRemoteRequest = {
  sort: Array<{ field: string; direction: 'asc' | 'desc' }>;
  filter: Record<string, any>;
  skip: number;
  take: number;
};

export const createRemoteAdapter = (state: SpiteGridState): SpiteRemoteRequest => {
  return {
    sort: state.sorting.map((s) => ({ field: s.id, direction: s.desc ? 'desc' : 'asc' })),
    filter: state.filtering.reduce((acc, f) => ({ ...acc, [f.id]: f.value }), {}),
    skip: state.pagination.pageIndex * state.pagination.pageSize,
    take: state.pagination.pageSize,
  };
};
