# -*- coding: utf-8 -*-
"""Resmi Global Talent Bridge şablonunu (7 slayt, 20×11,25") Catalyst içeriğiyle doldurur.
Görsel-öncelikli kurgu: her slaytta bir görsel çapa (grafik, ekran görüntüsü, sohbet maketi,
sayı karoları), metin yalnız başlık ve kısa etiket düzeyinde. Söz konuşmacı notlarında ve
el notunda. Şablon tasarımına DOKUNULMAZ; mevcut kutular run düzeyinde doldurulur.
Çalıştırma: uv run fill_sablon.py → Grup9_Catalyst.pptx"""
import json, os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

HERE = os.path.dirname(os.path.abspath(__file__))
CH = os.path.join(HERE, 'charts')
SH = os.path.join(HERE, 'shots')
D = json.load(open(os.path.join(HERE, 'deck_data.json'), encoding='utf-8'))
K, B, MC = D['kpi'], D['band'], D['mc']

def tr1(v): return f'{v:,.1f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
def tr0(v): return f'{round(v):,}'.replace(',', '.')

BEYAZ = RGBColor(0xFF, 0xFF, 0xFF)
LILA  = RGBColor(0xCB, 0xBC, 0xE6)   # gövde metni (açık lavanta)
SOLUK = RGBColor(0x9C, 0x8A, 0xC0)
PEMBE = RGBColor(0xE8, 0x5B, 0xD0)   # marka neon vurgusu
AMBER = RGBColor(0xF2, 0xB3, 0x4C)
NANE  = RGBColor(0x5C, 0xD6, 0xBE)
PANEL = RGBColor(0x43, 0x26, 0x63)   # koyu mor panel
PANEL2= RGBColor(0x37, 0x1F, 0x52)   # sohbet balonu koyu
CIZGI = RGBColor(0x6C, 0x47, 0x95)

prs = Presentation(os.path.join(HERE, 'sablon.pptx'))
S = list(prs.slides)

FONT = 'Arial'   # Poppins çoğu makinede yok; Arial Türkçe'yi her yerde doğru gösterir

def run_yaz(tf, yeni_satirlar):
    """Metin çerçevesindeki DOLU paragrafları sırayla değiştirir; kalanları boşaltır."""
    i = 0
    for p in tf.paragraphs:
        if not p.runs:
            continue
        p.runs[0].text = yeni_satirlar[i] if i < len(yeni_satirlar) else ''
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

def kutu_ekle(slide, x, y, w, h, satirlar, panel=False, hiza=None):
    """satirlar: (metin, boyut_pt, renk, bold, hizasız) listesi."""
    if panel:
        r = slide.shapes.add_shape(5, Inches(x - 0.22), Inches(y - 0.18), Inches(w + 0.44), Inches(h + 0.36))
        r.adjustments[0] = 0.055
        r.fill.solid(); r.fill.fore_color.rgb = PANEL
        r.line.color.rgb = CIZGI; r.line.width = Pt(1)
        r.shadow.inherit = False
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True
    ilk = True
    for m, pt, renk, bold in satirlar:
        p = tf.paragraphs[0] if ilk else tf.add_paragraph()
        ilk = False
        p.space_after = Pt(5)
        if hiza is not None:
            p.alignment = hiza
        r = p.add_run(); r.text = m
        r.font.name = FONT; r.font.size = Pt(pt); r.font.bold = bold
        r.font.color.rgb = renk
    return tb

