/**
 * Uygulama durumu (zustand).
 *
 * Tek dosyalık sürümde bu iş global mutable nesnelerle (W, H, SC, KMD) yapılıyordu
 * ve ekranlar birbirini doğrudan çağırıyordu. Burada aynı davranış tek bir mağazada
 * toplanıyor: ekranlar arası köprüler (Karar Merkezi → Watchlist → Harita) birer
 * eylem; senaryo parametreleri her sekmede aynı anda geçerli.
 */
import { create } from 'zustand';
import type { FlagKey } from '@/engine/flags';
import { BAZ_CFG, PARAM_BAZ, type SenaryoCfg, type ParamCfg } from '@/engine/senaryo';
import type { Kova, Pencere } from '@/engine/ladder';

export const SEKMELER = [
  { k: 'karar', ad: 'CODE' },
  { k: 'watch', ad: 'WATCHLIST' },
  { k: 'ongoru', ad: 'ÖNGÖRÜ & AI' },
  { k: 'harita', ad: 'HARİTA' },
  { k: 'senaryo', ad: 'SENARYO' },
] as const;

export type Sekme = (typeof SEKMELER)[number]['k'];

export type SiralamaAnahtar =
  | 'risk'
  | 'id'
  | 'sub'
  | 'mdl'
  | 'kr'
  | 't25'
  | 't33'
  | 'svc'
  | 'tts'
  | 'ttr'
  | 'min33'
  | 'clp'
  | 'fmv'
  | 'durum';

export interface WatchFiltre {
  flags: Set<FlagKey>;
  kr: '' | '0' | '1' | '2';
  q: string;
  kanal: '' | Kova;
  pencere: '' | Pencere | 'gecmis0';
}

export const BOS_FILTRE: WatchFiltre = {
  flags: new Set(),
  kr: '',
  q: '',
  kanal: '',
  pencere: '',
};

/** Oturum içi aksiyon kaydı — sunucu yok, sayfa yenilenince sıfırlanır. */
export interface Karar {
  k: 'onay' | 'ata' | 'talep';
  metin: string;
  zaman: string;
}

/** Haritada bir parçanın rotasını gösterme isteği (Karar Merkezi'nden gelir). */
export interface HaritaOdak {
  parca: number;
  hedef: string;
  mod: 'depo' | 'rota';
  /** aynı parçaya tekrar tıklanınca da tetiklensin diye artan sayaç */
  nonce: number;
}

interface Durum {
  sekme: Sekme;
  /** geçiş yönü: +1 sağa, −1 sola — sahne animasyonu bunu kullanır */
  yon: number;
  sozlukAcik: boolean;
  /** açılış sahnesi (dijital hangar) ekranda mı — uygulama onun arkasında durur */
  giris: boolean;

  watch: WatchFiltre;
  siralama: { k: SiralamaAnahtar; artan: boolean };
  seciliPn: number;
  /** CODE karar konsolunda incelenen parça (kritik karar kuyruğu) */
  codeParca: number;
  /** karar kuyruğu süzgeci: hangi kritik küme konsola düşüyor */
  codeKuyruk: 'alarm' | 'aog' | 'ber' | 'risk';
  /** oturum içi aksiyon kaydı: parça indeksi → verilen karar */
  kararlar: Record<number, Karar>;
  /** aksiyon merdiveninde seçili hedef istasyon (rota çizimi bunsuz başlamaz) */
  hedefIstasyon: string;

  haritaOdak: HaritaOdak | null;
  /** CODE karar konsoluna kaydırma isteği — nonce, aynı parçaya ikinci tıklamayı da tetikler */
  codeOdak: { i: number; nonce: number } | null;

  senaryo: SenaryoCfg & { preset: string };
  params: ParamCfg;
  /** kriz.ts PROFILLER anahtarı — şokun zamana yayılma biçimi */
  profil: string;
  /** takvimde incelenen ay, 0 = kriz öncesi */
  ay: number;

  git: (s: Sekme) => void;
  sozlugeBas: (a?: boolean) => void;
  /** kapıdan geç: açılış sahnesi kapanır, uygulama görünür */
  girisKapat: () => void;
  /** açılış sahnesini yeniden oynat (üst bardaki markaya tıklayınca) */
  girisAc: () => void;

  /** Karar Merkezi → Watchlist: kanala/pencereye süzülü aç */
  watchAc: (f: Partial<Pick<WatchFiltre, 'kanal' | 'pencere'>> & { flag?: FlagKey }) => void;
  /** herhangi bir ekrandan parça detayına git */
  parcaAc: (i: number) => void;
  /** CODE konsolunda parçayı seç (sekme değiştirmeden) */
  codeSec: (i: number) => void;
  /** herhangi bir ekrandan CODE karar konsoluna götür */
  codeAc: (i: number) => void;
  kuyrukSec: (k: 'alarm' | 'aog' | 'ber' | 'risk') => void;
  /** Karar Merkezi → Harita: fazla stok transfer rotasını çiz */
  haritadaGoster: (parca: number, hedef: string, mod?: 'depo' | 'rota') => void;

