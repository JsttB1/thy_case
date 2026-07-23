# -*- coding: utf-8 -*-
"""Resmi Global Talent Bridge şablonunu (7 slayt, 20×11,25") proje içeriğiyle doldurur.
Şablon tasarımına DOKUNULMAZ: mevcut metin kutularında run düzeyinde değişiklik yapılır
(biçim korunur); boş slaytlara marka diline uygun kutular eklenir.
Çalıştırma: uv run fill_sablon.py → Grup3_Komponent_Kontrol_Kulesi.pptx"""
import copy, json, os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'deck_data.json'), encoding='utf-8'))
K, B, MC = D['kpi'], D['band'], D['mc']

def tr1(v): return f'{v:,.1f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
def tr0(v): return f'{round(v):,}'.replace(',', '.')

BEYAZ = RGBColor(0xFF, 0xFF, 0xFF)
LILA  = RGBColor(0xCB, 0xBC, 0xE6)   # gövde metni (açık lavanta)
SOLUK = RGBColor(0x9C, 0x8A, 0xC0)
PEMBE = RGBColor(0xE8, 0x5B, 0xD0)   # marka neon vurgusu
AMBER = RGBColor(0xF2, 0xB3, 0x4C)
PANEL = RGBColor(0x43, 0x26, 0x63)   # koyu mor panel
CIZGI = RGBColor(0x6C, 0x47, 0x95)

prs = Presentation(os.path.join(HERE, 'sablon.pptx'))
S = list(prs.slides)

def run_yaz(tf, yeni_satirlar):
    """Metin çerçevesindeki DOLU paragrafları sırayla yeni satırlarla değiştirir;
    fazla kalan dolu paragraflar boşaltılır. Biçim (font/renk) korunur."""
    i = 0
    for p in tf.paragraphs:
        if not p.runs:
            continue
        yeni = yeni_satirlar[i] if i < len(yeni_satirlar) else ''
        p.runs[0].text = yeni
        for r in p.runs[1:]:
            r.text = ''
        i += 1

def bul(slide, ad):
    def ara(shapes):
        for sh in shapes:
            if sh.name == ad:
                return sh
            if sh.shape_type == 6:
                alt = ara(sh.shapes)
                if alt is not None:
                    return alt
    return ara(slide.shapes)

def kutu_ekle(slide, x, y, w, h, satirlar, panel=False):
    """satirlar: (metin, boyut_pt, renk, bold, font_adi) listesi. Poppins marka dili."""
    if panel:
        r = slide.shapes.add_shape(5, Inches(x - 0.22), Inches(y - 0.18), Inches(w + 0.44), Inches(h + 0.36))
        r.adjustments[0] = 0.055
        r.fill.solid(); r.fill.fore_color.rgb = PANEL
        r.line.color.rgb = CIZGI; r.line.width = Pt(1)
        r.shadow.inherit = False
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True
    ilk = True
    for m, pt, renk, bold, fon in satirlar:
        p = tf.paragraphs[0] if ilk else tf.add_paragraph()
        ilk = False
        p.space_after = Pt(6)
        r = p.add_run(); r.text = m
        r.font.name = fon; r.font.size = Pt(pt); r.font.bold = bold
        r.font.color.rgb = renk
    return tb

def notlar(slide, metin):
    slide.notes_slide.notes_text_frame.text = metin

PB, PSB, PR, PL = 'Poppins Bold', 'Poppins Semi-Bold', 'Poppins', 'Poppins Light'

# ============ S1 · KAPAK ============
S[0].shapes.title.text_frame.paragraphs[0].runs[0].text if S[0].shapes.title.text_frame.paragraphs[0].runs else None
tf = S[0].shapes.title.text_frame
if tf.paragraphs[0].runs:
    tf.paragraphs[0].runs[0].text = 'Komponent Kontrol Kulesi'
else:
    tf.text = 'Komponent Kontrol Kulesi'
