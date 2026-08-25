/**
 * CODE ÇEKİRDEĞİ — 3D operasyon küresi.
 *
 * Süs değil, veri: küre üzerindeki her nokta gerçek bir parçadır. Parçalar risk
 * skoruna göre sıralı geldiği için Fibonacci yerleşimi en riskli parçaları KUZEY
 * KUTBUNDA toplar — kürenin tepesi "risk kutbu"dur, aşağı indikçe portföy sakinleşir.
 * Nokta rengi karar motorunun o parçaya verdiği kanaldır (aynı kanalSec çağrısı).
 *
 * Tıklanan nokta karar konsoluna düşer: sahneden seçim ile listeden seçim aynı şey.
 * Yörüngedeki düğümler, tek veri modeline akan dağınık kaynaklardır (CLAUDE.md §1.3).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PN, NPN, LK } from '@/data/payload';
import { kararMotoru } from '@/engine/karar';
import { FL, hasF } from '@/engine/flags';
import { SC, KAYNAKLAR, TIP_RENK } from './sahneVeri';

/** Fibonacci küresi: i indeksi → birim küre üzerinde düzgün dağılmış nokta. */
function fibonacci(n: number): Float32Array {
  const p = new Float32Array(n * 3);
  const alt = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = alt * i;
    p[i * 3] = Math.cos(th) * r;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = Math.sin(th) * r;
  }
  return p;
}

interface Kume {
  poz: Float32Array;
  idx: Int32Array;
  renk: string;
  boy: number;
  opak: number;
}

/** Parçaları duruma göre üç kümeye böler; her kümenin kendi nokta boyu olur. */
function kumeler(): { kume: Kume[]; hepsi: Float32Array } {
  const d = kararMotoru();
  const hepsi = fibonacci(NPN);
  const grup: number[][] = [[], [], []]; // 0 alarm · 1 kırmızı · 2 diğer
  for (let i = 0; i < NPN; i++) {
    grup[hasF(i, FL.SIP) ? 0 : hasF(i, FL.KIRMIZI) ? 1 : 2].push(i);
  }
  const yap = (liste: number[], renk: string, boy: number, opak: number): Kume => {
    const poz = new Float32Array(liste.length * 3);
    const idx = new Int32Array(liste.length);
    liste.forEach((g, j) => {
      poz[j * 3] = hepsi[g * 3];
      poz[j * 3 + 1] = hepsi[g * 3 + 1];
      poz[j * 3 + 2] = hepsi[g * 3 + 2];
      idx[j] = g;
    });
    return { poz, idx, renk, boy, opak };
  };
  // "diğer" kümesi kendi içinde aksiyon/izle ayrımını renkle taşır → iki ayrı küme
  const aksiyon = grup[2].filter((i) => d.kanal[i] !== 'izle');
  const izle = grup[2].filter((i) => d.kanal[i] === 'izle');
  return {
    hepsi,
    kume: [
      yap(izle, SC.izle, 0.016, 0.5),
      yap(aksiyon, SC.aksiyon, 0.02, 0.8),
      yap(grup[1], SC.kirmizi, 0.03, 0.95),
      yap(grup[0], SC.alarm, 0.042, 1),
    ],
  };
}

