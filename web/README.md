# Catalyst — web uygulaması

Catalyst'in canlı ürünü: React + TypeScript + Vite uygulaması. (Eski tek-dosyalık `catalyst.html`
prototipi Temmuz 2026'da kaldırıldı; bu uygulama onun yerini aldı.) Sunuma hazır, geliştirilebilir
taban — 3D harita, sahne animasyonları ve yeni ekranlar buraya eklenir.

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # dist/          — kod bölünmüş statik site
npm run build:tek-dosya  # dist-tek-dosya/index.html — TEK DOSYA, offline (jüri demosu)
npm test                 # parite + geometri testleri (113 kontrol)
npm run tip              # tsc --noEmit
```

## Neden bu yığın

| Seçim | Gerekçe |
|---|---|
| **React 19 + TypeScript + Vite** | 3D için tek olgun ekosistem R3F; TS, 5.000 parçalık kolon dizilerinde alan adı hatalarını derlemede yakalıyor |
| **framer-motion** | Sahne geçişleri, sekme göstergesi, kart giriş sıralaması; 3D kamera hareketiyle aynı easing tokenlarını paylaşır |
| **Chart.js + react-chartjs-2** | 25 grafiğin yapılandırması tek dosyalık sürümden birebir taşınabildi — görsel davranış taşımada değişmedi |
| **zustand** | Ekranlar arası köprüler (Karar Merkezi → Watchlist → Harita) ve senaryo parametreleri tek mağazada; prop zinciri yok |
| **three + R3F + drei** | Kurulu ve ayrı chunk'ta bekliyor: harita 3D'ye geçtiğinde `views/harita/` altındaki render katmanı değişir |
| **vite-plugin-singlefile** | "internet gerektirmez, çift tıkla açılır" teslim garantisi (`npm run build:tek-dosya`) |

### Tek dosya paketi

`npm run build:tek-dosya` her şeyi — JS, CSS, payload, dünya konturu, three.js, Chart.js — tek bir
`Catalyst.html` içine gömer. Kurulum, sunucu ve ağ gerekmez.

Tek dosya modunda kod bölme KAPALI olmak zorunda: `lazy(() => import(…))` ile yüklenen sekmeler
ayrı chunk'a çıkarsa `file://` üstünde CORS'a takılır ve harita/senaryo sekmeleri açılmaz.
`viteSingleFile()` bunu kendisi hallediyor (dinamik importları tek pakete alıyor) — başsız
tarayıcıda `file://` ile doğrulandı: 3D küre çiziliyor, dışarıya sıfır istek gidiyor.

Çıktı adı `tekDosyaAdi()` eklentisiyle `index.html`'den `Catalyst.html`'e çevriliyor. Yeniden
adlandırma diskte (`writeBundle`) yapılıyor; Vite 8'in paketleyicisi Rolldown, `generateBundle`
içinde bundle nesnesine yazmayı yok sayıp dosyayı tamamen düşürüyor.

## Mimari

```
src/
  data/        payload.json (core.py çıktısı) + TS tipleri + dünya konturu
  engine/      HESAP ÇEKİRDEĞİ — saf TS, DOM bilmez
               stats · flags · ladder · karar · oner · senaryo · kriz · tahsis · format
  design/      tokens.css (THY paleti) · base.css · code.css (konsol) · kure.css (harita HUD)
               senaryo.css (şok gülü · takvim şeridi · alarm rayı · arazi HUD)
               hangar.css (açılış sahnesi HUD'u) · motion.ts · renkler.ts
  app/         App (kabuk, sekmeler, geçiş) · store (zustand) · Sözlük
  components/  Grafik (Chart.js sarmalayıcı) · temel (Kart/Kpi/Cip/…) · KararKarti (tek karar mekanizması)
  views/       Giris (açılış sahnesi) · Code · Watchlist · Ongoru · Harita · Senaryo
               hangar/{hangarGeo,hangarVeri,Ucak,Motor,HangarSahne}
               code/{Kure,KararKonsolu,UzunVade,icgoru,sahneVeri}
               watchlist/ParcaDetay · ongoru/ParamPanel
               senaryo/{araziGeo,Arazi,SokGulu,alarmlar,Belirsizlik}
               harita/haritaVeri · harita/kure/{kureGeo,kureStil,KureSahne}
```

