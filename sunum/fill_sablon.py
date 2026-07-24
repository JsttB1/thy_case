# -*- coding: utf-8 -*-
"""Resmi Global Talent Bridge şablonunu (7 slayt, 20×11,25") proje içeriğiyle doldurur.
Şablon tasarımına DOKUNULMAZ: mevcut metin kutularında run düzeyinde değişiklik yapılır
(biçim korunur); boş slaytlara marka diline uygun kutular eklenir.
Çalıştırma: uv run fill_sablon.py → Grup9_Catalyst.pptx"""
import copy, json, os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

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

FONT = 'Arial'   # Poppins bu makinede/çoğu makinede kurulu değil; Arial Türkçe'yi her yerde doğru gösterir

CH = os.path.join(HERE, 'charts')   # make_charts.py çıktıları (marka grafikler)
SH = os.path.join(HERE, 'shots')    # make_shots.py çıktıları (dashboard ekran görüntüleri)


def resim_ekle(slide, dosya, x, y, w, h, cerceve=True):
    """PNG'yi verilen inç kutusuna bozmadan gömer; dosya yoksa sessizce atlar (deste yine üretilir)."""
    if not os.path.exists(dosya):
        print('  ! görsel atlandı (yok):', os.path.relpath(dosya, HERE))
        return None
    pic = slide.shapes.add_picture(dosya, Inches(x), Inches(y), Inches(w), Inches(h))
    if cerceve:
        pic.line.color.rgb = CIZGI
        pic.line.width = Pt(0.75)
    return pic

def run_yaz(tf, yeni_satirlar):
    """Metin çerçevesindeki DOLU paragrafları sırayla yeni satırlarla değiştirir;
    fazla kalan dolu paragraflar boşaltılır. Renk/boyut korunur, font Arial'a çevrilir."""
    i = 0
    for p in tf.paragraphs:
        if not p.runs:
            continue
        yeni = yeni_satirlar[i] if i < len(yeni_satirlar) else ''
        p.runs[0].text = yeni
        p.runs[0].font.name = FONT
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

PB, PSB, PR, PL = FONT, FONT, FONT, FONT   # ağırlık, kutu_ekle'deki bold bayrağıyla verilir

# ============ S1 · KAPAK ============
S[0].shapes.title.text_frame.paragraphs[0].runs[0].text if S[0].shapes.title.text_frame.paragraphs[0].runs else None
tf = S[0].shapes.title.text_frame
if tf.paragraphs[0].runs:
    tf.paragraphs[0].runs[0].text = 'Catalyst'
else:
    tf.text = 'Catalyst'
kutu_ekle(S[0], 10.15, 6.35, 8.9, 2.4, [
    ('Komponent Envanter Karar Platformu  ·  Grup 9', 20, LILA, False, PSB),
    ('5.000 parça için görünürlük, öngörü ve aksiyon.', 15, SOLUK, False, PL),
    ('1.200 uçaktan 2.000 uçağa hazırlık. Tüm veriler sentetiktir.', 13, PEMBE, False, PR),
])
notlar(S[0], 'Catalyst, komponent envanteri için karar destek platformu. Filo %67 büyürken talep %63 ile %68 arası artıyor. Asıl kırılma büyümede değil, talebin yer değiştirmesinde. Bütün sayılar üç resmi veri setinden geliyor ve yeniden üretilebilir.')

