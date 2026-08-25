/**
 * DİJİTAL HANGAR — açılış sahnesi.
 *
 * Beş perdelik tek çekim: hangar → pist/filo → motora dalış → komponentlerin
 * açılması → karar küresi. Kamera KESİLMEZ; perdeler arasında yol alır, çünkü
 * anlatının iddiası da tek parça: "filo büyüyor" ile "şu PN kırmızıda" aynı
 * hikâyenin iki ucu.
 *
 * Perde ilerlemesi tek bir kayan sayıdır (`akis`, 0..4). Sahnedeki her şey —
 * kamera, uçağın opaklığı, fan hızı, komponent patlaması, son küre — bu tek
 * sayıdan türer. Bu yüzden ileri/geri sarmak, atlamak ve durdurmak bedava:
 * ayrı ayrı animasyon zaman çizelgesi tutulmuyor.
 *
 * Perf notu: gerçek ışık sayısı DÖRT (ambient + 3 nokta). Hangar aydınlatması
 * emissive yüzey + additive koni ile taklit edilir; 20 gerçek ışık sahneyi
 * jüri makinesinde 20 fps'e düşürüyordu, fark ise gözle görünmüyordu.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Ucak from './Ucak';
import Motor from './Motor';
import { HC, SEFERLER } from './hangarVeri';
import { SC } from '@/views/code/sahneVeri';
import { K } from '@/data/payload';
import {
  KAMERA,
  MOTOR_MERKEZ,
  UCAK_Y,
  ucusHali,
  aralik,
  kolay,
  karisim,
  fibonacciKure,
} from './hangarGeo';
import { OrbitControls } from '@react-three/drei';

/** Hangar ölçüleri — kapı arkada (−Z), uçak burnu kapıya sırtını döner (+Z). */
const H = { en: 78, derinlik: 74, yukseklik: 34, kapiEn: 62, kapiY: 26 } as const;

/* ------------------------------------------------------------------- ortam */

/**
 * ORTAM HARİTASI — sahnenin en kritik tek satırı.
 *
 * metalness yüksek bir malzemenin yansıtacak bir şeyi yoksa SİYAH çıkar: ilk
 * denemede motor kaportası, fan kanatları ve gövde kömür gibi görünüyordu,
 * ışıkları artırmak da işe yaramıyordu (metal difüz ışığı yansıtmaz).
 *
 * Çözüm bir HDRI dosyası DEĞİL — drei'nin Environment preset'leri CDN'den
 * indiriyor ve "internet gerektirmez" garantisini bozuyor. RoomEnvironment
 * three'nin içinde gelen, tamamen kodla üretilen bir stüdyo kutusudur:
 * PMREM'den geçirilip sahneye takılır, dosya boyutu sıfır.
 *
 * environmentIntensity 0,32: tam güçte hangar gece değil stüdyo gibi
 * oluyordu. Bu değerde metal "parlıyor" ama sahne gece kalıyor.
 */
function Ortam() {
  const gl = useThree((s) => s.gl);
  const sahne = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const oda = new RoomEnvironment();
    const hedef = pmrem.fromScene(oda, 0.04);
    sahne.environment = hedef.texture;
    sahne.environmentIntensity = 0.32;
    return () => {
      sahne.environment = null;
      hedef.dispose();
      pmrem.dispose();
      oda.clear();
    };
  }, [gl, sahne]);

  return null;
}

/* ------------------------------------------------------------------- zemin */