kutu_ekle(S[0], 10.15, 6.35, 8.9, 2.4, [
    ('Filo Büyür, Envanter Hazır mı? — Seçenek D · Grup 3', 20, LILA, False, PSB),
    ('Uçaklar için kule var, komponentler için yok: 5.000 parça için', 15, SOLUK, False, PL),
    ('görünürlük + öngörü + aksiyon karar katmanı.', 15, SOLUK, False, PL),
    ('1.200 → 2.000 uçak · talep bandı +%63–68 · tüm veriler sentetik/temsili', 13, PEMBE, False, PR),
])
notlar(S[0], 'Açılış: tek cümlede konsept — uçaklar için kule var, komponentler için yok. Filo %67 büyürken talep +%63–68 bandında; asıl kırılma göç. Hepsi üç resmi CSV\'den, yeniden üretilebilir.')

# ============ S2 · PROBLEM + BOŞLUK ============
bul(S[1], 'Title 51').text_frame.paragraphs[0].runs[0].text = 'Problem: Büyüme Değil, Göç — ve Süreç Alarmı Göremiyor'
kutu_ekle(S[1], 0.6, 2.15, 9.0, 8.6, [
    ('Talep: 90.016 → 146,9–150,8 bin adet/yıl (+%63–68 bandı)', 17, BEYAZ, True, PSB),
    ('İki bağımsız yöntem, şeffaf varsayımlar; nokta tahmin yok.', 14, LILA, False, PL),
    ('Yeni nesil payı %34 → %65 — talebin üçte ikisi yer değiştiriyor', 17, BEYAZ, True, PSB),
    ('Geçmişi olmayan parçalar ana senaryo: cold-start merkez modül.', 14, LILA, False, PL),
    ('Kategori ayrışması: Oxygen +%40, Electrical Power +%91', 17, BEYAZ, True, PSB),
    ('Tek çarpanlı plan iki uçta da yanılır; kategori × model × segment şart.', 14, LILA, False, PL),
    ('Saha: ~9 başkanlık · 4–5 kopuk kayıt sistemi', 17, BEYAZ, True, PSB),
    ('Bozulan parça için süreç reaktif bir telefon merdiveni; her devirde veri kopuyor.', 14, LILA, False, PL),
    ('Dürüstlük: THY 130,1 · pool 35,7 adet/uçak-yıl (3,6 kat fark)', 17, BEYAZ, True, PSB),
    ('Anomaliyi gizlemedik, mentora taşıdık; sistemde oran sabit değil, parametre.', 14, LILA, False, PL),
])
kutu_ekle(S[1], 10.6, 2.5, 8.2, 2.75, [
    (str(K['siparissiz']) + ' PN', 60, PEMBE, True, PB),
    ('bugün kırmızıda — stoku toparlanma süresinden önce bitecek — ve', 15, BEYAZ, False, PR),
    ("açık siparişi YOK. 11'i uçak yerde bırakan (AOG) kritik parça.", 15, BEYAZ, False, PR),
], panel=True)
kutu_ekle(S[1], 10.6, 5.95, 8.2, 3.1, [
    ('Toplam kırmızı: ' + str(K['kirmizi']) + ' PN · kapatma maliyeti yalnız ' + tr1(K['kapatma']) + ' M$', 15, AMBER, True, PSB),
    ('Fazla + ölü stok ~0,4 M$ — “şişkin envanter” miti veriyle çürüdü.', 14, LILA, False, PL),
    ('Sorun para değil; azaldığını kimsenin görmemesi.', 15, BEYAZ, True, PSB),
    ('1.200 uçakta el yordamıyla tutan denge, 2.000 uçakta tutmaz.', 14, LILA, False, PL),
], panel=True)
notlar(S[1], 'Rubrik 1+2 tek slaytta: problem (göç) + mevcut boşluk (72 siparişsiz kırmızı = alarmı hesaplayan süreç yok). Boşluğu nasıl bulduk: TTS<TTR koşulunu resmi stok verisiyle ilk kez biz hesapladık.')

