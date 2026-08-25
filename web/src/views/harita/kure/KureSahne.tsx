/**
 * KÜRE SAHNESİ — tam ekran 3D operasyon dünyası.
 *
 * Ekranın tamamı tek bir küredir: kıtalar 110m konturdan çalışma anında
 * noktalanır (hazır doku dosyası yok — uygulama internetsiz açılmak zorunda),
 * 25 istasyon yüzeyden dikilen sütunlarla ölçülür, tedarik kanalları büyük
 * çember yaylarında AKAN PARÇACIKLARLA çizilir.
 *
 * Akış yönü daima kaynak → hedef; hız kanal tipine bağlıdır (kureStil.AKIS_HIZ):
 * havuzdan değişim akıp giderken satın alma yolu ağır ağır ilerler. Yani "hangi
 * yol hızlı" sorusu tabloya bakmadan, hareketten okunur.
 *
 * Sayı üretmez: konumlar kureGeo.ts'ten, süre/maliyet/kanal haritaVeri.ts'ten
 * gelir. Sahne yalnız çizer.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { HA } from '../haritaVeri';
import {
  IST_POZ,
  R,
  yayNoktalari,
  yayOrnek,
  karaNoktalari,
  konturCizgileri,
  izgaraCizgileri,
} from './kureGeo';
import { KURE_RENK, DEPO_RENK_3D, AKIS_HIZ, SEC_RENK } from './kureStil';

/* ------------------------------------------------------------------ yardımcılar */

const bufGeo = (arr: Float32Array): THREE.BufferGeometry => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return g;
};


/**
 * İşaret ölçeği: kamera uzaklığına orantılı çarpan, yani ekrandaki boy sabit.
 * Referans uzaklık 3,9 — açılış kadrajında görünen boy neyse yakınlaşınca da o.
 */
const OLCEK_REF = 3.9;
const ekranOlcegi = (kamUz: number) => Math.min(1.35, kamUz / OLCEK_REF);

/** sabit tohumlu üreteç — yıldız alanı her açılışta aynı (demo tekrarlanabilir) */
function tohumlu(s: number) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------------------------------------------------- zemin */