/* ------------------------------------------------------------------ nokta bulutu */
function Bulut({ kume }: { kume: Kume }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(kume.poz, 3));
    return g;
  }, [kume]);

  return (
    <points geometry={geo} raycast={() => null}>
      <pointsMaterial
        size={kume.boy}
        color={kume.renk}
        transparent
        opacity={kume.opak}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/**
 * SEÇİM YÜZEYİ — kürenin üstünde görünmez bir küre; imleç nereye düşerse düşsün
 * o yöne EN YAKIN parçayı bulur.
 *
 * Neden nokta ışını değil: 5.000 nokta 1 birimlik kürede birbirine çok yakın;
 * ışın eşiği geniş tutulursa imleçten uzaktaki parça seçiliyor, dar tutulursa
 * tıklamalar boşa gidiyordu. Yüzeye çarpan noktanın yönü ile parça yönlerinin
 * iç çarpımı, "gözle tıklanan nokta" ile aynı sonucu verir ve her tıklama tutar.
 */
function SecimYuzeyi({
  hepsi,
  onSec,
  onUzerinde,
}: {
  hepsi: Float32Array;
  onSec: (i: number) => void;
  onUzerinde: (i: number | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const yerel = useRef(new THREE.Vector3());

  /** dünya koordinatındaki çarpma noktasına en yakın parça indeksi */
  const enYakin = (nokta: THREE.Vector3): number => {
    if (!ref.current) return -1;
    const p = ref.current.worldToLocal(yerel.current.copy(nokta)).normalize();
    let en = -Infinity;
    let idx = -1;
    for (let i = 0; i < NPN; i++) {
      const d = p.x * hepsi[i * 3] + p.y * hepsi[i * 3 + 1] + p.z * hepsi[i * 3 + 2];
      if (d > en) {
        en = d;
        idx = i;
      }
    }
    return idx;
  };

  return (
    <mesh
      ref={ref}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const i = enYakin(e.point);
        if (i >= 0) onSec(i);
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        const i = enYakin(e.point);
        if (i >= 0) onUzerinde(i);
      }}
      onPointerOut={() => onUzerinde(null)}
    >
      <sphereGeometry args={[1.02, 40, 28]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------ kaynak düğümü */
function Dugum({
  aci,
  yukseklik,
  yaricap,
  kaynak,
  vurgu,
  onTikla,
  etiketAl,
}: {
  aci: number;
  yukseklik: number;
  yaricap: number;
  kaynak: (typeof KAYNAKLAR)[number];
  vurgu: boolean;
  onTikla: () => void;
  /** HTML katmanındaki etiket düğümü — her karede buraya yansıtılır */
  etiketAl: () => HTMLDivElement | null;
}) {
  const ref = useRef<THREE.Group>(null);
  const nabiz = useRef<THREE.Mesh>(null);
  const dunya = useRef(new THREE.Vector3());
  const renk = TIP_RENK[kaynak.tip];
  const poz = useMemo(
    () => new THREE.Vector3(Math.cos(aci) * yaricap, yukseklik, Math.sin(aci) * yaricap),
    [aci, yaricap, yukseklik],
  );

  // düğümden çekirdeğe veri hattı
  const hat = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([poz.x, poz.y, poz.z, 0, 0, 0], 3));
    return g;
  }, [poz]);

  useFrame((st) => {
    // hat üzerinde çekirdeğe akan paket
    const t = (st.clock.elapsedTime * 0.35 + aci) % 1;
    if (nabiz.current) nabiz.current.position.copy(poz).multiplyScalar(1 - t);
    if (ref.current) ref.current.rotation.y += 0.01;

    /* Etiket 3D'de değil, tuvalin üstündeki HTML katmanında duruyor; konumu her
       karede buradan yansıtılır. (drei Html denendi: her etiket tuvali kaplayan
       bir sarmalayıcı div açıyor ve küre üzerindeki tıklamayı yutuyordu.)
       Kameradan düğüme giden ışın birim küreyi kesiyorsa düğüm arkadadır: söner
       ve tıklamayı bırakır. */
    const el = etiketAl();
    if (!ref.current || !el) return;
    ref.current.getWorldPosition(dunya.current);
    const kam = st.camera.position;
    const yon = dunya.current.clone().sub(kam);
    const uz = yon.length();
    yon.divideScalar(uz);
    const tt = -kam.dot(yon); // kameradan merkeze en yakın nokta
    const d = kam.clone().addScaledVector(yon, tt).length();
    const arkada = tt > 0 && tt < uz && d < 1.0;

    const ndc = dunya.current.clone().project(st.camera);
    const x = (ndc.x * 0.5 + 0.5) * st.size.width;
    const y = (-ndc.y * 0.5 + 0.5) * st.size.height;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -140%)`;
    el.style.opacity = arkada ? '0.14' : '1';
    el.style.pointerEvents = arkada ? 'none' : 'auto';
  });

  return (
    <group>
      <lineSegments geometry={hat}>
        <lineBasicMaterial color={renk} transparent opacity={vurgu ? 0.55 : 0.16} />
      </lineSegments>
      <mesh ref={nabiz}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshBasicMaterial color={renk} transparent opacity={0.9} />
      </mesh>
      <group ref={ref} position={poz} onClick={onTikla}>
        <mesh>
          <octahedronGeometry args={[vurgu ? 0.075 : 0.055, 0]} />
          <meshBasicMaterial color={renk} wireframe />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------- çekirdek */
function Cekirdek({ alarmSayisi }: { alarmSayisi: number }) {
  const ic = useRef<THREE.Mesh>(null);
  const halka = useRef<THREE.Mesh>(null);
  useFrame((st, dt) => {
    if (ic.current) ic.current.rotation.y -= dt * 0.25;
    if (halka.current) {
      // alarm nabzı: alarm varsa halka genişleyip söner
      const t = (st.clock.elapsedTime * 0.5) % 1;
      halka.current.scale.setScalar(1 + t * 0.55);
      (halka.current.material as THREE.Material).opacity = alarmSayisi > 0 ? 0.5 * (1 - t) : 0;
    }
  });
  return (
    <group>
      {/* lat/long telkafes — operasyon küresi */}
      <mesh>
        <sphereGeometry args={[1, 36, 20]} />
        <meshBasicMaterial color={SC.cizgi} wireframe transparent opacity={0.5} />
      </mesh>
      {/* iç çekirdek */}
      <mesh ref={ic}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshBasicMaterial color={SC.aksan} wireframe transparent opacity={0.32} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshBasicMaterial color="#101014" transparent opacity={0.92} />
      </mesh>
      {/* alarm halkası */}
      <mesh ref={halka} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.004, 6, 128]} />
        <meshBasicMaterial color={SC.alarm} transparent opacity={0} />
      </mesh>
      {/* yörünge halkaları */}
      {[
        [Math.PI / 2, 0, 0, 1.42],
        [Math.PI / 2.35, 0.5, 0.2, 1.62],
        [Math.PI / 1.75, -0.4, 0, 1.85],
      ].map(([rx, ry, rz, r], j) => (
        <mesh key={j} rotation={[rx, ry, rz]}>
          <torusGeometry args={[r, 0.0022, 6, 160]} />
          <meshBasicMaterial color={SC.cizgi} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ seçim izi */
function SecimIzi({ poz }: { poz: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (ref.current) {
      const s = 1 + 0.15 * Math.sin(st.clock.elapsedTime * 3);
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <group ref={ref} position={poz}>
      <mesh>
        <ringGeometry args={[0.055, 0.07, 24]} />
        <meshBasicMaterial color={SC.aksan} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial color={SC.aksan} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------------- sahne */
function Sahne({
  secili,
  onSec,
  onUzerinde,
  vurguKaynak,
  onKaynak,
  etiketler,
}: {
  secili: number;
  onSec: (i: number) => void;
  onUzerinde: (i: number | null) => void;
  vurguKaynak: string | null;
  onKaynak: (k: string) => void;
  /** tuvalin üstündeki HTML etiket katmanı — düğümler konumu buraya yansıtır */
  etiketler: React.RefObject<(HTMLDivElement | null)[]>;
}) {
  const { kume, hepsi } = useMemo(() => kumeler(), []);
  const grup = useRef<THREE.Group>(null);
  const alarm = kume[3].idx.length;

  useFrame((_, dt) => {
    if (grup.current) grup.current.rotation.y += dt * 0.045;
  });

  const secPoz = useMemo(
    () =>
      secili >= 0
        ? new THREE.Vector3(hepsi[secili * 3], hepsi[secili * 3 + 1], hepsi[secili * 3 + 2])
        : null,
    [secili, hepsi],
  );

  return (
    <>
      <group ref={grup}>
        <Cekirdek alarmSayisi={alarm} />
        {kume.map((k, j) => (
          <Bulut key={j} kume={k} />
        ))}
        <SecimYuzeyi hepsi={hepsi} onSec={onSec} onUzerinde={onUzerinde} />
        {secPoz && <SecimIzi poz={secPoz} />}
        {KAYNAKLAR.map((k, j) => (
          <Dugum
            key={k.kod}
            kaynak={k}
            aci={(j / KAYNAKLAR.length) * Math.PI * 2}
            yaricap={2.15}
            yukseklik={j % 3 === 0 ? 0.7 : j % 3 === 1 ? -0.5 : 0.08}
            vurgu={vurguKaynak === k.kod}
            onTikla={() => onKaynak(k.kod)}
            etiketAl={() => etiketler.current[j] ?? null}
          />
        ))}
      </group>
      {/* Tekerlek yakınlaştırması KAPALI: sahne sayfanın ortasında duruyor ve
          fare üstündeyken tekerleği yutunca sayfa kaydırılamıyordu. Yakınlaştırma
          köşedeki düğümlere alındı, döndürme sürüklemeyle serbest. */}
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={false} rotateSpeed={0.55} />
    </>
  );
}

/** Kamerayı merkeze doğru/uzağa taşır — HTML katmanındaki düğmeler bunu çağırır. */
function Yakinlastirici({ kayit }: { kayit: (f: (k: number) => void) => void }) {
  const kamera = useThree((s) => s.camera);
  useEffect(() => {
    kayit((k: number) => {
      const uz = Math.min(6.5, Math.max(2.1, kamera.position.length() * k));
      kamera.position.setLength(uz);
    });
  }, [kamera, kayit]);
  return null;
}

export default function Kure({
  secili,
  onSec,
  vurguKaynak,
  onKaynak,
}: {
  secili: number;
  onSec: (i: number) => void;
  vurguKaynak: string | null;
  onKaynak: (k: string) => void;
}) {
  const [uzerinde, setUzerinde] = useState<number | null>(null);
  const g = uzerinde;
  const zoom = useRef<((k: number) => void) | null>(null);
  const kayit = useCallback((f: (k: number) => void) => {
    zoom.current = f;
  }, []);
  const etiketler = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <>
      <Canvas
        camera={{ position: [0, 0.6, 3.6], fov: 46 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Yakinlastirici kayit={kayit} />
        <Sahne
          secili={secili}
          onSec={onSec}
          onUzerinde={setUzerinde}
          vurguKaynak={vurguKaynak}
          onKaynak={onKaynak}
          etiketler={etiketler}
        />
      </Canvas>

      {/* Kaynak etiketleri tuvalin ÜSTÜNDE, kendi katmanımızda: konumları her
          karede 3D'den yansıtılır. Katman tıklamayı geçirir, yalnız yazının
          kendisi tıklanır — küre üzerindeki parça seçimi engellenmez. */}
      <div className="kure-etiketler">
        {KAYNAKLAR.map((k, j) => (
          <div
            key={k.kod}
            ref={(el) => {
              etiketler.current[j] = el;
            }}
            className={'knode' + (vurguKaynak === k.kod ? ' on' : '')}
            onClick={() => onKaynak(k.kod)}
          >
            <b>{k.kod}</b>
            <i>{k.ad}</i>
          </div>
        ))}
      </div>

      <div className="kure-zoom">
        <button onClick={() => zoom.current?.(0.82)} title="yakınlaş">
          +
        </button>
        <button onClick={() => zoom.current?.(1.22)} title="uzaklaş">
          −
        </button>
      </div>
      {g != null && (
        <div className="kure-ipucu">
          <b>PN-{PN.id[g]}</b>
          <span>
            {LK.sub[PN.sub[g]]} · {LK.mdl[PN.mdl[g]]}
          </span>
          <span>
            {LK.kr[PN.kr[g]]} · risk {PN.risk[g].toFixed(1).replace('.', ',')}
          </span>
        </div>
      )}
    </>
  );
}
