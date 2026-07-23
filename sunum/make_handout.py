# -*- coding: utf-8 -*-
"""Jüri el notu (2 sayfa, A4, baskı dostu açık tema).
Sayfa 1: yönetici özeti — tez, üç musluk, kanıtlar, katmanlar, başarı ölçütleri.
Sayfa 2: jüri soruları için hazır cevaplar (CLAUDE.md §8, düzeltilmiş sayılarla).
Çalıştırma: uv run make_handout.py  →  kontrol_kulesi_el_notu.pdf"""
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
c = canvas.Canvas(os.path.join(HERE, 'kontrol_kulesi_el_notu.pdf'), pagesize=A4)
c.setTitle('Komponent Kontrol Kulesi — Jüri El Notu')

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
yaz(M + 4.4 * mm, H - 17.6 * mm, 'GLOBAL TALENT BRIDGE · FİLO BÜYÜR, ENVANTER HAZIR MI? · GRUP 3 — SEÇENEK D', 'Mono', 7.8, TEAL)
yaz(M, H - 27 * mm, 'Komponent Kontrol Kulesi', 'ArB', 23, INK)
yaz(M, H - 33.5 * mm, 'Uçaklar için kule var, komponentler için yok — 5.000 parça için görünürlük + öngörü + aksiyon katmanı.', 'Ar', 10, MUT)

y = H - 40 * mm
yaz(M, y, 'TEZ', 'Mono', 8, TEAL)
tez = ('Sorun stok adedi değil (fazla + ölü stok ~0,4 M$; açığı kapatmak yalnız ' + tr1(K['kapatma']) +
       ' M$), görünürlük ve süreç: bugün ' + str(K['kirmizi']) + ' parça kırmızıda — stoku, toparlanma '
       'süresinden önce bitecek — ve ' + str(K['siparissiz']) + "'sinin açık siparişi yok (11'i AOG kritik). "
       'Talep 2033 hedefinde +%' + str(round(B['alt_pct'])) + '–' + str(round(B['ust_pct'])) +
       ' bandında büyürken üçte ikisi yer değiştiriyor: yeni nesil modellerin payı %34 → %65. '
       'Büyüme yönetilebilir; kompozisyon göçü ancak veriyle yönetilir.')
n = yaz(M, y - 5 * mm, tez, 'Ar', 9.3, INK, mak=W - 2 * M)
y -= 5 * mm + n * 11.5 + 6 * mm

yaz(M, y, 'ÜÇ PARA MUSLUĞU', 'Mono', 8, TEAL)
cw = (W - 2 * M - 8 * mm) / 3
chipK(M, y - 22 * mm, cw, 18 * mm, tr1(K['scrap']) + ' M$/yıl', 'hurda ikamesi — BER kuralıyla vanaya bağlanır (2033: ' + tr1(K['scrap33']) + ' M$)', AMBER)
chipK(M + cw + 4 * mm, y - 22 * mm, cw, 18 * mm, tr1(K['float_fmv']) + ' → ' + tr1(K['float_33']) + ' M$', 'tamir döngüsü sermayesi — TAT programı + kabiliyet yatırımıyla sınırlanır', TEAL)
chipK(M + 2 * (cw + 4 * mm), y - 22 * mm, cw, 18 * mm, tr1(K['phaseout']) + ' M$', 'küçülen 4 modele bağlı stok — takvimle değil sinyalle eritilir', RED)
y -= 30 * mm

yaz(M, y, 'MODEL MAKET DEĞİL — DÖRT BAĞIMSIZ DOĞRULAMA', 'Mono', 8, TEAL)
kan = [('%97', 'float formülü sahada: ' + tr0(K['float_adet']) + ' tahmin ↔ ' + tr0(K['tamirde']) + ' gerçek'),
       ('1 numara', 'risk skoru birincisi (PN-101741) gerçek stokta fiilen kırmızı'),
       ('%0,4', 'geriye dönük test: görülmeyen çeyreğin toplamı binde 4 hata ile'),
       ('%' + tr1(MC['uyum']), str(MC['trials']) + ' denemelik Monte Carlo, kapalı formla uyum')]
cw4 = (W - 2 * M - 12 * mm) / 4
for i, (v, l) in enumerate(kan):
    chipK(M + i * (cw4 + 4 * mm), y - 20 * mm, cw4, 16.5 * mm, v, l, INK)
