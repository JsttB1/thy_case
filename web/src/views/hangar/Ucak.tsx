/**
 * UÇAK — prosedürel gövde. Hazır 3D model YOK.
 *
 * Gerekçe tek satır: `npm run build:tek-dosya` "internet gerektirmez, çift tıkla
 * açılır" garantisi veriyor. GLTF/doku dosyası o garantiyi bozardı (ya ayrı
 * istek, ya da base64 ile megabaytlarca HTML). Bütün siluet hangarGeo'daki
 * kesitlerden lathe/extrude ile çalışma anında üretilir.
 *
 * "OYUNCAK GİBİ" GÖRÜNMEMEK İÇİN — ilk sürümün dersleri:
 *  1. Livery KUTU İLE YAPILMAZ. Kırmızı kuşak bir box'tı ve silindirik gövdeyi
 *     kesip yanlardan düz levha gibi taşıyordu. Şimdi kuşaklar gövdeyle AYNI
 *     lathe profilinden, yalnız phi (theta) aralığı sınırlı ve yarıçapı bir tık
 *     büyük üretiliyor — boya gövdeye sarılıyor.
 *  2. Kanat sivrilmesi gerçekçi olmalı. Uç veteri kök veterinin %18'i; ilk
 *     sürümde %35'ti ve kanat "kürek" gibi duruyordu.
 *  3. Parça sayısı siluet demek: winglet, kanat-gövde peteği, dorsal fin,
 *     ters itki kuşağı, APU egzozu, bogie'li ana takım. Bunların hiçbiri tek
 *     başına görünmüyor ama toplamı "gerçek uçak" hissini kuruyor.
 *
 * Yön: burun +Z (hangar kapısına sırtını döner) · kanat ±X · yukarı +Y.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  govdeProfil,
  kuyrukKalkisi,
  kanatPlanform,
  winglet,
  dikeyKuyruk,
  yatayKuyruk,
  GOVDE_R,
} from './hangarGeo';
import { HC } from './hangarVeri';

/* ------------------------------------------------------------------ geometri */

/** Profil noktalarını lathe'e verilecek Vector2 dizisine çevirir. */
const lathePoints = (olcek = 1) => govdeProfil().map(([z, r]) => new THREE.Vector2(r * olcek, z));

/** Lathe gövdeyi +Z eksenine yatırır ve kuyruğu yukarı kıvırır. */
function govdeyeUydur(g: THREE.BufferGeometry): THREE.BufferGeometry {
  g.rotateX(Math.PI / 2); // lathe ekseni Y → gövde ekseni Z (burun +Z)
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, p.getY(i) + kuyrukKalkisi(p.getZ(i)));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

function govdeGeo(): THREE.BufferGeometry {
  return govdeyeUydur(new THREE.LatheGeometry(lathePoints(), 56));
}

/**
 * Gövdeye SARILAN boya kuşağı: aynı profil, biraz büyük yarıçap, sınırlı phi.
 *
 * PHI YÖNÜ (bir kez yanlış yapıldı, not düşüldü): LatheGeometry tepe noktasını
 * (r·sin φ, y, r·cos φ) olarak kurar; gövde rotateX(+90°) ile Z eksenine
 * yatırılınca dünya karşılığı şu olur:
 *   φ=0 → ALT (−Y) · φ=π/2 → +X yan · φ=π → ÜST (+Y) · φ=3π/2 → −X yan
 * İlk sürümde karın bandı φ≈3,6'ya konmuştu — yani boya gövdenin ALTINA değil
 * ÜSTÜNE gitmişti ve kamera açısından hiç görünmüyordu.
 */
function kusakGeo(phi0: number, phiLen: number, olcek: number): THREE.BufferGeometry {
  return govdeyeUydur(new THREE.LatheGeometry(lathePoints(olcek), 40, phi0, phiLen));
}