function Yildizlar() {
  const geo = useMemo(() => {
    const rnd = tohumlu(9);
    const n = 1400;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 26 + rnd() * 20;
      p[i * 3] = Math.cos(th) * s * r;
      p[i * 3 + 1] = u * r;
      p[i * 3 + 2] = Math.sin(th) * s * r;
    }
    return bufGeo(p);
  }, []);
  return (
    <points geometry={geo} raycast={() => null}>
      <pointsMaterial
        size={0.13}
        color={KURE_RENK.yildiz}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/** Atmosfer halesi — arka yüzü boyanan küre, kenarda parlar (fresnel). */
function Atmosfer() {
  const uni = useMemo(() => ({ uC: { value: new THREE.Color(KURE_RENK.atmosfer) } }), []);
  /* Hale kırmızıya geçince daraltıldı: doymuş kırmızı, eski soğuk tona göre
     toplamsal karışımda çok daha fazla taşıyor ve küreyi yutuyordu. */
  return (
    <mesh scale={1.075} raycast={() => null}>
      <sphereGeometry args={[R, 48, 32]} />
      <shaderMaterial
        uniforms={uni}
        side={THREE.BackSide}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexShader={`
          varying vec3 vN;
          void main(){
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={`
          uniform vec3 uC;
          varying vec3 vN;
          void main(){
            float i = pow(clamp(0.68 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.2);
            gl_FragColor = vec4(uC, 1.0) * i * 0.85;
          }`}
      />
    </mesh>
  );
}

function Zemin() {
  /* Kıtalar bir kez üretilir (~4.500 nokta + ~4.000 kıyı segmenti). Ağır iş
     tarayıcıda ve yalnızca harita sekmesine girildiğinde koşar; sahne zaten
     lazy chunk. */
  const kara = useMemo(() => bufGeo(karaNoktalari()), []);
  const kiyi = useMemo(() => bufGeo(konturCizgileri()), []);
  const izgara = useMemo(() => bufGeo(izgaraCizgileri()), []);
  return (
    <group>
      <mesh raycast={() => null}>
        <sphereGeometry args={[R, 64, 48]} />
        <meshBasicMaterial color={KURE_RENK.okyanus} />
      </mesh>
      <lineSegments geometry={izgara} raycast={() => null}>
        <lineBasicMaterial color={KURE_RENK.izgara} transparent opacity={0.55} depthWrite={false} />
      </lineSegments>
      <points geometry={kara} raycast={() => null}>
        <pointsMaterial
          size={0.0092}
          color={KURE_RENK.kara}
          transparent
          opacity={0.95}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <lineSegments geometry={kiyi} raycast={() => null}>
        <lineBasicMaterial color={KURE_RENK.kiyi} transparent opacity={0.34} depthWrite={false} />
      </lineSegments>
      <Atmosfer />
    </group>
  );
}

/* ---------------------------------------------------------------- istasyonlar */

/**
 * Veri sütunları — yüzeyden dikilen çizgiler.
 * Yükseklik metriğin karekökü ile ölçeklenir: alan değil boy karşılaştırıyoruz,
 * karekök büyük istasyonun küçükleri ezmesini engeller (2D'deki daire alanı
 * kuralının küre karşılığı).
 */
function Sutunlar({ deger, max, sec }: { deger: number[]; max: number; sec: number }) {
  const { geo, capGeo } = useMemo(() => {
    const n = HA.kod.length;
    const poz = new Float32Array(n * 6);
    const renk = new Float32Array(n * 6);
    const cap = new Float32Array(n * 3);
    const capRenk = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const h = 0.035 + 0.42 * Math.sqrt(Math.max(0, deger[i]) / max);
      const v = IST_POZ[i];
      c.set(DEPO_RENK_3D[HA.depo[i]] ?? DEPO_RENK_3D.yok);
      poz[i * 6] = v[0] * 1.002;
      poz[i * 6 + 1] = v[1] * 1.002;
      poz[i * 6 + 2] = v[2] * 1.002;
      poz[i * 6 + 3] = v[0] * (1 + h);
      poz[i * 6 + 4] = v[1] * (1 + h);
      poz[i * 6 + 5] = v[2] * (1 + h);
      // taban sönük, tepe parlak: sütun yükseldikçe ışıyor
      renk.set([c.r * 0.35, c.g * 0.35, c.b * 0.35, c.r, c.g, c.b], i * 6);
      cap.set([v[0] * (1 + h), v[1] * (1 + h), v[2] * (1 + h)], i * 3);
      capRenk.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(poz, 3));
    g.setAttribute('color', new THREE.BufferAttribute(renk, 3));
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(cap, 3));
    g2.setAttribute('color', new THREE.BufferAttribute(capRenk, 3));
    return { geo: g, capGeo: g2 };
  }, [deger, max]);

  const secPoz = useMemo(() => {
    const h = 0.035 + 0.42 * Math.sqrt(Math.max(0, deger[sec] ?? 0) / max);
    const v = IST_POZ[sec] ?? IST_POZ[0];
    return new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(1 + h);
  }, [deger, max, sec]);

  const nabiz = useRef<THREE.Mesh>(null);
  const halkalar = useRef<THREE.Group>(null);
  useFrame((st) => {
    /* Sütunlar YARIÇAP boyunca dikilir; ekranın ortasındaki istasyon doğrudan
       kameraya baktığı için kısalır. Bu yüzden her istasyonun bir de kameraya
       dönük halkası var: büyüklük hangi açıdan bakılırsa bakılsın okunur
       (2D haritadaki "daire alanı = uçak sayısı" kuralının küre karşılığı).

       İşaretler zoom'la BÜYÜMEZ — 2D haritadaki maplibre davranışı korundu:
       ölçek kamera uzaklığıyla çarpılır, ekrandaki boy sabit kalır. Aksi hâlde
       Türkiye'ye yaklaşıldığında tek bir halka ekranı kaplıyordu. Sütun boyu
       ise coğrafi veridir; o dünya ölçeğinde kalır. */
    const k = ekranOlcegi(st.camera.position.length());
    if (halkalar.current)
      halkalar.current.children.forEach((ch) => {
        ch.scale.setScalar(k);
        ch.lookAt(st.camera.position);
      });
    if (!nabiz.current) return;
    const t = (st.clock.elapsedTime * 0.9) % 1;
    nabiz.current.scale.setScalar((0.02 + t * 0.055) * k);
    (nabiz.current.material as THREE.Material).opacity = 0.75 * (1 - t);
    nabiz.current.lookAt(st.camera.position);
  });

  return (
    <group>
      <group ref={halkalar}>
        {IST_POZ.map((v, i) => {
          const r = 0.013 + 0.042 * Math.sqrt(Math.max(0, deger[i]) / max);
          return (
            <mesh
              key={HA.kod[i]}
              position={[v[0] * 1.003, v[1] * 1.003, v[2] * 1.003]}
              raycast={() => null}
            >
              <ringGeometry args={[r * 0.82, r, 24]} />
              <meshBasicMaterial
                color={DEPO_RENK_3D[HA.depo[i]] ?? DEPO_RENK_3D.yok}
                side={THREE.DoubleSide}
                transparent
                opacity={i === sec ? 0.95 : 0.5}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>
      <lineSegments geometry={geo} raycast={() => null}>
        <lineBasicMaterial vertexColors transparent opacity={0.92} depthWrite={false} />
      </lineSegments>
      <points geometry={capGeo} raycast={() => null}>
        {/* sütun başlığı piksel ölçeğinde: yaklaşınca büyüyüp lekeye dönüşmesin */}
        <pointsMaterial
          size={7}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation={false}
          depthWrite={false}
        />
      </points>
      {/* seçili istasyonun tepesinde genişleyip sönen halka */}
      <mesh ref={nabiz} position={secPoz} raycast={() => null}>
        <ringGeometry args={[0.55, 1, 28]} />
        <meshBasicMaterial
          color={KURE_RENK.kiyi}
          side={THREE.DoubleSide}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Tıklama hedefleri — sütunlar ince, ışın onları yakalayamaz; küre yüzeyine görünmez toplar konur. */
function IstasyonHitleri({
  onSec,
  onUzerinde,
}: {
  onSec: (i: number) => void;
  onUzerinde: (i: number | null) => void;
}) {
  return (
    <group>
      {IST_POZ.map((v, i) => (
        <mesh
          key={HA.kod[i]}
          position={[v[0] * 1.02, v[1] * 1.02, v[2] * 1.02]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSec(i);
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onUzerinde(i);
          }}
          onPointerOut={() => onUzerinde(null)}
        >
          <sphereGeometry args={[0.033, 10, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Kriz katmanı — istasyonlar filo payıyla orantılı kırmızı halkalarla nabız atar.
 * `kat` (senaryodaki kırmızı çarpanı) yalnız görünürlüğü değil NABIZ HIZINI da
 * belirler: kriz derinleştikçe küre görünür biçimde hızlanır.
 */
function KrizHalkalari({ kat }: { kat: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (!ref.current) return;
    const t = (st.clock.elapsedTime * (0.35 + 0.22 * kat)) % 1;
    ref.current.children.forEach((ch, i) => {
      const m = ch as THREE.Mesh;
      const g = 0.35 + HA.pay25[i] * 6;
      m.scale.setScalar((0.03 + t * 0.09) * (1 + g));
      (m.material as THREE.Material).opacity = Math.min(0.85, 0.15 + g * 0.5) * (1 - t);
      m.lookAt(st.camera.position);
    });
  });
  return (
    <group ref={ref}>
      {IST_POZ.map((v, i) => (
        <mesh
          key={HA.kod[i]}
          position={[v[0] * 1.004, v[1] * 1.004, v[2] * 1.004]}
          raycast={() => null}
        >
          <ringGeometry args={[0.72, 1, 26]} />
          <meshBasicMaterial
            color={SEC_RENK}
            side={THREE.DoubleSide}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------- akan parçacık */

/**
 * AKIŞ — yay boyunca ilerleyen kuyruklu parçacıklar.
 *
 * Kuyruk yapısı sabit (grup × üye), konum her karede polyline'dan örneklenir:
 * en fazla 12 yay × 30 parçacık = 360 konum güncellemesi, tahsisatsız.
 * Boyut/saydamlık attribute olarak gider; nokta boyu three'nin PointsMaterial
 * formülüyle aynı ölçekte olsun diye uPx = yükseklik/2 (dpr dahil).
 */
function Akis({
  poz,
  n,
  renk,
  hiz,
  grup = 3,
  uye = 7,
  boy = 0.03,
  gucOran = 1,
}: {
  poz: Float32Array;
  n: number;
  renk: string;
  hiz: number;
  grup?: number;
  uye?: number;
  boy?: number;
  gucOran?: number;
}) {
  const say = grup * uye;
  const { geo, aP, aS, aA } = useMemo(() => {
    const p = new Float32Array(say * 3);
    const s = new Float32Array(say);
    const a = new Float32Array(say);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
    g.setAttribute('aA', new THREE.BufferAttribute(a, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
    return { geo: g, aP: p, aS: s, aA: a };
  }, [say]);

  const uni = useMemo(
    () => ({ uC: { value: new THREE.Color(renk) }, uPx: { value: 400 } }),
    [renk],
  );
  useEffect(() => {
    uni.uC.value.set(renk);
  }, [renk, uni]);

  useFrame((st) => {
    uni.uPx.value = st.size.height * st.viewport.dpr * 0.5;
    const t0 = st.clock.elapsedTime * hiz;
    for (let g = 0; g < grup; g++) {
      for (let u = 0; u < uye; u++) {
        const k = g * uye + u;
        let t = (t0 + g / grup - u * 0.011) % 1;
        if (t < 0) t += 1;
        yayOrnek(poz, n, t, aP, k * 3);
        const kuyruk = 1 - u / uye;
        // uçlarda sönme: parça kaynaktan çıkarken ve hedefe varırken silikleşir
        const uc = Math.pow(Math.sin(Math.PI * t), 0.35);
        aS[k] = boy * (0.35 + 0.65 * kuyruk);
        aA[k] = gucOran * uc * kuyruk * kuyruk;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aS.needsUpdate = true;
    geo.attributes.aA.needsUpdate = true;
  });

  return (
    <points geometry={geo} raycast={() => null} frustumCulled={false}>
      <shaderMaterial
        uniforms={uni}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float aS;
          attribute float aA;
          uniform float uPx;
          varying float vA;
          void main(){
            vA = aA;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            // üst sınır: yakınlaşınca parçacık lekeye dönüşmesin
            gl_PointSize = min(15.0, aS * uPx / max(0.001, -mv.z));
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform vec3 uC;
          varying float vA;
          void main(){
            float d = length(gl_PointCoord - vec2(0.5));
            float a = smoothstep(0.5, 0.02, d);
            gl_FragColor = vec4(uC, a * vA);
          }`}
      />
    </points>
  );
}

/* ---------------------------------------------------------------------- yaylar */

export interface YaySpec {
  /** kaynak havalimanı indeksi */
  a: number;
  /** hedef havalimanı indeksi */
  b: number;
  renk: string;
  tip: string;
  vurgu: boolean;
  soluk: boolean;
  /** üst üste binen yaylar farklı yükseklikte ayrışsın */
  kat: number;
  tikla?: () => void;
  ipucu?: string;
}

function Yay({ s, onUzerinde }: { s: YaySpec; onUzerinde: (v: string | null) => void }) {
  const { poz, n } = useMemo(
    () => yayNoktalari(s.a, s.b, 1 + s.kat * 0.22 + (s.vurgu ? 0.06 : 0)),
    [s.a, s.b, s.kat, s.vurgu],
  );
  /* Yay bir ÇİZGİ değil ince bir TÜP: WebGL'de lineWidth çoğu tarayıcıda yok
     sayılıyor ve çizgi ne yaparsanız yapın 1 piksel kalıyor. Kalınlık ancak
     gerçek geometriyle elde ediliyor. Yarıçap role göre değişir ki vurgulanan
     rota soluk olanların arasından sıyrılsın.

     TÜPÜN BEDELİ: sabit yarıçap dünya biriminde ölçülür, yani yakınlaştıkça
     ekranda kalınlaşır — aynı yay genel kadrajda 2 px, rota kadrajında 6 px
     çıkıyordu. Yarıçap bu yüzden kamera uzaklığına oranlanıyor; ekrandaki
     kalınlık artık her kadrajda aynı. Geometriyi her karede yeniden kurmamak
     için ölçek BASAMAKLANIR: %18'den küçük değişimde eski geometri korunur. */
  const [olcek, setOlcek] = useState(1);
  useFrame(({ camera }) => {
    const k = Math.max(0.3, Math.min(2.4, camera.position.length() / OLCEK_REF));
    setOlcek((v) => (Math.abs(k - v) / v > 0.18 ? k : v));
  });

  const govde = useMemo(() => {
    const adim = Math.max(1, Math.floor(n / 72));
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i += adim)
      pts.push(new THREE.Vector3(poz[i * 3], poz[i * 3 + 1], poz[i * 3 + 2]));
    // adım n'i tam bölmezse son nokta düşer, yay hedefe varmadan biterdi
    if (n % adim !== 0) pts.push(new THREE.Vector3(poz[n * 3], poz[n * 3 + 1], poz[n * 3 + 2]));
    /* Referans kadrajda (kamera 3,9 birim, fov 42) 1 dünya birimi ≈ 317 px.
       Yani 0,0024 → ~1,5 px. `olcek` bunu her kadrajda sabit tutar. */
    const r = (s.soluk ? 0.0012 : s.vurgu ? 0.0038 : 0.0024) * olcek;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length, r, 6, false);
  }, [poz, n, s.soluk, s.vurgu, olcek]);

  /* Işın ince çizgiyi yakalayamaz: yayın üstüne boyanmayan (colorWrite=false)
     kalın bir tüp konur, tıklama ve ipucu onun üzerinden gelir. */
  const tup = useMemo(() => {
    const adim = Math.max(1, Math.floor(n / 40));
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i += adim)
      pts.push(new THREE.Vector3(poz[i * 3], poz[i * 3 + 1], poz[i * 3 + 2]));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length, 0.022, 4, false);
  }, [poz, n]);

  useEffect(() => () => void tup.dispose(), [tup]);
  useEffect(() => () => void govde.dispose(), [govde]);

  /* Çizgide TOPLAMSAL karışım YOK: yaylar hedefte demet hâlinde birleşiyor ve
     toplamsal karışım demeti beyaza doyuruyordu — kanal rengi okunmaz oluyordu.
     Işıma yalnız akan parçacıklarda; ince renkli çizgi rotayı, parçacık akışı
     yönü ve hızı taşır. */
  const opak = s.soluk ? 0.1 : s.vurgu ? 0.7 : 0.33;

  return (
    <group>
      <mesh geometry={govde} raycast={() => null}>
        <meshBasicMaterial color={s.renk} transparent opacity={opak} depthWrite={false} />
      </mesh>
      {!s.soluk && (
        <Akis
          poz={poz}
          n={n}
          renk={s.renk}
          hiz={AKIS_HIZ[s.tip] ?? 0.2}
          grup={s.vurgu ? 3 : 2}
          uye={s.vurgu ? 8 : 5}
          boy={s.vurgu ? 0.03 : 0.02}
          gucOran={s.vurgu ? 0.8 : 0.42}
        />
      )}
      {s.tikla && (
        <mesh
          geometry={tup}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            s.tikla?.();
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            if (s.ipucu) onUzerinde(s.ipucu);
          }}
          onPointerOut={() => onUzerinde(null)}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** Hedef istasyon — uçağın yerde beklediği nokta: dönen nişangâh + nabız. */
function Hedef({ i }: { i: number }) {
  const g = useRef<THREE.Group>(null);
  const halka = useRef<THREE.Mesh>(null);
  const poz = useMemo(() => {
    const v = IST_POZ[i];
    return new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(1.006);
  }, [i]);
  useFrame((st) => {
    const k = ekranOlcegi(st.camera.position.length());
    if (g.current) {
      g.current.lookAt(st.camera.position);
      g.current.rotateZ(st.clock.elapsedTime * 0.35);
      g.current.scale.setScalar(k);
    }
    if (halka.current) {
      const t = (st.clock.elapsedTime * 0.75) % 1;
      halka.current.scale.setScalar((0.022 + t * 0.055) * k);
      (halka.current.material as THREE.Material).opacity = 0.8 * (1 - t);
      halka.current.lookAt(st.camera.position);
    }
  });
  return (
    <group position={poz}>
      <group ref={g}>
        <mesh raycast={() => null}>
          <ringGeometry args={[0.026, 0.031, 4]} />
          <meshBasicMaterial color={SEC_RENK} side={THREE.DoubleSide} transparent opacity={0.95} />
        </mesh>
      </group>
      <mesh ref={halka} raycast={() => null}>
        <ringGeometry args={[0.88, 1, 28]} />
        <meshBasicMaterial color={SEC_RENK} side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------------- kamera */

export interface Odak {
  poz: [number, number, number];
  nonce: number;
}

/**
 * Uçuş — kamera hedefe büyük çember üzerinden döner (doğrusal interpolasyon
 * küreyi keserdi). Kullanıcı sürüklemeye başlarsa uçuş iptal olur: kontrol
 * daima insanda.
 */
function Kamera({ odak, otoDon }: { odak: Odak | null; otoDon: boolean }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    autoRotate: boolean;
    addEventListener: (t: string, f: () => void) => void;
    removeEventListener: (t: string, f: () => void) => void;
    update: () => void;
  } | null;
  const hedef = useRef<THREE.Vector3 | null>(null);
  const son = useRef(-1);
  const gecici = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (!odak || odak.nonce === son.current) return;
    son.current = odak.nonce;
    hedef.current = new THREE.Vector3(...odak.poz);
  }, [odak]);

  useEffect(() => {
    if (!controls) return;
    const iptal = () => {
      hedef.current = null;
    };
    controls.addEventListener('start', iptal);
    return () => controls.removeEventListener('start', iptal);
  }, [controls]);

  useFrame((_, dt) => {
    if (controls) controls.autoRotate = otoDon && !hedef.current;
    const h = hedef.current;
    if (!h) return;
    const k = 1 - Math.pow(0.0016, Math.min(dt, 0.05));
    const a = camera.position.clone().normalize();
    const b = h.clone().normalize();
    const q = gecici.current.setFromUnitVectors(a, b);
    const kismi = new THREE.Quaternion().slerp(q, k);
    const yon = a.applyQuaternion(kismi);
    const uz = THREE.MathUtils.lerp(camera.position.length(), h.length(), k);
    camera.position.copy(yon.multiplyScalar(uz));
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(h) < 0.012) hedef.current = null;
  });
  return null;
}