y -= 28 * mm

yaz(M, y, 'ÇÖZÜM — ÜÇ KATMAN, SALT-OKUNUR MİMARİ (AMOS/TRAX DEĞİŞMEZ, GERİ YAZMA YOK)', 'Mono', 8, TEAL)
katman = [('1 · GÖRÜNÜRLÜK (Faz 1)', 'Olay-kaynaklı tek komponent kaydı; gerçek TAT olay farkından; sermaye kokpiti. İlk gün değeri: 72 siparişsiz kırmızının yakalanması. Kapı: veri kalitesi puanı.'),
          ('2 · ÖNGÖRÜ (Faz 2)', 'ABC×XYZ segmentasyonu; Croston/SBA + Poisson emniyet stoğu; bant projeksiyonu; cold-start (analog + Bayes). Öneri modu — kapı: MAPE + kabul oranı.'),
          ('3 · AKSİYON (Faz 2–3)', 'TTS<TTR alarmı → zorunlu aksiyon; eskalasyon merdiveni süre+maliyetle; BER motoru; phase-out tetikleri; pool koordinasyonu; kriz playbook + çeyreklik war-game.')]
yy = y - 5 * mm
for b, t in katman:
    yaz(M, yy, b, 'ArB', 8.6, INK)
    n = yaz(M + 38 * mm, yy, t, 'Ar', 8.4, MUT, mak=W - M - (M + 38 * mm))
    yy -= n * 10.4 + 2.6 * mm
y = yy - 2 * mm

yaz(M, y, 'BAŞARI ÖLÇÜTLERİ', 'Mono', 8, TEAL)
yaz(M, y - 5 * mm, "AOG'da bekleyen uçak oranı ↓ (ana metrik)  ·  siparişsiz kırmızı " + str(K['siparissiz']) +
    ' → 0  ·  kritik karşılama ≥ %97–98  ·  erken yakalama ↑  ·  MAPE + öneri kabulü (faz kapıları)  ·  bağlı sermaye guard-rail',
    'Ar', 8.6, INK, mak=W - 2 * M)
y -= 16 * mm
yaz(M, y, 'CANLI DEMO AKIŞI (~6 DAKİKA)', 'Mono', 8, TEAL)
demo = [('1', 'Kokpit — 132,9 M$ sermaye fotoğrafı; vurgu kartı: "72 kırmızı PN, siparişsiz — 11 AOG kritik".'),
        ('2', 'Watchlist — skor birincisi PN-101741: sahada gerçekten kırmızı; aksiyon merdiveni süre+maliyetle sıralı.'),
        ('3', 'Öngörü & AI — ABC×XYZ, tahmin gezgini, cold-start canlı Bayes demosu, geriye dönük test (%0,4).'),
        ('4', 'Harita — Türkiye 16 havalimanı + İstanbul merkezli küresel ağ (9 hub); kriz katmanı.'),
        ('5', 'Senaryo — motor ailesi krizi tek tıkla: kırmızı 134 → 477; Monte Carlo bandı ekranda.'),
        ('6', 'Jüri modu — kritiklik ağırlığı/BER/tampon kaydırıcıları: sayılar tarayıcıda anında yeniden hesaplanır.'),
        ('7', 'Kapanış — kabiliyet ROI: ' + tr1(K['kab_tasarruf']) + ' M$/yıl + ' + tr1(K['kab_sermaye']) + ' M$; "yazılım ekranı değil, yatırım kararı".')]
yy = y - 5.4 * mm
for no, t in demo:
    c.setFillColor(TEAL); c.setFont('Mono', 8.6); c.drawString(M, yy, no)
    n = yaz(M + 6 * mm, yy, t, 'Ar', 8.6, INK, mak=W - M - (M + 6 * mm))
    yy -= n * 10.6 + 1.8 * mm

c.setFont('Mono', 7); c.setFillColor(DIM)
c.drawString(M, 12 * mm, 'Tüm veriler sentetik / temsili resmi case setleridir. Her sayı core.py ile yeniden üretilebilir; demo tek HTML, internetsiz.')
c.showPage()