# ============ S2 · PROBLEM + BOŞLUK ============
bul(S[1], 'Title 51').text_frame.paragraphs[0].runs[0].text = 'Problem: Büyüme Değil, Talebin Yer Değiştirmesi'
kutu_ekle(S[1], 0.6, 2.15, 9.0, 8.6, [
    ('Asıl mesele büyüme değil', 17, BEYAZ, True, PSB),
    ('2033 talebi bugüne göre %63 ile %68 arası artıyor. Kritik olan bu değil.', 14, LILA, False, PL),
    ('Talebin üçte ikisi yeni parçalara kayıyor', 17, BEYAZ, True, PSB),
    ('Yeni nesil modellerin payı %34’ten %65’e çıkıyor. Bu parçaların çoğunun geçmiş verisi yok.', 14, LILA, False, PL),
    ('Kategoriler farklı hızda büyüyor', 17, BEYAZ, True, PSB),
    ('Bir kategori %40 artarken bir diğeri %91 artıyor. Tek bir katsayıyla plan yapılamaz.', 14, LILA, False, PL),
    ('Kayıtlar dağınık, süreç görünmüyor', 17, BEYAZ, True, PSB),
    ('Bir parça yaklaşık 9 başkanlıktan geçiyor ve 4-5 ayrı sisteme kaydediliyor. Her geçişte veri kopuyor.', 14, LILA, False, PL),
])
kutu_ekle(S[1], 10.6, 2.5, 8.2, 2.75, [
    (str(K['siparissiz']) + ' parça', 54, PEMBE, True, PB),
    ('stoğu tükenmek üzere ama hiç sipariş açılmamış.', 15, BEYAZ, False, PR),
    ('Bunların 11’i, yokluğunda uçağı yerde bırakan kritik parça.', 15, BEYAZ, False, PR),
], panel=True)
kutu_ekle(S[1], 10.6, 5.95, 8.2, 3.1, [
    ('Stoğu riske giren toplam ' + str(K['kirmizi']) + ' parça var.', 15, AMBER, True, PSB),
    ('Hepsini yerine koymak yalnızca ' + tr1(K['kapatma']) + ' M$. Yani sorun para değil.', 14, LILA, False, PL),
    ('Sorun, stoğun azaldığını kimsenin görememesi.', 15, BEYAZ, True, PSB),
    ('Bugün elle tutulan bu denge, 2.000 uçakta tutmaz.', 14, LILA, False, PL),
], panel=True)
notlar(S[1], 'Problem ve mevcut boşluğu birlikte veriyoruz. 72 parçanın stoğu bitmek üzere ve sipariş bile açılmamış. Bu, azalmayı hesaplayan bir sürecin olmadığının kanıtı. Bu durumu resmi stok verisiyle ilk kez biz ölçtük.')
resim_ekle(S[1], os.path.join(CH, 's2_goc.png'), 0.6, 5.6, 8.5, 3.97, cerceve=False)

# ============ S3 · ÇÖZÜM AKIŞI (6 adım + 3 faz bandı) ============
bul(S[2], 'Title 26').text_frame.paragraphs[0].runs[0].text = 'Çözüm: Uçtan Uca Bir Karar Katmanı'
etiketler = ['BAĞLAN', 'BİRLEŞTİR', 'ÖNGÖR', 'UYAR', 'HAREKETE GEÇ', 'PROVA ET']
govdeler = [
    ['Mevcut bakım sistemlerine bağlanır ve kayıtları yalnızca okur.',
     'Hiçbir sisteme yazmadığı için mevcut işleyiş değişmez.'],
    ['Bir parçanın farklı sistemlerdeki kayıtları tek kimlikte birleşir.',
     'Parçanın yeri, durumu ve gerçek tamir süresi tek yerden izlenir.'],
    ['Gelecek talep, her parça grubuna uygun yöntemle aralık olarak tahmin edilir.',
     'Geçmişi olmayan yeni parçalar benzerlerinin verisinden yola çıkar.'],
    ['Stok, yenisi gelene kadar yetmeyecekse sistem önceden alarm verir.',
     'Her alarm önerilen aksiyonla gelir ve stok seviyeleri kendini günceller.'],
    ['Riskli parça için tamir, havuz, hurda ve alım seçenekleri süre ile maliyete göre puanlanır.',
     'Ekip en uygun adımı tek bakışta görür.'],
    ['Motor arızası ya da tedarik gecikmesi gibi krizler önceden denenir, etkisi anında hesaplanır.',
     'Bütçe en çok riski kapatan alıma yönlenir ve plan her çeyrek tazelenir.'],
]
def govde_yaz(tf, satirlar):
    """S3 gövdeleri: tam cümleler — sola yaslı, 12,5 pt, normal ağırlık (fragman değil paragraf)."""
    i = 0
    for p in tf.paragraphs:
        if not p.runs:
            continue
        p.alignment = PP_ALIGN.LEFT
        p.runs[0].text = satirlar[i] if i < len(satirlar) else ''
        p.runs[0].font.name = FONT
        p.runs[0].font.size = Pt(12.5)
        p.runs[0].font.bold = False
        for r in p.runs[1:]:
            r.text = ''
        i += 1
