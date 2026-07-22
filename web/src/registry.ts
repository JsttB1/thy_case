import { lazy } from 'react';
import type React from 'react';
import type { DataKey } from './data/types';

/**
 * ★ TEK KAYIT NOKTASI
 *
 * Yeni feature eklemek = (1) src/features/<sekme>/FXX*.tsx yaz,
 *                        (2) aşağıdaki FEATURES dizisine bir satır ekle.
 * Başka hiçbir dosyaya dokunulmaz — üç kişi aynı anda üç feature yazarken çakışmaz.
 */

export type TabId =
  | 'overview'
  | 'demand'
  | 'inventory'
  | 'risk'
  | 'network'
  | 'scenario'
  | 'explorer';

export type IconName = 'gauge' | 'trending' | 'boxes' | 'alert' | 'map' | 'sliders' | 'table';

export interface TabDef {
  id: TabId;
  label: string;
  icon: IconName;
}

export type FeatureStatus = 'live' | 'beta' | 'planned';

export interface FeatureDef {
  id: string;
  tab: TabId;
  title: string;
  /** kart başlığının altındaki tek satır yöntem notu — jüri "nasıl hesapladınız" derse cevap ekranda */
  method?: string;
  /** 12 kolonluk gridde genişlik */
  span: 4 | 5 | 6 | 7 | 8 | 12;
  minHeight?: number;
  status: FeatureStatus;
  /** sadece bu JSON'lar fetch edilir */
  needs: DataKey[];
  Component?: React.LazyExoticComponent<React.FC>;
  /** status 'planned' ise placeholder'da görünen açıklama */
  plannedNote?: string;
  /** grid kartı değil, uygulama seviyesinde mount edilir (ör. çekmece) */
  global?: boolean;
  /**
   * Kart çerçevesi: 'card' (varsayılan) → grid başlık+yöntem notunu kendi çizer,
   * feature yalnız gövdeyi render eder. 'none' → feature kendi kabuğunu getirir
   * (F01 panosu gibi tam kanama gerektiren bileşenler).
   */
  chrome?: 'card' | 'none';
}

export const TABS: TabDef[] = [
  { id: 'overview', label: 'Genel Bakış', icon: 'gauge' },
  { id: 'demand', label: 'Talep & Tahmin', icon: 'trending' },
  { id: 'inventory', label: 'Envanter Sağlığı', icon: 'boxes' },
  { id: 'risk', label: 'Risk & Kritiklik', icon: 'alert' },
  { id: 'network', label: 'Ağ & Kapsama', icon: 'map' },
  { id: 'scenario', label: 'Senaryo Simülatörü', icon: 'sliders' },
  { id: 'explorer', label: 'PN Gezgini', icon: 'table' },
];

/**
 * FAZ 1: hepsi 'planned'. Sonraki fazlarda ilgili satırın status'ü 'live' yapılıp
 * Component alanına React.lazy(() => import(...)) bağlanacak.
 */