  filtreDegis: (y: Partial<WatchFiltre>) => void;
  flagDegis: (f: FlagKey) => void;
  filtreSifirla: () => void;
  siralamaDegis: (k: SiralamaAnahtar) => void;
  sec: (i: number) => void;
  kararVer: (i: number, k: Karar | null) => void;
  hedefSec: (k: string) => void;

  senaryoDegis: (y: Partial<SenaryoCfg & { preset: string }>) => void;
  paramDegis: (y: Partial<ParamCfg>) => void;
  paramSifirla: () => void;
  profilSec: (k: string) => void;
  aySec: (n: number) => void;
}

const sira = (s: Sekme) => SEKMELER.findIndex((x) => x.k === s);

export const useStore = create<Durum>((set, get) => ({
  sekme: 'karar',
  yon: 1,
  sozlukAcik: false,
  giris: true,

  watch: { ...BOS_FILTRE, flags: new Set() },
  siralama: { k: 'risk', artan: false },
  seciliPn: -1,
  codeParca: -1,
  codeOdak: null,
  codeKuyruk: 'alarm',
  kararlar: {},
  hedefIstasyon: '',
  haritaOdak: null,

  senaryo: { ...BAZ_CFG, preset: 'baz' },
  params: { ...PARAM_BAZ },
  profil: 'kademeli',
  ay: 0,

  git: (s) => {
    const o = get().sekme;
    if (o === s) return;
    set({ sekme: s, yon: sira(s) > sira(o) ? 1 : -1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  sozlugeBas: (a) => set((st) => ({ sozlukAcik: a ?? !st.sozlukAcik })),

  girisKapat: () => set({ giris: false }),
  girisAc: () => set({ giris: true }),

  watchAc: (f) => {
    const flags = new Set<FlagKey>();
    if (f.flag) flags.add(f.flag);
    set({
      watch: {
        ...BOS_FILTRE,
        flags,
        kanal: f.kanal ?? '',
        pencere: f.pencere ?? '',
      },
      seciliPn: -1,
    });
    get().git('watch');
  },

  parcaAc: (i) => {
    set({ seciliPn: i });
    get().git('watch');
  },

  codeSec: (i) => set({ codeParca: i }),

  /* Sekme değiştirmek YETMİYOR: kullanıcı konsolda karar vermeye geliyor ama
     CODE sayfanın en başında açılıyordu ve konsol iki ekran aşağıdaydı. nonce,
     aynı parça için ikinci kez basıldığında da kaydırmayı tetikler. */
  codeAc: (i) => {
    set((st) => ({ codeParca: i, codeOdak: { i, nonce: (st.codeOdak?.nonce ?? 0) + 1 } }));
    get().git('karar');
  },

  kuyrukSec: (k) => set({ codeKuyruk: k, codeParca: -1 }),

  haritadaGoster: (parca, hedef, mod = 'depo') => {
    set((st) => ({
      haritaOdak: { parca, hedef, mod, nonce: (st.haritaOdak?.nonce ?? 0) + 1 },
    }));
    get().git('harita');
  },

  filtreDegis: (y) => set((st) => ({ watch: { ...st.watch, ...y } })),

  flagDegis: (f) =>
    set((st) => {
      const flags = new Set(st.watch.flags);
      if (flags.has(f)) flags.delete(f);
      else flags.add(f);
      return { watch: { ...st.watch, flags } };
    }),

  filtreSifirla: () => set({ watch: { ...BOS_FILTRE, flags: new Set() } }),

  siralamaDegis: (k) =>
    set((st) => ({
      siralama: st.siralama.k === k ? { k, artan: !st.siralama.artan } : { k, artan: false },
    })),

  sec: (i) => set({ seciliPn: i }),
  kararVer: (i, k) =>
    set((st) => {
      const y = { ...st.kararlar };
      if (k) y[i] = k;
      else delete y[i];
      return { kararlar: y };
    }),
  hedefSec: (k) => set({ hedefIstasyon: k }),

  senaryoDegis: (y) => set((st) => ({ senaryo: { ...st.senaryo, ...y } })),
  paramDegis: (y) => set((st) => ({ params: { ...st.params, ...y } })),
  paramSifirla: () => set({ params: { ...PARAM_BAZ } }),

  /* Profil değişince ay SIFIRLANIR: ani darbe 10 ay, uzun sürükleyen 27 ay —
     eski ay yeni takvimin dışında kalabiliyor. */
  profilSec: (k) => set({ profil: k, ay: 0 }),
  aySec: (n) => set({ ay: Math.max(0, n) }),
}));