/* ------------------------------------------------------------------- etiketler */

/**
 * İstasyon etiketleri 3D'de değil, tuvalin üstündeki HTML katmanında.
 * (Kure.tsx'te ölçüldü: drei `Html` her etiket için tuvali kaplayan sarmalayıcı
 * açıyor ve küre üzerindeki tıklamayı yutuyor.) Konum her karede yansıtılır,
 * kürenin arkasına geçen etiket söner ve tıklamayı bırakır.
 */
function Etiketler({
  etiketler,
  oncelik,
  deger,
  max,
}: {
  etiketler: React.RefObject<(HTMLDivElement | null)[]>;
  oncelik: boolean[];
  deger: number[];
  max: number;
}) {
  const v = useRef(new THREE.Vector3());
  /* Çizim sırası = önem sırası. Türkiye kümesinde 16 nokta birkaç yüz piksele
     sığışıyor; çakışan etiketten ÖNEMLİ olan kalsın diye önce öncelikliler,
     sonra metrik değeri büyükler yerleştirilir. */
  const sira = useMemo(
    () =>
      HA.kod
        .map((_, i) => i)
        .sort((a, b) => (oncelik[a] === oncelik[b] ? deger[b] - deger[a] : oncelik[a] ? -1 : 1)),
    [oncelik, deger],
  );
  const yerlesik = useRef<number[]>([]);

  useFrame((st) => {
    const kam = st.camera.position;
    const kamUz = kam.length();
    const yakin = kamUz < 2.35;
    const kabul = yerlesik.current;
    kabul.length = 0;
    for (const i of sira) {
      const el = etiketler.current?.[i];
      if (!el) continue;
      const p = IST_POZ[i];
      const h = 0.035 + 0.42 * Math.sqrt(Math.max(0, deger[i]) / max);
      /* Ufuk testi: kamera uzaklığı d iken yüzeydeki bir nokta ancak
         cos(açı) > R/d ise görünür (teğet noktası). Sabit bir eşik kullanmak
         kameraya yaklaştıkça haritanın yarısını yanlışlıkla gizler. */
      const gorunur = (p[0] * kam.x + p[1] * kam.y + p[2] * kam.z) / kamUz > R / kamUz + 0.015;
      let goster = gorunur && (oncelik[i] || yakin);
      let x = 0;
      let y = 0;
      if (goster) {
        v.current
          .set(p[0], p[1], p[2])
          .multiplyScalar(1 + h)
          .project(st.camera);
        x = (v.current.x * 0.5 + 0.5) * st.size.width;
        y = (-v.current.y * 0.5 + 0.5) * st.size.height;
        // çakışma: daha önemli bir etiket bu kutuyu kaptıysa bu sefer görünme
        for (let k = 0; k < kabul.length; k += 2)
          if (Math.abs(x - kabul[k]) < 76 && Math.abs(y - kabul[k + 1]) < 24) {
            goster = false;
            break;
          }
      }
      if (!goster) {
        if (el.style.opacity !== '0') {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
        continue;
      }
      kabul.push(x, y);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    }
  });
  return null;
}

/* ---------------------------------------------------------------------- sahne */

/** HUD'daki +/− düğmeleri için kamerayı merkeze doğru/uzağa taşır. */
function Yakinlastirici({ kayit }: { kayit: (f: (k: number) => void) => void }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    kayit((k: number) => {
      camera.position.setLength(Math.min(6, Math.max(1.35, camera.position.length() * k)));
    });
  }, [camera, kayit]);
  return null;
}