def cip(slide, x, y, w, h, buyuk, kucuk, renk, bsize=38, ksize=12.5):
    """Sayı karosu: panel + büyük sayı + tek satır etiket. Görsel-öncelikli kurgunun taşı."""
    r = slide.shapes.add_shape(5, Inches(x), Inches(y), Inches(w), Inches(h))
    r.adjustments[0] = 0.10
    r.fill.solid(); r.fill.fore_color.rgb = PANEL
    r.line.color.rgb = CIZGI; r.line.width = Pt(1)
    r.shadow.inherit = False
    tf = r.text_frame; tf.word_wrap = True
    tf.margin_left = Inches(0.16); tf.margin_right = Inches(0.16)
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    a = p.add_run(); a.text = buyuk
    a.font.name = FONT; a.font.size = Pt(bsize); a.font.bold = True; a.font.color.rgb = renk
    p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER
    b = p2.add_run(); b.text = kucuk
    b.font.name = FONT; b.font.size = Pt(ksize); b.font.bold = False; b.font.color.rgb = LILA
    return r

def balon(slide, x, y, w, h, metin, kim, sag=False):
    """Sohbet balonu maketi (Copilot vizyonu)."""
    r = slide.shapes.add_shape(5, Inches(x), Inches(y), Inches(w), Inches(h))
    r.adjustments[0] = 0.16
    r.fill.solid(); r.fill.fore_color.rgb = PANEL2 if sag else PANEL
    r.line.color.rgb = PEMBE if not sag else CIZGI
    r.line.width = Pt(1.2 if not sag else 1)
    r.shadow.inherit = False
    tf = r.text_frame; tf.word_wrap = True
    tf.margin_left = Inches(0.18); tf.margin_right = Inches(0.18)
    tf.margin_top = Inches(0.10); tf.margin_bottom = Inches(0.10)
    p = tf.paragraphs[0]
    k = p.add_run(); k.text = kim + '  '
    k.font.name = FONT; k.font.size = Pt(11); k.font.bold = True
    k.font.color.rgb = SOLUK if sag else PEMBE
    m = p.add_run(); m.text = metin
    m.font.name = FONT; m.font.size = Pt(13.5); m.font.bold = False; m.font.color.rgb = BEYAZ
    return r

def resim_ekle(slide, dosya, x, y, w, h, cerceve=True):
    if not os.path.exists(dosya):
        print('! görsel yok, atlandı:', os.path.basename(dosya))
        return None
    pic = slide.shapes.add_picture(dosya, Inches(x), Inches(y), Inches(w), Inches(h))
    if cerceve:
        pic.line.color.rgb = CIZGI; pic.line.width = Pt(1)
    return pic

def notlar(slide, metin):
    slide.notes_slide.notes_text_frame.text = metin

# ============ S1 · KAPAK ============
tf = S[0].shapes.title.text_frame
if tf.paragraphs[0].runs:
    tf.paragraphs[0].runs[0].text = 'Catalyst'
else:
    tf.text = 'Catalyst'
kutu_ekle(S[0], 10.15, 6.35, 8.9, 1.3, [
    ('Komponent Envanter Karar Platformu  ·  Grup 9', 20, LILA, False),
    ('Tüm veriler sentetiktir.', 13, PEMBE, False),
])
cip(S[0], 10.15, 8.15, 2.80, 1.55, '1.200→2.000', 'uçak, 2025→2033', NANE, bsize=24)
cip(S[0], 13.15, 8.15, 2.80, 1.55, '+%63–68', 'komponent talebi', AMBER, bsize=26)
cip(S[0], 16.15, 8.15, 2.80, 1.55, '5.000', 'parça tek platformda', PEMBE, bsize=26)
notlar(S[0], 'Catalyst, komponent envanteri için karar destek platformu. Filo yüzde 67 büyürken talep yüzde 63 ile 68 arası artıyor. Asıl kırılma büyümede değil, talebin yer değiştirmesinde. Bütün sayılar üç resmi veri setinden geliyor ve yeniden üretilebilir.')