## GİRİŞ — dijital hangar (açılış sahnesi)

Uygulamanın kapısı: `views/Giris.tsx` + `views/hangar/`. Beş perdelik **tek çekim** bir 3D sahne —
hangar → pist/filo → motora dalış → komponentlerin açılması → karar küresi. Kamera kesilmez;
perde 0'dan 1'e giderken hangar kapısından fiilen dışarı uçar, sonra geri dönüp motorun içine girer.

Altı tasarım kararı kayda değer:

- **Hazır 3D model YOK.** Gövde `LatheGeometry`, kanat/kuyruk `ExtrudeGeometry`, motor
  silindir + kesit — hepsi `hangarGeo.ts`'teki kesit tablolarından çalışma anında üretilir.
  Gerekçe `build:tek-dosya` garantisi: bir GLTF ya da doku dosyası ya ayrı ağ isteği ya da
  megabaytlarca base64 demekti. Prosedürel siluetin dosya maliyeti sıfır, her zoomda keskin.
- **"Oyuncak uçak" üç şeyden kurtuldu** (ilk sürümün dersi, `Ucak.tsx` başında da yazılı):
  (1) livery artık KUTU değil — kırmızı kuşak ve gri karın, gövdeyle **aynı lathe profilinden**
  sınırlı phi ile üretilir, yani boya gövdeye sarılır; kutu geometri silindiri kesip yanlardan
  levha gibi taşıyordu. (2) Kanat sivrilmesi %35'ten %18'e indi — eskisi "kürek" gibiydi.
  (3) Parça sayısı siluet demek: winglet, kanat–gövde peteği, dorsal fin, ters itki kuşağı,
  APU egzozu, bogie'li ana takım. Hiçbiri tek başına fark edilmiyor, toplamı uçak yapıyor.
- **Motor YANDAN ve kesitli.** Kamera baştan bakarken yalnız fan diski görünüyordu; kaportadan
  ~130°'lik bir dilim çıkarılıp kamera yana alınınca fan → booster → HP kompresör kademeleri →
  yanma odası (yanan) → türbin → egzoz konisi tek karede okunuyor. Kesit sabittir, kamerayla
  dönmez: serbest bakışta kullanıcı çevirip kapalı tarafı da görür.
- **Ortam haritası da dosyasız.** metalness'i yüksek malzeme yansıtacak bir şey bulamazsa
  SİYAH çıkar — ilk sürümde motor ve gövde kömür gibiydi, ışık artırmak da çözmüyordu.
  Çözüm three'nin içinde kodla gelen `RoomEnvironment`; PMREM'den geçirilip
  `scene.environmentIntensity = 0.32` ile takılıyor (tam güçte gece hangarı stüdyoya dönüyor).
- **Tek kayan sayı.** Kamera, uçağın opaklığı, fan hızı, komponent patlaması ve son küre —
  hepsi tek bir `akis` (0..4) değerinden türer. Bu yüzden ileri/geri sarmak, atlamak ve
  duraklatmak bedava; ayrı zaman çizelgesi tutulmuyor.
- **Rozetler süs değil, üstelik doğru yerde.** Motorun üstünde açılan sekiz komponent,
  payload'daki sekiz ATA motor kategorisidir (ATA 71–80, `hangarVeri.ts`): 1.552 PN · 55 kırmızı
  · $43,2M. Her rozet **kendi fiziksel istasyonunda** durur — yanma odası rozeti yanma odasının,
  starter rozeti aksesuar kutusunun hizasında; patladıklarında motorun boyunca yayılıyorlar ve
  "bu parça motorun neresinde" sorusu görüntüden okunuyor. (İlk tasarım tek düzlemde bir halkaydı;
  motor yandan gösterilince halka kenardan görünüp rozetler üst üste biniyordu.) Rozete tıklayınca
  gerçek künye açılır; "kategori kırılımını aç" bağlantısı Öngörü sekmesine götürür. Etiketler
  3D'de değil tuval üstündeki HTML katmanında durur ve her karede oradan yansıtılır — aynı
  teknik `code/Kure.tsx`'te de kullanılıyor (drei `Html` tuvali kaplayıp tıklamayı yutuyordu).
