# -*- coding: utf-8 -*-
"""kontrol_kulesi.html'in sekmelerinden gerçek ekran görüntüleri alır (S4 kartları için).
Tamamen başsız (headless) Playwright — ekranda hiçbir pencere açılmaz, koyu tema
slaytlarla uyumlu. Tek seferlik kurulum + çalıştırma:
    uv run --with playwright playwright install chromium
    uv run --with playwright python make_shots.py
Çıktı: shots/*.png. fill_sablon.py bunları kart çerçevelerine gömer (dosya yoksa atlar)."""
import os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.abspath(os.path.join(HERE, '..', 'kontrol_kulesi.html'))
OUT = os.path.join(HERE, 'shots')
os.makedirs(OUT, exist_ok=True)
URL = 'file://' + HTML
W, HH = 1360, 720

# (sekme anahtarı, çıktı adı, kaydırma px) — kaydırma en görsel bölümü kadraja alır
SHOTS = [
    ('kokpit',  'kokpit',   185),   # KPI kartları + para kalemleri grafiği
    ('watch',   'watch',    120),   # filtreler + risk sıralı tablo
    ('ongoru',  'ongoru',   120),   # talep projeksiyonu
    ('harita',  'harita',   120),   # etkileşimli ağ haritası
    ('senaryo', 'senaryo',  120),   # kriz senaryosu + jüri modu
    ('ongoru',  'cekirdek', 900),   # geri test / doğrulama bölümü
]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': W, 'height': HH}, device_scale_factor=2)
    pg.goto(URL, wait_until='load')
    pg.wait_for_timeout(1200)
    for key, name, scroll in SHOTS:
        pg.click(f'.tab[data-v="{key}"]')
        pg.wait_for_timeout(1500)          # Chart.js animasyonu bitsin
        pg.evaluate(f'window.scrollTo(0, {scroll})')
        pg.wait_for_timeout(500)
        pg.screenshot(path=os.path.join(OUT, name + '.png'),
                      clip={'x': 0, 'y': 0, 'width': W, 'height': HH})
        pg.evaluate('window.scrollTo(0, 0)')
        print('✓', name)
    b.close()
print('Ekran görüntüleri', OUT, 'altına yazıldı.')