/** Planform poligonundan kalınlık verilmiş yüzey; açıklık +X, veter +Z. */
function yuzeyGeo(nokta: [number, number][], kalinlik: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  nokta.forEach(([a, v], i) => (i === 0 ? s.moveTo(a, v) : s.lineTo(a, v)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: kalinlik, bevelEnabled: false });
  g.translate(0, 0, -kalinlik / 2);
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Dikey yüzey (fin / winglet): yükseklik +Y, veter +Z, kalınlık X. */
function dikeyGeo(nokta: [number, number][], kalinlik: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  nokta.forEach(([h, v], i) => (i === 0 ? s.moveTo(h, v) : s.lineTo(h, v)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: kalinlik, bevelEnabled: false });
  g.translate(0, 0, -kalinlik / 2);
  g.rotateZ(Math.PI / 2);
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * Kuyruktaki marka işareti — App.tsx'teki MarkaIsaret'in 3D karşılığı.
 * Doku değil geometri: kuyruk kaplaması CanvasTexture olsaydı UV'yi extrude
 * kenarlarında elle eşlemek gerekirdi ve yakın planda bulanıklaşırdı.
 */
function isaretGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-2.5, -1.5);
  s.quadraticCurveTo(-0.2, -1.35, 1.15, 1.95);
  s.lineTo(1.95, 1.75);
  s.quadraticCurveTo(0.35, -2.05, -2.4, -2.05);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false });
  g.rotateZ(Math.PI / 2);
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Kanat–gövde peteği: gövdenin altına oturan yumuşak dolgu. */
function petekGeo(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 22, 14);
  g.scale(2.6, 1.15, 9.2);
  return g;
}

/* ---------------------------------------------------------------- malzemeler */

interface Malzemeler {
  govde: THREE.MeshStandardMaterial;
  alt: THREE.MeshStandardMaterial;
  marka: THREE.MeshStandardMaterial;
  beyaz: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  koyu: THREE.MeshStandardMaterial;
  lastik: THREE.MeshStandardMaterial;
  cam: THREE.MeshStandardMaterial;
  hepsi: THREE.Material[];
}

/**
 * Boyalı alüminyum: metalness DÜŞÜK, roughness orta, envMapIntensity yüksek.
 * Yüksek metalness "krom oyuncak" veriyordu; gerçek livery boyalıdır ve
 * çevreyi bulanık yansıtır — o his envMapIntensity ile geliyor.
 */
const boya = (renk: string, ruh = 0.38) =>
  new THREE.MeshStandardMaterial({
    color: renk,
    metalness: 0.12,
    roughness: ruh,
    envMapIntensity: 1.35,
  });

function malzemeYap(): Malzemeler {
  const m = {
    govde: boya(HC.govde, 0.32),
    alt: new THREE.MeshStandardMaterial({
      color: HC.govdeAlt,
      metalness: 0.62,
      roughness: 0.42,
      envMapIntensity: 1.2,
    }),
    marka: boya(HC.marka, 0.34),
    beyaz: boya('#ffffff', 0.3),
    metal: new THREE.MeshStandardMaterial({
      color: HC.metal,
      metalness: 0.9,
      roughness: 0.22,
      envMapIntensity: 1.6,
    }),
    koyu: new THREE.MeshStandardMaterial({
      color: HC.metalKoyu,
      metalness: 0.55,
      roughness: 0.5,
    }),
    lastik: new THREE.MeshStandardMaterial({ color: '#14161c', metalness: 0.1, roughness: 0.9 }),
    cam: new THREE.MeshStandardMaterial({
      color: '#0b1220',
      metalness: 0.85,
      roughness: 0.12,
      envMapIntensity: 2,
    }),
  };
  return { ...m, hepsi: Object.values(m) };
}

/* --------------------------------------------------------------- alt parçalar */

/** Kabin pencereleri — 2 × 34 örnek, tek instanced çizim. */
function Pencereler({ malzeme }: { malzeme: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const sayi = 68;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (const yan of [1, -1]) {
      for (let j = 0; j < 34; j++) {
        o.position.set(yan * (GOVDE_R - 0.06), 0.66, 10.2 - j * 0.62);
        o.rotation.set(0, yan * (Math.PI / 2), 0);
        o.updateMatrix();
        mesh.setMatrixAt(i++, o.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, sayi]} material={malzeme}>
      <planeGeometry args={[0.28, 0.2]} />
    </instancedMesh>
  );
}

/** Ana iniş takımı — bogie'li: iki tekerlek yan yana, gerçek dar gövde düzeni. */
function AnaTakim({ x, mlz }: { x: number; mlz: Malzemeler }) {
  return (
    <group position={[x, -1.6, -1.2]}>
      <mesh material={mlz.metal} position={[0, -1.25, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 2.5, 10]} />
      </mesh>
      {/* diyagonal destek */}
      <mesh material={mlz.koyu} position={[0, -1.1, 0.55]} rotation={[0.42, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 2.3, 8]} />
      </mesh>
      {[-0.36, 0.36].map((s) => (
        <mesh key={s} material={mlz.lastik} position={[s, -2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.58, 0.58, 0.34, 18]} />
        </mesh>
      ))}
      {/* jant */}
      {[-0.36, 0.36].map((s) => (
        <mesh
          key={`j${s}`}
          material={mlz.metal}
          position={[s, -2.5, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.26, 0.26, 0.36, 12]} />
        </mesh>
      ))}
      {/* takım kapağı */}
      <mesh material={mlz.govde} position={[-0.42, -0.3, 0]}>
        <boxGeometry args={[0.08, 1.5, 2.2]} />
      </mesh>
    </group>
  );
}

function BurunTakim({ mlz }: { mlz: Malzemeler }) {
  return (
    <group position={[0, -1.5, 12.4]}>
      <mesh material={mlz.metal} position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 2.1, 10]} />
      </mesh>
      {[-0.24, 0.24].map((s) => (
        <mesh key={s} material={mlz.lastik} position={[s, -2.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 0.26, 16]} />
        </mesh>
      ))}
      <mesh material={mlz.govde} position={[0, -0.35, 0.34]}>
        <boxGeometry args={[0.7, 1.4, 0.08]} />
      </mesh>
    </group>
  );
}