for ad, met in zip(['TextBox 69', 'TextBox 71', 'TextBox 73', 'TextBox 75', 'TextBox 77', 'TextBox 84'], etiketler):
    run_yaz(bul(S[2], ad).text_frame, [met])
for ad, sat in zip(['TextBox 88', 'TextBox 89', 'TextBox 90', 'TextBox 93', 'TextBox 92', 'TextBox 91'], govdeler):
    govde_yaz(bul(S[2], ad).text_frame, sat)
# Faz bandı: kutu çiftlerinin altına üç etiket (notlardaki fazlama slaytta da görünsün)
for a, b, faz in [('TextBox 88', 'TextBox 89', 'FAZ 1 · GÖRÜNÜRLÜK'),
                  ('TextBox 90', 'TextBox 93', 'FAZ 2 · ÖNGÖRÜ'),
                  ('TextBox 92', 'TextBox 91', 'FAZ 3 · AKSİYON')]:
    sa, sb = bul(S[2], a), bul(S[2], b)
    x1 = Emu(sa.left).inches
    x2 = Emu(sb.left).inches + Emu(sb.width).inches
    yalt = 9.05   # kart zeminleri ~8,78"de bitiyor (metin kutusundan uzun); sabit hiza en güvenlisi
    cz = S[2].shapes.add_shape(5, Inches(x1 + 0.10), Inches(yalt), Inches(x2 - x1 - 0.20), Inches(0.52))
    cz.adjustments[0] = 0.5
    cz.fill.background()
    cz.line.color.rgb = CIZGI; cz.line.width = Pt(1)
    cz.shadow.inherit = False
    tb = kutu_ekle(S[2], x1, yalt + 0.075, x2 - x1, 0.42, [(faz, 13, LILA, True, PSB)])
    tb.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
notlar(S[2], 'Altı adımı üç fazda anlatıyoruz. Bağlan ve birleştir görünürlük fazı, öngör ve uyar öngörü fazı, harekete geç ve prova et aksiyon fazı. Fazlar arası geçiş tarihe değil ölçüte bağlı. En önemli nokta: mevcut sistemlere hiçbir şey yazmıyoruz, sadece okuyoruz.')

# ============ S4 · PROTOTİP (6 kart) ============
bul(S[3], 'Title 74').text_frame.paragraphs[0].runs[0].text = 'Prototip: Tek Dosyalık Canlı Dashboard'
for ad in ('TextBox 40', 'TextBox 41', 'TextBox 42', 'TextBox 43'):   # şablondaki örnek metinleri boşalt
    run_yaz(bul(S[3], ad).text_frame, [])
kartlar = [
    ('Kokpit', 'Envanter, para akışı, kırmızı liste', 'kokpit.png'),
    ('Watchlist', 'Risk sırası + önerilen aksiyon', 'watch.png'),
    ('Öngörü & AI', 'Segment tahmini + cold-start', 'ongoru.png'),
    ('Harita', '25 istasyon, krizin ağa etkisi', 'harita.png'),
    ('Senaryo', 'Kriz ve parametreler tek ekranda', 'senaryo.png'),
    ('Doğrulanmış Çekirdek', 'Float %97, geri test binde 4', 'cekirdek.png'),
]
gruplar = ['Group 50', 'Group 59', 'Group 62', 'Group 65', 'Group 68', 'Group 71']
for g, (baslik, alt, shot) in zip(gruplar, kartlar):
    grp = bul(S[3], g)
    gx, gy = Emu(grp.left).inches, Emu(grp.top).inches
    tbs = [sh for sh in grp.shapes if sh.has_text_frame]
    run_yaz(tbs[0].text_frame, [baslik])
    run_yaz(tbs[1].text_frame, [alt])
    tbs[1].text_frame.vertical_anchor = MSO_ANCHOR.TOP
    resim_ekle(S[3], os.path.join(SH, shot), gx + 0.37, gy + 0.98, 3.90, 2.06)
notlar(S[3], 'Beş ekranı canlı gösteriyoruz. Dashboard tek bir HTML dosyası, USB’den açılıyor ve salon ağına ihtiyaç duymuyor. Her sayı koddan yeniden üretilebiliyor.')

