# -*- coding: utf-8 -*-
"""catalyst.html'in sekmelerinden ODAKLI ekran görüntüleri alır (S4 kartları için).
Tüm ekran değil, her sekmenin en önemli bloğu kadraja alınır (ör. Harita'da Türkiye
haritasının kendisi). Kadraj, S4 kart çerçevesinin en-boy oranına (3,90"×2,06")
oturtulur, böylece gömülürken bozulmaz. Tamamen başsız — ekranda pencere açılmaz.
    uv run --with playwright playwright install chromium
    uv run --with playwright python make_shots.py
Çıktı: shots/*.png. fill_sablon.py bunları kart çerçevelerine gömer (dosya yoksa atlar)."""
import os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.abspath(os.path.join(HERE, '..', 'catalyst.html'))
OUT = os.path.join(HERE, 'shots')
os.makedirs(OUT, exist_ok=True)
URL = 'file://' + HTML
W, H = 1600, 1000
ORAN = 3.90 / 2.06        # S4 kart çerçevesi
UST = 64                  # sabit üst bar; kadraj bunun altında kalsın

# (sekme, çıktı adı, hedef seçiciler, hiza) — 'seçici||üstKapsayıcı' closest() demektir,
# birden çok seçici verilirse kadraj birleşimdir. hiza: en genişletilirken hangi kenar sabit
# kalsın ('l' sol, 'r' sağ, 'c' orta) — komşu kartı ortasından kesmemek için.
SHOTS = [
    ('kokpit',  'kokpit',   ['#v-kokpit .callout.red', '#v-kokpit .grid.auto'], 'c'),  # kör nokta + KPI şeridi
    ('watch',   'watch',    ['#v-watch .card'],                                 'c'),  # filtreler + risk tablosu
    ('ongoru',  'ongoru',   ['#cBant||.card', '#cKat||.card'],                  'c'),  # 2033 bandı · göç · kategori
    ('harita',  'harita',   ['svgfit:#hSvg'],                                   'c'),  # Türkiye haritasının çizili alanı
    ('senaryo', 'senaryo',  ['#scK', '#cScen'],                                 'l'),  # kriz KPI şeridi + etki grafiği
    ('ongoru',  'cekirdek', ['#cBt||.grid'],                                    'c'),  # geri test + doğrulama bloğu
]

JS_UNION = """(items) => {
  const boxes = items.map(s => {
    if (s.startsWith('svgfit:')) {         // svg'nin letterbox'ı değil, çizili içerik alanı
      const el = document.querySelector(s.slice(7));
      if (!el) return null;
      const b = el.getBoundingClientRect(), vb = el.viewBox.baseVal;
      const sc = Math.min(b.width / vb.width, b.height / vb.height);
      const w = vb.width * sc, h = vb.height * sc;
      const l = b.left + (b.width - w) / 2, t = b.top + (b.height - h) / 2;
      return {l: l, t: t, r: l + w, b2: t + h};
    }
    const [q, up] = s.split('||');
    let el = document.querySelector(q);
    if (!el) return null;
    if (up) el = el.closest(up) || el;
    const b = el.getBoundingClientRect();
    return {l: b.left, t: b.top, r: b.right, b2: b.bottom};
  }).filter(Boolean);
  const l = Math.min(...boxes.map(b => b.l)), t = Math.min(...boxes.map(b => b.t));
  const r = Math.max(...boxes.map(b => b.r)), b2 = Math.max(...boxes.map(b => b.b2));
  return {x: l, y: t, w: r - l, h: b2 - t};
}"""


def kadraj(r, hiza='c'):
    """Birleşim kutusunu 12px payla büyüt, kart oranına oturt, görünür alana kıstır."""
    x, y, w, h = r['x'] - 12, r['y'] - 12, r['w'] + 24, r['h'] + 24
    if w / h > ORAN:                       # fazla yatay → boy ekle
        ek = w / ORAN - h
        y -= ek / 2; h += ek
    else:                                  # fazla dikey → en ekle (hizaya göre tek yandan)
        ek = h * ORAN - w
        if hiza == 'l':
            w += ek                        # sol kenar sabit, boşluk sağa
        elif hiza == 'r':
            x -= ek; w += ek               # sağ kenar sabit, boşluk sola
        else:
            x -= ek / 2; w += ek
    if w > W:                              # pencereye sığmıyorsa oranı koruyarak küçült
        x += (w - W) / 2; w = W;
    if h > H - UST:
        y += (h - (H - UST)) / 2; h = H - UST
    x = max(0, min(x, W - w))
    y = max(UST, min(y, H - h))
    return {'x': x, 'y': y, 'width': w, 'height': h}


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=2)
    pg.goto(URL, wait_until='load')
    pg.wait_for_timeout(1200)
    for key, name, sels, hiza in SHOTS:
        pg.click(f'.tab[data-v="{key}"]')
        pg.wait_for_timeout(1500)          # Chart.js animasyonu bitsin
        if key == 'harita':
            pg.click('#hZtr')              # dünya görünümü yerine okunaklı Türkiye kadrajı
            pg.wait_for_timeout(500)
        ilk = sels[0].split('||')[0].replace('svgfit:', '')
        pg.eval_on_selector(ilk, 'el => el.scrollIntoView({block: "center"})')
        pg.wait_for_timeout(450)
        r = pg.evaluate(JS_UNION, sels)
        pg.screenshot(path=os.path.join(OUT, name + '.png'), clip=kadraj(r, hiza))
        pg.evaluate('window.scrollTo(0, 0)')
        print('✓', name)
    b.close()
print('Ekran görüntüleri', OUT, 'altına yazıldı.')