/**
 * Motor kaportası — kanadın altında ve ÖNÜNDE.
 *
 * Beş parça: giriş dudağı (parlak metal halka) · fan kaportası · TERS İTKİ
 * kuşağı (bir tık geniş, koyu) · kor egzozu · konisi. Tek silindir "boru" gibi
 * duruyordu; kaportayı gerçek yapan şey bu çap kırılımları.
 */
function Nasel({ x, mlz, detay }: { x: number; mlz: Malzemeler; detay: boolean }) {
  return (
    <group position={[x, -1.15, 3.4]}>
      {/* giriş dudağı — torus XY düzleminde, motor ekseni Z: döndürülmez */}
      <mesh material={mlz.metal} position={[0, 0, 2.35]}>
        <torusGeometry args={[1.3, 0.11, 10, 32]} />
      </mesh>
      {/* fan kaportası */}
      <mesh material={mlz.govde} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.34, 1.38, 2.6, 30, 1, true]} />
      </mesh>
      {/* ters itki kuşağı */}
      <mesh material={mlz.alt} position={[0, 0, -1.85]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.38, 1.16, 1.1, 30, 1, true]} />
      </mesh>
      {/* kor egzozu */}
      <mesh material={mlz.koyu} position={[0, 0, -2.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.78, 0.68, 0.8, 20, 1, true]} />
      </mesh>
      <mesh material={mlz.koyu} position={[0, 0, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.6, 1.1, 18]} />
      </mesh>
      {/* fan yüzü */}
      {detay && (
        <>
          <mesh material={mlz.koyu} position={[0, 0, 1.75]}>
            <circleGeometry args={[1.26, 28]} />
          </mesh>
          <mesh material={mlz.metal} position={[0, 0, 1.82]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.24, 0.5, 14]} />
          </mesh>
        </>
      )}
      {/* pilon: kaportayı kanada bağlar (öne doğru incelen kama) */}
      <mesh material={mlz.govde} position={[0, 1.25, -0.9]}>
        <boxGeometry args={[0.26, 1.7, 2.4]} />
      </mesh>
      <mesh material={mlz.govde} position={[0, 1.9, -2.3]}>
        <boxGeometry args={[0.22, 1.0, 2.6]} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------------- uçak */

export interface UcakProps {
  /** arka plan trafiği için sade mod: pencere · takım · marka işareti yok */
  sade?: boolean;
  /** park hâli — iniş takımı açık */
  parkta?: boolean;
  /** her karede okunan opaklık (0..1); sahne perde geçişinde bunu kısar */
  opaklik?: React.RefObject<number>;
}

