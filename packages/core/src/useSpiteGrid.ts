import { create } from 'zustand';

type SpiteGridState = {
  sorting: Array<{ id: string; desc: boolean }>;
  filtering: Array<{ id: string; value: any }>;
  setSorting: (sorting: SpiteGridState['sorting']) => void;
  setFiltering: (filtering: SpiteGridState['filtering']) => void;
};

export const useSpiteStore = create<SpiteGridState>((set) => ({
  sorting: [],
  filtering: [],
  setSorting: (sorting) => set({ sorting }),
  setFiltering: (filtering) => set({ filtering }),
}));

export const useSpiteGrid = () => {
  const { sorting, filtering, setSorting, setFiltering } = useSpiteStore();
  
  return {
    sorting,
    filtering,
    setSorting,
    setFiltering,
    // Core logic will be expanded here
  };
};