# ============ S5 · ÖZELLİKLER ============
bul(S[4], 'Title 28').text_frame.paragraphs[0].runs[0].text = 'Platform Özellikleri'
kutu_ekle(S[4], 0.6, 2.2, 9.2, 8.4, [
    ('Kırmızı liste ve siparişsiz alarmı', 15, BEYAZ, True, PSB),
    ('Dayanma süresi tedarik süresinin altına inen parça uyarı üretir. Uyarı, aksiyon önerisiyle birlikte gelir.', 13, LILA, False, PL),
    ('Dinamik min–max ve emniyet stoğu', 15, BEYAZ, True, PSB),
    ('Her parça için servis hedefine göre otomatik hesaplanır. Elle liste tutulmaz.', 13, LILA, False, PL),
    ('Aksiyon merdiveni', 15, BEYAZ, True, PSB),
    ('Tamir, pool, BER ve alım seçenekleri süre ve maliyet puanıyla sıralanır.', 13, LILA, False, PL),
    ('Bütçe optimizasyonu', 15, BEYAZ, True, PSB),
    ('Verilen bütçeyle en çok riski kapatan alım listesini çıkarır.', 13, LILA, False, PL),
    ('Tahmin motoru', 15, BEYAZ, True, PSB),
    ('Segment bazlı istatistik, üstüne AI düzeltmesi. Geçmişi olmayan parça benzerlerinden başlar, veri geldikçe kendine yakınsar.', 13, LILA, False, PL),
])
kutu_ekle(S[4], 10.6, 2.5, 8.2, 2.55, [
    ('72 → 0', 44, PEMBE, True, PB),
    ('Stoğu biten ama siparişi olmayan parça sayısı ilk fazda sıfırlanır.', 14, BEYAZ, False, PR),
    ('Her uyarı bir aksiyona bağlanır.', 14, BEYAZ, False, PR),
], panel=True)
kutu_ekle(S[4], 10.6, 5.75, 8.2, 3.0, [
    ('Doğrulama', 16, AMBER, True, PSB),
    ('Float tahmini sahayla %97 uyumlu. Geri testte toplam hata binde 4.', 14, LILA, False, PL),
    ('Simülasyon, formülle %99,5 uyum gösterdi.', 14, LILA, False, PL),
    ('AI bugün öneri modundadır, kararı klasik yöntem verir.', 14, BEYAZ, True, PSB),
], panel=True)
notlar(S[4], 'Bu slayt ürünün özellik setini veriyor: alarm, min-max, aksiyon merdiveni, bütçe optimizasyonu ve tahmin motoru. Yapay zekâ öneri modunda, kararı klasik yöntemler veriyor. Doğrulama sayıları sağ altta: float %97, geri test binde 4, simülasyon %99,5.')

