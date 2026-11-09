/**
 * Uygulama durumu (zustand + immer). Veri ve arayüz tercihleri tarayıcının IndexedDB deposunda saklanır;
 * sunucuya hiçbir veri gönderilmez.
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { del, get, set } from "idb-keyval";
import type { Dataset, Methodology, TableKind, Tab } from "../domain/types";
import { M0 } from "../domain/constants";
import { builtinDataset } from "../domain/sampleData";
import { clone } from "../domain/text";
import type { StageState } from "../io/importer";

export interface UiState {
  tab: Tab;
  sel: string | null;
  q: string;
  proc: string;
  pg: number;
  ps: number;
  /** Seçili riskin sayfasına git ve satırı görünür yap */
  jump: boolean;
  tsub: TableKind;
  tq: string;
  tf: Record<TableKind, Record<string, string>>;
  tw: Record<TableKind, Record<string, number>>;
  hid: Record<TableKind, string[]>;
  colp: boolean;
}

export interface AppState extends Dataset {
  base: Dataset;
  m: Methodology;
  seq: number;
  ui: UiState;
  hydrated: boolean;
  /** Genel amaçlı değişiklik: taslak üzerinde doğrudan değiştirin. */
  mutate: (fn: (s: AppState) => void) => void;
  setUi: (p: Partial<UiState>) => void;
  loadDataset: (d: Dataset, m?: Methodology) => void;
  resetToBase: () => void;
}

const initialUi = (): UiState => ({
  tab: "sim", sel: null, q: "", proc: "", pg: 0, ps: 30, jump: false,
  tsub: "r", tq: "", tf: { r: {}, c: {} }, tw: { r: {}, c: {} }, hid: { r: [], c: [] }, colp: false
});

function fromDataset(d: Dataset) {
  return { risks: clone(d.risks), controls: clone(d.controls), src: clone(d.src), base: clone(d) };
}

/** IndexedDB depolaması; yazmalar 300 ms birleştirilir (yazarken her tuşta kaydetmemek için). */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const idbStorage: StateStorage = {
  getItem: async (name) => {
    try { return (await get<string>(name)) ?? null; } catch { return null; }
  },
  setItem: (name, value) => {
    clearTimeout(timers.get(name));
    timers.set(name, setTimeout(() => {
      try { set(name, value).catch(() => { /* depolama dolu veya engelli */ }); } catch { /* IndexedDB yok (ör. gizli pencere) */ }
    }, 300));
  },
  removeItem: async (name) => {
    try { await del(name); } catch { /* yok say */ }
  }
};

export const useApp = create<AppState>()(
  persist(
    immer((setState) => {
      const d = builtinDataset();
      return {
        ...fromDataset(d),
        m: clone(M0),
        seq: 1,
        ui: { ...initialUi(), sel: d.risks[0]?.id ?? null },
        hydrated: false,
        mutate: (fn) => setState((s) => { fn(s as AppState); }),
        setUi: (p) => setState((s) => { Object.assign(s.ui, p); }),
        loadDataset: (data, m) => setState((s) => {
          Object.assign(s, fromDataset(data));
          if (m) s.m = clone(m);
          s.ui.sel = data.risks[0]?.id ?? null;
          s.ui.pg = 0;
          s.ui.q = "";
          s.ui.proc = "";
          s.ui.tf = { r: {}, c: {} };
        }),
        resetToBase: () => setState((s) => {
          s.risks = clone(s.base.risks);
          s.controls = clone(s.base.controls);
          if (!s.risks.some((r) => r.id === s.ui.sel)) s.ui.sel = s.risks[0]?.id ?? null;
        })
      };
    }),
    {
      name: "bgd-risk-sim",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ risks: s.risks, controls: s.controls, src: s.src, base: s.base, m: s.m, seq: s.seq, ui: { ...s.ui, jump: false, colp: false } }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return { ...current, ...p, ui: { ...current.ui, ...(p.ui ?? {}) } };
      },
      onRehydrateStorage: () => () => { useApp.setState({ hydrated: true }); }
    }
  )
);

/* ---------- Yükleme alanları (kalıcı değil) ---------- */
interface StageStore {
  stage: StageState;
  setSlot: (k: "r" | "c" | "m", v: StageState["r"]) => void;
  setIncl: (v: boolean) => void;
  clear: () => void;
}
export const useStage = create<StageStore>()((setState) => ({
  stage: { r: null, c: null, m: null, incl: false },
  setSlot: (k, v) => setState((s) => ({ stage: { ...s.stage, [k]: v, ...(k === "r" && !v ? { incl: false } : {}) } })),
  setIncl: (v) => setState((s) => ({ stage: { ...s.stage, incl: v } })),
  clear: () => setState({ stage: { r: null, c: null, m: null, incl: false } })
}));

/* ---------- Bildirim ---------- */
interface ToastStore { msg: string | null; show: (m: string) => void }
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export const useToast = create<ToastStore>()((setState) => ({
  msg: null,
  show: (msg) => {
    clearTimeout(toastTimer);
    setState({ msg });
    toastTimer = setTimeout(() => setState({ msg: null }), 2800);
  }
}));
export const toast = (m: string) => useToast.getState().show(m);
