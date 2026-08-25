# -*- coding: utf-8 -*-
"""Sunum slaytları için marka renkli, şeffaf zeminli grafikler üretir.
Veri kaynağı deck_data.json — fill_sablon.py ile aynı dosya, sayılar slayt metniyle birebir.
Çıktı figsize'ları slayttaki yerleşim ölçüsüyle (inç) aynıdır; fill_sablon.py resmi
add_picture ile bozulmadan aynı ölçüde gömer.
Çalıştırma: uv run make_charts.py → charts/*.png"""
import json, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'deck_data.json'), encoding='utf-8'))
OUT = os.path.join(HERE, 'charts')
os.makedirs(OUT, exist_ok=True)

# Marka paleti (fill_sablon.py ile uyumlu)
PEMBE = '#E85BD0'   # neon vurgu / kritik
AMBER = '#F2B34C'   # uyarı / bugünkü durum
LILA  = '#CBBCE6'   # gövde metni
SOLUK = '#9C8AC0'   # ikincil / nötr seri
BEYAZ = '#FFFFFF'
MOR   = '#8A63C4'   # ara ton
NANE  = '#5CD6BE'   # hedef / iyi durum
CIZGI = '#6C4795'   # eksen / ızgara

plt.rcParams.update({
    'font.family': 'DejaVu Sans',   # Türkçe glifleri (İ ğ ş ç ü ö ı) tam destekler
    'font.size': 13,
    'text.color': LILA,
    'axes.labelcolor': LILA,
    'xtick.color': LILA,
    'ytick.color': LILA,
    'figure.dpi': 200,
})


def tr(v, d=0):
    """Türkçe sayı biçimi: 1.791 / 67,8"""
    return f'{v:,.{d}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def style(ax, ygrid=True):
    ax.set_facecolor('none')
    for sp in ('top', 'right'):
        ax.spines[sp].set_visible(False)
    for sp in ('left', 'bottom'):
        ax.spines[sp].set_color(CIZGI)
        ax.spines[sp].set_linewidth(1.0)
    ax.tick_params(length=0)
    if ygrid:
        ax.grid(axis='y', color=CIZGI, alpha=0.30, lw=0.8)
    ax.set_axisbelow(True)


def baslik(ax, metin):
    ax.set_title(metin, loc='left', color=BEYAZ, fontsize=13.5, fontweight='bold', pad=12)


def save(fig, name):
    fig.patch.set_alpha(0)
    fig.savefig(os.path.join(OUT, name), transparent=True)
    plt.close(fig)
    print('✓', name)


# ─────────────────────────────────────────────────────────────────────────
# S2 · Talep göçü — hem büyüyor hem yer değiştiriyor (yığılı çubuk)
# ─────────────────────────────────────────────────────────────────────────
def goc():
    g = D['goc']
    onceki = [g['kucul25'] / 1000, g['kucul33'] / 1000]
    diger  = [g['diger25'] / 1000, g['diger33'] / 1000]
    yeni   = [g['yeni25'] / 1000,  g['yeni33'] / 1000]
    x = [0, 1]
    fig, ax = plt.subplots(figsize=(9.0, 4.2), constrained_layout=True)
    style(ax)
    w = 0.5
    ax.bar(x, onceki, w, color=SOLUK, label='Önceki nesil modeller')
    ax.bar(x, diger, w, bottom=onceki, color=MOR, label='Diğer modeller')
    alt = [a + b for a, b in zip(onceki, diger)]
    ax.bar(x, yeni, w, bottom=alt, color=PEMBE, label='Yeni nesil (geçmiş verisi yok)')

    for i in range(2):
        tot = onceki[i] + diger[i] + yeni[i]
        pay = 100 * yeni[i] / tot
        ax.text(x[i], alt[i] + yeni[i] / 2, f'%{tr(pay)}', ha='center', va='center',
                color=BEYAZ, fontsize=17, fontweight='bold')
        ax.text(x[i], tot + 3.5, f'{tr(tot, 1)} bin', ha='center', color=LILA, fontsize=12.5)

    # Sade tutuldu: çubuk yüksekliği büyümeyi, büyüyen pembe pay göçü zaten anlatıyor.
    ax.set_xticks(x)
    ax.set_xticklabels(['2025', '2033'], fontsize=16, color=BEYAZ, fontweight='bold')
    ax.set_ylabel('yıllık talep (bin adet)')
    ax.set_ylim(0, 172)
    ax.set_yticks([0, 50, 100, 150])
    ax.legend(loc='upper left', frameon=False, fontsize=11.5, labelcolor=LILA,
              handlelength=1.1, borderpad=0.2)
    baslik(ax, 'Talep hem büyüyor hem de yeni parçalara kayıyor')
    save(fig, 's2_goc.png')