- **3D SERBEST.** Üst bardaki anahtar kamerayı kullanıcıya verir (`OrbitControls`): sürükle
  döndür, tekerlek yakınlaştır. Açıkken koreografi kameraya DOKUNMAZ — iki yerden birden
  sürülen kamera titriyordu — ama fan dönmeye, yanma odası yanmaya devam eder. Perde
  değiştirmek serbest bakışı kapatır ve yönetmen koltuğuna döner.

Son perdedeki karar küresi CODE ekranındaki operasyon küresinin **aynı Fibonacci dağılımı ve aynı
paletidir** (72 siparişsiz · 62 kalan kırmızı · 1.418 aksiyon · 3.448 izle): kapı açıldığında
kullanıcı ilk ekranda aynı görüntüyü bulur, film ile ürün arasında kesinti hissetmez.

`Enter`/`ESC` geçer, `← →` ve fare tekerleği perde çevirir, boşluk duraklatır (serbest bakışta
tekerlek yakınlaştırmaya döner). Üst bardaki markaya basmak sahneyi yeniden oynatır
(`store.girisAc`). `prefers-reduced-motion` açıksa film kendiliğinden ilerlemez, perdeleri
kullanıcı tıklar.

## CODE — ana ekran

Kapıdan geçilince açılan ilk sekme **CODE (Component Decision Engine)**. Beş ekranın tamamı
açık THY temasındadır — `design/code.css` yalnız bu ekranın kendi düzenini sarar; koyu ton
sayfada değil, sahnenin içinde kalır (bkz. tokens.css "tek koyu yüzey kuralı"; giriş sahnesi
bu kuralın bilinçli istisnasıdır, çünkü orada sayfa zaten görüntünün kendisidir).

**Karar mekanizması watchlist'ten buraya taşındı.** Kart tek bileşendir
(`components/KararKarti.tsx`): konsolda düğmeleriyle, parça detayında `saltOkunur` modunda —
oradan "CODE konsolunda karar ver" köprüsü aynı parçayı konsolda açar. Bir parça hakkında karar
tek yerde verilir, iki ekran çelişemez.

`code/Kure.tsx` — 5.000 parçanın 3D küresi. Üç tasarım kararı kayda değer:

- **Nokta ışını yerine seçim yüzeyi.** 5.000 nokta birim kürede çok sıkışık; ışın eşiği geniş
  olunca imleçten uzaktaki parça seçiliyor, dar olunca tıklama boşa gidiyordu. Görünmez küre
  yüzeyine çarpan yön ile parça yönlerinin iç çarpımı "gözle tıklanan nokta"yı verir.
