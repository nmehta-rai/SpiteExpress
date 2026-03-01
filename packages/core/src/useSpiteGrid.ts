import * as Y from 'yjs';
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
  
  // Collaborative Actions
  syncWithYjs: (yArray: Y.Array<Row>) => void;
};

export const useSpiteStore = create<SpiteGridState>((set, get) => {
  let yjsArray: Y.Array<Row> | null = null;

  return {
    data: [],
    sorting: [],
    filtering: [],
    pagination: { pageIndex: 0, pageSize: 20 },
    
    setData: (data) => {
      if (yjsArray) {
        yjsArray.doc?.transact(() => {
          yjsArray?.delete(0, yjsArray.length);
          yjsArray?.insert(0, data);
        });
      } else {
        set({ data });
      }
    },
    
    setSorting: (sorting) => set({ sorting }),
    setFiltering: (filtering) => set({ filtering }),
    setPagination: (pagination) => set({ pagination }),
    
    updateCell: (rowIndex, columnId, value) => {
      if (yjsArray) {
        const row = yjsArray.get(rowIndex);
        if (row) {
          const newRow = { ...row, [columnId]: value };
          yjsArray.delete(rowIndex, 1);
          yjsArray.insert(rowIndex, [newRow]);
        }
      } else {
        set((state) => {
          const newData = [...state.data];
          if (newData[rowIndex]) {
            newData[rowIndex] = { ...newData[rowIndex], [columnId]: value };
          }
          return { data: newData };
        });
      }
    },

    syncWithYjs: (yArray) => {
      yjsArray = yArray;
      
      // Initial sync
      set({ data: yArray.toArray() });

      // Listen for remote changes
      yArray.observe(() => {
        set({ data: yArray.toArray() });
      });
    }
  };
});

export const useSpiteGrid = () => {
  const store = useSpiteStore();
  
  return {
    ...store,
  };
};