export const FEATURES: FeatureDef[] = [
  /* ── Sekme 1 — Genel Bakış ─────────────────────────────── */
  {
    id: 'F01',
    tab: 'overview',
    title: 'Sipariş Geri Sayım Panosu',
    method: 'tükenme günü = elde servis stoğu ÷ günlük talep · kalan gün = tükenme − lead time',
    span: 12,
    minHeight: 420,
    status: 'live',
    needs: ['inventory', 'kpi'],
    chrome: 'none',
    Component: lazy(() => import('./features/overview/F01CountdownBoard')),
  },
  {
    id: 'F02',
    tab: 'overview',
    title: 'KPI şeridi',
    method: 'case dummy setinden türetilmiş 2025 gerçekleşen ve 2033 projeksiyon değerleri',
    span: 12,
    minHeight: 150,
    status: 'live',
    needs: ['kpi'],
    Component: lazy(() => import('./features/overview/F02KpiStrip')),
  },
  {
    id: 'F03',
    tab: 'overview',
    title: 'Doğrusal büyüme yanılgısı',
    method: 'emniyet stoğu √λ ile büyür — filo +%66,7 ve talep +%63,6 iken min stok +%28,8',
    span: 6,
    minHeight: 300,
    status: 'live',
    needs: ['kpi'],
    Component: lazy(() => import('./features/overview/F03GrowthFallacy')),
  },
  {
    id: 'F04',
    tab: 'overview',
    title: 'Bugünün aksiyon listesi',
    method: 'kritiklik × geri sayım durumu × açık maliyet sıralamasından türetilmiş ilk 5 aksiyon',
    span: 6,
    minHeight: 300,
    status: 'live',
    needs: ['inventory', 'kpi'],
    Component: lazy(() => import('./features/overview/F04ActionList')),
  },

  /* ── Sekme 2 — Talep & Tahmin ──────────────────────────── */
  {
    id: 'F10',
    tab: 'demand',
    title: 'Model bazında talep 2025 → 2033',
    method: 'PN başına çeyreklik sökülme oranı × filo büyüme katsayısı, model kırılımında',
    span: 8,
    minHeight: 380,
    status: 'live',
    needs: ['demand'],
    Component: lazy(() => import('./features/demand/F10DemandByModel')),
  },
  {
    id: 'F11',
    tab: 'demand',
    title: 'Çeyreklik mevsimsellik',
    method: 'THY / havuz / scrap talebinin çeyreklik dağılımı — Q3 zirvesi yaz operasyonu',
    span: 4,
    minHeight: 380,
    status: 'live',
    needs: ['demand'],
    Component: lazy(() => import('./features/demand/F11Seasonality')),
  },
  {
    id: 'F12',
    tab: 'demand',
    title: 'ML modeli — eğitim, MAE, scatter',
    method: 'MLP-Poisson NLL kaybı · 4 çeyreklik veri üzerinde baseline karşılaştırması',
    span: 12,
    minHeight: 400,
    status: 'live',
    needs: ['model_ml'],
    Component: lazy(() => import('./features/demand/F12MlPanel')),
  },
  {
    id: 'F13',
    tab: 'demand',
    title: 'Kesikli talep analizi',
    method: 'ADI ve CV² eşiklerine göre kesikli (intermittent) sınıflandırma — 1.730 PN',
    span: 6,
    minHeight: 340,
    status: 'live',
    needs: ['demand', 'pn'],
    Component: lazy(() => import('./features/demand/F13Intermittent')),
  },
  {
    id: 'F14',
    tab: 'demand',
    title: 'Survival / Weibull hazard modeli',
    span: 6,
    minHeight: 340,
    status: 'planned',
    needs: [],
    plannedNote:
      'Komponent arıza zamanını Weibull hazard fonksiyonuyla modelleyip yaşa bağlı sökülme olasılığı üretmek. Uçuş saati / çevrim verisi gerektirir — dummy sette yok.',
  },

  /* ── Sekme 3 — Envanter Sağlığı ────────────────────────── */
  {
    id: 'F20',
    tab: 'inventory',
    title: 'Açık / Dengede / Fazla × kritiklik',
    method: 'elde servis stoğu min-max bandına göre sınıflandırılıp kritiklik ile çaprazlandı',
    span: 6,
    minHeight: 360,
    status: 'live',
    needs: ['inventory'],
    Component: lazy(() => import('./features/inventory/F20StatusMatrix')),
  },
  {
    id: 'F21',
    tab: 'inventory',
    title: 'Sermaye dağılımı',
    method: 'servis / pipeline / atıl / fazla stoğun CLP ve FMV üzerinden USD karşılığı',
    span: 6,
    minHeight: 360,
    status: 'live',
    needs: ['inventory'],
    Component: lazy(() => import('./features/inventory/F21Capital')),
  },
  {
    id: 'F22',
    tab: 'inventory',
    title: 'Geri sayım tablosu',
    method: 'kalan gün = (elde servis ÷ günlük talep) − lead time · artan sıralı',
    span: 12,
    minHeight: 500,
    status: 'live',
    needs: ['pn'],
    Component: lazy(() => import('./features/inventory/F22CountdownTable')),
  },
  {
    id: 'F23',
    tab: 'inventory',
    title: 'Tamir mi, yeni alım mı?',
    method: 'tamir maliyeti ÷ yeni alım (CLP) oranı — eşiği aşan kalemler scrap adayı',
    span: 6,
    minHeight: 360,
    status: 'live',
    needs: ['inventory', 'kpi'],
    Component: lazy(() => import('./features/inventory/F23RepairVsBuy')),
  },
  {
    id: 'F24',
    tab: 'inventory',
    title: 'Pipeline yaşlandırma',
    span: 6,
    minHeight: 360,
    status: 'planned',
    needs: [],
    plannedNote:
      'Pipeline\'daki 13.515 adedin sipariş tarihine göre yaşlandırılması — hangi siparişler beklemede kalmış. Sipariş tarihi alanı dummy sette yok.',
  },

  /* ── Sekme 4 — Risk & Kritiklik ────────────────────────── */
  {
    id: 'F30',
    tab: 'risk',
    title: 'AOG risk skoru dağılımı',
    method: 'kritiklik %35 · lead time %25 · filo büyümesi %20 · atölye yokluğu %10 · talep %10',
    span: 5,
    minHeight: 360,
    status: 'live',
    needs: ['risk', 'kpi'],
    Component: lazy(() => import('./features/risk/F30RiskHistogram')),
  },
  {
    id: 'F31',
    tab: 'risk',
    title: 'Isı haritası: alt kategori × kritiklik',
    method: 'ATA alt kategorisi × kritiklik seviyesinde ortalama risk skoru',
    span: 7,
    minHeight: 360,
    status: 'live',
    needs: ['risk'],
    Component: lazy(() => import('./features/risk/F31Heatmap')),
  },
  {
    id: 'F32',
    tab: 'risk',
    title: 'En riskli 100 PN',
    method: 'risk skoruna göre azalan sıralı, geri sayım durumu ile birlikte',
    span: 12,
    minHeight: 460,
    status: 'live',
    needs: ['risk'],
    Component: lazy(() => import('./features/risk/F32TopRisk')),
  },
  {
    id: 'F33',
    tab: 'risk',
    title: 'Risk skoru ayrıştırma',
    method: 'seçili PN\'in skoru 5 bileşene ayrılır — formül kartın altında, black box yok',
    span: 6,
    minHeight: 340,
    status: 'live',
    needs: ['pn', 'demand'],
    Component: lazy(() => import('./features/risk/F33RiskBreakdown')),
  },
  {
    id: 'F34',
    tab: 'risk',
    title: 'İç atölye yatırım adayları',
    method: 'dış tedarikli + yüksek lead time + yüksek talep kesişimi — iç kabiliyet ROI sıralaması',
    span: 6,
    minHeight: 340,
    status: 'live',
    needs: ['pn'],
    Component: lazy(() => import('./features/risk/F34WorkshopCandidates')),
  },

  /* ── Sekme 5 — Ağ & Kapsama ───────────────────────────── */
  {
    id: 'F40',
    tab: 'network',
    title: 'İstasyon ağı haritası',
    method: '15 istasyon · daire yarıçapı uçak sayısına, renk depo tipine göre',
    span: 12,
    minHeight: 520,
    status: 'planned',
    needs: ['stations'],
    plannedNote: 'MapLibre GL + CARTO Positron basemap. İstasyona tıklama detay açar.',
  },
  {
    id: 'F41',
    tab: 'network',
    title: 'AOG kapsama alanları',
    method: 'transferSaatIST ≤ eşik olan istasyonlar kapsanan sayılır (basitleştirilmiş, isochrone değil)',
    span: 6,
    minHeight: 420,
    status: 'planned',
    needs: ['stations', 'pn'],
    plannedNote: '4 / 12 / 24 saat eşiklerinde filonun ne kadarı kritik komponente erişebiliyor.',
  },
  {
    id: 'F42',
    tab: 'network',
    title: 'Havuzlama simülatörü (√n)',
    method: 'ssDağınık = Σ z√(λᵢL) · ssHavuzlu = z√(Σλᵢ L) · tasarruf = 1 − ssHavuzlu/ssDağınık',
    span: 6,
    minHeight: 420,
    status: 'planned',
    needs: ['stations', 'pn'],
    plannedNote: 'Merkezî havuz vs dağınık stok — aynı servis seviyesinde emniyet stoğu tasarrufu.',
  },
  {
    id: 'F43',
    tab: 'network',
    title: 'Transfer akış çizgileri',
    span: 6,
    minHeight: 360,
    status: 'planned',
    needs: [],
    plannedNote:
      'İstasyonlar arası komponent transfer hacmini harita üzerinde akış çizgisi olarak göstermek. Transfer işlem kaydı dummy sette yok.',
  },
  {
    id: 'F44',
    tab: 'network',
    title: '2033 yeni istasyon önerisi',
    span: 6,
    minHeight: 360,
    status: 'planned',
    needs: [],
    plannedNote:
      '2033 filo dağılımına göre kapsamı en çok artıracak yeni ileri depo konumunu tesis yerleşim optimizasyonu ile bulmak.',
  },

  /* ── Sekme 6 — Senaryo Simülatörü ─────────────────────── */
  {
    id: 'F50',
    tab: 'scenario',
    title: 'Kriz simülatörü',
    method: 'λL = rate₃₃(1+şok) × lead(1+gecikme) ÷ 91,25 · min = ⌈λL⌉ + ⌈z√(λL)⌉ · 5.000 PN canlı',
    span: 12,
    minHeight: 480,
    status: 'planned',
    needs: ['pn'],
    plannedNote: '3 slider + 4 hazır senaryo: baz durum, tedarikçi krizi, talep patlaması, küresel tıkanma.',
  },
  {
    id: 'F51',
    tab: 'scenario',
    title: 'Filo slider\'ı 1.200 → 2.000',
    method: 'k = (N−1200)/800 · rateN = rate₂₅ + (rate₃₃ − rate₂₅)·k — doğrusal vs √λ ölçekleme',
    span: 6,
    minHeight: 440,
    status: 'planned',
    needs: ['pn', 'fleet'],
    plannedNote: 'Demo\'nun en güçlü anı: iki ölçekleme eğrisi arasındaki makas, dolar cinsinden.',
  },
  {
    id: 'F52',
    tab: 'scenario',
    title: 'TAT kaldıracı (Little\'s Law)',
    method: 'dolaşımdaki ihtiyaç = sökülme hızı × döngü süresi — TAT %20 ↓ ise ihtiyaç %20 ↓',
    span: 6,
    minHeight: 440,
    status: 'planned',
    needs: ['pn'],
    plannedNote: 'Envanter probleminin bir kısmı satın alma değil, süreç problemi.',
  },
  {
    id: 'F53',
    tab: 'scenario',
    title: 'Mevcut yapı vs havuzlanmış yapı',
    span: 12,
    minHeight: 400,
    status: 'planned',
    needs: [],
    plannedNote:
      'F42 havuzlama sonucunu tüm ağ için toplulaştırıp mevcut yapıyla uçtan uca maliyet karşılaştırması.',
  },

  /* ── Sekme 7 — PN Gezgini ─────────────────────────────── */
  {
    id: 'F60',
    tab: 'explorer',
    title: '5.000 PN sanallaştırılmış tablo',
    method: 'pn.json kolonsal dizileri · @tanstack/react-virtual ile DOM\'da yalnız görünen satırlar',
    span: 12,
    minHeight: 600,
    status: 'planned',
    needs: ['pn'],
    plannedNote: 'Arama, çoklu filtre, tüm kolonlarda sıralama, CSV dışa aktarma.',
  },
  {
    id: 'F61',
    tab: 'explorer',
    title: 'PN detay çekmecesi',
    method: 'her sekmeden açılabilen global panel — talep, tedarik, stok, geri sayım blokları',
    span: 12,
    minHeight: 200,
    status: 'planned',
    needs: ['pn', 'inventory'],
    global: true,
    plannedNote: 'Sağdan açılan panel. Uygulama seviyesinde mount edilir, gridde kart olarak durmaz.',
  },
];