- **Etiketler drei `Html` değil, kendi katmanımız.** drei her etiket için tuvali kaplayan bir
  sarmalayıcı div açıyor ve küre üzerindeki tıklamayı yutuyordu (DOM'da doğrulandı). Etiketler
  artık `.kure-etiketler` katmanında; konumları her karede 3D'den yansıtılır, küre arkasına
  geçince sönüp tıklamayı bırakırlar.
- **Tekerlek yakınlaştırması kapalı.** Sahne sayfanın ortasında; tekerlek yutulunca sayfa
  kaydırılamıyordu. Yakınlaştırma köşedeki düğmelerde, döndürme sürüklemede.

WebGL açılmazsa `SahneKalkani` hata sınırı sahneyi düşürür, konsol ve sayılar çalışmaya devam
eder — sunum durmaz.

**Kural:** hesap `engine/`de, çizim `views/`te. Bir sayı iki ekranda görünüyorsa ikisi de aynı
engine fonksiyonunu çağırır — "iki ekran çelişemez" garantisi kodun şeklinden gelir.

## Veri hattı

Tek doğruluk kaynağı hâlâ `core.py`. Web uygulaması hesaplanmış sayı üretmez, `payload.json` okur:

```bash
# core.py → web/src/data/payload.json (kaynak veri veri/eski/ altındaki üç CSV)
cd .. && uv run build_dashboard.py
```

`payload.json` depoda commit'lidir; yalnız CSV ya da formül değişirse yeniden üretmek gerekir.

## Parite

`npm test` — **113 kontrol**, dört dosya.

**57'si motor (`engine.test.ts`).** Bir bölümü sayı paritesi, hepsi `core.py`'den doğrulanmış
sabit değerlere karşı: kanal dağılımı 694/641/217/3.448 · sipariş alarmı 42 · kırmızı 134/22 ·
motor krizi 477 · OEM 283 · belirsizlik 389 (%80: 371–408) · motor krizi 797 · kapalı form ↔ 800
deneme uyumu.

Geri kalanı yeni şok eksenlerini ve kriz takvimini kilitliyor — bunlar "kod çalışıyor mu"
sorusundan çok **hangi eksenin neyi vurup neyi vurmadığı** sözleşmesidir:

- `BAZ_CFG` bütün yeni eksenlerde nötr; nötr ayarda `ttrSok`/`leadSok` gün sayısını hiç değiştirmez.
- Gümrük kuyruğu **toplamsal** ve yalnız dış kanala biner (iç tamirli parçada gün sabit), bu yüzden
  kısa TAT'lı parçayı yüzdece daha sert vurur.
- İç kapasite kaybı yalnız `ato === 1` olanı çarpar; `disOnly` açıkken TAT şoku iç kanalı atlar.
- `filoUc: 0` tam olarak 1,0 verir (motor bandın ortasında değil → asimetrik interpolasyon) ve
  uçlar 2033 açığını **monoton** büyütür; bugünün kırmızı listesine dokunmaz.
- Havuz kaybı **adetleri değiştirmez**, yalnız faturayı büyütür. Kur şoku da adetlere dokunmaz:
  $ kalemleri ölçekler ve BER eşiğini kaydırır (nakit koruma modu).
- `byKat` toplamı `kir`'e eşit; marj dağılımının **ilk 4 kovasının toplamı = kırmızı listenin
  kendisi**. Marj dağılımı TAT şokunu görür, TTS dağılımı (tanım gereği) görmez.
- Takvimde `siddet` eğrisi ve `olcek`: **çarpanlar 1'den başlar**, yapısal varsayımlar
  (`filoUc`, `disOnly`) ölçeklenmez, 0. ay baz durumu birebir verir.
- Uzun sürükleyen profil, ani darbeyle aynı zirveye çıkar ama **daha çok parça·ay** yakar.
- Tahsis eğrisi monoton, kazanım %100'e yakınsar, `butce80` toplamın küçük bir kısmı; tornado
  6 etken üretir ve her etkenin üst ucu daha pahalıdır.

**9'u küre geometrisi (`kureGeo.test.ts`):** dünyanın ayna görüntüsü olmadığı (Atlantik'ten
bakınca İstanbul sağda, JFK solda), yayların iki havalimanını gerçekten birleştirdiği ve kara
ızgarasının karayı karada, denizi denizde bulduğu kilitlenir.

**19'u arazi geometrisi (`senaryo/araziGeo.test.ts`):** boyutlar seri/etiket sayısından gelir ·
satırlar baz aya göre azalan sıralanır ve sıralamadan sonra da hücre doğru aya/satıra bağlı kalır ·
normalize 0..1, maksimum tam 1 · boş seri ve tümü sıfır ızgara çökmez (sıfıra bölme yok) · çubuklar
ızgara sınırları içinde ve yükseklik değerle artar · tarama çizgisi doğru sütuna oturur, taşan aya
kırpılır · kamera ızgaranın dışından ve üstünden bakar · rampa girdileri kırpılır, sıcaklık arttıkça
kırmızılaşır ve **marka kırmızısı rampada yoktur** (kimlik rengi ile veri rengi ayrı işler).

