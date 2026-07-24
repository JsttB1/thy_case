import { create } from 'zustand';
import type { Durum, Kritiklik } from './data/types';
import type { TabId } from './registry';

/**
 * Sekmeler arası ortak durum (spec 2.1).
 * Kalıcılaştırma YOK — localStorage/sessionStorage kullanılmıyor (kabul kriteri 9).
 */

export type FiloYili = 2025 | 2033;

export interface Senaryo {
  /** talep şoku, 0–0.8 */
  talepSoku: number;
  /** lead time gecikmesi, 0–1.0 */
  leadGecikme: number;
  /** servis hedefi z bonusu, 0–0.3 */
  servisBonusu: number;
  /** filo boyutu, 1200–2000 */
  filoBoyut: number;
}

export const BAZ_SENARYO: Senaryo = {
  talepSoku: 0,
  leadGecikme: 0,
  servisBonusu: 0,
  filoBoyut: 2000,
};

interface AppState {
  aktifSekme: TabId;
  filoYili: FiloYili;

  kritiklikFiltresi: Kritiklik[];
  modelFiltresi: string[];
  durumFiltresi: Durum[];
  arama: string;

  /** açık PN detay çekmecesi — "PN-101058" ya da null */
  seciliPn: string | null;

  senaryo: Senaryo;

  setSekme: (t: TabId) => void;
  setFiloYili: (y: FiloYili) => void;

  setKritiklik: (k: Kritiklik[]) => void;
  toggleKritiklik: (k: Kritiklik) => void;
  setModel: (m: string[]) => void;
  setDurum: (d: Durum[]) => void;
  setArama: (q: string) => void;
  filtreleriSifirla: () => void;

  setSeciliPn: (pn: string | null) => void;

  setSenaryo: (patch: Partial<Senaryo>) => void;
  senaryoSifirla: () => void;
}

export const useStore = create<AppState>((set) => ({
  aktifSekme: 'ai',
  filoYili: 2033,

  kritiklikFiltresi: [],
  modelFiltresi: [],
  durumFiltresi: [],
  arama: '',

  seciliPn: null,

  senaryo: { ...BAZ_SENARYO },

  setSekme: (t) => set({ aktifSekme: t }),
  setFiloYili: (y) => set({ filoYili: y }),

  setKritiklik: (k) => set({ kritiklikFiltresi: k }),
  toggleKritiklik: (k) =>
    set((s) => ({
      kritiklikFiltresi: s.kritiklikFiltresi.includes(k)
        ? s.kritiklikFiltresi.filter((x) => x !== k)
        : [...s.kritiklikFiltresi, k],
    })),
  setModel: (m) => set({ modelFiltresi: m }),
  setDurum: (d) => set({ durumFiltresi: d }),
  setArama: (q) => set({ arama: q }),
  filtreleriSifirla: () =>
    set({ kritiklikFiltresi: [], modelFiltresi: [], durumFiltresi: [], arama: '' }),

  setSeciliPn: (pn) => set({ seciliPn: pn }),

  setSenaryo: (patch) => set((s) => ({ senaryo: { ...s.senaryo, ...patch } })),
  senaryoSifirla: () => set({ senaryo: { ...BAZ_SENARYO } }),
}));

/** Boş dizi = "hepsi" anlamına gelir; filtre aktif mi diye tek yerden sor. */
export const filtreAktif = (s: AppState): boolean =>
  s.kritiklikFiltresi.length > 0 ||
  s.modelFiltresi.length > 0 ||
  s.durumFiltresi.length > 0 ||
  s.arama.trim() !== '';