# ============ S2 · PROBLEM (grafik + sayı karoları) ============
bul(S[1], 'Title 51').text_frame.paragraphs[0].runs[0].text = 'Problem: Büyüme Değil, Talebin Yer Değiştirmesi'
resim_ekle(S[1], os.path.join(CH, 's2_goc.png'), 0.6, 3.05, 10.30, 4.81, cerceve=False)
kutu_ekle(S[1], 0.6, 8.55, 10.3, 1.3, [
    ('Kırmızıdaki 134 parçayı kapatmak yalnızca 0,7 M$.', 16, BEYAZ, True),
    ('Sorun para değil. Sorun, stoğun azaldığını kimsenin görememesi.', 15, LILA, False),
])
cip(S[1], 11.35, 2.20, 7.95, 1.62, '+%63–68', '2033 talep artışı, nokta değil aralık', PEMBE)
cip(S[1], 11.35, 4.17, 7.95, 1.62, '%34 → %65', 'yeni nesil payı: talep yer değiştiriyor', AMBER)
cip(S[1], 11.35, 6.14, 7.95, 1.62, '72 / 134', 'siparişsiz kırmızı / toplam kırmızı parça', PEMBE)
cip(S[1], 11.35, 8.11, 7.95, 1.62, 'İGA +%52 · ADB +%82', 'istasyon yükü: yapı hub’lara dağılıyor', AMBER, bsize=28)
notlar(S[1], 'Problem dört sayıyla anlatılıyor. Talep yüzde 63 ile 68 arası artıyor ama asıl kırılma dağılımda: yeni nesil payı 34’ten 65’e çıkıyor ve bu parçaların geçmiş verisi yok. 72 parçanın stoğu bitmek üzere, açık siparişi bile yok, 11’i uçağı yerde bırakır. Kapatma maliyeti yalnızca 0,7 milyon dolar, yani sorun para değil süreç. İstasyon tablosu yapının dağıldığını gösteriyor: İGA uçak yükü yüzde 52, İzmir yüzde 82 artıyor, merkezi depo varsayımı 2033’te geçerli değil. Kategoriler de farklı hızda büyüyor, yüzde 40’a karşı yüzde 91, tek katsayıyla plan yapılamaz.')

# ============ S3 · ÇÖZÜM AKIŞI (6 adım, tek cümle + faz bandı) ============
bul(S[2], 'Title 26').text_frame.paragraphs[0].runs[0].text = 'Çözüm: Uçtan Uca Bir Karar Katmanı'
etiketler = ['BAĞLAN', 'BİRLEŞTİR', 'ÖNGÖR', 'UYAR', 'HAREKETE GEÇ', 'PROVA ET']
govdeler = [
    'Mevcut sistemleri yalnızca okur, hiçbirine yazmaz.',
    'Her parçanın dağınık kaydı tek kimlikte birleşir.',
    'Talep, parça grubuna uygun yöntemle aralık olarak tahmin edilir.',
    'Stok yetmeyecekse alarm, aksiyon önerisiyle birlikte gelir.',
    'Tamir, havuz, hurda ve alım tek puanla sıralanır.',
    'Krizler önceden denenir, bütçe en çok riske gider.',
]
for ad, met in zip(['TextBox 69', 'TextBox 71', 'TextBox 73', 'TextBox 75', 'TextBox 77', 'TextBox 84'], etiketler):
    run_yaz(bul(S[2], ad).text_frame, [met])
for ad, cml in zip(['TextBox 88', 'TextBox 89', 'TextBox 90', 'TextBox 93', 'TextBox 92', 'TextBox 91'], govdeler):
    tfb = bul(S[2], ad).text_frame
    run_yaz(tfb, [cml])
    for p in tfb.paragraphs:
        if p.runs:
            p.alignment = PP_ALIGN.LEFT
            p.runs[0].font.size = Pt(13)
            p.runs[0].font.bold = False