**28'i hangar geometrisi (`hangar/hangarGeo.test.ts`):** açılış sahnesi gözle doğrulanır ama
siluet ve uçuş profili gözle YANILTICIDIR — kamera uzaktayken "uçak gibi" duran bir eğri, yakın
planda burnu yere gömülü çıkar. Kilitlenenler: kalkışta tekerlek rotasyona kadar yerde kalır,
irtifa ondan sonra tek yönlü artar ve burun açısı ~20°'yi geçmez (üstü "roket" görünüyor) ·
inişte irtifa temasa kadar tek yönlü azalır, **hiçbir t'de sıfırın altına inmez** ve flare burnu
kaldırıp temastan sonra indirir · gövde profili kuyruktan buruna sıralı, iki uç kapalı · kanat
sivrilir ve ok açılıdır · rozet dağılırken **istasyonu (z) kaymaz**, yalnız yarıçapı büyür ·
sekiz rozetin ikisi aynı (z, açı) çiftinde değildir ve **yandan bakışta ayrışırlar** — etiket
çakışmasının sayısal karşılığı · kademeler eksen boyunca sıralı, hepsi fanın arkasında ve kor
kaportasını delmez · fan kaportanın içinde kalır · kor kesiti önce daralıp sonra genişler (yanma
odası boğazı) · karar küresinin noktaları birim küre üzerindedir · son üç perdenin kamerası
motorun önünde kalır ve perde 2–3 motoru **yandan** görür (kesitin içi ancak böyle okunur).

Testler "kod çalışıyor mu" demiyor; **taşımada tek bir sayının kaybolmadığını** kanıtlıyor.

## HARİTA — tam ekran 3D küre

2D SVG harita yerini **ekranın tamamını kaplayan operasyon küresine** bıraktı; paneller kürenin
üstünde cam HUD olarak durur. Seam işe yaradı: `haritaVeri.ts` (süre/kanal/rota/metrik) tek satır
değişmeden kaldı, yalnız çizim katmanı değişti. `useGorunum.ts` (2D jestler) silindi, yerini
`OrbitControls` aldı.

| Dosya | İş |
|---|---|
| `harita/kure/kureGeo.ts` | Saf matematik: lon/lat → küre, büyük çember yayı + örnekleyici, kara noktası ızgarası, kıyı/meridyen çizgileri, kamera çerçevesi. three.js **bilmez**, testleri node'da koşar |
| `harita/kure/kureStil.ts` | Koyu zemin paleti — depo/kanal renklerinin anlamı 2D ile birebir, yalnız parlaklık taşındı; akış hızları kanal tipine bağlı |
| `harita/kure/KureSahne.tsx` | R3F sahnesi: küre, yıldızlar, atmosfer, istasyon sütunları, akan parçacıklı yaylar, kamera uçuşu, etiket katmanı |
| `design/kure.css` | Tam ekran yerleşim + cam paneller (`.kure` yalnız bu ekranı sarar) |

**Kıtalar dosyadan değil, hesaptan.** Hazır `earth.jpg` yok (uygulama internetsiz açılmak
zorunda): kara noktaları aynı 110m kontur verisinden, çalışma anında nokta-içinde-poligon testiyle
üretiliyor. Boylam adımı `1/cos(lat)` ile açılır, noktalar kutuplarda sıkışmaz.

**Akış = süre.** Yay üzerindeki parçacıkların hızı kanal tipinden gelir (`AKIS_HIZ`): havuzdan
değişim akıp giderken satın alma yolu sürünür. "Hangi yol hızlı" sorusu tabloya bakmadan, hareketten
okunur. Kanal satırına tıklamak kamerayı o yola uçurur — kısa depo transferi Türkiye'ye yaklaşır,
OEM satın alma Avrupa'ya açılır.