function Zemin() {
  const izgara = useMemo(() => {
    const n: number[] = [];
    for (let x = -H.en; x <= H.en; x += 6) n.push(x, 0.02, -H.derinlik, x, 0.02, H.derinlik);
    for (let z = -H.derinlik; z <= H.derinlik; z += 6) n.push(-H.en, 0.02, z, H.en, 0.02, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(n, 3));
    return g;
  }, []);
  useEffect(() => () => izgara.dispose(), [izgara]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[H.en * 2, H.derinlik * 2]} />
        <meshStandardMaterial color={HC.zemin} metalness={0.62} roughness={0.34} />
      </mesh>
      <lineSegments geometry={izgara}>
        <lineBasicMaterial color={HC.cizgi} transparent opacity={0.5} />
      </lineSegments>

      {/* Park yeri işaretleri: burun çizgisi + kanat emniyet şeridi.
          Opaklık bilerek düşük — ilk denemede tam parlak sarı/kırmızı şeritler
          kadrajı çapraz kesip uçağın önüne geçiyordu. İşaret zeminde okunmalı,
          sahneyi yönetmemeli. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 16]}>
        <planeGeometry args={[0.36, 26]} />
        <meshBasicMaterial color="#c9a227" transparent opacity={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -3]}>
        <planeGeometry args={[38, 0.36]} />
        <meshBasicMaterial color="#c9a227" transparent opacity={0.18} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 21, 0.04, -1.4]}>
          <planeGeometry args={[0.26, 20]} />
          <meshBasicMaterial color={HC.marka} transparent opacity={0.22} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------- hangar kabuğu */

/** Çatı makasları, kolonlar, yan duvarlar ve arkadaki kapı boşluğu. */
function Kabuk() {
  const makas = useMemo(() => Array.from({ length: 9 }, (_, i) => -H.derinlik + 8 + i * 9), []);
  const kolon = useMemo(() => Array.from({ length: 7 }, (_, i) => -H.derinlik + 12 + i * 11), []);

  return (
    <group>
      {/* yan duvarlar */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * H.en, H.yukseklik / 2, 0]}
          rotation={[0, -s * Math.PI * 0.5, 0]}
        >
          <planeGeometry args={[H.derinlik * 2, H.yukseklik]} />
          <meshStandardMaterial
            color={HC.kabuk}
            metalness={0.2}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* ön duvar (kameranın arkası) */}
      <mesh position={[0, H.yukseklik / 2, H.derinlik]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[H.en * 2, H.yukseklik]} />
        <meshStandardMaterial color={HC.kabuk} metalness={0.2} roughness={0.9} />
      </mesh>
      {/* tavan */}
      <mesh position={[0, H.yukseklik, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[H.en * 2, H.derinlik * 2]} />
        <meshStandardMaterial color="#0d1626" metalness={0.1} roughness={1} />
      </mesh>

      {/* ARKA DUVAR — kapı boşluğu bırakılarak üç parça hâlinde: yanlar + lento.
          Tek delikli geometri yerine üç dikdörtgen; ShapeGeometry deliği burada
          sadece daha fazla üçgen demek olurdu. */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (H.kapiEn / 2 + (H.en - H.kapiEn / 2) / 2), H.yukseklik / 2, -H.derinlik]}
        >
          <planeGeometry args={[H.en - H.kapiEn / 2, H.yukseklik]} />
          <meshStandardMaterial color={HC.kabuk} metalness={0.2} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, (H.yukseklik + H.kapiY) / 2, -H.derinlik]}>
        <planeGeometry args={[H.kapiEn, H.yukseklik - H.kapiY]} />
        <meshStandardMaterial color={HC.kabuk} metalness={0.2} roughness={0.9} />
      </mesh>
      {/* kapı kasası — THY kırmızısı ince çerçeve, hangarın tek kimlik vurgusu */}
      <mesh position={[0, H.kapiY, -H.derinlik + 0.3]}>
        <boxGeometry args={[H.kapiEn + 1.4, 0.7, 0.7]} />
        <meshStandardMaterial
          color={HC.marka}
          emissive={new THREE.Color(HC.marka)}
          emissiveIntensity={0.55}
        />
      </mesh>

      {/* çatı makasları */}
      {makas.map((z) => (
        <group key={z} position={[0, H.yukseklik - 1.6, z]}>
          <mesh>
            <boxGeometry args={[H.en * 2, 0.5, 0.5]} />
            <meshStandardMaterial color={HC.kafes} metalness={0.6} roughness={0.6} />
          </mesh>
          {/* çapraz kafes — makasın altında zikzak */}
          {Array.from({ length: 16 }, (_, i) => (
            <mesh
              key={i}
              position={[-H.en + 5 + i * 10, -1.5, 0]}
              rotation={[0, 0, i % 2 ? 0.55 : -0.55]}
            >
              <boxGeometry args={[0.18, 3.6, 0.18]} />
              <meshStandardMaterial color={HC.kafes} metalness={0.5} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* yan kolonlar */}
      {kolon.map((z) =>
        [-1, 1].map((s) => (
          <mesh key={`${z}-${s}`} position={[s * (H.en - 0.5), H.yukseklik / 2, z]}>
            <boxGeometry args={[0.8, H.yukseklik, 1.6]} />
            <meshStandardMaterial color={HC.kafes} metalness={0.5} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ aydınlatma */

/**
 * Aydınlatma rampaları. Perde 0'da SIRAYLA yanarlar — "hangar uyanıyor".
 * Sıra bilerek arkadan öne: göz önce derinliği, sonra uçağı görüyor.
 */
function Rampalar() {
  const yerler = useMemo(() => {
    const a: [number, number][] = [];
    for (let i = 0; i < 5; i++)
      for (const s of [-1, 1]) a.push([s * 22, -H.derinlik + 14 + i * 15]);
    return a;
  }, []);
  const ref = useRef<(THREE.Group | null)[]>([]);

  useFrame((st) => {
    const t = st.clock.elapsedTime;
    yerler.forEach(([, z], i) => {
      const g = ref.current[i];
      if (!g) return;
      // arkadaki rampa önce yanar; her biri kısa bir titremeyle oturur
      const gecikme = 0.35 + ((z + H.derinlik) / (H.derinlik * 2)) * 1.9;
      const acik = aralik(t, gecikme, gecikme + 0.55);
      const titre = acik < 1 ? (Math.sin(t * 47 + i) > 0 ? 1 : 0.35) : 1;
      const gorunur = acik * titre;
      const panel = g.children[0] as THREE.Mesh;
      const koni = g.children[1] as THREE.Mesh;
      (panel.material as THREE.MeshBasicMaterial).opacity = gorunur;
      /* Koni opaklığı 0,075'ten 0,022'ye indirildi: additive koniler kadrajda
         dev gri üçgenler hâlinde uçağın önüne geçiyordu. Hacim hissi bu
         değerde de var, "sis makinesi" görüntüsü yok. */
      (koni.material as THREE.MeshBasicMaterial).opacity = gorunur * 0.022;
    });
  });

  return (
    <group>
      {yerler.map(([x, z], i) => (
        <group
          key={i}
          position={[x, H.yukseklik - 2.6, z]}
          ref={(el) => {
            ref.current[i] = el;
          }}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[7, 1.5]} />
            <meshBasicMaterial color={HC.isik} transparent opacity={0} />
          </mesh>
          {/* ışık konisi: additive, çok düşük opaklık — sis yerine hacim hissi */}
          <mesh position={[0, -H.yukseklik / 2 + 1.3, 0]}>
            <coneGeometry args={[7.5, H.yukseklik - 2.6, 20, 1, true]} />
            <meshBasicMaterial
              color={HC.isik}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
      {/* Gerçek ışıklar. Şiddetler yüksek görünüyor ama decay=2 ile fizikseldir:
          26 birim yükseklikten gelen ışık uçağa varana kadar ~1/700'e düşer.
          Kırmızı dolgu lambası kimlik içindir — gövdenin sağ yanağına THY tonu
          düşürür, sahne tek renkli griye kaçmaz. */}
      <ambientLight intensity={0.55} color="#8fa6c8" />
      <pointLight
        position={[-24, 26, 18]}
        intensity={9000}
        color="#cfe0ff"
        distance={190}
        decay={2}
      />
      <pointLight
        position={[26, 26, -14]}
        intensity={7000}
        color="#bcd2f5"
        distance={190}
        decay={2}
      />
      <pointLight
        position={[16, 9, 30]}
        intensity={2400}
        color={HC.marka}
        distance={90}
        decay={2}
      />
      {/* motorun önündeki nokta ışık: dalış perdesinde kaporta ve fan burada
          aydınlanır, yoksa kamera içeri girdiğinde kadraj kararıyordu */}
      <pointLight position={[-9, 6, 12]} intensity={900} color="#dbe8ff" distance={40} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ pist / filo */

/** İki pist şeridinin hangar eksenine uzaklığı — trafik şeritleri bunlara oturur. */
const SERITLER = [-110, -250];

/** Pist şeritleri, orta çizgi ve kenar ışıkları — kapının ötesinde gece apronu. */
function Pist() {
  const seritler = SERITLER;
  const kenar = useMemo(() => {
    const p: number[] = [];
    for (const z of seritler)
      for (let x = -240; x <= 280; x += 16) {
        p.push(x, 0.5, z - 30, x, 0.5, z + 30);
      }
    return new Float32Array(p);
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(kenar, 3));
    return g;
  }, [kenar]);
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <group position={[0, -0.4, 0]}>
      {/* apron zemini */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -260]}>
        <planeGeometry args={[900, 460]} />
        <meshStandardMaterial color={HC.pist} metalness={0.35} roughness={0.75} />
      </mesh>
      {seritler.map((z) => (
        <group key={z}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, 0.12, z]}>
            <planeGeometry args={[560, 44]} />
            <meshStandardMaterial color="#101a2c" metalness={0.2} roughness={0.9} />
          </mesh>
          {/* orta çizgi kesikleri */}
          {Array.from({ length: 24 }, (_, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-240 + i * 23, 0.16, z]}>
              <planeGeometry args={[11, 0.8]} />
              <meshBasicMaterial color="#e8eef7" transparent opacity={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* kenar ışıkları */}
      <points geometry={geo}>
        <pointsMaterial color="#9fd0ff" size={1.6} sizeAttenuation transparent opacity={0.85} />
      </points>
    </group>
  );
}

/** Tek sefer: uçuş profilinde ilerleyen sade uçak. */
function Sefer({ sefer, i }: { sefer: (typeof SEFERLER)[number]; i: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((st) => {
    const g = ref.current;
    if (!g) return;
    const t = (((st.clock.elapsedTime / sefer.sure + sefer.faz) % 1) + 1) % 1;
    const h = ucusHali(sefer.tip, t, sefer.z);
    g.position.set(h.x, h.y + 1.6, h.z);
    // burun +Z modellendi; pist ekseni +X → gövde Y'de çeyrek tur çevrilir
    g.rotation.set(0, Math.PI / 2, 0);
    g.rotateOnAxis(new THREE.Vector3(1, 0, 0), h.egim);
    g.rotateOnAxis(new THREE.Vector3(0, 0, 1), h.yatis);
  });

  return (
    <group ref={ref} scale={sefer.olcek}>
      <Ucak sade key={i} />
      {/* seyir ışıkları: sol kırmızı, sağ yeşil, kuyrukta çakar */}
      <mesh position={[-16.4, -0.6, -2]}>
        <sphereGeometry args={[0.4, 6, 6]} />
        <meshBasicMaterial color="#ff3b3b" />
      </mesh>
      <mesh position={[16.4, -0.6, -2]}>
        <sphereGeometry args={[0.4, 6, 6]} />
        <meshBasicMaterial color="#39ff88" />
      </mesh>
    </group>
  );
}

function Trafik() {
  return (
    <group>
      {SEFERLER.map((s, i) => (
        <Sefer key={i} sefer={s} i={i} />
      ))}
    </group>
  );
}

/* --------------------------------------------------------------- karar küresi */

/**
 * SON PERDE — 5.000 parçanın küresi.
 *
 * CODE ekranındaki operasyon küresinin ta kendisi (aynı palet, aynı kanal
 * dağılımı): kapı açıldığında kullanıcı ilk ekranda bu görüntüyü bulur, açılış
 * filmi ile ürün arasında kesinti hissetmez. Renk dağılımı uydurma değil —
 * 72 siparişsiz · 62 kalan kırmızı · 1.418 aksiyon · 3.448 izle.
 */
function KararKuresi({ akis }: { akis: React.RefObject<number> }) {
  const ref = useRef<THREE.Points>(null);

  const { geo, mat } = useMemo(() => {
    const n = K.pn;
    const poz = fibonacciKure(n);
    const renk = new Float32Array(n * 3);
    const kova: [number, string][] = [
      [K.siparissiz, SC.alarm],
      [K.kirmizi - K.siparissiz, SC.kirmizi],
      [1418, SC.aksiyon],
      [n, SC.izle],
    ];
    const c = new THREE.Color();
    let sinir = 0;
    let k = 0;
    for (let i = 0; i < n; i++) {
      while (k < kova.length - 1 && i >= sinir + kova[k][0]) {
        sinir += kova[k][0];
        k++;
      }
      c.set(kova[k][1]);
      renk[i * 3] = c.r;
      renk[i * 3 + 1] = c.g;
      renk[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(poz, 3));
    g.setAttribute('color', new THREE.BufferAttribute(renk, 3));
    const m = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return { geo: g, mat: m };
  }, []);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((st, dt) => {
    const g = ref.current;
    if (!g) return;
    // küre son perdede doğar: komponentler dağıldıktan sonra yerini veriye bırakır
    const a = kolay(aralik(akis.current ?? 0, 3.35, 4));
    mat.opacity = a;
    g.visible = a > 0.01;
    g.scale.setScalar(karisim(0.25, 2.85, a));
    g.rotation.y += dt * 0.16;
    g.rotation.x = 0.22 + Math.sin(st.clock.elapsedTime * 0.13) * 0.06;
  });

  return (
    <group position={MOTOR_MERKEZ}>
      <points ref={ref} geometry={geo} material={mat} />
    </group>
  );
}

/* ------------------------------------------------------------------ koreografi */

/**
 * Kamera + perdeye bağlı bütün türev değerler.
 *
 * `akis` hedef perdeye üstel yaklaşır (kare bağımsız: 1-exp(-k·dt)). Doğrusal
 * lerp denendi, düşük fps'te sıçrıyordu; üstel form 30 fps'te de aynı yolu
 * izliyor. Fare paralaksı kameraya EKLENİR, hedefe değil: sürüklenme birikip
 * sahneyi kaydırmasın.
 */
function Koreografi({
  perde,
  serbest,
  akis,
  ucakOpak,
  motorAcilim,
  motorGorunum,
  fanHiz,
  motorGrup,
}: {
  perde: number;
  /** serbest bakış: kamerayı kullanıcı sürüklüyor, koreografi karışmaz */
  serbest: boolean;
  akis: React.RefObject<number>;
  ucakOpak: React.RefObject<number>;
  motorAcilim: React.RefObject<number>;
  motorGorunum: React.RefObject<number>;
  fanHiz: React.RefObject<number>;
  motorGrup: React.RefObject<THREE.Group | null>;
}) {
  const kam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const bak = useRef(new THREE.Vector3(...KAMERA[0].bak));
  const p0 = useRef(new THREE.Vector3());
  const p1 = useRef(new THREE.Vector3());
  const b0 = useRef(new THREE.Vector3());
  const b1 = useRef(new THREE.Vector3());

  useFrame((st, dt) => {
    const a = akis.current ?? 0;
    const hedef = perde;
    /* 1,35 → 1,7: perde 0'dan 1'e geçerken kamera hangarın karanlık içinden
       geçiyor ve yavaş katsayıda o boş kadraj bir saniyeden uzun sürüyordu. */
    const k = 1 - Math.exp(-dt * 1.7);
    akis.current = a + (hedef - a) * k;
    const p = akis.current;

    const i0 = Math.max(0, Math.min(KAMERA.length - 1, Math.floor(p)));
    const i1 = Math.max(0, Math.min(KAMERA.length - 1, i0 + 1));
    const f = kolay(p - i0);

    p0.current.set(...KAMERA[i0].poz);
    p1.current.set(...KAMERA[i1].poz);
    b0.current.set(...KAMERA[i0].bak);
    b1.current.set(...KAMERA[i1].bak);

    bak.current.copy(b0.current).lerp(b1.current, f);

    /* SERBEST BAKIŞTA kameraya DOKUNULMAZ — OrbitControls sürüyor. Türev
       değerler (fan hızı, patlama, opaklık) yine hesaplanır: kullanıcı motoru
       çevirirken fan dönmeye, yanma odası yanmaya devam etsin. */
    if (!serbest) {
      const poz = p0.current.clone().lerp(p1.current, f);

      // yavaş nefes + fare paralaksı — sahne asla donmuş görünmesin
      const t = st.clock.elapsedTime;
      const nefes = 1 + 0.004 * Math.sin(t * 0.35);
      poz.multiplyScalar(nefes);
      poz.x += st.pointer.x * 1.5;
      poz.y += st.pointer.y * 0.9;

      kam.position.lerp(poz, 1 - Math.exp(-dt * 6));
      kam.lookAt(bak.current);
      const fov = karisim(KAMERA[i0].fov, KAMERA[i1].fov, f);
      if (Math.abs(kam.fov - fov) > 0.01) {
        kam.fov = fov;
        kam.updateProjectionMatrix();
      }
    }

    /* ---- perdeye bağlı türev değerler ---- */
    /* Uçak perde 2'de hayalete döner: motor onun yerini alır, iki nasel
       çakışmaz. 0,06 değil 0,13 — tam silinince motor boşlukta yüzüyordu;
       bu değerde kanat ve gövde belli belirsiz duruyor ve "bu motor bir
       uçağın üzerinde" bilgisi kaybolmuyor. */
    ucakOpak.current = karisim(1, 0.13, kolay(aralik(p, 1.35, 2.1)));
    motorAcilim.current = kolay(aralik(p, 2.5, 3.25));
    fanHiz.current = karisim(0.25, 1.85, kolay(aralik(p, 1.2, 2.4)));

    // motor gövdesi perde 1.2'den itibaren belirir, son perdede veriye karışır
    const gorunum = kolay(aralik(p, 1.2, 1.9)) * (1 - kolay(aralik(p, 3.4, 3.95)));
    motorGorunum.current = gorunum;
    const g = motorGrup.current;
    if (g) {
      g.visible = gorunum > 0.02;
      g.scale.setScalar(karisim(0.86, 1, kolay(aralik(p, 1.2, 2.2))));
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (!m || Array.isArray(m)) return;
        m.transparent = true;
        m.depthWrite = gorunum > 0.9;
        m.opacity = gorunum;
      });
    }
  });

  return null;
}

/* --------------------------------------------------------------------- sahne */

function Sahne({
  perde,
  serbest,
  vurgu,
  onKomponent,
  etiketler,
}: {
  perde: number;
  serbest: boolean;
  vurgu: number;
  onKomponent: (i: number) => void;
  etiketler: React.RefObject<(HTMLDivElement | null)[]>;
}) {
  const akis = useRef(0);
  const ucakOpak = useRef(1);
  const motorAcilim = useRef(0);
  const motorGorunum = useRef(0);
  const fanHiz = useRef(0.25);
  const motorGrup = useRef<THREE.Group | null>(null);

  return (
    <>
      <color attach="background" args={[HC.zemin]} />
      <fog attach="fog" args={[HC.zemin, 120, 760]} />
      <Ortam />

      {/* Serbest bakış: yalnız açıkken mount edilir. Sürekli mount tutmak
          koreografi ile aynı kareyi iki kez yazmak demek — kamera titriyordu.
          Hedef, içinde bulunulan perdenin bakış noktası: kullanıcı nereye
          bakıyorsa onun etrafında döner. */}
      {serbest && (
        <OrbitControls
          makeDefault
          target={KAMERA[Math.min(perde, KAMERA.length - 1)].bak}
          enablePan={false}
          minDistance={2.2}
          maxDistance={120}
          rotateSpeed={0.55}
          zoomSpeed={0.8}
        />
      )}

      <Koreografi
        perde={perde}
        serbest={serbest}
        akis={akis}
        ucakOpak={ucakOpak}
        motorAcilim={motorAcilim}
        motorGorunum={motorGorunum}
        fanHiz={fanHiz}
        motorGrup={motorGrup}
      />

      <Zemin />
      <Kabuk />
      <Rampalar />
      <Pist />
      <Trafik />

      {/* park hâlindeki uçak — tekerlekler tam y=0'a otursun diye UCAK_Y kadar
          yukarıda; aynı sabit motorun sahnedeki yerini de belirler */}
      <group position={[0, UCAK_Y, 0]}>
        <Ucak parkta opaklik={ucakOpak} />
      </group>

      {/* kesitli motor: uçağın SOL naseliyle birebir aynı noktada */}
      <group ref={motorGrup} position={MOTOR_MERKEZ} visible={false}>
        <Motor
          acilim={motorAcilim}
          gorunum={motorGorunum}
          hiz={fanHiz}
          vurgu={vurgu}
          onSec={onKomponent}
          etiketler={etiketler}
        />
      </group>

      <KararKuresi akis={akis} />
    </>
  );
}

export default function HangarSahne({
  perde,
  serbest,
  vurgu,
  onKomponent,
  etiketler,
}: {
  perde: number;
  serbest: boolean;
  vurgu: number;
  onKomponent: (i: number) => void;
  etiketler: React.RefObject<(HTMLDivElement | null)[]>;
}) {
  /* dpr üst sınırı 1.75: retina'da 2 ile aradaki fark bu sahnede görünmüyor,
     kare süresi ise neredeyse iki katına çıkıyor. */
  return (
    <Canvas
      camera={{ position: KAMERA[0].poz, fov: KAMERA[0].fov, near: 0.4, far: 1600 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Sahne
        perde={perde}
        serbest={serbest}
        vurgu={vurgu}
        onKomponent={onKomponent}
        etiketler={etiketler}
      />
    </Canvas>
  );
}
