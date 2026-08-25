# -*- coding: utf-8 -*-
"""Jüri el notu (2 sayfa, A4, baskı dostu açık tema).
Sayfa 1: yönetici özeti — tez, üç musluk, kanıtlar, katmanlar, başarı ölçütleri.
Sayfa 2: jüri soruları için hazır cevaplar (CLAUDE.md §8, düzeltilmiş sayılarla).
Çalıştırma: uv run make_handout.py  →  catalyst_el_notu.pdf"""
import json, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'deck_data.json'), encoding='utf-8'))
K, B, MC = D['kpi'], D['band'], D['mc']

SUP = '/System/Library/Fonts/Supplemental/'
pdfmetrics.registerFont(TTFont('Ar', SUP + 'Arial.ttf'))
pdfmetrics.registerFont(TTFont('ArB', SUP + 'Arial Bold.ttf'))
pdfmetrics.registerFont(TTFont('Mono', SUP + 'Courier New Bold.ttf'))

INK = HexColor('#141B2B'); MUT = HexColor('#5A6478'); DIM = HexColor('#8A93A6')
TEAL = HexColor('#0E8C7C'); AMBER = HexColor('#B87614'); RED = HexColor('#C24545')
LINE = HexColor('#D8DDE6'); PANEL = HexColor('#F3F5F9')

W, H = A4
M = 16 * mm
c = canvas.Canvas(os.path.join(HERE, 'catalyst_el_notu.pdf'), pagesize=A4)
c.setTitle('Catalyst — Jüri El Notu')

def tr1(v): return f'{v:,.1f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
def tr0(v): return f'{round(v):,}'.replace(',', '.')

def kutu(x, y, w, h, cizgi=LINE, dolgu=PANEL):
    c.setFillColor(dolgu); c.setStrokeColor(cizgi); c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, 2.2 * mm, stroke=1, fill=1)

def yaz(x, y, t, f='Ar', s=9, renk=INK, mak=None):
    c.setFont(f, s); c.setFillColor(renk)
    if mak:  # basit sarma
        satirlar, cur = [], ''
        for w_ in t.split():
            d = (cur + ' ' + w_).strip()
            if pdfmetrics.stringWidth(d, f, s) <= mak: cur = d
            else: satirlar.append(cur); cur = w_
        satirlar.append(cur)
        for i, sl in enumerate(satirlar):
            c.drawString(x, y - i * (s + 2.2), sl)
        return len(satirlar)
    c.drawString(x, y, t)
    return 1

def chipK(x, y, w, h, deger, etiket, renk=TEAL):
    kutu(x, y, w, h)
    c.setFont('Mono', 14); c.setFillColor(renk); c.drawString(x + 3.2 * mm, y + h - 7.5 * mm, deger)
    yaz(x + 3.2 * mm, y + h - 12.6 * mm, etiket, 'Ar', 7.2, MUT, mak=w - 6.4 * mm)

# ============================ SAYFA 1 ============================
c.setFillColor(TEAL); c.rect(M, H - 18 * mm, 2.6 * mm, 2.6 * mm, stroke=0, fill=1)
yaz(M + 4.4 * mm, H - 17.6 * mm, 'GLOBAL TALENT BRIDGE · FİLO BÜYÜR, ENVANTER HAZIR MI? · GRUP 9', 'Mono', 7.8, TEAL)
yaz(M, H - 27 * mm, 'Catalyst', 'ArB', 23, INK)
yaz(M, H - 33.5 * mm, 'Komponent envanteri için karar destek platformu. 5.000 parça için görünürlük, öngörü ve aksiyon.', 'Ar', 10, MUT)