Ölçülen üç karar:

- **Kadraj bütün kanalları birden çerçevelemez.** Denendi: tek bir JFK havuz seçeneği kamerayı
  dünyaya kadar geri çekiyor ve asıl konu (AOG istasyonu) kenarda kalıyordu. Kural artık "hedef +
  konuşulan kaynak".
- **İşaretler zoom'la büyümez** (2D'deki maplibre davranışı korundu): halka/nabız ölçeği kamera
  uzaklığıyla çarpılır. Aksi hâlde Türkiye'ye yaklaşınca tek halka ekranı kaplıyordu. Sütun boyu
  ise coğrafi veridir, dünya ölçeğinde kalır.
- **Yay çizgisinde toplamsal karışım yok.** Yaylar hedefte demet hâlinde birleşiyor ve toplamsal
  karışım demeti beyaza doyurup kanal rengini yok ediyordu; ışıma yalnız parçacıklarda.

Açılış kadrajı animasyonla değil doğrudan kurulur (`baslangic`): sekmeye geçildiğinde küre ilk
karede doğru yere bakar, CODE'dan "haritada göster" ile gelindiğinde doğrudan o rotanın kadrajında
doğar. Etiketler drei `Html` değil kendi katmanımız (bkz. CODE küresi) ve çakışanlar önem sırasına
göre elenir — Türkiye kümesinde 16 nokta üst üste binmesin.

`three`, `@react-three/fiber`, `@react-three/drei` ayrı chunk'ta ve sahne `lazy()`; ilk açılış
ağırlaşmaz. WebGL açılmazsa `SahneKalkani` sınırı sayıları düz listeyle gösterir, bağlam kaybında
sahne kendini geri yükler.

## SENARYO — kriz simülatörü

Sekmenin tek cümlelik modeli: **her kriz ya stoğun dayanma süresini (TTS) kısaltır ya da tedarik
süresini (TTR) uzatır**. Öyleyse kriz bir *parametre şokudur*; stres testi ayrı bir model değil,
projeksiyon motorunun üstünde bir düğmedir. Sayfa iki şey iddia eder ve her ikisi de ölçülür:

**1. Krizin bir ŞEKLİ vardır.** Yedi şok ekseni yedi kaydırıcı olarak dizilince "lojistik krizi"
ile "talep patlaması" ekranda birbirine benziyordu — iki farklı kriz, aynı üç çubuk. Radar
poligonu (*şok gülü*) krizin parmak izini verir; preset seçilince poligon o şekle **morph** eder,
elle sapıldığında kesikli referans poligonu ne kadar sapıldığını gösterir.

**2. Kriz zamana yayılır.** Şok anlık değil: tırmanma → plato → toparlanma profiliyle **her ay**
5.000 parça yeniden hesaplanır. 3D arazi bu takvimin *kategori × ay* yükseklik alanıdır ve
"duvara kaçıncı ayda çarpıyoruz" sorusunu cevaplar.

| Dosya | İş |
|---|---|
| `engine/senaryo.ts` | 11 şok ekseni, preset kütüphanesi, `senaryoHesap` (tek geçiş / 5.000 parça), belirsizlik, TTS + emniyet marjı dağılımları |
| `engine/kriz.ts` | Kriz profilleri, şiddet eğrisi, `olcek`, ay ay `krizTakvim` |
| `engine/tahsis.ts` | Greedy bütçe tahsisi (verim = ağırlıklı kazanım / birim maliyet) + tornado duyarlılığı |
| `views/senaryo/araziGeo.ts` | Izgara / yerleşim / renk rampası — **saf matematik**, three.js bilmez, testleri node'da koşar |
| `views/senaryo/Arazi.tsx` | R3F sahnesi: tek `InstancedMesh`, tarama düzlemi, etiket katmanı, zoom |
| `views/senaryo/SokGulu.tsx` | Radar kontrol yüzeyi (SVG), sürükleme + klavye, elle yazılmış morph |
| `views/senaryo/alarmlar.ts` | Eşik tabanlı uyarı rayı üreteci (SEN-A00…A11) |
| `design/senaryo.css` | Gül · takvim şeridi · alarm kartları · arazi HUD |

