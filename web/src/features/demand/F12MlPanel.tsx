import type { FC } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useDatum } from '../../data/useData';
import { sayi } from '../../lib/format';
import { eksenProps, izgaraProps, tooltipProps } from '../../lib/chartTheme';
import { Eyebrow, Skeleton } from '../../ui';

const Panel: FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <div className="flex flex-col">
    <Eyebrow className="mb-2">{baslik}</Eyebrow>
    <div className="h-[220px] w-full">{children}</div>
  </div>
);

/**
 * F12 — ML paneli. Bulgu dürüst sunuluyor: model baseline ile başa baş.
 * Bunu saklamak yerine yazmak, 4 çeyreklik veride istatistiksel tavanın
 * nerede olduğunu bildiğimizi gösteriyor.
 */
export const F12MlPanel: FC = () => {
  const { data, loading } = useDatum('model_ml');
  if (loading || !data) return <Skeleton className="h-64 w-full" />;

  const egitim = data.history.epoch.map((e, i) => ({
    epoch: e,
    train: data.history.train[i],
    test: data.history.test[i],
  }));

  const metrikler = Object.entries(data.metrics).map(([ad, m]) => ({ ad, ...m }));
  const enIyiMae = Math.min(...metrikler.map((m) => m.mae));

  const scatter = data.scatter.y.map((y, i) => ({ y, p: data.scatter.p[i] }));
  const enBuyuk = Math.max(...data.scatter.y, ...data.scatter.p);

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel baslik="Eğitim eğrisi · Poisson NLL">
          <ResponsiveContainer>
            <LineChart data={egitim} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...izgaraProps} />
              <XAxis dataKey="epoch" {...eksenProps} width={30} />
              <YAxis {...eksenProps} width={44} tickFormatter={(v) => sayi(v as number, 1)} />
              <Tooltip
                {...tooltipProps}
                formatter={(v, n) => [sayi(v as number, 3), n === 'train' ? 'Eğitim' : 'Test']}
                labelFormatter={(l) => `Epoch ${l}`}
              />
              <Line
                dataKey="train"
                name="train"
                stroke="#1A1D21"
                dot={false}
                strokeWidth={1.6}
                isAnimationActive={false}
              />
              <Line
                dataKey="test"
                name="test"
                stroke="#E81932"
                dot={false}
                strokeWidth={1.6}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel baslik="Q4 MAE karşılaştırma">
          <ResponsiveContainer>
            <BarChart
              data={metrikler}
              layout="vertical"
              margin={{ top: 4, right: 34, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...izgaraProps} vertical horizontal={false} />
              <XAxis type="number" {...eksenProps} tickFormatter={(v) => sayi(v as number, 1)} />
              <YAxis
                type="category"
                dataKey="ad"
                {...eksenProps}
                width={120}
                tick={{ fill: '#5A6472', fontSize: 11 }}
              />
              <Tooltip {...tooltipProps} formatter={(v) => [sayi(v as number, 3), 'MAE']} />
              <Bar dataKey="mae" radius={[0, 2, 2, 0]} barSize={16} isAnimationActive={false}>
                {metrikler.map((m) => (
                  // en iyi MAE vurgulanır — grafikte tek kırmızı
                  <Cell key={m.ad} fill={m.mae === enIyiMae ? '#E81932' : '#8B94A3'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel baslik="Gerçek vs tahmin">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...izgaraProps} vertical />
              <XAxis type="number" dataKey="y" name="Gerçek" {...eksenProps} width={30} />
              <YAxis type="number" dataKey="p" name="Tahmin" {...eksenProps} width={34} />
              <ZAxis range={[18, 18]} />
              <Tooltip
                {...tooltipProps}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v, n) => [sayi(v as number, 2), n as string]}
              />
              {/* y = x referansı: nokta bulutu bu çizgiden ne kadar sapıyor */}
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: enBuyuk, y: enBuyuk },
                ]}
                stroke="#5A6472"
                strokeDasharray="4 3"
              />
              <Scatter data={scatter} fill="#1A1D21" fillOpacity={0.35} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <p className="mt-5 border-t border-tk-line pt-4 text-sm leading-relaxed text-tk-slate">
        <strong className="text-tk-ink">Dürüst bulgu:</strong> derin öğrenme modeli baseline ile
        başa baş (MAE {sayi(data.metrics['Derin öğrenme (MLP-Poisson)']?.mae ?? 0, 2)} vs{' '}
        {sayi(data.metrics['3Q ortalama']?.mae ?? 0, 2)}). Dört çeyreklik veriyle istatistiksel
        tavan burası — daha karmaşık model daha iyi sonuç vermiyor. Kazanım tahmin doğruluğunda
        değil, yeni çeyrekler geldikçe yeniden eğitilebilen ölçeklenebilir mimaride; aynı hat
        uçuş saati ve çevrim verisi bağlandığında anlamlı fark üretir.
      </p>
    </div>
  );
};

export default F12MlPanel;
