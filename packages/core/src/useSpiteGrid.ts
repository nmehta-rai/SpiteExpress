import { create } from 'zustand';

export type CellValue = string | number | boolean | null | undefined;

export type Row = Record<string, CellValue>;

export type SpiteGridState = {
  data: Row[];
  sorting: Array<{ id: string; desc: boolean }>;
  filtering: Array<{ id: string; value: any }>;
  pagination: { pageIndex: number; pageSize: number };
  
  // Actions
  setData: (data: Row[]) => void;
  setSorting: (sorting: SpiteGridState['sorting']) => void;
  setFiltering: (filtering: SpiteGridState['filtering']) => void;
  setPagination: (pagination: SpiteGridState['pagination']) => void;
  updateCell: (rowIndex: number, columnId: string, value: CellValue) => void;
};

export const useSpiteStore = create<SpiteGridState>((set) => ({
  data: [],
  sorting: [],
  filtering: [],
  pagination: { pageIndex: 0, pageSize: 20 },
  
  setData: (data) => set({ data }),
  setSorting: (sorting) => set({ sorting }),
  setFiltering: (filtering) => set({ filtering }),
  setPagination: (pagination) => set({ pagination }),
  
  updateCell: (rowIndex, columnId, value) => set((state) => {
    const newData = [...state.data];
    if (newData[rowIndex]) {
      newData[rowIndex] = { ...newData[rowIndex], [columnId]: value };
    }
    return { data: newData };
  }),
}));

export const useSpiteGrid = () => {
  const store = useSpiteStore();
  
  return {
    ...store,
    // Core logic for processing data (sorting, filtering) happens here
    // or is delegated to the remote adapter.
  };
};