**Süre şoku kanal tipine göre ayrışır** — sayfanın en önemli tek fonksiyonu:

```
g = gün
if (iç)                 g *= 1 + icKap/100     # atölye kaybı YALNIZ kabiliyeti olanı vurur
if (!(disOnly && iç))   g *= 1 + l/100         # TAT şoku, oransal
if (!iç)                g += gumruk            # gümrük kuyruğu, TOPLAMSAL ve yalnız dış kanal
```

Gümrüğün toplamsal olması anlatının parçası: Kızıldeniz tipi bir tıkanma süreyi oranla değil blok
hâlinde uzatır, bu yüzden kısa TAT'lı parçaları yüzdece daha sert vurur. Aynı biçimde **havuz
ekseni kırmızı sayısını hiç değiştirmez** — TTS de TTR de kımıldamaz, değişen yalnız paradır; alarm
metni bunu açıkça söyler: havuz karşılıklı sigortadır, faturası ancak çekilince görünür.

**Neden arazi, neden küre değil.** Uygulamada zaten iki küre var (CODE parça çekirdeği, harita
dünyası). Buradaki veri coğrafi değil, iki eksenli bir ızgara: *kategori × ay*. Doğru gösterim
yükseklik alanıdır. Yüzey değil **çubuk**, çünkü kategoriler sürekli bir eksen değil — aralarını
interpolasyonla doldurmak var olmayan ara değerler uydurmak olurdu.

**Kümülatif dolar raporlanmaz.** `kap` bir *stok* büyüklüğüdür (kaç adet eksiğiz × birim fiyat),
akış değil; aylar boyunca toplanırsa aynı eksik defalarca sayılır. Bunun yerine zirve maruziyet ve
**parça·ay** raporlanır — "alçak ama uzun süren kriz, kısa ve sert olandan daha çok yakar" cümlesi
de zaten bu birimle ölçülüyor.

**İki dağılım birden var, çünkü biri kör.** TTS = stok/talep olduğu için tedarik süresini *tanım
gereği* görmez: lojistik krizinde TTS dağılımı hiç kımıldamaz ama parçalar kırmızıya düşer. Emniyet
marjı (TTS − TTR − tampon) her iki şoku da görür ve **negatif olması "kırmızı" ile aynı şeydir** —
ilk dört kovanın toplamı tam olarak kırmızı listedir (testte kilitli). Varsayılan görünüm marjdır;
TTS'in bu sınırı ekranda gizlenmez, yazıyla söylenir.