y = H - 40 * mm
yaz(M, y, 'TEZ', 'Mono', 8, TEAL)
tez = ('Sorun stok miktarı değil, görünürlük ve süreç. Bugün ' + str(K['kirmizi']) + ' parçanın stoğu, yenisi gelene '
       'kadar bitmek üzere ve bunların ' + str(K['siparissiz']) + "'sinin açık siparişi bile yok. Oysa hepsini tamamlamak yalnızca " +
       tr1(K['kapatma']) + ' M$, yani mesele para değil. Talep 2033 hedefine giderken %' + str(round(B['alt_pct'])) + ' ile %' + str(round(B['ust_pct'])) +
       ' arası büyüyor ama asıl kırılma dağılımda: yeni nesil modellerin payı %34\'ten %65\'e çıkıyor. '
       'Büyüme yönetilebilir, bu dağılım değişimi ise ancak veriyle yönetilir.')
n = yaz(M, y - 5 * mm, tez, 'Ar', 9.3, INK, mak=W - 2 * M)
y -= 5 * mm + n * 11.5 + 6 * mm

yaz(M, y, 'ÜÇ PARA MUSLUĞU', 'Mono', 8, TEAL)
cw = (W - 2 * M - 8 * mm) / 3
chipK(M, y - 22 * mm, cw, 18 * mm, tr1(K['scrap']) + ' M$/yıl', 'hurda ikamesi. BER kuralıyla vanaya bağlanır, 2033\'te ' + tr1(K['scrap33']) + ' M$', AMBER)
chipK(M + cw + 4 * mm, y - 22 * mm, cw, 18 * mm, tr1(K['float_fmv']) + ' → ' + tr1(K['float_33']) + ' M$', 'tamir döngüsü sermayesi. TAT programı ve kabiliyet yatırımıyla sınırlanır', TEAL)
chipK(M + 2 * (cw + 4 * mm), y - 22 * mm, cw, 18 * mm, tr1(K['phaseout']) + ' M$', 'küçülen 4 modele bağlı stok. Takvimle değil sinyalle eritilir', RED)
y -= 30 * mm

yaz(M, y, 'DÖRT BAĞIMSIZ DOĞRULAMA', 'Mono', 8, TEAL)
kan = [('%97', 'float tahmini sahayla uyumlu: ' + tr0(K['float_adet']) + ' tahmin, ' + tr0(K['tamirde']) + ' gerçek'),
       ('1 numara', 'risk sıralamasının birincisi sahada gerçekten riskli çıktı'),
       ('%0,4', 'geriye dönük test: görülmeyen çeyreğin toplamı binde 4 hatayla bulundu'),
       ('%' + tr1(MC['uyum']), str(MC['trials']) + ' denemelik simülasyon, formülle uyumlu')]
cw4 = (W - 2 * M - 12 * mm) / 4
for i, (v, l) in enumerate(kan):
    chipK(M + i * (cw4 + 4 * mm), y - 20 * mm, cw4, 16.5 * mm, v, l, INK)
y -= 28 * mm

yaz(M, y, 'ÇÖZÜM: ÜÇ KATMAN, SALT OKUNUR MİMARİ (KAYNAKLARA YAZILMAZ)', 'Mono', 8, TEAL)
katman = [('1 · GÖRÜNÜRLÜK', 'Tek komponent kaydı ve envanter sermayesinin tek ekrandan izlenmesi. Gerçek tedarik süreleri olaylardan ölçülür. İlk gün değeri, stoğu biten 72 parçanın yakalanması. Sonraki faza geçiş veri kalitesine bağlı.'),
          ('2 · ÖNGÖRÜ', 'Segmentli tahmin, kesikli talep yöntemleri, aralık projeksiyonu ve geçmişi olmayan parça tahmini. Öneri modunda çalışır, doğruluk ve kabul oranı eşiğiyle ilerler.'),
          ('3 · AKSİYON', 'Stoğu riske giren parçada zorunlu aksiyon, süre ve maliyete göre sıralanan seçenekler, tamir kararı motoru, emekli filo tetikleri ve havuz koordinasyonu. Kriz planı önceden hazır.')]