/**
 * Feature → uygulama fazı. Placeholder kartlarının köşesindeki rozet buradan gelir,
 * böylece jüri boş yer değil, bilinçli kapsam ve yol haritası görür.
 * Fazı olmayanlar dummy sette karşılığı bulunmayan, demo sonrası genişleme adayları.
 */
const FAZLAR: Record<number, string[]> = {
  2: ['F01', 'F02', 'F03', 'F04'],
  3: ['F10', 'F11', 'F12', 'F13', 'F20', 'F21', 'F22', 'F23', 'F30', 'F31', 'F32', 'F33', 'F34'],
  4: ['F50', 'F51', 'F52'],
  5: ['F40', 'F41', 'F42', 'F60', 'F61'],
};

export function fazEtiketi(id: string): string {
  for (const [faz, ids] of Object.entries(FAZLAR)) {
    if (ids.includes(id)) return `Faz ${faz}`;
  }
  return 'Yol haritası';
}

export const featuresByTab = (tab: TabId): FeatureDef[] => FEATURES.filter((f) => f.tab === tab);

/** Bir sekmenin ihtiyaç duyduğu tüm veri anahtarları — prefetch için. */
export const needsByTab = (tab: TabId): DataKey[] => [
  ...new Set(featuresByTab(tab).flatMap((f) => f.needs)),
];
