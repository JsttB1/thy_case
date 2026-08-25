/**
 * MOTOR — kesitli turbofan.
 *
 * Sahnenin can alıcı yeri. Kamera motora YANDAN yanaşır ve kaportanın kesilmiş
 * yüzünden içeri bakar: fan → booster → HP kompresör kademeleri → yanma odası
 * (yanan) → türbin → egzoz konisi, hepsi tek karede. (İlk sürümde kamera baştan
 * bakıyordu ve yalnız fan diski görünüyordu — motorun "içi" hiç okunmuyordu.)
 *
 * Kesit sabit bir dilimdir, kamerayla dönmez: serbest bakışta kullanıcı motoru
 * çevirip kapalı tarafı da görür. Kaportanın altında ne olduğu ancak iki taraf
 * birlikte görülünce anlaşılır.
 *
 * Motorun üstündeki SEKİZ rozet payload'daki sekiz ATA motor kategorisidir
 * (bkz. hangarVeri.ts) ve her biri KENDİ fiziksel istasyonunda durur: yanma
 * odası rozeti yanma odasının, starter rozeti aksesuar kutusunun hizasında.
 *
 * Etiketler 3D'de değil tuvalin üstündeki HTML katmanında durur; konumları her
 * karede buradan yansıtılır (code/Kure.tsx ile aynı teknik: drei Html her etiket
 * için tuvali kaplayan bir sarmalayıcı açıp tıklamayı yutuyordu).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { komponentYeri, korKesiti, kademeler, fanKanat, MOTOR, KESIT } from './hangarGeo';
import { HC, MOTOR_KOMPONENT } from './hangarVeri';

/* ---------------------------------------------------------------- malzemeler */

const metal = (renk: string, ruh: number, met = 0.9) =>
  new THREE.MeshStandardMaterial({
    color: renk,
    metalness: met,
    roughness: ruh,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  });

/* ---------------------------------------------------------------------- fan */

/**
 * Fan diski. 22 kanat: daha azı dururken "pervane", daha çoğu dönerken tek gri
 * disk oluyordu. Kanat ucu 1,26'da kalır — kaporta iç yarıçapı 1,32, daha uzunu
 * kaportayı deliyordu.
 */