# ─────────────────────────────────────────────────────────────────────────
# S6 · üç dar sütun için üç küçük çubuk
# ─────────────────────────────────────────────────────────────────────────
def taps():
    k = D['kpi']
    vals = [k['scrap'], k['float_fmv'], k['phaseout']]   # 67.8 / 23.3 / 52.0
    labels = ['Hurda\nkurtarma', 'Tamir\ndöngüsü', 'Emekli filo\nstoğu']
    colors = [AMBER, MOR, PEMBE]
    fig, ax = plt.subplots(figsize=(5.5, 3.4), constrained_layout=True)
    style(ax)
    ax.bar(range(3), vals, 0.58, color=colors)
    for i, v in enumerate(vals):
        ax.text(i, v + 1.5, tr(v, 1), ha='center', color=BEYAZ, fontsize=13.5, fontweight='bold')
    ax.set_xticks(range(3))
    ax.set_xticklabels(labels, fontsize=11.5, color=LILA)
    ax.set_ylim(0, 80)
    ax.set_yticks([0, 25, 50, 75])
    ax.set_ylabel('M$ / yıl')
    baslik(ax, 'Üç büyük tasarruf kalemi')
    save(fig, 's6_taps.png')


def kriz():
    k = D['kpi']
    vals = [k['kirmizi'], D['motor_kirmizi']]   # 134 → 477
    fig, ax = plt.subplots(figsize=(5.5, 3.4), constrained_layout=True)
    style(ax)
    bars = ax.bar([0, 1], vals, 0.52, color=[AMBER, PEMBE])
    for i, v in enumerate(vals):
        ax.text(i, v + 12, tr(v), ha='center', color=BEYAZ, fontsize=15, fontweight='bold')
    ax.annotate('×3,6', xy=(1, vals[1]), xytext=(0.5, 300), ha='center',
                color=BEYAZ, fontsize=13, fontweight='bold',
                arrowprops=dict(arrowstyle='-|>', color=SOLUK, lw=1.4))
    ax.set_xticks([0, 1])
    ax.set_xticklabels(['Bugün', 'Motor\nailesi krizi'], fontsize=12, color=LILA)
    ax.set_ylim(0, 560)
    ax.set_yticks([0, 200, 400])
    ax.set_ylabel('kırmızı liste (parça)')
    baslik(ax, 'Kriz kırmızı listeyi 3,6 katına çıkarır')
    save(fig, 's6_kriz.png')


def basari():
    k = D['kpi']
    fig, ax = plt.subplots(figsize=(5.3, 3.4), constrained_layout=True)
    style(ax)
    ax.bar([0], [k['siparissiz']], 0.5, color=AMBER)
    ax.text(0, k['siparissiz'] + 2.5, tr(k['siparissiz']), ha='center',
            color=BEYAZ, fontsize=15, fontweight='bold')
    ax.scatter([1], [0], s=120, color=NANE, zorder=5)
    ax.text(1, 5.5, '0', ha='center', color=NANE, fontsize=15, fontweight='bold')
    ax.annotate('', xy=(0.94, 3), xytext=(0.08, k['siparissiz'] - 4),
                arrowprops=dict(arrowstyle='-|>', color=SOLUK, lw=1.4,
                                connectionstyle='arc3,rad=-0.2'))
    ax.set_xticks([0, 1])
    ax.set_xticklabels(['Bugün', 'Hedef'], fontsize=12, color=LILA)
    ax.set_xlim(-0.6, 1.6)
    ax.set_ylim(0, 82)
    ax.set_yticks([0, 25, 50, 75])
    ax.set_ylabel('siparişsiz kritik parça')
    baslik(ax, 'Siparişsiz kritik parça sıfıra iner')
    save(fig, 's6_basari.png')


if __name__ == '__main__':
    goc()
    taps()
    kriz()
    basari()
    print('Tüm grafikler', OUT, 'altına yazıldı.')
