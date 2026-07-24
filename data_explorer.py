# -*- coding: utf-8 -*-
"""Catalyst — İç Veri Gezgini (PyQt6)

Sunum için DEĞİL, ekibin elindeki veriyi hızlıca kurcalaması için masaüstü araç.
Dört veri seti: core.build() türetilmiş PN tablosu + üç ham CSV. Filtrele, grafikle,
sırala, tekil PN'e in. Sayılar catalyst.html ile aynı çekirdekten (core.py) gelir.

Çalıştırma:
    uv run --group gui python data_explorer.py
Başsız kendi kendine test (pencere açmaz):
    QT_QPA_PLATFORM=offscreen uv run --group gui python data_explorer.py --selftest
"""
import os
import sys

os.environ.setdefault('QT_API', 'PyQt6')   # matplotlib QtAgg bağlamasını sabitle

import numpy as np
import pandas as pd
from PyQt6 import QtCore, QtGui, QtWidgets
import matplotlib
matplotlib.use('QtAgg')
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg, NavigationToolbar2QT
from matplotlib.figure import Figure

import core

Qt = QtCore.Qt
YOK = '(yok)'
SAYI = '(satır sayısı)'
CHART_TYPES = ['Histogram', 'Çubuk (kategoriye göre)', 'Dağılım (scatter)',
               'Kutu (box)', 'Zaman serisi (çeyreklik)']
AGGS = {'toplam': 'sum', 'ortalama': 'mean', 'medyan': 'median',
        'en büyük': 'max', 'sayı': 'count'}

# Koyu tema — göz yormasın
matplotlib.rcParams.update({
    'figure.facecolor': '#1b2233', 'axes.facecolor': '#1b2233',
    'axes.edgecolor': '#3a4560', 'axes.labelcolor': '#c7d0e0',
    'text.color': '#c7d0e0', 'xtick.color': '#9aa8c0', 'ytick.color': '#9aa8c0',
    'axes.grid': True, 'grid.color': '#2a3347', 'grid.linewidth': 0.6,
    'figure.autolayout': True, 'font.size': 9,
})
PAL = ['#4FC1B0', '#E85BD0', '#F2B34C', '#8A63C4', '#5B8DEF', '#E0685F',
       '#63C46A', '#C4A15B', '#B063C4', '#5BC4E8', '#C45B7A', '#8AC45B']


# ─────────────────────────────────────────────────────────────────────────
def load_datasets():
    """Dört veri seti + çeyreklik ham (PN drill-down için ayrıca saklanır)."""
    c, fleet, meta = core.build()
    q, fleet_raw, inv = core.load()
    q = q.copy()
    q['TOPLAM'] = q['THY_TALEP_ADET'] + q['POOL_TALEP_ADET']
    core_df = c.reset_index()   # PN indeksi sütun olsun
    sets = {
        'Çekirdek — PN × türetilmiş (76 sütun)': core_df,
        'Çeyreklik ham veri (PN × çeyrek)': q,
        'Envanter ham veri (PN)': inv,
        'Filo dağılımı (model)': fleet_raw,
    }
    return sets, q


def numeric_cols(df):
    return list(df.select_dtypes(include='number').columns)


def group_cols(df):
    """Kategori ekseni: metin/bool sütunlar + az kardinaliteli sayısal (ör. ATA_CHAPTER)."""
    out = []
    for col in df.columns:
        s = df[col]
        if s.dtype == object or s.dtype == bool:
            out.append(col)
        elif np.issubdtype(s.dtype, np.number) and s.nunique(dropna=True) <= 30:
            out.append(col)
    return out


def filter_cols(df):
    """Filtre için elverişli düşük kardinaliteli sütunlar (PN gibi eşsizler hariç)."""
    out = []
    for col in df.columns:
        s = df[col]
        n = s.nunique(dropna=True)
        if col == 'PN':
            continue
        if s.dtype == bool or (n <= 60 and (s.dtype == object or np.issubdtype(s.dtype, np.number))):
            out.append(col)
    return out


def clean_num(s):
    return pd.to_numeric(s, errors='coerce').replace([np.inf, -np.inf], np.nan)