function Fan({ hiz, mlz }: { hiz: React.RefObject<number>; mlz: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  const kanatlar = useMemo(() => Array.from({ length: 22 }, (_, i) => fanKanat(i, 22)), []);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z -= dt * (hiz.current ?? 1) * 3.4;
  });

  return (
    <group ref={ref} position={[0, 0, MOTOR.fanZ]}>
      <mesh material={mlz} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.4, 22]} />
      </mesh>
      {/* spinner konisi */}
      <mesh material={mlz} position={[0, 0, 0.46]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.33, 0.68, 22]} />
      </mesh>
      {kanatlar.map(({ aci, burulma }, i) => (
        <group key={i} rotation={[0, 0, aci]}>
          <mesh position={[0, 0.79, 0]} rotation={[0, burulma, 0]}>
            <boxGeometry args={[0.14, 1.0, 0.46]} />
            <meshStandardMaterial
              color={HC.fan}
              metalness={0.95}
              roughness={0.14}
              envMapIntensity={1.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Çıkış yönlendirici kanatları (OGV) — sabit, fanın hemen arkasında. */
function Statorlar({ mlz }: { mlz: THREE.Material }) {
  const kanat = useMemo(() => Array.from({ length: 30 }, (_, i) => (i / 30) * Math.PI * 2), []);
  return (
    <group position={[0, 0, MOTOR.fanZ - 0.75]}>
      {kanat.map((a, i) => (
        <group key={i} rotation={[0, 0, a]}>
          <mesh material={mlz} position={[0, 1.02, 0]} rotation={[0, -0.34, 0]}>
            <boxGeometry args={[0.05, 0.46, 0.34]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * KOR — kompresör/türbin gövdesi + kademe diskleri + yanma odası.
 *
 * Kademeler ayrı ayrı halkalar hâlinde çizilir (kademeler()): kesitten bakınca
 * "içi dolu bir boru" değil, gerçekten kademeli bir makine görünsün diye.
 * Döner kademeler fanla aynı milde: hepsi tek grupta döner.
 */
function Kor({ hiz, mlz }: { hiz: React.RefObject<number>; mlz: Record<string, THREE.Material> }) {
  const kesit = useMemo(korKesiti, []);
  const kdm = useMemo(kademeler, []);
  const doner = useRef<THREE.Group>(null);
  const yanma = useRef<THREE.Mesh>(null);

  useFrame((st, dt) => {
    if (doner.current) doner.current.rotation.z -= dt * (hiz.current ?? 1) * 3.4;
    // yanma odası nabzı — sabit parlaklık "plastik", nabız "çalışıyor" okunuyor
    if (yanma.current) {
      const t = st.clock.elapsedTime;
      const m = yanma.current.material as THREE.MeshBasicMaterial;
      // 0,55 tabanda additive katman beyaza doyup "ampul" gibi parlıyordu
      m.opacity = 0.3 + 0.12 * Math.sin(t * 7.3) + 0.06 * Math.sin(t * 2.1);
    }
  });

  return (
    <group>
      {/* kor gövdesi — daralıp genişleyen kesit */}
      {kesit.slice(0, -1).map(([z, r], i) => {
        const [z2, r2] = kesit[i + 1];
        return (
          <mesh key={i} position={[0, 0, (z + z2) / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry
              args={[r, r2, Math.abs(z - z2), 24, 1, true, KESIT.basla, KESIT.uzunluk]}
            />
            <primitive object={i >= 4 ? mlz.sicakMetal : mlz.korMetal} attach="material" />
          </mesh>
        );
      })}

      {/* dönen kademeler */}
      <group ref={doner}>
        {kdm.map(([z, ic, dis, n], i) => (
          <group key={i} position={[0, 0, z]}>
            {/* disk göbeği */}
            <mesh material={mlz.korMetal} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[ic, ic, 0.1, 20]} />
            </mesh>
            {/* bıçak halkası */}
            {Array.from({ length: n }, (_, j) => (
              <group key={j} rotation={[0, 0, (j / n) * Math.PI * 2]}>
                <mesh
                  material={z < -0.8 ? mlz.turbin : mlz.bicak}
                  position={[0, (ic + dis) / 2, 0]}
                  rotation={[0, 0.5, 0]}
                >
                  <boxGeometry args={[0.035, dis - ic, 0.14]} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        {/* mil */}
        <mesh material={mlz.korMetal} position={[0, 0, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 4.6, 12]} />
        </mesh>
      </group>

      {/* yanma odası ışığı */}
      <mesh ref={yanma} position={[0, 0, -0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.62, 20, 1, true]} />
        <meshBasicMaterial
          color={HC.sicak}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* yakıt enjektörleri — yanma odasının çevresinde halka */}
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} rotation={[0, 0, (i / 12) * Math.PI * 2]}>
          <mesh material={mlz.korMetal} position={[0, 0.46, -0.42]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.34, 6]} />
          </mesh>
        </group>
      ))}

      {/* egzoz konisi (plug) */}
      <mesh material={mlz.sicakMetal} position={[0, 0, -3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.6, 1.5, 22, 1, true]} />
      </mesh>
    </group>
  );
}

/**
 * KAPORTA — dış kabuk, kesilmiş.
 *
 * İki katman: dış kaporta (livery beyazı) ve baypas kanalının iç duvarı (koyu).
 * Tek katman kâğıt gibi duruyordu; iki katman arasındaki boşluk baypas kanalını
 * görünür kılıyor — motorun havayı ikiye ayırdığı gerçeği kesitten okunuyor.
 */
function Kaporta({
  acilim,
  mlz,
}: {
  acilim: React.RefObject<number>;
  mlz: Record<string, THREE.Material>;
}) {
  const kabuk = useRef<THREE.Group>(null);

  useFrame(() => {
    // patlama ilerledikçe kaporta hafifçe kalkar: kapak açılıyor izlenimi
    const a = acilim.current ?? 0;
    if (kabuk.current) {
      kabuk.current.position.y = a * 0.5;
      kabuk.current.rotation.z = a * 0.1;
    }
  });

  const boy = MOTOR.girisZ - MOTOR.baypasZ;
  const orta = (MOTOR.girisZ + MOTOR.baypasZ) / 2;

  return (
    <group ref={kabuk}>
      {/* dış kaporta */}
      <mesh material={mlz.kaporta} position={[0, 0, orta]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[MOTOR.disR, MOTOR.disR * 0.86, boy, 40, 1, true, KESIT.basla, KESIT.uzunluk]}
        />
      </mesh>
      {/* baypas kanalının iç duvarı */}
      <mesh material={mlz.icDuvar} position={[0, 0, orta]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[
            MOTOR.disR - 0.16,
            MOTOR.disR * 0.86 - 0.14,
            boy,
            36,
            1,
            true,
            KESIT.basla,
            KESIT.uzunluk,
          ]}
        />
      </mesh>
      {/* Kesim yüzeyleri: kabuk kalınlığını gösteren iki radyal levha.
          Koyu ton bilerek — parlak metal olunca kaportadan daha çok dikkat
          çekip "raf" gibi duruyordu. Kesik kenar, kesilen şeyden sönük olmalı. */}
      {[KESIT.basla, KESIT.basla + KESIT.uzunluk].map((a, i) => (
        <group key={i} rotation={[0, 0, a]}>
          <mesh
            material={mlz.kesim}
            position={[MOTOR.disR - 0.08, 0, orta]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[boy, 0.16]} />
          </mesh>
        </group>
      ))}
      {/* Baypas kanalı destek çubukları — YALNIZ kesitin dışında kalan açılarda.
          Açıklığın önünden geçenler kadraja rastgele çubuklar gibi düşüyordu. */}
      {[3.4, 4.3, 5.2, 6.0].map((a) => (
        <group key={a} rotation={[0, 0, a]}>
          <mesh material={mlz.icDuvar} position={[0, 1.1, -0.9]}>
            <boxGeometry args={[0.07, 0.6, 0.26]} />
          </mesh>
        </group>
      ))}
      {/* giriş dudağı — tam halka (kesitten bağımsız), parlak metal */}
      <mesh material={mlz.dudak} position={[0, 0, MOTOR.girisZ]}>
        <torusGeometry args={[MOTOR.disR - 0.09, 0.12, 12, 44]} />
      </mesh>
      {/* baypas çıkış halkası */}
      <mesh material={mlz.dudak} position={[0, 0, MOTOR.baypasZ]}>
        <torusGeometry args={[MOTOR.disR * 0.86 - 0.07, 0.06, 8, 40]} />
      </mesh>
      {/* kor kaportası — baypas ile korun arasındaki duvar */}
      <mesh material={mlz.icDuvar} position={[0, 0, -1.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[MOTOR.korR, MOTOR.korR * 0.92, 2.2, 28, 1, true, KESIT.basla, KESIT.uzunluk]}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------ komponent rozeti */

/**
 * Tek komponent rozeti: sekizgen işaret + motora inen veri hattı + hat üzerinde
 * akan paket. Kırmızı listesi olan kategori alarm tonunda yanar (--st-red
 * ailesi); temizler nötr veri mavisinde. Renk burada da anlam taşır.
 */
function Rozet({
  i,
  acilim,
  gorunum,
  vurgu,
  onTikla,
  etiketAl,
}: {
  i: number;
  acilim: React.RefObject<number>;
  /** motor gövdesinin sahnedeki varlığı (0..1) — son perdede rozetler de söner */
  gorunum: React.RefObject<number>;
  vurgu: boolean;
  onTikla: () => void;
  etiketAl: () => HTMLDivElement | null;
}) {
  const grup = useRef<THREE.Group>(null);
  const isaret = useRef<THREE.Group>(null);
  const paket = useRef<THREE.Mesh>(null);
  const hat = useRef<THREE.LineSegments>(null);
  const dunya = useRef(new THREE.Vector3());
  const k = MOTOR_KOMPONENT[i];
  const renk = k.kirmizi > 0 ? HC.alarm : HC.veri;

  const hatGeo = useMemo(() => new THREE.BufferGeometry(), []);
  useLayoutEffect(() => () => hatGeo.dispose(), [hatGeo]);

  const uc = useMemo(() => new THREE.Vector3(), []);
  const kok = useMemo(() => new THREE.Vector3(), []);

  useFrame((st) => {
    const a = acilim.current ?? 0;
    /* Rozet motora bağlıdır: motor son perdede veriye karışırken rozetler de
       onunla sönmeli. Yalnız `acilim`e bakılınca (o perde 3'ten sonra 1'de
       kalıyor) etiketler karar küresinin üstünde asılı duruyordu. */
    const g = gorunum.current ?? 1;
    const p = komponentYeri(k.ist, a);
    uc.set(p.x, p.y, p.z);
    // hat, rozetten kendi istasyonunun eksen üstündeki noktasına iner
    kok.set(p.x * 0.2, p.y * 0.2, p.z);

    if (grup.current) {
      grup.current.position.copy(uc);
      grup.current.visible = a > 0.02 && g > 0.02;
    }
    if (isaret.current) {
      isaret.current.rotation.y += 0.018;
      isaret.current.rotation.x += 0.006;
      isaret.current.scale.setScalar((vurgu ? 1.5 : 1) * (0.55 + a * 0.45));
    }

    hatGeo.setFromPoints([uc, kok]);
    if (hat.current) (hat.current.material as THREE.Material).opacity = a * g * 0.55;

    // hat üzerinde çekirdeğe akan paket (CODE küresindeki düğümlerle aynı dil)
    if (paket.current) {
      const t = (st.clock.elapsedTime * 0.5 + i / MOTOR_KOMPONENT.length) % 1;
      paket.current.position.lerpVectors(uc, kok, t);
      (paket.current.material as THREE.Material).opacity = a * g * (1 - t) * 0.95;
    }

    /* Etiketi HTML katmanına yansıt. Kamera arkasına düşen rozet gizlenir:
       yoksa etiket ekranın ters tarafında hayalet gibi beliriyordu. */
    const el = etiketAl();
    if (!grup.current || !el) return;
    grup.current.getWorldPosition(dunya.current);
    const ndc = dunya.current.clone().project(st.camera);
    const gorunur = a > 0.06 && g > 0.06 && ndc.z < 1 && Math.abs(ndc.x) < 1.6;
    const y = (-ndc.y * 0.5 + 0.5) * st.size.height;

    /* Etiket kadrajın DIŞINA taşmaz. Sağdaki rozetin etiketi sağa açılır, ama
       kenara yaklaşınca sola döner ve son çare olarak x kırpılır: ilk denemede
       sağdaki iki kategori ekranın dışında kalıp okunmuyordu. */
    const gen = el.offsetWidth || 150;
    const bosluk = 14;
    let x = (ndc.x * 0.5 + 0.5) * st.size.width;
    let saga = ndc.x >= 0;
    if (saga && x + bosluk + gen > st.size.width - 8) saga = false;
    else if (!saga && x - bosluk - gen < 8) saga = true;
    x = Math.min(
      Math.max(x, saga ? 8 : gen + bosluk + 8),
      saga ? st.size.width - gen - bosluk - 8 : st.size.width - 8,
    );

    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(${saga ? `${bosluk}px` : `calc(-100% - ${bosluk}px)`}, -50%)`;
    el.style.opacity = gorunur ? String(Math.min(1, a * 1.6) * g) : '0';
    el.style.pointerEvents = gorunur ? 'auto' : 'none';
  });

  return (
    <>
      {/* <line> DEĞİL <lineSegments>: JSX'te `line` SVG öğesine çözülüyor ve
          geometry özelliği tip hatası veriyor (code/Kure.tsx'te de aynı seçim). */}
      <lineSegments ref={hat} geometry={hatGeo}>
        <lineBasicMaterial color={renk} transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <mesh ref={paket}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color={renk} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={grup} onClick={onTikla}>
        <group ref={isaret}>
          <mesh>
            <octahedronGeometry args={[0.19, 0]} />
            <meshBasicMaterial color={renk} wireframe />
          </mesh>
          <mesh>
            <octahedronGeometry args={[0.11, 0]} />
            <meshBasicMaterial color={renk} transparent opacity={0.55} />
          </mesh>
        </group>
        {/* kırmızı kategori: etrafında alarm halkası (rozetle aynı düzlemde —
            döndürülürse çizgiye iniyor) */}
        {k.kirmizi > 0 && (
          <mesh>
            <torusGeometry args={[0.3, 0.012, 6, 28]} />
            <meshBasicMaterial color={HC.alarm} transparent opacity={0.8} />
          </mesh>
        )}
      </group>
    </>
  );
}

/* -------------------------------------------------------------------- motor */

export default function Motor({
  acilim,
  gorunum,
  hiz,
  vurgu,
  onSec,
  etiketler,
}: {
  /** 0 = rozetler motorun üstünde · 1 = tam açılmış patlama */
  acilim: React.RefObject<number>;
  /** motorun sahnedeki varlığı (0..1) — rozetler ve etiketler buna da bağlı */
  gorunum: React.RefObject<number>;
  /** fan dönüş çarpanı */
  hiz: React.RefObject<number>;
  vurgu: number;
  onSec: (i: number) => void;
  etiketler: React.RefObject<(HTMLDivElement | null)[]>;
}) {
  const mlz = useMemo(
    () => ({
      kaporta: metal('#e8edf4', 0.34, 0.25),
      icDuvar: metal('#39435a', 0.55, 0.7),
      kesim: metal('#2f3a4d', 0.55, 0.6),
      /* Giriş dudağı: metalness 0,96 + roughness 0,16 ile ayna gibiydi ve
         yansıtacak parlak bir şey olmadığı için SİYAH bir lastik halka gibi
         duruyordu. Fırçalanmış alüminyum değerleri ışığı gerçekten yakalıyor. */
      dudak: metal('#b3bfd0', 0.72, 0.34),
      korMetal: metal('#7f8b9e', 0.32, 0.92),
      sicakMetal: metal('#6b5747', 0.42, 0.85),
      bicak: metal('#c3d0e2', 0.16, 0.95),
      turbin: metal('#b98f63', 0.28, 0.9),
      fanGobek: metal('#39424f', 0.3, 0.85),
    }),
    [],
  );

  useLayoutEffect(() => () => Object.values(mlz).forEach((m) => m.dispose()), [mlz]);

  return (
    <group>
      <Kaporta acilim={acilim} mlz={mlz} />
      <Fan hiz={hiz} mlz={mlz.fanGobek} />
      <Statorlar mlz={mlz.korMetal} />
      <Kor hiz={hiz} mlz={mlz} />

      {/* PİLON KÜTÜĞÜ KALDIRILDI. Motorun kendi pilon parçası, arkada duran
          hayalet uçağın pilonuyla üst üste biniyor ve kadrajın tepesinde
          birbirini kesen beyaz levhalar bırakıyordu. Bağlamı zaten hayalet
          uçak veriyor: motor bir kanadın altında duruyor, ikinci kez
          söylemeye gerek yok. */}

      {MOTOR_KOMPONENT.map((_, i) => (
        <Rozet
          key={i}
          i={i}
          acilim={acilim}
          gorunum={gorunum}
          vurgu={vurgu === i}
          onTikla={() => onSec(i)}
          etiketAl={() => etiketler.current[i] ?? null}
        />
      ))}
    </group>
  );
}