# Faz bandı
for a, b, faz in [('TextBox 88', 'TextBox 89', 'FAZ 1 · GÖRÜNÜRLÜK'),
                  ('TextBox 90', 'TextBox 93', 'FAZ 2 · ÖNGÖRÜ'),
                  ('TextBox 92', 'TextBox 91', 'FAZ 3 · AKSİYON')]:
    sa, sb = bul(S[2], a), bul(S[2], b)
    x1 = Emu(sa.left).inches
    x2 = Emu(sb.left).inches + Emu(sb.width).inches
    yalt = 9.05
    cz = S[2].shapes.add_shape(5, Inches(x1 + 0.10), Inches(yalt), Inches(x2 - x1 - 0.20), Inches(0.52))
    cz.adjustments[0] = 0.5
    cz.fill.background()
    cz.line.color.rgb = CIZGI; cz.line.width = Pt(1)
    cz.shadow.inherit = False
    tb = kutu_ekle(S[2], x1, yalt + 0.075, x2 - x1, 0.42, [(faz, 13, LILA, True)], hiza=PP_ALIGN.CENTER)
tb = kutu_ekle(S[2], 0.6, 9.86, 18.7, 0.6, [
    ('Yol haritasında: hub’lar arası acil parça getirimi · bekleme penceresine bakım önerisi · eşzamanlı bakımda parça değişimi · geri bildirimle öğrenen model', 12.5, SOLUK, False),
], hiza=PP_ALIGN.CENTER)
notlar(S[2], 'Altı adımı üç fazda anlatıyoruz: görünürlük, öngörü, aksiyon. Geçiş tarihe değil ölçüte bağlı. Mevcut sistemlere hiçbir şey yazmıyoruz, kurulum riski taşımıyor. Kayıtlar birleşince gerçek tamir süreleri olaylardan ölçülür. Tahmin gruba göre yöntem seçer, geçmişi olmayan parça benzerinden başlar. Alarm önerisiyle gelir, min-max kendini günceller. Aksiyonlar süre ve maliyet puanıyla sıralanır. En alttaki şerit yol haritası: acil getirim, bekleme penceresi bakımı, eşzamanlı bakımda parça değişimi, geri bildirimle öğrenen model.')

# ============ S4 · PROTOTİP (6 gerçek ekran görüntüsü) ============
bul(S[3], 'Title 74').text_frame.paragraphs[0].runs[0].text = 'Prototip: Tek Dosyalık Canlı Dashboard'
for ad in ('TextBox 40', 'TextBox 41', 'TextBox 42', 'TextBox 43'):
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
notlar(S[3], 'Beş ekranı canlı gösteriyoruz. Dashboard tek bir HTML dosyası, USB’den açılıyor ve salon ağına ihtiyaç duymuyor. Her sayı koddan yeniden üretilebiliyor. Demo akışı: kokpitteki alarmdan watchlist’e, oradan parça detayına, sonra harita ve senaryoya.')

# ============ S5 · ÖNGÖRÜ MOTORU + COPILOT (akış + sohbet maketi) ============
bul(S[4], 'Title 28').text_frame.paragraphs[0].runs[0].text = 'Öngörü Motoru ve Copilot'
# tahmin ufku
cip(S[4], 0.60, 2.30, 2.95, 1.55, '1 YIL', 'sipariş planı', NANE, bsize=28)
cip(S[4], 3.80, 2.30, 2.95, 1.55, '5 YIL', 'bütçe ve filo', AMBER, bsize=28)
cip(S[4], 7.00, 2.30, 2.95, 1.55, '10 YIL', 'kabiliyet yatırımı', PEMBE, bsize=28)
# model akışı
adimlar = ['İstatistik tabanı', 'AI düzeltmesi', 'İnsan onayı', 'Geri bildirim']
for n, adim in enumerate(adimlar):
    x = 0.60 + n * 2.45
    r = S[4].shapes.add_shape(5, Inches(x), Inches(4.45), Inches(2.05), Inches(0.85))
    r.adjustments[0] = 0.22
    r.fill.solid(); r.fill.fore_color.rgb = PANEL
    r.line.color.rgb = CIZGI; r.line.width = Pt(1)
    r.shadow.inherit = False
    tfr = r.text_frame; tfr.word_wrap = True
    p = tfr.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    a = p.add_run(); a.text = adim
    a.font.name = FONT; a.font.size = Pt(13); a.font.bold = True; a.font.color.rgb = BEYAZ
    if n:
        kutu_ekle(S[4], x - 0.47, 4.62, 0.5, 0.5, [('→', 20, SOLUK, True)])