# ============ S3 · ÇÖZÜM AKIŞI (6 adım) ============
bul(S[2], 'Title 26').text_frame.paragraphs[0].runs[0].text = 'Çözüm: Kontrol Kulesi — Uçtan Uca Karar Katmanı'
etiketler = ['BAĞLAN', 'BİRLEŞTİR', 'ÖNGÖR', 'UYAR', 'HAREKETE GEÇ', 'PROVA ET']
govdeler = [
    ['CDC ile salt-okunur', 'AMOS/TRAX değişmez', 'geri yazma yok', 'sıfır entegrasyon riski'],
    ['olay omurgası', 'tek komponent kaydı', 'gerçek TAT olaydan', 'PN + durum + konum'],
    ['ABC×XYZ segmentleri', 'Croston/SBA + AI', 'cold-start (Bayes)', 'mevsim katsayısı ×1,20'],
    ['TTS<TTR alarmı', 'dinamik min–max', 'emniyet stoğu (Poisson)', 'siparişsiz kırmızı: 0'],
    ['aksiyon merdiveni', 'BER · pool · phase-out', 'süre + maliyet puanı', 'AOG $/saat kıyası'],
    ['kriz senaryoları', 'Monte Carlo + duyarlılık', 'bütçe optimizasyonu', 'çeyreklik war-game'],
]
for ad, met in zip(['TextBox 69', 'TextBox 71', 'TextBox 73', 'TextBox 75', 'TextBox 77', 'TextBox 84'], etiketler):
    run_yaz(bul(S[2], ad).text_frame, [met])
for ad, sat in zip(['TextBox 88', 'TextBox 89', 'TextBox 90', 'TextBox 93', 'TextBox 92', 'TextBox 91'], govdeler):
    run_yaz(bul(S[2], ad).text_frame, sat)
notlar(S[2], 'Üç katman (görünürlük/öngörü/aksiyon) altı adımda: bağlan-birleştir Faz 1, öngör-uyar Faz 2, harekete geç-prova et Faz 2–3. Kapılar takvim değil metrik. Kritik cümle: hiçbir kaynağa yazmıyoruz.')

# ============ S4 · PROTOTİP (6 kart) ============
bul(S[3], 'Title 74').text_frame.paragraphs[0].runs[0].text = 'Prototip: Tek Dosyalık Canlı Dashboard'
for ad in ('TextBox 40', 'TextBox 41', 'TextBox 42', 'TextBox 43'):   # şablondaki örnek metinleri boşalt
    run_yaz(bul(S[3], ad).text_frame, [])
kartlar = [
    ('Kokpit', '132,9 M$ sermaye fotoğrafı; üç para musluğu; 72 siparişsiz kırmızı vurgusu; mimari şeması + faz yol haritası.'),
    ('Watchlist', '5.000 PN risk skoru sıralı; 8 filtre; PN detayında aksiyon merdiveni (süre+maliyet) ve canlı stok-out eğrisi.'),
    ('Öngörü & AI', 'Bant projeksiyonu; tahmin gezgini; hata analizi; cold-start canlı Bayes demosu; hurda anomali dedektörü (159 PN).'),
    ('Harita', '16 yurt içi havalimanı (gerçek kontur) + İstanbul merkezli küresel ağ (9 hub); kriz katmanı; tamir akış okları.'),
    ('Senaryo & Jüri Modu', 'Kriz kütüphanesi tek tıkla 5.000 PN yeniden hesaplar; kritiklik ağırlığı/BER/tampon kaydırıcıları canlı.'),
    ('Doğrulanmış Çekirdek', 'Float %97 (8.012 tahmin, 7.800 saha) · skor birincisi sahada kırmızı · backtest %0,4 · Monte Carlo uyumu %99,5 · 26 grafik · internetsiz.'),
]
gruplar = ['Group 50', 'Group 59', 'Group 62', 'Group 65', 'Group 68', 'Group 71']
for g, (baslik, govde) in zip(gruplar, kartlar):
    grp = bul(S[3], g)
    tbs = [sh for sh in grp.shapes if sh.has_text_frame]
    run_yaz(tbs[0].text_frame, [baslik])
    run_yaz(tbs[1].text_frame, [govde])
notlar(S[3], 'Demo bu beş ekranda; altıncı kart güven kartı. Tek HTML dosyası — USB\'den açılır, salon ağına muhtaç değiliz. Her sayı python ile yeniden üretilir (deterministik).')