yy = y - 5 * mm
for b, t in katman:
    yaz(M, yy, b, 'ArB', 8.6, INK)
    n = yaz(M + 38 * mm, yy, t, 'Ar', 8.4, MUT, mak=W - M - (M + 38 * mm))
    yy -= n * 10.4 + 2.6 * mm
y = yy - 2 * mm

yaz(M, y, 'BAŞARI ÖLÇÜTLERİ', 'Mono', 8, TEAL)
yaz(M, y - 5 * mm, "Yerde bekleyen uçak oranı düşer (ana ölçüt)  ·  siparişsiz kırmızı " + str(K['siparissiz']) +
    ' → 0  ·  kritik parça karşılama %97-98 üstü  ·  erken yakalama artar  ·  tahmin doğruluğu ve öneri kabulü faz kapısı  ·  bağlı sermaye sınırı',
    'Ar', 8.6, INK, mak=W - 2 * M)
y -= 16 * mm
yaz(M, y, 'CANLI DEMO AKIŞI (~6 DAKİKA)', 'Mono', 8, TEAL)
demo = [('1', 'Karar merkezi. 5.000 parça tek kural dizisinden geçer, her biri tek kanala düşer; pencere alarmında sipariş tarihi kaçmış 42 parça.'),
        ('2', 'Watchlist. Sıralamanın birincisi PN-101741 sahada gerçekten riskli. Yanında ne yapılacağı süre ve maliyetle sıralı.'),
        ('3', 'Öngörü ve AI. Segmentasyon, tahmin gezgini, cold-start tahmini ve geriye dönük test, binde 4 hata.'),
        ('4', 'Harita. Türkiye 16 havalimanı ve İstanbul merkezli küresel ağ. Kriz etkisi harita üzerinde.'),
        ('5', 'Senaryo. Motor ailesi krizi tek tıkla: riskli parça 134\'ten 477\'ye çıkıyor.'),
        ('6', 'Model parametreleri. Ağırlık, BER ve tampon kaydırıcıları oynatılınca sayılar anında yeniden hesaplanıyor.'),
        ('7', 'Kapanış. Kabiliyet yatırımı yılda ' + tr1(K['kab_tasarruf']) + ' M$ getiriyor.')]
yy = y - 5.4 * mm
for no, t in demo:
    c.setFillColor(TEAL); c.setFont('Mono', 8.6); c.drawString(M, yy, no)
    n = yaz(M + 6 * mm, yy, t, 'Ar', 8.6, INK, mak=W - M - (M + 6 * mm))
    yy -= n * 10.6 + 1.8 * mm

c.setFont('Mono', 7); c.setFillColor(DIM)
c.drawString(M, 12 * mm, 'Tüm veriler sentetik ve temsilî case setleridir. Her sayı koddan yeniden üretilebilir. Demo tek dosya, internet gerektirmez.')
c.showPage()