# ============ S6 · ÖNCELİKLENDİRME · KRİZ · BAŞARI ============
bul(S[5], 'Title 51').text_frame.paragraphs[0].runs[0].text = 'Önceliklendirme, Kriz Dayanıklılığı ve Başarı Ölçütü'
kutu_ekle(S[5], 0.6, 2.3, 5.9, 7.6, [
    ('ÖNCE NE YAPMALI?', 15, PEMBE, True, PB),
    ('Üç büyük para kalemi var: yılda ' + tr1(K['scrap']) + ' M$ hurda, ' + tr1(K['float_fmv']) + ' M$ tamir döngüsü ve ' + tr1(K['phaseout']) + ' M$ emekli filo stoğu.', 13.5, LILA, False, PL),
    ('Her alım, harcanan para başına en çok riski azaltana göre sıralanıyor. İlk milyonlar en çok işe yarıyor.', 13.5, LILA, False, PL),
    ('Atölye kabiliyeti yatırımı 547 parçada yılda ' + tr1(K['kab_tasarruf']) + ' M$ tasarruf getiriyor.', 13.5, BEYAZ, True, PSB),
    ('En büyük etken tedarik süresi. Yüzde 20 değişince maliyet 23 ile 45 M$ arasında oynuyor.', 13.5, LILA, False, PL),
    ('İlk faz sadece görünürlük. Daha ilk gün stoğu biten 72 parça yakalanıyor.', 13.5, LILA, False, PL),
], panel=True)
kutu_ekle(S[5], 7.15, 2.3, 5.9, 7.6, [
    ('KRİZ BİR AYAR DEĞİŞİKLİĞİDİR', 15, PEMBE, True, PB),
    ('Her kriz ya stoğun dayanma süresini kısaltır ya da tedarik süresini uzatır. İkisi de birer ayar.', 13.5, LILA, False, PL),
    ('Motor ailesi krizini canlı deniyoruz. Riskli parça sayısı 134’ten 477’ye çıkıyor.', 13.5, BEYAZ, True, PSB),
    ('Simülasyon aynı senaryoda ' + tr0(MC['motor']['acik_ort']) + ' parça ve ' + tr1(MC['motor']['ek_ort']) + ' M$ ek ihtiyaç gösteriyor.', 13.5, LILA, False, PL),
    ('Kütüphanede pandemi, OEM gecikmesi, lojistik ve kur şoku senaryoları hazır.', 13.5, LILA, False, PL),
    ('Kriz planı önceden yazılıyor ve her çeyrek bir senaryo prova ediliyor.', 13.5, LILA, False, PL),
], panel=True)
kutu_ekle(S[5], 13.7, 2.3, 5.6, 7.6, [
    ('BAŞARIYI NASIL ÖLÇERİZ?', 15, PEMBE, True, PB),
    ('Ana ölçüt, parça yüzünden yerde bekleyen uçak oranının düşmesi. Her saati gelir kaybı.', 13.5, BEYAZ, True, PSB),
    ('Stoğu biten ama siparişi olmayan parça sayısı sıfıra iniyor. Her uyarı bir aksiyona bağlanıyor.', 13.5, LILA, False, PL),
    ('Kritik parça karşılama oranı %97-98’in üstünde tutuluyor.', 13.5, LILA, False, PL),
    ('Otomasyona geçiş, tahmin doğruluğu ve öneri kabul oranı eşiğine bağlı.', 13.5, LILA, False, PL),
    ('Servis, stok şişirilerek değil tedarik süresi kısaltılarak korunuyor.', 13.5, LILA, False, PL),
], panel=True)
notlar(S[5], 'Bu slayt önceliklendirmeyi, kriz dayanıklılığını ve başarı ölçütlerini birlikte veriyor. Akılda kalması gerekenler: üç para kalemi 67,8, 23,3 ve 52 M$. Kabiliyet yatırımı yılda 12,1 M$. Motor krizinde riskli parça 134’ten 477’ye çıkıyor.')
resim_ekle(S[5], os.path.join(CH, 's6_taps.png'), 1.10, 6.2, 4.90, 3.03, cerceve=False)
resim_ekle(S[5], os.path.join(CH, 's6_kriz.png'), 7.65, 6.2, 4.90, 3.03, cerceve=False)
resim_ekle(S[5], os.path.join(CH, 's6_basari.png'), 14.15, 6.2, 4.70, 3.01, cerceve=False)

# ============ S7 · KAPANIŞ ============
kutu_ekle(S[6], 1.2, 1.7, 17.6, 3.6, [
    ('Catalyst · komponent envanteri için uçtan uca karar katmanı', 26, BEYAZ, True, PB),
    ('Tahmin, alarm, aksiyon ve senaryo tek platformda. Tüm sayılar yeniden üretilebilir.', 18, LILA, False, PL),
])
kutu_ekle(S[6], 1.2, 9.55, 17.6, 0.9, [
    ('Canlı demo ve tüm sayıların yeniden üretimi için hazırız  ·  Grup 9', 15, LILA, False, PL),
])
notlar(S[6], 'Kapanış cümlesini net söyleyip sorulara geçiyoruz. El notunun ikinci sayfasında sık gelen sorular için hazır cevaplar var.')

# Başlık kutularını Poppins'ten Arial'a çevir (Türkçe her yerde doğru görünsün)
for s in S:
    for sh in s.shapes:
        if sh.has_text_frame and sh.name.startswith('Title'):
            for p in sh.text_frame.paragraphs:
                for r in p.runs:
                    r.font.name = FONT
                    r.font.bold = True

cikti = os.path.join(HERE, 'Grup9_Catalyst.pptx')
prs.save(cikti)
print('✓', os.path.basename(cikti), 'yazıldı —', len(S), 'slayt (limit 7)')