kutu_ekle(S[4], 0.60, 5.52, 9.35, 0.85, [
    ('Kabul oranı modeli eğitir ve otomasyon eşiğini belirler. Geçmişi olmayan parça benzerinden başlar.', 12.5, SOLUK, False),
    ('AI bugün öneri modunda, kararı klasik yöntem verir.', 12.5, LILA, False),
])
# doğrulama
cip(S[4], 0.60, 6.62, 2.95, 1.55, '%97', 'float saha uyumu', NANE, bsize=30)
cip(S[4], 3.80, 6.62, 2.95, 1.55, 'binde 4', 'geri test hatası', NANE, bsize=26)
cip(S[4], 7.00, 6.62, 2.95, 1.55, '%99,5', 'simülasyon uyumu', NANE, bsize=30)
# Copilot sohbet maketi
kutu_ekle(S[4], 10.55, 2.30, 8.35, 0.5, [('Copilot · ikinci faz vizyonu', 16, PEMBE, True)])
balon(S[4], 11.60, 3.00, 7.30, 1.15, 'TC-JSA yarın İzmir’e uçacak. Riskli parçası var mı?', 'OPERATÖR', sag=True)
balon(S[4], 10.55, 4.40, 7.30, 1.75, '3 parça kırmızıda. PN-101741 için öneri: havuzdan değişim, 3 gün. Gerekçe ve geçmiş katkısı ekli.', 'COPILOT')
balon(S[4], 11.60, 6.40, 7.30, 1.15, 'Onayla. Raporu vardiya notuna ekle.', 'OPERATÖR', sag=True)
kutu_ekle(S[4], 10.55, 7.68, 8.35, 0.9, [
    ('Ayrık sistemlerin üzerinde tek soru-cevap yüzeyi. Her cevap loglanır,', 13, LILA, False),
    ('merkezi rapor formatına düşer. Mimari mikroservis.', 13, LILA, False),
])
notlar(S[4], 'Solda tahmin motoru: 1, 5 ve 10 yıllık ufuk. Akış dört adım: istatistik tabanı, AI düzeltmesi, insan onayı, geri bildirim. Kabul oranı modeli eğitir, eşik geçilmeden otomasyon yok. Doğrulama üç sayı: float yüzde 97, geri test binde 4, simülasyon yüzde 99,5. Sağda Copilot vizyonu sohbet maketiyle: uçak sorulur, cevap dashboard verisinden gelir, öneri gerekçesiyle birlikte. Her cevap loglanır ve merkezi rapor formatına düşer, mimari mikroservis. Copilot bugün prototipte yok, ikinci faz vizyonudur ve bunu açıkça söylüyoruz.')

