export type GridRequest = {
  page: number;
  pageSize: number;
  sorts: Array<{ id: string; desc: boolean }>;
  filters: Array<{ id: string; value: any }>;
  grouping?: string[];
};

export type GridResponse<T> = {
  data: T[];
  totalCount: number;
  summary?: any;
};

export type RemoteAdapter<T> = (request: GridRequest) => Promise<GridResponse<T>>;

export const createRemoteAdapter = <T>(fetcher: (req: GridRequest) => Promise<GridResponse<T>>): RemoteAdapter<T> => {
  return async (request) => {
    try {
      return await fetcher(request);
    } catch (error) {
      console.error('SpiteExpress Remote Adapter Error:', error);
      throw error;
    }
  };
};