# ============================ SAYFA 2 · JÜRİ S&C ============================
c.setFillColor(TEAL); c.rect(M, H - 18 * mm, 2.6 * mm, 2.6 * mm, stroke=0, fill=1)
yaz(M + 4.4 * mm, H - 17.6 * mm, 'JÜRİ SORULARINA HAZIR CEVAPLAR', 'Mono', 7.8, TEAL)
yaz(M, H - 26 * mm, 'Sorarsanız, cevabımız hazır', 'ArB', 17, INK)
sc = [
 ('“Envanter zaten dengede; çözdüğünüz problem ne?”',
  'Doğru — adetler kabaca yerinde (fazla+ölü ~0,4 M$). Ama denge kör: 72 parça aylardır alarm koşulunda ve siparişi yok; alarmı hesaplayan süreç yok. 1.200 uçakta el yordamıyla tutan denge, %67 büyüme ve %65 talep göçüyle tutmaz.'),
 ('“Paranın karşılığı nerede?”',
  'Üç muslukta: ' + tr1(K['scrap']) + ' M$/yıl hurda ikamesi (BER kuralıyla), ' + tr1(K['float_fmv']) + '→' + tr1(K['float_33']) + ' M$ tamir döngüsü sermayesi (TAT programıyla), ' + tr1(K['phaseout']) + ' M$ phase-out stoğu (sinyalle eritme). Ek: kabiliyet yatırımı ' + tr1(K['kab_tasarruf']) + ' M$/yıl + ' + tr1(K['kab_sermaye']) + ' M$ serbesti.'),
 ('“Neden daha çok stok almıyorsunuz?”',
  'Açık ' + tr1(K['kapatma']) + ' M$ ile kapanır; sorun adet değil süre (satın alma kuyruğu 270 güne uzuyor) ve bilgi. Kör stok 2033’te ' + tr1(K['float_33']) + ' M$ raf demek; aynı servisi daha az sermayeyle TAT kısaltıp önceden görerek sağlıyoruz.'),
 ('“AMOS/TRAX varken farkınız ne?”',
  'Onlar kayıt, biz karar katmanıyız: CDC ile yalnız okuruz, hiçbir kaynağa yazmayız. 72 siparişsiz kırmızı, eksik katmanın ölçülmüş hâlidir.'),
 ('“Yeni nesil parçaların geçmişi yok; tahmin neye dayanır?”',
  'Cold-start modülüne: analog grup önceli + üretici MTBUR, gözlem geldikçe Bayes güncellemesi. 2033 talebinin ~%65’i bu parçalarda — ana senaryomuz bu; dashboard’da canlı demosu var.'),
 ('“Projeksiyonlar güvenilir mi?”',
  'Bant veriyoruz (+%63–68), nokta değil; 3,6× THY/pool anomalisini raporlayıp mentora sorduk. Geriye dönük kanıt: float %97, skor birincisi sahada kırmızı, backtest %0,4, Monte Carlo uyumu %' + tr1(MC['uyum']) + '.'),
 ('“Kriz hazırlığı somut olarak ne?”',
  'Kriz = parametre şoku (TTS kısalır / TTR uzar). Senaryo kütüphanesi + tek tık stres testi: motor krizinde kırmızı 134→477; Monte Carlo aynı senaryoda ' + tr0(MC['motor']['acik_ort']) + ' PN / ' + tr1(MC['motor']['ek_ort']) + ' M$ diyor. Playbook önceden yazılır; çeyreklik war-game.'),
 ('“Neden top-N’e odaklanmıyorsunuz?”',
  'Adette Pareto yok (ilk 20 PN talebin %5,3’ü) — kapsam otomasyonla geniş tutulur. Değerde Pareto var (ilk 500 PN değerin %67’si) — sermaye dar listeyle yönetilir. İki ayrı liste stratejisi.'),
]
yy = H - 34 * mm
for q, a in sc:
    n1 = yaz(M, yy, q, 'ArB', 9.2, INK, mak=W - 2 * M); yy -= n1 * 11.2 + 1.2 * mm
    n2 = yaz(M, yy, a, 'Ar', 8.6, MUT, mak=W - 2 * M); yy -= n2 * 10.6 + 4.2 * mm
c.setFont('Mono', 7); c.setFillColor(DIM)
c.drawString(M, 12 * mm, 'Kontrol Kulesi · Grup 3 · tüm sayılar üç resmi CSV’den; kabiliyet tasarrufu $12,1M/yıl (doküman içi 12,2 yuvarlaması düzeltildi).')
c.save()
print('✓ kontrol_kulesi_el_notu.pdf yazıldı')