export interface SahneProps {
  deger: number[];
  max: number;
  sec: number;
  kriz: number;
  yaylar: YaySpec[];
  hedef: number | null;
  odak: Odak | null;
  otoDon: boolean;
  oncelik: boolean[];
  onSec: (i: number) => void;
  onIstasyonUzerinde: (i: number | null) => void;
  onYayUzerinde: (v: string | null) => void;
  etiketler: React.RefObject<(HTMLDivElement | null)[]>;
  zoomKayit: (f: (k: number) => void) => void;
  /** açılış kamerası — sahne daha ilk karede doğru kadrajda doğar (uçuş sonradan) */
  baslangic: [number, number, number];
}

function Sahne(p: SahneProps) {
  return (
    <>
      <Yildizlar />
      <Zemin />
      <Sutunlar deger={p.deger} max={p.max} sec={p.sec} />
      {p.kriz > 1 && <KrizHalkalari kat={p.kriz} />}
      {p.yaylar.map((s, i) => (
        <Yay key={`${s.a}-${s.b}-${s.tip}-${i}`} s={s} onUzerinde={p.onYayUzerinde} />
      ))}
      {p.hedef != null && <Hedef i={p.hedef} />}
      <IstasyonHitleri onSec={p.onSec} onUzerinde={p.onIstasyonUzerinde} />
      <Etiketler etiketler={p.etiketler} oncelik={p.oncelik} deger={p.deger} max={p.max} />
      <Kamera odak={p.odak} otoDon={p.otoDon} />
      <Yakinlastirici kayit={p.zoomKayit} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.35}
        maxDistance={6}
        rotateSpeed={0.42}
        zoomSpeed={0.75}
        enableDamping
        dampingFactor={0.075}
        autoRotateSpeed={0.32}
      />
    </>
  );
}

/**
 * Açılış kadrajı animasyonla değil doğrudan kurulur: harita sekmesine geçildiğinde
 * (ya da CODE'dan "haritada göster" ile gelindiğinde) küre daha ilk karede doğru
 * yere bakar. Uçuş animasyonu sonraki odak değişimleri için — açılışta bekletmek
 * sunumda kaybedilmiş bir saniyedir.
 */
export default function KureSahne(props: SahneProps) {
  return (
    <Canvas
      camera={{ position: props.baslangic, fov: 42, near: 0.05, far: 120 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(KURE_RENK.uzay, 1);
        /* Bağlam kaybında (GPU baskısı, çok sayıda WebGL yüzeyi) tarayıcı sahneyi
           sessizce ölü bırakıyor: HTML katmanı çalışmaya devam ettiği için ekranda
           etiketler kalıyor ama küre kayboluyor — geliştirme sırasında görüldü.
           preventDefault, tarayıcının bağlamı geri yüklemesine izin verir. */
        gl.domElement.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault();
          },
          false,
        );
      }}
    >
      <Sahne {...props} />
    </Canvas>
  );
}