# ============ S5 · YAPAY ZEKÂ ============
bul(S[4], 'Title 28').text_frame.paragraphs[0].runs[0].text = 'Yapay Zekâ: Hibrit ve Dürüst'
kutu_ekle(S[4], 0.6, 2.2, 9.2, 8.4, [
    ('λ = istatistiksel taban × e^(ağ düzeltmesi)', 19, PEMBE, True, PB),
    ('MLP 128-64-32 · 54 özellik · 10.000 örnek · Poisson kaybı', 14, LILA, False, PL),
    ('3 tohumlu topluluk; en iyi epoch geri yüklenir; deterministik.', 14, LILA, False, PL),
    ('Parça düzeyinde talep kesikli: medyan 11 adet/yıl, %14,6 sıfır çeyrek', 16, BEYAZ, True, PSB),
    ('→ tekil parçada Croston/SBA + Poisson emniyet stoğu; ağ bugün öneri modunda.', 14, LILA, False, PL),
    ('Cold-start ana senaryo (talebin ~%65’i geçmişsiz parçaya kayıyor)', 16, BEYAZ, True, PSB),
    ('→ öncül analog gruptan + üretici MTBUR; gözlemle Bayes güncellemesi.', 14, LILA, False, PL),
])
kutu_ekle(S[4], 10.6, 2.5, 8.2, 2.55, [
    ('%16,3 → %0,4', 44, PEMBE, True, PB),
    ('Geriye dönük test: Q3 toplamı yalnız Q1–Q2 ile tahmin edildi;', 14, BEYAZ, False, PR),
    ('mevsim katsayısı (×1,20) toplam hatayı binde dörde indirdi.', 14, BEYAZ, False, PR),
], panel=True)
kutu_ekle(S[4], 10.6, 5.75, 8.2, 3.0, [
    ('Dört bağımsız doğrulama', 16, AMBER, True, PSB),
    ('float %97 (8.012 tahmin, 7.800 saha) · risk skoru 1.si fiilen kırmızı', 14, LILA, False, PL),
    ('backtest %0,4 · Monte Carlo (800 deneme) kapalı formla %99,5 uyum', 14, LILA, False, PL),
    ('Slider, senaryo ve optimizasyon aynı doğrulanmış çekirdekte koşar.', 14, BEYAZ, True, PSB),
], panel=True)
notlar(S[4], 'Dürüstlük stratejisi: 4 çeyrekle sinir ağı klasikleri geçemez — bunu biz söylüyoruz; sezon 8+ çeyrek ister. Ama toplam düzeyde binde 4. AI bugün öneri modunda; AMOS olay verisi bağlanınca değeri açılır.')

