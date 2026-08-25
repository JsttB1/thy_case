/**
 * KRİZ ARAZİSİ — kategori × ay yükseklik alanı.
 *
 * Sahne SAYI ÜRETMEZ: ızgara, sıralama, normalize ve renk rampası araziGeo.ts'te
 * (saf matematik, testleri node'da koşar); burası yalnız çizer.
 *
 * Ölçülmüş kararlar bu dosyada:
 *  · Çubuklar tek InstancedMesh; senaryo değişince HEDEF güncellenir, MEVCUT
 *    korunur → arazi eski hâlinden yenisine AKAR (kesme yok).
 *  · Animasyon kare süresinden BAĞIMSIZ: 1 − exp(−dt·k). Sabit adım kullanılırsa
 *    yavaş cihazda animasyon hızı değişir.
 *  · Tekerlek yakınlaştırma KAPALI (sahne sayfanın ortasında; tekerlek yutulunca
 *    sayfa kaydırılamıyor — CODE küresinde ölçülmüş karar). Zoom köşe düğmelerinde.
 *  · Etiketler drei `Html` DEĞİL: drei her etiket için tuvali kaplayan bir
 *    sarmalayıcı div açıp sahnedeki tıklamayı yutuyor.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { hucreYer, kameraKonum, rampaRgb, taramaX, OLCU, type Arazi as AraziTip } from './araziGeo';

/* Sahne zemini arka plandan BİR TON AÇIK — arazi kendi tabakasında dursun.
   Değerler nötr palete hizalı: ARKA sayfa zemini (--s-1), ZEMIN kart yüzeyi
   (--s-0). Eskiden mavi-gri merdivenden geliyordu ve palet nötrleşince
   arazi kutusu sayfanın geri kalanından hafifçe maviye kaçıyordu.
   ÇUBUK renkleri buradan gelmez — onlar araziGeo.rampaRgb'de, değişmedi. */
const ZEMIN = '#f8f8f9';
const ARKA = '#ecedee';
const IZGARA = '#dcdddf';

/* ------------------------------------------------------------------ çubuklar */

function Cubuklar({
  a,
  onUzerinde,
  onSec,
}: {
  a: AraziTip;
  onUzerinde: (h: number | null) => void;
  onSec: (ay: number) => void;
}) {
  const n = a.hucreler.length;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const su = useRef(new Float32Array(n));
  const hedef = useRef(new Float32Array(n));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const renk = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    /* ızgara boyu değiştiyse (mod değişimi) tamponlar yeniden kurulur, aynı
       kaldıysa mevcut yükseklikler korunur → akış devam eder */
    if (su.current.length !== n) {
      su.current = new Float32Array(n);
      hedef.current = new Float32Array(n);
    }
    for (let i = 0; i < n; i++) hedef.current[i] = hucreYer(a.hucreler[i], a).y;
  }, [a, n]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const k = 1 - Math.exp(-dt * 8); // kritik sönümlü, ~400 ms
    for (let i = 0; i < n; i++) {
      const d = hedef.current[i] - su.current[i];
      su.current[i] = Math.abs(d) > 1e-4 ? su.current[i] + d * k : hedef.current[i];
      const h = su.current[i];
      const p = hucreYer(a.hucreler[i], a);
      dummy.position.set(p.x, h / 2, p.z);
      dummy.scale.set(p.gx * 0.78, h, p.gz * 0.78); // 0.78 → çubuklar arası nefes payı
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      // renk ANLIK yükseklikten okunur → animasyon boyunca renk ile boy tutarlı
      const [r, g, b] = rampaRgb(h / OLCU.boy);
      renk.setRGB(r, g, b);
      m.setColorAt(i, renk);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      key={n}
      ref={mesh}
      args={[undefined, undefined, Math.max(1, n)]}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (e.instanceId != null) onUzerinde(e.instanceId);
      }}
      onPointerOut={() => onUzerinde(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.instanceId != null) onSec(a.hucreler[e.instanceId].ix);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.62} metalness={0.04} />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------- zemin */

