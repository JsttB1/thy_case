/**
 * Paylaşılan arayüz parçaları. Sınıf adları tek dosyalık sürümle aynı
 * (base.css'te tanımlı) — görsel dil tek yerden yönetilir.
 */
import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { ogeVaryant, listeVaryant } from '@/design/motion';
import { KR_RENK } from '@/design/renkler';
import { PN, LK } from '@/data/payload';

/* ---------------------------------------------------------------- bölüm başlığı */
export function Bolum({ baslik, aciklama }: { baslik: string; aciklama?: ReactNode }) {
  return (
    <>
      <motion.h2
        className="sec-h"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        {baslik}
      </motion.h2>
      {aciklama && <p className="sec-p">{aciklama}</p>}
    </>
  );
}

/* ---------------------------------------------------------------------- kart */
export function Kart({
  baslik,
  ipucu,
  children,
  sinif = '',
  stil,
  sag,
}: {
  baslik?: ReactNode;
  ipucu?: ReactNode;
  children?: ReactNode;
  sinif?: string;
  stil?: CSSProperties;
  /** başlık satırının sağına düşen içerik (rozet, çip grubu…) */
  sag?: ReactNode;
}) {
  return (
    <motion.div className={'card ' + sinif} style={stil} variants={ogeVaryant}>
      {(baslik || sag) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {typeof baslik === 'string' ? <h3>{baslik}</h3> : baslik}
          {sag && <div style={{ marginLeft: 'auto' }}>{sag}</div>}
        </div>
      )}
      {ipucu && <div className="hint">{ipucu}</div>}
      {children}
    </motion.div>
  );
}

/* ----------------------------------------------------------------------- KPI */
export function Kpi({
  etiket,
  deger,
  alt,
  ton = '',
  renk,
  isaret,
}: {
  etiket: string;
  deger: ReactNode;
  alt?: ReactNode;
  ton?: '' | 'teal' | 'amber' | 'red';
  renk?: string;
  isaret?: string;
}) {
  return (
    <motion.div className={'kpi ' + ton} variants={ogeVaryant}>
      {isaret && <span className="spark">{isaret}</span>}
      <div className="l">{etiket}</div>
      <div className="v" style={renk ? { color: renk } : undefined}>
        {deger}
      </div>
      {alt && <div className="d">{alt}</div>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------- callout */
export function Vurgu({
  etiket,
  ton = '',
  children,
}: {
  etiket: string;
  ton?: '' | 'red' | 'amber';
  children: ReactNode;
}) {
  return (
    <motion.div className={'callout ' + ton} variants={ogeVaryant}>
      <span className="tag">{etiket}</span>
      <p>{children}</p>
    </motion.div>
  );
}

/* -------------------------------------------------------------------- rozet */
export function Rozet({
  tip,
  children,
  stil,
}: {
  tip: 'aog' | 'kri' | 'nk' | 'red' | 'teal' | 'warn' | 'sari' | 'mor';
  children: ReactNode;
  stil?: CSSProperties;
}) {
  return (
    <span className={`bg bg-${tip}`} style={stil}>
      {children}
    </span>
  );
}

/** kritiklik rozeti — AOG / KRİTİK / DEĞİL */
export function KrRozet({ kr }: { kr: number }) {
  if (kr === 0) return <Rozet tip="aog">AOG</Rozet>;
  if (kr === 1) return <Rozet tip="kri">KRİTİK</Rozet>;
  return <Rozet tip="nk">DEĞİL</Rozet>;
}

/** kritiklik nokta göstergesi (tablo hücresi) */
export function KrNokta({ i }: { i: number }) {
  return (
    <span
      className="sdot"
      style={{ background: KR_RENK[PN.kr[i]] }}
      title={LK.kr[PN.kr[i]]}
      aria-label={LK.kr[PN.kr[i]]}
    />
  );
}

/* --------------------------------------------------------------------- çubuk */
export function Cubuk({
  oran,
  renk,
  yukseklik = 6,
  genislik,
}: {
  /** 0–100 */
  oran: number;
  renk: string;
  yukseklik?: number;
  genislik?: number | string;
}) {
  return (
    <div className="bar-track" style={{ height: yukseklik, width: genislik }}>
      <motion.i
        style={{ background: renk }}
        initial={{ width: 0 }}
        animate={{ width: Math.max(0, Math.min(100, oran)) + '%' }}
        transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------- çip */
export function Cip({
  acik,
  onClick,
  children,
  baslik,
  pasif,
  stil,
}: {
  acik?: boolean;
  /** Olay verilir: iç içe tıklanabilir kartlarda stopPropagation gerekiyor. */
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
  baslik?: string;
  pasif?: boolean;
  stil?: CSSProperties;
}) {
  return (
    <button
      type="button"
      className={'chip' + (acik ? ' on' : '') + (pasif ? ' dis' : '')}
      onClick={onClick}
      title={baslik}
      style={stil}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ kaydırıcı */
export function Kaydirici({
  etiket,
  deger,
  min,
  max,
  adim = 1,
  bicim,
  onDegis,
}: {
  etiket: string;
  deger: number;
  min: number;
  max: number;
  adim?: number;
  bicim: (v: number) => string;
  onDegis: (v: number) => void;
}) {
  return (
    <div className="sl">
      <label>
        {etiket} <b>{bicim(deger)}</b>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={adim}
        value={deger}
        onChange={(e) => onDegis(+e.target.value)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- ızgara */
export function Izgara({
  tip,
  children,
  stil,
}: {
  tip: 'g2' | 'g3' | 'g4' | 'g21' | 'g12';
  children: ReactNode;
  stil?: CSSProperties;
}) {
  return (
    <motion.div
      className={'grid ' + tip}
      style={stil}
      variants={listeVaryant}
      initial="gizli"
      animate="gorunur"
    >
      {children}
    </motion.div>
  );
}

/** animasyonlu liste sarmalayıcı (kart olmayan blok yığınları için) */
export function Yigin({ children, stil }: { children: ReactNode; stil?: CSSProperties }) {
  return (
    <motion.div style={stil} variants={listeVaryant} initial="gizli" animate="gorunur">
      {children}
    </motion.div>
  );
}

export const Oge = motion.div;