# ============ S6 · ÖNCELİK · KRİZ · BAŞARI (3 büyük sayı + 3 grafik) ============
bul(S[5], 'Title 51').text_frame.paragraphs[0].runs[0].text = 'Önceliklendirme, Kriz Dayanıklılığı ve Başarı Ölçütü'
kutu_ekle(S[5], 0.6, 2.3, 5.9, 7.6, [
    ('ÖNCELİK', 15, PEMBE, True),
    ('12,1 M$/yıl', 40, BEYAZ, True),
    ('kabiliyet yatırımının getirisi, 547 parça', 13, LILA, False),
    ('Üç para akışı: ' + tr1(K['scrap']) + ' · ' + tr1(K['float_fmv']) + '→' + tr1(K['float_33']) + ' · ' + tr1(K['phaseout']) + ' M$. Her alım, risk başına kazanca göre sıralanır.', 13, LILA, False),
], panel=True)
kutu_ekle(S[5], 7.15, 2.3, 5.9, 7.6, [
    ('KRİZ PROVASI', 15, PEMBE, True),
    ('134 → 477', 40, BEYAZ, True),
    ('motor krizinde kırmızı liste, tek tıkla', 13, LILA, False),
    ('Simülasyon aynı senaryoda ' + tr0(MC['motor']['acik_ort']) + ' parça ve ' + tr1(MC['motor']['ek_ort']) + ' M$ ek ihtiyaç gösterir. Plan her çeyrek prova edilir.', 13, LILA, False),
], panel=True)
kutu_ekle(S[5], 13.7, 2.3, 5.6, 7.6, [
    ('BAŞARI ÖLÇÜTÜ', 15, PEMBE, True),
    ('72 → 0', 40, BEYAZ, True),
    ('siparişsiz kritik parça ilk fazda sıfırlanır', 13, LILA, False),
    ('Ana ölçüt: parça yüzünden yerde bekleyen uçak oranının düşmesi. Kritik karşılama %97-98 üstünde tutulur.', 13, LILA, False),
], panel=True)
resim_ekle(S[5], os.path.join(CH, 's6_taps.png'), 1.10, 6.2, 4.90, 3.03, cerceve=False)
resim_ekle(S[5], os.path.join(CH, 's6_kriz.png'), 7.65, 6.2, 4.90, 3.03, cerceve=False)
resim_ekle(S[5], os.path.join(CH, 's6_basari.png'), 14.15, 6.2, 4.70, 3.01, cerceve=False)
notlar(S[5], 'Üç sütun üç sayıyla konuşuyor. Öncelik: üç para akışı 67,8, 23,3’ten 39’a ve 52 milyon dolar; kabiliyet yatırımı yılda 12,1 milyon getiriyor; bütçe optimizasyonu her alımı harcanan dolar başına kapanan riske göre sıralıyor ve ilk milyonlar en çok işe yarıyor. Kriz: motor ailesi krizi tek tıkla deneniyor, kırmızı 134’ten 477’ye çıkıyor, simülasyon 796 parça ve 39,4 milyon ek ihtiyaç gösteriyor; kütüphanede pandemi, OEM gecikmesi, lojistik ve kur şoku hazır. Başarı: siparişsiz kritik parça sıfıra iner, yerde bekleyen uçak oranı düşer, servis stok şişirerek değil tedarik süresi kısaltarak korunur.')

# ============ S7 · KAPANIŞ + RİSKLER ============
kutu_ekle(S[6], 1.2, 1.7, 17.6, 2.4, [
    ('Catalyst · komponent envanteri için uçtan uca karar katmanı', 26, BEYAZ, True),
    ('Tahmin, alarm, aksiyon ve senaryo tek platformda. Tüm sayılar yeniden üretilebilir.', 18, LILA, False),
])
kutu_ekle(S[6], 1.2, 5.15, 8.8, 3.4, [
    ('RİSKLER VE KARŞILIKLARI', 15, PEMBE, True),
    ('Veri kalitesi → faz geçişi ölçüte bağlı', 14, LILA, False),
    ('Model hatası → öneri modu, eşiksiz otomasyon yok', 14, LILA, False),
    ('Benimseme → uyarı önerisiyle gelir, geri bildirim ölçülür', 14, LILA, False),
    ('Entegrasyon → salt okunur, hiçbir kaynağa yazılmaz', 14, LILA, False),
], panel=True)
kutu_ekle(S[6], 1.2, 9.55, 17.6, 0.9, [
    ('Canlı demo ve tüm sayıların yeniden üretimi için hazırız  ·  Grup 9', 15, LILA, False),
])
notlar(S[6], 'Kapanış cümlesini söyleyip risk paneline bir cümleyle değiniyoruz: riskleri biliyoruz ve her birinin karşılığı tasarımda var. Sonra sorulara geçiyoruz. Resmi yedi sorunun slayt eşlemesi SUNUM_KILAVUZU içinde, hazır cevaplar el notunun ikinci sayfasında.')

# Başlık kutularını Arial'a çevir (Türkçe her yerde doğru görünsün)
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
