import type { SpiteGridState } from '../useSpiteGrid';

export type SpiteRemoteRequest = {
  sort: Array<{ field: string; direction: 'asc' | 'desc' }>;
  filter: Record<string, any>;
  skip: number;
  take: number;
};

export const buildRemoteRequest = (state: SpiteGridState): SpiteRemoteRequest => {
  return {
    sort: state.sorting.map((s) => ({ field: s.id, direction: s.desc ? 'desc' : 'asc' })),
    filter: state.filtering.reduce((acc, f) => ({ ...acc, [f.id]: f.value }), {}),
    skip: state.pagination.pageIndex * state.pagination.pageSize,
    take: state.pagination.pageSize,
  };
};