# ============ S6 · ÖNCELİKLENDİRME · KRİZ · BAŞARI ============
bul(S[5], 'Title 51').text_frame.paragraphs[0].runs[0].text = 'Önceliklendirme · Kriz Dayanıklılığı · Başarı Ölçütleri'
kutu_ekle(S[5], 0.6, 2.3, 5.9, 7.6, [
    ('ÖNCE NE? (kısıtlı bütçe)', 15, PEMBE, True, PB),
    ('Üç musluk: ' + tr1(K['scrap']) + ' M$/yıl hurda · ' + tr1(K['float_fmv']) + '→' + tr1(K['float_33']) + ' M$ döngü · ' + tr1(K['phaseout']) + ' M$ phase-out', 13.5, LILA, False, PL),
    ('Sınır eğrisi: her alım $ başına risk azaltımıyla sıralı — ilk milyonlar en dik.', 13.5, LILA, False, PL),
    ('Kabiliyet yatırımı (547 PN): ' + tr1(K['kab_tasarruf']) + ' M$/yıl + ' + tr1(K['kab_sermaye']) + ' M$ serbesti.', 13.5, BEYAZ, True, PSB),
    ('Duyarlılık: en büyük kaldıraç TAT (±%20 → 23,2–44,8 M$).', 13.5, LILA, False, PL),
    ('Faz 1 salt-okunur: ilk gün 72 yakalanır; kapılar metrikle.', 13.5, LILA, False, PL),
    ('Gayrifaal kuyruğu: 8,5 M$ tamirle 13,9 M$ değer (BER ayıklanarak).', 13.5, LILA, False, PL),
    ('Hurda anomalisi: 159 PN kalite/karar incelemesine.', 13.5, LILA, False, PL),
], panel=True)
kutu_ekle(S[5], 7.15, 2.3, 5.9, 7.6, [
    ('KRİZ = PARAMETRE ŞOKU', 15, PEMBE, True, PB),
    ('TTS kısalır ya da TTR uzar; stres testi motorun üstünde bir düğme.', 13.5, LILA, False, PL),
    ('Motor ailesi krizi (canlı): kırmızı 134 → 477 PN.', 13.5, BEYAZ, True, PSB),
    ('Monte Carlo aynı senaryoda: ' + tr0(MC['motor']['acik_ort']) + ' PN · ' + tr1(MC['motor']['ek_ort']) + ' M$ ek ihtiyaç.', 13.5, LILA, False, PL),
    ('Kütüphane: pandemi · OEM gecikmesi · lojistik · kur şoku.', 13.5, LILA, False, PL),
    ('Playbook önceden yazılır; çeyreklik war-game ile prova edilir.', 13.5, LILA, False, PL),
    ('Kıtlık sensörü: FMV/CLP oranı (medyan 0,43) kalıcı yükselirse erken uyarı.', 13.5, LILA, False, PL),
    ('Dayanıklılık göstergeleri kokpitte: TTS dağılımı + kırmızı sayacı.', 13.5, LILA, False, PL),
], panel=True)
kutu_ekle(S[5], 13.7, 2.3, 5.6, 7.6, [
    ('NASIL ÖLÇERİZ?', 15, PEMBE, True, PB),
    ("AOG'da bekleyen uçak oranı ↓ — ana metrik (her saat gelir kaybı).", 13.5, BEYAZ, True, PSB),
    ('Siparişsiz kırmızı: ' + str(K['siparissiz']) + ' → 0 (alarm-aksiyon bağı zorunlu).', 13.5, LILA, False, PL),
    ('Kritik parça karşılama ≥ %97–98 · erken yakalama oranı ↑.', 13.5, LILA, False, PL),
    ('MAPE + öneri kabulü: faz kapıları bu eşiklerle açılır.', 13.5, LILA, False, PL),
    ('Bağlı sermaye guard-rail: servis, sermaye şişirerek değil TAT kısaltarak.', 13.5, LILA, False, PL),
    ('Expedite maliyeti ↓: erken yakalanan alarm ucuz kanaldan çözülür.', 13.5, LILA, False, PL),
    ('Hurda oranı %11,1 izlenir; BER kuralı 67,8 M$/yıl musluğun vanası.', 13.5, LILA, False, PL),
], panel=True)
notlar(S[5], 'Rubrik 5+6 + vizyonun kriz sütunu tek slaytta. Sayı ezberi: 67,8 / 23,3→39,0 / 52,0 M$ · 12,1+4,0 · 134→477 · 796/39,4 M$ · 72→0.')

# ============ S7 · KAPANIŞ ============
kutu_ekle(S[6], 1.2, 1.7, 17.6, 3.6, [
    ('“2033’e daha büyük bir depoyla değil; her parçanın görünür, her kararın kurallı,', 24, BEYAZ, False, PSB),
    ('her planın parametrik ve her krizin önceden prova edilmiş olduğu', 24, BEYAZ, False, PSB),
    ('bir işletim modeliyle gidilir.”', 24, BEYAZ, False, PSB),
    ('Kontrol Kulesi, bu modelin yazılım hâlidir.', 19, PEMBE, True, PB),
])
kutu_ekle(S[6], 1.2, 9.55, 17.6, 0.9, [
    ('Canlı demo ve tüm sayıların yeniden üretimi için hazırız  ·  Grup 3', 15, LILA, False, PL),
])
notlar(S[6], 'Kapanış cümlesi ezber. Sorulara geçilir; el notunun 2. sayfasında 8 hazır cevap var.')

cikti = os.path.join(HERE, 'Grup3_Komponent_Kontrol_Kulesi.pptx')
prs.save(cikti)
print('✓', os.path.basename(cikti), 'yazıldı —', len(S), 'slayt (limit 7)')