# ============================ SAYFA 2 · JÜRİ S&C ============================
c.setFillColor(TEAL); c.rect(M, H - 18 * mm, 2.6 * mm, 2.6 * mm, stroke=0, fill=1)
yaz(M + 4.4 * mm, H - 17.6 * mm, 'JÜRİ SORULARINA HAZIR CEVAPLAR', 'Mono', 7.8, TEAL)
yaz(M, H - 26 * mm, 'Sorarsanız, cevabımız hazır', 'ArB', 17, INK)
sc = [
 ('“Envanter zaten dengede, çözdüğünüz problem ne?”',
  'Adetler kabaca yerinde, fazla ve ölü stok toplamı sadece 0,4 M$. Ama bu denge kör. ' + str(K['siparissiz']) + ' parça aylardır stoğu bitecek durumda ve siparişi yok, çünkü bunu hesaplayan bir süreç yok. Bugün elle tutulan bu denge, %67 büyüme ve talep kaymasıyla tutmaz.'),
 ('“Paranın karşılığı nerede?”',
  'Üç kalemde. Yılda ' + tr1(K['scrap']) + ' M$ hurda ikamesi, ' + tr1(K['float_fmv']) + ' M$ tamir döngüsü sermayesi ve ' + tr1(K['phaseout']) + ' M$ emekli filo stoğu. Ayrıca kabiliyet yatırımı yılda ' + tr1(K['kab_tasarruf']) + ' M$ tasarruf ve ' + tr1(K['kab_sermaye']) + ' M$ serbesti getiriyor.'),
 ('“Neden daha çok stok almıyorsunuz?”',
  'Açığı kapatmak ' + tr1(K['kapatma']) + ' M$. Sorun adet değil, süre ve bilgi. Satın alma kuyruğu 270 güne uzayabiliyor. Körlemesine stok 2033\'te ' + tr1(K['float_33']) + ' M$ rafta bekleyen sermaye demek. Aynı servisi, tedarik süresini kısaltıp talebi önceden görerek daha az sermayeyle sağlıyoruz.'),
 ('“AMOS ve TRAX varken farkınız ne?”',
  'Onlar kayıt sistemi, biz karar katmanıyız. Mevcut sistemleri sadece okuruz, hiçbirine yazmayız. ' + str(K['siparissiz']) + ' siparişsiz parça, eksik olan bu katmanın ölçülmüş hâlidir.'),
 ('“Yeni nesil parçaların geçmişi yok, tahmin neye dayanıyor?”',
  'Tahmini benzer parçalardan başlatıyoruz, gerçek veri geldikçe modeli düzeltiyoruz. 2033 talebinin yaklaşık %65\'i bu parçalarda olduğu için bu ana senaryomuz. Dashboard\'da canlı demosu var.'),
 ('“Projeksiyonlar güvenilir mi?”',
  'Tek bir nokta değil, %63 ile %68 arası bir aralık veriyoruz. THY ile pool arasındaki 3,6 katlık farkı da veri anomalisi olarak işaretledik. Geriye dönük kontroller: float %97 tuttu, sıralamanın birincisi sahada riskli, geri test binde 4 hata, simülasyon uyumu %' + tr1(MC['uyum']) + '.'),
 ('“Kriz hazırlığı somut olarak ne?”',
  'Kriz bizim için bir ayar değişikliği. Ya stoğun dayanma süresi kısalır ya tedarik süresi uzar. Senaryo kütüphanesi ve tek tık stres testiyle deniyoruz. Motor krizinde riskli parça 134\'ten 477\'ye çıkıyor, simülasyon aynı senaryoda ' + tr0(MC['motor']['acik_ort']) + ' parça diyor. Kriz planı önceden yazılı, her çeyrek prova ediliyor.'),
 ('“Neden en riskli birkaç parçaya odaklanmıyorsunuz?”',
  'Adette az sayıda parça öne çıkmıyor, en çok talep gören 20 parça talebin sadece %5,3\'ü. O yüzden kapsamı otomasyonla geniş tutuyoruz. Değerde ise 500 parça değerin %67\'sini taşıyor, sermayeyi bu dar listeyle yönetiyoruz. İki ayrı liste, iki ayrı strateji.'),
]
yy = H - 34 * mm
for q, a in sc:
    n1 = yaz(M, yy, q, 'ArB', 9.2, INK, mak=W - 2 * M); yy -= n1 * 11.2 + 1.2 * mm
    n2 = yaz(M, yy, a, 'Ar', 8.6, MUT, mak=W - 2 * M); yy -= n2 * 10.6 + 4.2 * mm
c.setFont('Mono', 7); c.setFillColor(DIM)
c.drawString(M, 12 * mm, 'Catalyst · Grup 9 · tüm sayılar üç resmi veri setinden hesaplanır. Kabiliyet tasarrufu 12,1 M$/yıl.')
c.save()
print('✓ catalyst_el_notu.pdf yazıldı')
