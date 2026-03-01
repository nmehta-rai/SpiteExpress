# Project Plan: SpiteExpress 👹

## The Vision
A headless, high-performance React data grid built specifically to end the misery of styling DevExpress components. It matches enterprise feature sets (DevExtreme) but offers total UI freedom and native AI "vibe coding" optimizations.

## Core Pillars
1. **Headless Core:** `useSpiteGrid()` hook handles logic; developer handles markup. No fighting nested CSS classes.
2. **Infinite Scale:** 2D Virtualization (row + column) built-in from day zero.
3. **Atomic State:** Zustand/Jotai powered state management for zero-lag cell editing.
4. **Beyond Enterprise:** Native data viz (sparklines, heatmaps) and AI-steerable API.
5. **AI Vibe Coding Friendly:** Predictable, composable structure that makes it trivial for an LLM to generate and mutate grid states.

## Roadmap to MVP

### Phase 1: The Foundation (Scaffolding)
- [x] Initialize Monorepo (Turborepo + Vite + TypeScript).
- [x] Implement `useSpiteGrid` core state (Sorting, Filtering logic).
- [x] Build the Virtualization Engine (Row/Column).

### Phase 2: Feature Parity (The Spite List)
- [x] **Remote Data Handling:** Universal adapter for server-side pagination/filtering/sorting/grouping. (A massive pain point in DevExpress).
- [x] **Grouping & Aggregation:** Master-detail views and multi-level grouping.
- [ ] **Filter Builder:** A standalone headless component for complex query building.
- [ ] **Export Engine:** Native PDF/Excel export (Worker-based for performance).

### Phase 3: The "Vibe Coding" Layer
- [ ] **AI-Friendly Manifest:** Schema-first design that helps AI models understand the grid structure.
- [ ] **Command API:** Let LLMs steer the grid ("Sort by price then filter where stock < 10").

### Phase 4: Launch & Portfolio
- [ ] Build the **SpiteExpress Landing Page**.
- [ ] Create a "DevExpress vs SpiteExpress" styling demo (The "Spite-off").
- [ ] Deploy to Portfolio.

## Server-Side Strategy
Instead of complex configurations, SpiteExpress uses a **Protocol-First** approach. We define a standard JSON structure for "Grid State" (filters, sorts, pages) and provide a lightweight backend utility to translate that state into SQL/Prisma/Mongo queries automatically.

---
*Created by Migo for Nikhil Rai*