# ─────────────────────────────────────────────────────────────────────────
class PandasModel(QtCore.QAbstractTableModel):
    """Salt-okunur, sıralanabilir pandas tablo modeli."""

    def __init__(self, df=pd.DataFrame()):
        super().__init__()
        self._df = df

    def set_df(self, df):
        self.beginResetModel()
        self._df = df
        self.endResetModel()

    def rowCount(self, parent=QtCore.QModelIndex()):
        return 0 if parent.isValid() else len(self._df)

    def columnCount(self, parent=QtCore.QModelIndex()):
        return 0 if parent.isValid() else self._df.shape[1]

    def headerData(self, sec, orient, role=Qt.ItemDataRole.DisplayRole):
        if role != Qt.ItemDataRole.DisplayRole:
            return None
        if orient == Qt.Orientation.Horizontal:
            return str(self._df.columns[sec])
        return str(self._df.index[sec])

    def data(self, index, role=Qt.ItemDataRole.DisplayRole):
        if not index.isValid():
            return None
        v = self._df.iat[index.row(), index.column()]
        if role == Qt.ItemDataRole.DisplayRole:
            return self._fmt(v)
        if role == Qt.ItemDataRole.TextAlignmentRole and isinstance(v, (int, float, np.number)) and not isinstance(v, bool):
            return int(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        if role == Qt.ItemDataRole.ForegroundRole and isinstance(v, (bool, np.bool_)):
            return QtGui.QBrush(QtGui.QColor('#4FC1B0' if v else '#6b7488'))
        return None

    @staticmethod
    def _fmt(v):
        if isinstance(v, (bool, np.bool_)):
            return '✓' if v else '·'
        if isinstance(v, (float, np.floating)):
            if not np.isfinite(v):
                return '∞' if v > 0 else ('-∞' if v < 0 else '—')
            if abs(v - round(v)) < 1e-9 and abs(v) < 1e15:
                return f'{int(round(v)):,}'.replace(',', '.')
            return f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return ''
        return str(v)

    def sort(self, col, order=Qt.SortOrder.AscendingOrder):
        if self._df.empty:
            return
        name = self._df.columns[col]
        self.layoutAboutToBeChanged.emit()
        self._df = self._df.sort_values(
            name, ascending=(order == Qt.SortOrder.AscendingOrder),
            kind='mergesort', na_position='last')
        self.layoutChanged.emit()

    def row_dict(self, r):
        return self._df.iloc[r]


# ─────────────────────────────────────────────────────────────────────────
class MainWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Catalyst — İç Veri Gezgini')
        self.resize(1360, 840)
        self.datasets, self.quarterly = load_datasets()
        self.filtered = pd.DataFrame()

        # --- sol kontrol paneli ------------------------------------------
        panel = QtWidgets.QWidget()
        pl = QtWidgets.QVBoxLayout(panel)
        pl.setContentsMargins(10, 10, 10, 10)
        pl.setSpacing(7)

        self.ds_combo = QtWidgets.QComboBox()
        self.ds_combo.addItems(self.datasets.keys())
        pl.addWidget(QtWidgets.QLabel('Veri seti'))
        pl.addWidget(self.ds_combo)

        self.search = QtWidgets.QLineEdit()
        self.search.setPlaceholderText('PN / metin ara…')
        pl.addWidget(self.search)

        pl.addWidget(self._sep('Filtreler'))
        self.filter_rows = []
        for _ in range(3):
            row = QtWidgets.QHBoxLayout()
            col = QtWidgets.QComboBox()
            val = QtWidgets.QComboBox()
            col.currentIndexChanged.connect(lambda _i, c=col, v=val: self._fill_values(c, v))
            col.currentIndexChanged.connect(self.apply_filters)
            val.currentIndexChanged.connect(self.apply_filters)
            row.addWidget(col, 3)
            row.addWidget(val, 2)
            pl.addLayout(row)
            self.filter_rows.append((col, val))

        pl.addWidget(self._sep('Grafik'))
        self.chart_combo = QtWidgets.QComboBox()
        self.chart_combo.addItems(CHART_TYPES)
        pl.addWidget(self.chart_combo)
        self.x_combo = self._labeled(pl, 'X ekseni')
        self.y_combo = self._labeled(pl, 'Y ekseni')
        self.g_combo = self._labeled(pl, 'Grup / renk')
        self.agg_combo = self._labeled(pl, 'Toplama (çubuk)')
        self.agg_combo.addItems(AGGS.keys())

        pl.addStretch(1)
        self.count_lbl = QtWidgets.QLabel('—')
        self.count_lbl.setStyleSheet('color:#8aa0c8;font-weight:bold')
        pl.addWidget(self.count_lbl)
        exp = QtWidgets.QPushButton('Filtreli veriyi CSV\'ye aktar')
        exp.clicked.connect(self.export_csv)
        pl.addWidget(exp)
        panel.setFixedWidth(310)

        # --- sağ: grafik / tablo / istatistik ----------------------------
        self.tabs = QtWidgets.QTabWidget()
        self.fig = Figure(figsize=(7, 5))
        self.canvas = FigureCanvasQTAgg(self.fig)
        chart_w = QtWidgets.QWidget()
        cl = QtWidgets.QVBoxLayout(chart_w)
        cl.setContentsMargins(0, 0, 0, 0)
        cl.addWidget(NavigationToolbar2QT(self.canvas, chart_w))
        cl.addWidget(self.canvas)
        self.tabs.addTab(chart_w, 'Grafik')

        self.table = QtWidgets.QTableView()
        self.model = PandasModel()
        self.table.setModel(self.model)
        self.table.setSortingEnabled(True)
        self.table.setAlternatingRowColors(True)
        self.table.horizontalHeader().setDefaultSectionSize(96)
        self.table.doubleClicked.connect(self.on_row_dblclick)
        self.tabs.addTab(self.table, 'Tablo')

        self.stats = QtWidgets.QPlainTextEdit()
        self.stats.setReadOnly(True)
        self.stats.setStyleSheet('font-family:Menlo,monospace;font-size:12px')
        self.tabs.addTab(self.stats, 'İstatistik')

        split = QtWidgets.QSplitter()
        split.addWidget(panel)
        split.addWidget(self.tabs)
        split.setStretchFactor(1, 1)
        self.setCentralWidget(split)
        self.statusBar().showMessage('Hazır')

        # --- sinyaller ----------------------------------------------------
        self.ds_combo.currentIndexChanged.connect(self.on_dataset)
        self.search.textChanged.connect(self.apply_filters)
        self.chart_combo.currentIndexChanged.connect(self.on_chart_type)
        for cb in (self.x_combo, self.y_combo, self.g_combo, self.agg_combo):
            cb.currentIndexChanged.connect(self.draw_chart)

        self._apply_dark()
        self.on_dataset()

    # --- küçük yardımcılar -----------------------------------------------
    def _sep(self, text):
        lbl = QtWidgets.QLabel(text.upper())
        lbl.setStyleSheet('color:#6f7d99;font-size:10px;font-weight:bold;margin-top:6px')
        return lbl

    def _labeled(self, layout, text):
        layout.addWidget(QtWidgets.QLabel(text))
        cb = QtWidgets.QComboBox()
        layout.addWidget(cb)
        return cb

    @property
    def df(self):
        return self.datasets[self.ds_combo.currentText()]

    # --- veri seti değişimi ----------------------------------------------
    def on_dataset(self):
        df = self.df
        fcols = filter_cols(df)
        for col, val in self.filter_rows:
            col.blockSignals(True); val.blockSignals(True)
            col.clear(); col.addItem('(filtre yok)'); col.addItems(fcols)
            val.clear()
            col.blockSignals(False); val.blockSignals(False)
        self.on_chart_type(redraw=False)
        self.apply_filters()

    # --- grafik tipi → eksen combolarını uygun sütunlarla doldur ---------
    def on_chart_type(self, *_a, redraw=True):
        df = self.df
        nums, grps = numeric_cols(df), group_cols(df)
        ct = self.chart_combo.currentText()
        if ct == 'Histogram':
            xopts, yopts, gopts = nums, [], grps
        elif ct == 'Çubuk (kategoriye göre)':
            xopts, yopts, gopts = grps, [SAYI] + nums, [YOK] + grps
        elif ct == 'Dağılım (scatter)':
            xopts, yopts, gopts = nums, nums, [YOK] + grps
        elif ct == 'Kutu (box)':
            xopts, yopts, gopts = grps, nums, []
        else:  # Zaman serisi
            xopts, yopts, gopts = [], nums, [YOK] + grps
        self._repop(self.x_combo, xopts)
        self._repop(self.y_combo, yopts)
        self._repop(self.g_combo, gopts)
        self.agg_combo.setEnabled(ct == 'Çubuk (kategoriye göre)')
        if redraw:
            self.draw_chart()

    @staticmethod
    def _repop(combo, items):
        prev = combo.currentText()
        combo.blockSignals(True)
        combo.clear()
        combo.addItems([str(i) for i in items])
        if prev in items:
            combo.setCurrentText(prev)
        combo.setEnabled(bool(items))
        combo.blockSignals(False)

    def _fill_values(self, col, val):
        val.blockSignals(True)
        val.clear()
        name = col.currentText()
        if name and name != '(filtre yok)' and name in self.df.columns:
            uniq = self.df[name].dropna().unique()
            try:
                uniq = sorted(uniq)
            except TypeError:
                uniq = list(uniq)
            val.addItem('(hepsi)')
            val.addItems([str(u) for u in uniq])
        val.blockSignals(False)

    # --- filtre uygula → tablo/istatistik/grafik güncelle ----------------
    def apply_filters(self, *_a):
        df = self.df
        mask = pd.Series(True, index=df.index)
        for col, val in self.filter_rows:
            name = col.currentText()
            chosen = val.currentText()
            if name and name != '(filtre yok)' and chosen and chosen != '(hepsi)' and name in df.columns:
                mask &= df[name].astype(str) == chosen
        text = self.search.text().strip()
        if text:
            hay = df.astype(str).apply(lambda s: s.str.contains(text, case=False, na=False))
            mask &= hay.any(axis=1)
        self.filtered = df[mask]
        self.model.set_df(self.filtered.reset_index(drop=True))
        self.count_lbl.setText(f'{len(self.filtered):,}'.replace(',', '.') + f' / {len(df):,}'.replace(',', '.') + ' satır')
        self.update_stats()
        self.draw_chart()

    # --- istatistik sekmesi ----------------------------------------------
    def update_stats(self):
        df = self.filtered
        if df.empty:
            self.stats.setPlainText('(filtre sonucu boş)')
            return
        parts = [f'{len(df):,} satır × {df.shape[1]} sütun\n'.replace(',', '.')]
        num = df.select_dtypes('number').replace([np.inf, -np.inf], np.nan)
        if not num.empty:
            desc = num.describe().T[['count', 'mean', 'std', 'min', '50%', 'max']]
            desc.columns = ['adet', 'ort', 'std', 'min', 'medyan', 'maks']
            parts.append('SAYISAL ÖZET\n' + desc.to_string(float_format=lambda x: f'{x:,.2f}'))
        xcol = self.x_combo.currentText()
        if xcol in df.columns and (df[xcol].dtype == object or df[xcol].dtype == bool
                                   or df[xcol].nunique() <= 30):
            vc = df[xcol].value_counts().head(25)
            parts.append(f'\n\n{xcol} — DEĞER SAYIMI\n' + vc.to_string())
        self.stats.setPlainText('\n'.join(parts))

    # --- grafik çizimi ----------------------------------------------------
    def draw_chart(self, *_a):
        self.fig.clear()
        ax = self.fig.add_subplot(111)
        df = self.filtered
        ct = self.chart_combo.currentText()
        try:
            if df.empty:
                raise ValueError('Filtre sonucu boş')
            if ct == 'Histogram':
                self._hist(ax, df)
            elif ct == 'Çubuk (kategoriye göre)':
                self._bar(ax, df)
            elif ct == 'Dağılım (scatter)':
                self._scatter(ax, df)
            elif ct == 'Kutu (box)':
                self._box(ax, df)
            else:
                self._timeseries(ax, df)
        except Exception as e:
            ax.text(0.5, 0.5, str(e), ha='center', va='center', color='#e0685f',
                    transform=ax.transAxes, fontsize=11)
            ax.set_axis_off()
        self.canvas.draw()

    def _hist(self, ax, df):
        x = self.x_combo.currentText()
        d = clean_num(df[x]).dropna()
        if d.empty:
            raise ValueError(f'{x}: sayısal veri yok')
        ax.hist(d, bins=40, color=PAL[0], edgecolor='#1b2233')
        ax.set_xlabel(x); ax.set_ylabel('adet')
        ax.set_title(f'{x} dağılımı  ·  medyan {d.median():,.2f}', color='#e6ecf5')

    def _bar(self, ax, df):
        x = self.x_combo.currentText()
        y = self.y_combo.currentText()
        if y == SAYI:
            s = df.groupby(x, dropna=False).size()
            ylab = 'satır sayısı'
        else:
            fn = AGGS[self.agg_combo.currentText()]
            s = df.groupby(x, dropna=False)[y].agg(fn)
            ylab = f'{y} ({self.agg_combo.currentText()})'
        s = s.sort_values(ascending=False)
        trunc = len(s) > 25
        s = s.head(25)
        ax.bar([str(i) for i in s.index], s.values, color=PAL[2])
        ax.set_ylabel(ylab)
        ax.set_title(f'{ylab} — {x}' + (' (ilk 25)' if trunc else ''), color='#e6ecf5')
        for lbl in ax.get_xticklabels():
            lbl.set_rotation(40); lbl.set_ha('right'); lbl.set_fontsize(8)

    def _scatter(self, ax, df):
        x, y, g = self.x_combo.currentText(), self.y_combo.currentText(), self.g_combo.currentText()
        dx, dy = clean_num(df[x]), clean_num(df[y])
        m = dx.notna() & dy.notna()
        if not m.any():
            raise ValueError('Geçerli (x, y) çifti yok')
        if g and g != YOK and g in df.columns:
            cats = df.loc[m, g].astype(str)
            for i, cat in enumerate(sorted(cats.unique())[:12]):
                sel = cats == cat
                ax.scatter(dx[m][sel], dy[m][sel], s=12, alpha=0.6,
                           color=PAL[i % len(PAL)], label=cat)
            ax.legend(fontsize=7, framealpha=0.2, loc='best')
        else:
            ax.scatter(dx[m], dy[m], s=12, alpha=0.55, color=PAL[0])
        ax.set_xlabel(x); ax.set_ylabel(y)
        ax.set_title(f'{y} — {x}', color='#e6ecf5')

    def _box(self, ax, df):
        x, y = self.x_combo.currentText(), self.y_combo.currentText()
        top = df[x].astype(str).value_counts().head(12).index
        data, labels = [], []
        for cat in top:
            vals = clean_num(df[df[x].astype(str) == cat][y]).dropna()
            if len(vals):
                data.append(vals.values); labels.append(cat)
        if not data:
            raise ValueError('Kutu için yeterli veri yok')
        bp = ax.boxplot(data, labels=labels, patch_artist=True, showfliers=False)
        for i, box in enumerate(bp['boxes']):
            box.set(facecolor=PAL[i % len(PAL)], alpha=0.55)
        for el in ('whiskers', 'caps', 'medians'):
            for ln in bp[el]:
                ln.set_color('#c7d0e0')
        ax.set_ylabel(y)
        ax.set_title(f'{y} dağılımı — {x}', color='#e6ecf5')
        for lbl in ax.get_xticklabels():
            lbl.set_rotation(40); lbl.set_ha('right'); lbl.set_fontsize(8)

    def _timeseries(self, ax, df):
        if 'CEYREK' not in df.columns:
            raise ValueError('Zaman serisi yalnızca "Çeyreklik ham veri" setinde çalışır')
        y = self.y_combo.currentText()
        g = self.g_combo.currentText()
        order = ['Q1', 'Q2', 'Q3', 'Q4']
        if g and g != YOK and g in df.columns:
            top = df[g].astype(str).value_counts().head(8).index
            for i, cat in enumerate(top):
                s = (df[df[g].astype(str) == cat].groupby('CEYREK')[y].sum()
                     .reindex(order))
                ax.plot(order, s.values, marker='o', color=PAL[i % len(PAL)], label=str(cat))
            ax.legend(fontsize=7, framealpha=0.2)
        else:
            s = df.groupby('CEYREK')[y].sum().reindex(order)
            ax.plot(order, s.values, marker='o', color=PAL[0], linewidth=2)
        ax.set_ylabel(f'{y} (toplam)')
        ax.set_title(f'Çeyreklik {y}', color='#e6ecf5')

    # --- tabloda çift tık → tekil PN çeyreklik kırılımı ------------------
    def on_row_dblclick(self, index):
        row = self.model.row_dict(index.row())
        pn = row.get('PN') if hasattr(row, 'get') else None
        if not pn:
            return
        sub = self.quarterly[self.quarterly['PN'] == pn]
        if sub.empty:
            self.statusBar().showMessage(f'{pn}: çeyreklik veri yok', 4000)
            return
        self.fig.clear()
        ax = self.fig.add_subplot(111)
        order = ['Q1', 'Q2', 'Q3', 'Q4']
        g = sub.groupby('CEYREK')[['THY_TALEP_ADET', 'POOL_TALEP_ADET', 'SCRAP_ADET']].sum().reindex(order)
        xs = np.arange(4)
        ax.bar(xs - 0.25, g['THY_TALEP_ADET'], 0.25, label='THY talep', color=PAL[0])
        ax.bar(xs, g['POOL_TALEP_ADET'], 0.25, label='Pool talep', color=PAL[1])
        ax.bar(xs + 0.25, g['SCRAP_ADET'], 0.25, label='Scrap', color=PAL[2])
        ax.set_xticks(xs); ax.set_xticklabels(order)
        meta = sub.iloc[0]
        ax.set_title(f'{pn} · {meta.AIRCRAFT_MODEL} · {meta.SUB_CATEGORY} · {meta.KRITIKLIK_DURUMU}',
                     color='#e6ecf5', fontsize=10)
        ax.legend(fontsize=8, framealpha=0.2)
        self.canvas.draw()
        self.tabs.setCurrentIndex(0)
        self.statusBar().showMessage(f'{pn} çeyreklik kırılımı', 5000)

    # --- dışa aktar -------------------------------------------------------
    def export_csv(self):
        if self.filtered.empty:
            self.statusBar().showMessage('Boş — aktarılacak satır yok', 4000)
            return
        path, _ = QtWidgets.QFileDialog.getSaveFileName(
            self, 'Filtreli veriyi kaydet', 'catalyst_filtreli.csv', 'CSV (*.csv)')
        if path:
            self.filtered.to_csv(path, index=False, encoding='utf-8-sig')
            self.statusBar().showMessage(f'{len(self.filtered)} satır → {path}', 6000)

    def _apply_dark(self):
        self.setStyleSheet("""
            QWidget { background:#141a28; color:#c7d0e0; font-size:13px; }
            QComboBox, QLineEdit, QPlainTextEdit, QTableView {
                background:#1b2233; border:1px solid #2f3a52; border-radius:4px; padding:3px; }
            QComboBox:disabled { color:#5a6478; }
            QPushButton { background:#2a3450; border:1px solid #3a4970;
                border-radius:4px; padding:6px; }
            QPushButton:hover { background:#34426a; }
            QTableView { gridline-color:#2a3347; selection-background-color:#34426a; }
            QHeaderView::section { background:#232c40; color:#9fb0cc; border:0;
                border-right:1px solid #2a3347; padding:4px; }
            QTabBar::tab { background:#1b2233; padding:7px 16px; }
            QTabBar::tab:selected { background:#34426a; }
        """)


# ─────────────────────────────────────────────────────────────────────────
def selftest():
    """Pencere açmadan tüm veri setleri × grafik tiplerini render eder (offscreen)."""
    app = QtWidgets.QApplication(sys.argv)
    w = MainWindow()
    n = 0
    for ds in range(w.ds_combo.count()):
        w.ds_combo.setCurrentIndex(ds)
        for ct in range(w.chart_combo.count()):
            w.chart_combo.setCurrentIndex(ct)
            w.draw_chart()
            n += 1
    # tekil PN drill-down (çekirdek seti, ilk satır)
    w.ds_combo.setCurrentIndex(0)
    w.on_row_dblclick(w.model.index(0, 0))
    print(f'SELFTEST OK — {len(w.datasets)} veri seti, {n} grafik render edildi, PN drill-down çalıştı')
    return 0


def main():
    if '--selftest' in sys.argv:
        return selftest()
    app = QtWidgets.QApplication(sys.argv)
    app.setApplicationName('Catalyst Veri Gezgini')
    w = MainWindow()
    w.show()
    return app.exec()


if __name__ == '__main__':
    sys.exit(main())
