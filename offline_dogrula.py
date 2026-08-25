"""Tek dosyalık teslim paketini DOĞRULAR: kurulum yok, sunucu yok, internet yok.

    cd web && npm run build:tek-dosya
    uv run --with playwright python offline_dogrula.py

Neyi kanıtlar:

1. `file://` protokolüyle açılıyor — yani şirket bilgisayarında çift tıklamak yeter,
   arkada bir web sunucusu gerekmiyor.
2. Beş sekmenin hepsi içerik üretiyor ve HARİTA'daki 3D küre gerçekten çiziliyor.
   Bu adım pazarlık konusu değil: sekmeler `lazy(() => import(…))` ile yükleniyor
   ve ayrı chunk'a çıkarlarsa `file://` üstünde CORS'a takılıp sessizce açılmazlar.
   Ana sayfanın açılması bu hatayı YAKALAMAZ.
3. `file://` dışına TEK bir ağ isteği çıkmıyor. Asıl offline garantisi budur:
   projede CDN, web fontu veya telemetri yok (fontlar sistem yığınından gelir),
   olsaydı intranette bloke olur ve sayfa yarım açılırdı.
"""

import os
import sys

from playwright.sync_api import sync_playwright

KOK = os.path.dirname(os.path.abspath(__file__))
DOSYA = os.path.join(KOK, 'web', 'dist-tek-dosya', 'Catalyst.html')
SEKMELER = ['CODE', 'WATCHLIST', 'ÖNGÖRÜ & AI', 'HARİTA', 'SENARYO']


def main() -> int:
    if not os.path.exists(DOSYA):
        print(f'HATA: {DOSYA} yok. Önce: cd web && npm run build:tek-dosya')
        return 1

    boyut = os.path.getsize(DOSYA) / 1e6
    print(f'dosya : {DOSYA}  ({boyut:.1f} MB)')

    with sync_playwright() as p:
        # swiftshader: CI/başsız ortamda GPU yokken de WebGL çalışsın
        tarayici = p.chromium.launch(args=['--enable-unsafe-swiftshader', '--use-gl=swiftshader'])
        sayfa = tarayici.new_page(viewport={'width': 1500, 'height': 950})

        hatalar: list[str] = []
        dis_istekler: list[str] = []
        sayfa.on('pageerror', lambda e: hatalar.append(f'PAGEERROR: {e}'))
        sayfa.on('console', lambda m: m.type == 'error' and hatalar.append(m.text))
        sayfa.on('request', lambda r: r.url.startswith('file://') or dis_istekler.append(r.url))

        sayfa.goto('file://' + DOSYA)
        sayfa.wait_for_timeout(3000)
        # Açılış sahnesi (3D hangar) uygulamanın ÜSTÜNDE duruyor ve tıklamayı
        # yutuyor; ESC ile geçilmezse sekmelere erişilemiyor.
        sayfa.keyboard.press('Escape')
        sayfa.wait_for_timeout(1800)

        logo = sayfa.locator('.topbar-in > .thy-logo').count()
        print(f'  THY amblemi     → {logo} adet (üst barda 1 olmalı)')

        bloklar: dict[str, int] = {}
        for ad in SEKMELER:
            sayfa.locator('.tab', has_text=ad).first.click()
            sayfa.wait_for_timeout(3000)
            bloklar[ad] = sayfa.locator('.card, .code-hero, .kure').count()
            print(f'  {ad:14s} → {bloklar[ad]} blok')

        sayfa.locator('.tab', has_text='HARİTA').first.click()
        sayfa.wait_for_timeout(3500)
        tuval = sayfa.evaluate(
            "() => { const c = document.querySelector('canvas');"
            ' return c ? [c.width, c.height] : null; }'
        )
        tarayici.close()

    print(f'\n3D küre        : {tuval}')
    print(f'dış ağ isteği  : {len(dis_istekler)}')
    for u in dis_istekler[:8]:
        print('   ', u[:120])
    print(f'konsol hatası  : {len(hatalar)}')
    for h in hatalar[:8]:
        print('   ', h[:200])

    sorun = []
    if any(n == 0 for n in bloklar.values()):
        sorun.append('bazı sekmeler boş')
    if not tuval or tuval[0] < 100:
        sorun.append('3D küre çizilmedi (dinamik import tek pakete girmemiş olabilir)')
    if dis_istekler:
        sorun.append('dışarıya ağ isteği gidiyor — offline garantisi bozuk')
    if hatalar:
        sorun.append('konsol hatası var')
    if logo != 1:
        sorun.append('THY amblemi üst barda yok')

    if sorun:
        print('\nBAŞARISIZ: ' + ' · '.join(sorun))
        return 1
    print('\nTAMAM: çift tıkla açılır, kurulum ve internet gerektirmez.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