function Zemin({ a }: { a: AraziTip }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const gx = OLCU.gen / Math.max(1, a.nx);
    const gz = OLCU.der / Math.max(1, a.nz);
    for (let i = 0; i <= a.nx; i++) {
      const x = i * gx - OLCU.gen / 2;
      pts.push(x, 0.001, -OLCU.der / 2, x, 0.001, OLCU.der / 2);
    }
    for (let j = 0; j <= a.nz; j++) {
      const z = j * gz - OLCU.der / 2;
      pts.push(-OLCU.gen / 2, 0.001, z, OLCU.gen / 2, 0.001, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, [a.nx, a.nz]);

  useEffect(() => () => void geo.dispose(), [geo]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[OLCU.gen + 1.4, OLCU.der + 1.4]} />
        <meshStandardMaterial color={ZEMIN} roughness={0.95} metalness={0} />
      </mesh>
      <lineSegments geometry={geo} raycast={() => null}>
        <lineBasicMaterial color={IZGARA} transparent opacity={0.9} />
      </lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------------ tarama */

/** Seçili ayı işaretleyen yarı saydam düzlem — hedefe kayar, hafif nabız atar. */
function Tarama({ a, ay }: { a: AraziTip; ay: number }) {
  const g = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st, dt) => {
    if (!g.current) return;
    const h = taramaX(ay, a);
    const k = 1 - Math.exp(-dt * 9);
    g.current.position.x += (h - g.current.position.x) * k;
    if (mat.current) mat.current.opacity = 0.1 + 0.05 * Math.sin(st.clock.elapsedTime * 2.4);
  });
  return (
    <group ref={g}>
      <mesh rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
        <planeGeometry args={[OLCU.der + 1, OLCU.boy * 1.15]} />
        <meshBasicMaterial
          ref={mat}
          color="#16233a"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- etiketler */

/**
 * Etiket katmanı: bileşen HİÇBİR ŞEY render etmez (`return null`), her karede
 * 3D konumu project() ile ekrana yansıtıp `el.style.transform` yazar.
 *
 * Bütçe: satır etiketlerinden yalnız ilk 8 (sıralı olduğu için en kötü
 * kategoriler), ay etiketlerinden seçili ay + her 3'üncü. Hepsi basılsa 53
 * etiket olurdu ve arazi okunmaz hâle gelirdi.
 */
function Etiketler({
  a,
  ay,
  satirRef,
  ayRef,
}: {
  a: AraziTip;
  ay: number;
  satirRef: React.RefObject<(HTMLSpanElement | null)[]>;
  ayRef: React.RefObject<(HTMLSpanElement | null)[]>;
}) {
  const v = useRef(new THREE.Vector3());
  const yerlesik = useRef<number[]>([]);

  useFrame((st) => {
    const kabul = yerlesik.current;
    kabul.length = 0;
    const gx = OLCU.gen / Math.max(1, a.nx);
    const gz = OLCU.der / Math.max(1, a.nz);

    const yaz = (el: HTMLSpanElement | null, x3: number, y3: number, z3: number) => {
      if (!el) return;
      v.current.set(x3, y3, z3).project(st.camera);
      if (v.current.z > 1) {
        el.style.opacity = '0';
        return;
      }
      const x = (v.current.x * 0.5 + 0.5) * st.size.width;
      const y = (-v.current.y * 0.5 + 0.5) * st.size.height;
      /* Çakışma eleme: 26 satır 9 birimlik derinliğe sığdığı için komşu satır
         etiketleri ekranda ~10 px arayla düşüyor. Kutu bu yüzden dar tutuldu;
         yine de elenen satırın adı boşa gitmiyor, imleç HUD'unda okunuyor. */
      for (let k = 0; k < kabul.length; k += 2)
        if (Math.abs(x - kabul[k]) < 46 && Math.abs(y - kabul[k + 1]) < 11) {
          el.style.opacity = '0';
          return;
        }
      kabul.push(x, y);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.opacity = '1';
    };

    const enSol = -OLCU.gen / 2 - 0.35;
    for (let z = 0; z < Math.min(8, a.nz); z++)
      yaz(satirRef.current?.[z] ?? null, enSol, 0.12, (z + 0.5) * gz - OLCU.der / 2);

    const onSira = OLCU.der / 2 + 0.45;
    for (let x = 0; x < a.nx; x++) {
      if (x !== ay && x % 3 !== 0) {
        const el = ayRef.current?.[x];
        if (el) el.style.opacity = '0';
        continue;
      }
      yaz(ayRef.current?.[x] ?? null, (x + 0.5) * gx - OLCU.gen / 2, 0.12, onSira);
    }
  });

  return null;
}

/* ------------------------------------------------------------------- zoom */

/** Kamera uzaklığını 9..46 aralığında hedefe yaklaştırır; sayfa ref üzerinden çağırır. */
function Yakinlastirici({ kayit }: { kayit: (f: (k: number) => void) => void }) {
  const camera = useThree((s) => s.camera);
  const hedef = useRef(0);
  useEffect(() => {
    kayit((k: number) => {
      const su = hedef.current || camera.position.length();
      hedef.current = Math.min(46, Math.max(9, su * k));
    });
  }, [camera, kayit]);
  useFrame((_, dt) => {
    if (!hedef.current) return;
    const uz = camera.position.length();
    const y = uz + (hedef.current - uz) * (1 - Math.exp(-dt * 7));
    camera.position.setLength(y);
    if (Math.abs(hedef.current - y) < 0.02) hedef.current = 0;
  });
  return null;
}

/* ------------------------------------------------------------------- sahne */

export interface AraziProps {
  a: AraziTip;
  ay: number;
  onUzerinde: (h: number | null) => void;
  onSec: (ay: number) => void;
  satirRef: React.RefObject<(HTMLSpanElement | null)[]>;
  ayRef: React.RefObject<(HTMLSpanElement | null)[]>;
  zoomKayit: (f: (k: number) => void) => void;
}

export default function Arazi(p: AraziProps) {
  return (
    <Canvas
      camera={{ position: kameraKonum(), fov: 40, near: 0.5, far: 260 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(ARKA, 1);
        /* Bağlam kaybında tarayıcı sahneyi sessizce ölü bırakıyor: HTML katmanı
           çalışmaya devam ettiği için ekranda etiketler kalıyor ama arazi
           kayboluyor. preventDefault, bağlamın geri yüklenmesine izin verir. */
        gl.domElement.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault();
          },
          false,
        );
      }}
    >
      {/* beyaz zeminde mimari maket görünümü: yumuşak dolgu + iki yönlü ışık */}
      <ambientLight intensity={1.05} />
      <directionalLight position={[8, 14, 9]} intensity={1.25} />
      <directionalLight position={[-9, 7, -6]} intensity={0.32} />
      <Zemin a={p.a} />
      <Cubuklar a={p.a} onUzerinde={p.onUzerinde} onSec={p.onSec} />
      <Tarama a={p.a} ay={p.ay} />
      <Etiketler a={p.a} ay={p.ay} satirRef={p.satirRef} ayRef={p.ayRef} />
      <Yakinlastirici kayit={p.zoomKayit} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2 - 0.05}
        rotateSpeed={0.5}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
