/**
 * Turkish Airlines amblemi — üst barın en solunda, her ekranda.
 *
 * KAYNAK: Wikimedia Commons, "Turkish Airlines logo 2019 compact.svg",
 * kamu malı olarak işaretli. Marka THY'ye aittir; bu proje Turkish Technic
 * için hazırlanan bir vaka çalışması olduğundan kimlik olarak kullanılıyor.
 *
 * YALNIZ AMBLEM: dosyadaki "TURKISH AIRLINES" kelime markasının 15 path'i
 * BİLEREK alınmadı (kullanıcı kararı) — üst barda zaten CATALYST yazıyor,
 * ikinci bir kelime markası şeridi kalabalıklaştırıyordu.
 *
 * NEDEN GÖMÜLÜ SVG, DOSYA DEĞİL: teslim tek bir HTML dosyası ve internetsiz
 * çalışmak zorunda (bkz. README "Teslim"). Ayrı bir .svg dosyası hem ek istek
 * hem de `file://` üstünde CORS riski demekti.
 *
 * Renkler markanın kendi değerleri: #C70A0C kırmızı + beyaz. Uygulamanın vurgu
 * kırmızısı (#E81932) FARKLI ve bilerek karıştırılmadı — biri marka amblemi,
 * diğeri arayüzün eylem rengi.
 */
export default function ThyLogo({ sinif }: { sinif?: string }) {
  return (
    <svg
      className={'thy-logo' + (sinif ? ' ' + sinif : '')}
      viewBox="0 0 60.6 60.6"
      role="img"
      aria-label="Turkish Airlines"
    >
      <path d="M 33.4,0.2 C 48.6,1.8 60.5,14.6 60.5,30.3 60.5,47 47,60.5 30.3,60.5 13.6,60.5 0,47 0,30.3 0,13.6 13.5,0 30.3,0 c 1,0 2.1,0.1 3.1,0.2 M 35,58.4 C 50.5,55.8 61,41.1 58.4,25.5 56.2,12.6 45.7,3.2 33.3,1.9 30.8,1.6 28.2,1.7 25.6,2.1 22.5,2.6 19.6,3.6 17,5 c 13.6,4.7 21,11.8 21.5,19 0.3,4.5 -1.8,7.7 -4.6,10.3 L 53.3,33 c 0.5,0 0.7,0.6 0.1,0.8 L 7.1,47 c 4.7,6.5 12,10.8 20.1,11.6 2.6,0.3 5.2,0.3 7.8,-0.2 M 22.3,30.9 C 24.8,21.4 21.9,11.4 15,6.1 5.6,12.1 0.1,23.3 2.1,35 c 0.6,3.9 2,7.4 4,10.5 7.4,-2 13.9,-5.9 16.2,-14.6" fill="#ffffff"  />
      <path d="M 35,58.4 C 50.5,55.8 61,41.1 58.4,25.5 56.2,12.6 45.7,3.2 33.3,1.9 30.8,1.6 28.2,1.7 25.6,2.1 22.5,2.6 19.6,3.6 17,5 c 13.6,4.7 21,11.8 21.5,19 0.3,4.5 -1.8,7.7 -4.6,10.3 L 53.3,33 c 0.5,0 0.7,0.6 0.1,0.8 L 7.1,47 c 4.7,6.5 12,10.8 20.1,11.6 2.6,0.3 5.2,0.3 7.8,-0.2 z M 22.3,30.9 C 24.8,21.4 21.9,11.4 15,6.1 5.6,12.1 0.1,23.3 2.1,35 c 0.6,3.9 2,7.4 4,10.5 7.4,-2 13.9,-5.9 16.2,-14.6 z" fill="#c70a0c"  />
    </svg>
  );
}