export default function Ucak({ sade = false, parkta = false, opaklik }: UcakProps) {
  const mlz = useMemo(malzemeYap, []);

  const geo = useMemo(
    () => ({
      govde: govdeGeo(),
      // alt kabuk: gövdenin alt ~130°'si gri (gerçek liverylerde göbek boyasız)
      karin: kusakGeo(-Math.PI * 0.36, Math.PI * 0.72, 1.006),
      // kırmızı kuşak: karnın hemen üstünde, iki yanda birer ince şerit
      kusakSag: kusakGeo(1.06, 0.19, 1.012),
      kusakSol: kusakGeo(-1.25, 0.19, 1.012),
      kanat: yuzeyGeo(kanatPlanform(), 0.5),
      winglet: dikeyGeo(winglet(), 0.28),
      yatay: yuzeyGeo(yatayKuyruk(), 0.34),
      dikey: dikeyGeo(dikeyKuyruk(), 0.4),
      isaret: isaretGeo(),
      petek: petekGeo(),
    }),
    [],
  );

  useLayoutEffect(() => {
    return () => {
      Object.values(geo).forEach((g) => g.dispose());
      mlz.hepsi.forEach((m) => m.dispose());
    };
  }, [geo, mlz]);

  /* Opaklık her karede yazılır (state değil): perde geçişi 60 fps'te akıyor,
     her kare React render'ı tetiklemek sahneyi kilitler. transparent bayrağı
     yalnız gerçekten şeffafken açılır — tam opak hâlde sıralama hatası olmasın. */
  useFrame(() => {
    if (!opaklik) return;
    const o = opaklik.current ?? 1;
    for (const m of mlz.hepsi) {
      const seffaf = o < 0.995;
      if (m.transparent !== seffaf) {
        m.transparent = seffaf;
        m.depthWrite = !seffaf;
        m.needsUpdate = true;
      }
      m.opacity = o;
    }
  });

  /** Bir kanat yarısı: ana yüzey + ucundaki winglet. Sol taraf X'te aynalanır. */
  const KanatYarim = ({ yon }: { yon: 1 | -1 }) => (
    <group scale={[yon, 1, 1]} rotation={[0, 0, yon * -0.085]}>
      <mesh geometry={geo.kanat} material={mlz.govde} />
      {/* winglet kanat ucunda, hafif dışa yatık */}
      <group position={[16.0, 0.1, 0]} rotation={[0, 0, -0.22]}>
        <mesh geometry={geo.winglet} material={mlz.marka} />
      </group>
    </group>
  );

  return (
    <group>
      <mesh geometry={geo.govde} material={mlz.govde} />
      <mesh geometry={geo.karin} material={mlz.alt} />
      <mesh geometry={geo.kusakSol} material={mlz.marka} />
      <mesh geometry={geo.kusakSag} material={mlz.marka} />

      {/* kanat–gövde peteği */}
      <mesh geometry={geo.petek} material={mlz.govde} position={[0, -1.45, -1.2]} />

      {/* kanatlar */}
      <group position={[0, -0.95, -1.6]}>
        <KanatYarim yon={1} />
        <KanatYarim yon={-1} />
      </group>

      {/* yatay stabilizatör — kuyruk kalkışının üstünde */}
      <group position={[0, 1.55, -15.6]}>
        <group rotation={[0, 0, -0.07]}>
          <mesh geometry={geo.yatay} material={mlz.govde} />
        </group>
        <group scale={[-1, 1, 1]} rotation={[0, 0, 0.07]}>
          <mesh geometry={geo.yatay} material={mlz.govde} />
        </group>
      </group>

      {/* dikey kuyruk: THY kimliği — tam kırmızı, üstünde beyaz işaret */}
      <group position={[0, 1.7, -13.6]}>
        <mesh geometry={geo.dikey} material={mlz.marka} />
        {!sade && (
          <>
            <mesh geometry={geo.isaret} material={mlz.beyaz} position={[0.22, 4.6, -2.4]} />
            <mesh geometry={geo.isaret} material={mlz.beyaz} position={[-0.22, 4.6, -2.4]} />
          </>
        )}
        {/* dorsal fin: fini gövdeye bağlayan üçgen dolgu */}
        <mesh material={mlz.marka} position={[0, -0.35, 3.1]} rotation={[-0.24, 0, 0]}>
          <boxGeometry args={[0.36, 0.9, 3.4]} />
        </mesh>
      </group>

      {/* APU egzozu — kuyruk konisinin ucu */}
      <mesh material={mlz.koyu} position={[0, 2.6, -19.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.7, 12, 1, true]} />
      </mesh>

      <Nasel x={-7.8} mlz={mlz} detay={!sade} />
      <Nasel x={7.8} mlz={mlz} detay={!sade} />

      {!sade && <Pencereler malzeme={mlz.cam} />}

      {/* Kokpit camı — gövdeye oturan koyu bant. Kutu bilerek küçük ve gövdeye
          gömülü: büyük tutulunca burunda siyah bir tuğla gibi duruyordu. */}
      <group position={[0, 0.86, 15.55]}>
        <mesh material={mlz.cam} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[1.74, 0.42, 1.15]} />
        </mesh>
        <mesh material={mlz.cam} position={[0, -0.2, 0.72]} rotation={[0.55, 0, 0]}>
          <boxGeometry args={[1.3, 0.34, 0.7]} />
        </mesh>
      </group>

      {parkta && (
        <>
          <AnaTakim x={-2.9} mlz={mlz} />
          <AnaTakim x={2.9} mlz={mlz} />
          <BurunTakim mlz={mlz} />
        </>
      )}
    </group>
  );
}