**Alarm rayı dürüstlük kuralına tabidir** (CODE'daki `icgoru.ts` ile birebir aynı): dil katmanı —
cümle kalıpları, eşikler, öncelik sırası, güven yüzdeleri — kodda sabittir; içindeki sayıların
**hepsi** motordan canlı gelir. Ekranda bu ayrım yazıyla belirtilir, ray "LLM üretti" gibi
sunulmaz. Bir alarm bir eşik aşımıdır: koşulu sağlanmayan alarm listeye hiç girmez, bu yüzden baz
durumda ray neredeyse boştur — sakin ekran, sakin sistem demektir.

**Parametre paneli Öngörü'ye taşındı.** Burada kriz *simüle* edilir, Öngörü'de model *kalibre*
edilir. Parametreler mağazada ortak kaldığı için iki ekran aynı kırmızı sayısını üretmeye devam
eder; alarm tamponu artık senaryo motorunu da doğrudan besler (tek doğruluk kaynağı).

Ölçülmüş tuzaklar, tekrar keşfedilmesin diye:

- **drei `Html` sahnedeki tıklamayı yutar** — her etiket için tuvali kaplayan bir sarmalayıcı div
  açıyor. Etiketler kendi DOM katmanımızda, konumları her karede `project()` ile yansıtılıyor;
  çakışanlar eleniyor (26 satır 9 birimlik derinliğe sığdığı için komşular ~10 px arayla düşüyor).
- **Tekerlek yakınlaştırması sayfayı kilitler** — sahne sayfa ortasında olduğu için
  `enableZoom={false}`; yakınlaştırma köşe düğmelerinde.
- **SVG `viewBox` ölçeği CSS piksel değerlerini çarpar** — gülün viewBox'ı doğal piksel boyuna eşit
  (340), yoksa "9px" yazı ekranda 30px çıkıyor.
- **framer-motion SVG `points` interpolate etmez** — morph elle, `requestAnimationFrame` ile
  (280 ms easeOutCubic); sürükleme sırasında interpolasyon atlanır, imleçle poligon arasında
  gecikme hissi olmasın.
- **6px'lik SVG tutamak parmakla tutulamaz** — görünmez `r=16` dokunma dairesi gerekiyor. Sürükleme
  tek yol değil: her tutamak `role="slider"`, ok tuşları ± adım, `Home`/`End` uçlar.
- **Gül dar bir kolonda da durabilmeli** — okunuş listesinin kırılma noktası viewport'tan değil
  **kapsayıcıdan** okunur (`container-type: inline-size`), yoksa geniş ekranda bile 340px'lik gülün
  yanına 90px'lik bir liste sıkışıyor.
- **Rampanın soğuk ucu beyaz zeminde kaybolur** — açık gri değil orta gri (`#B9C0C8`). Marka
  kırmızısı rampada yok: bu bir veri serisi, kimlik değil.
- **`Math.max(0.02, …)` yükseklik tabanı şart** — yoksa "veri yok" ile "değer sıfır" ayrışmaz.
- **Ölçekte çarpanlar 1'den başlar** — `w = 0`'da `yeniDem` 0 olursa talep sıfırlanır ve 0. ay baz
  durumu vermez; sayfanın bütün karşılaştırmaları çürür.
- **Profil değişince `ay` sıfırlanır** — ani darbe 10 ay, uzun sürükleyen 27 ay; eski ay yeni
  takvimin dışında kalıyor. Çizimde ayrıca `Math.min(ay, aylar.length - 1)` savunması var.
- **Kare süresinden bağımsız animasyon** — `1 - Math.exp(-dt·k)`, sabit adım değil; yoksa yavaş
  cihazda animasyon hızı değişir. Senaryo değişince *hedef* güncellenir, *mevcut* korunur → arazi
  eski hâlinden yenisine akar.
- **Chart.js'e 10.000 nokta verilmez** — tahsis eğrisi 90 noktaya indirgeniyor.

Arazi `lazy()` + `Suspense` + kendi `SahneKalkani` sınırıyla sarılı: WebGL açılmazsa aynı sayılar
düz listede çıkar ve sayfanın geri kalanı çalışmaya devam eder. **Her sahnenin kendi sınırı olmalı** —
tek ortak sınır bütün sekmeleri birlikte düşürür. Bağlam kaybında `preventDefault()` çağrılır, yoksa
tarayıcı sahneyi sessizce ölü bırakıyor (HTML katmanı çalıştığı için ekranda etiketler kalıp arazi
kayboluyor).

## Bilinen tasarım kararı

Sekme geçişi yalnız **giriş** animasyonu kullanıyor (çıkış animasyonu yok). `AnimatePresence
mode="wait"` denendi: tembel yüklenen bir sekme askıya alındığında çıkış "tamamlandı" sayılmıyor
ve ekran eski görünümde kilitleniyor. Sunumda donan ekranın bedeli, çıkış animasyonunun
getirisinden büyük. Sekme parçaları ilk boyamadan 400 ms sonra arka planda çekiliyor, böylece
geçişte yükleme yazısı da görünmüyor.
