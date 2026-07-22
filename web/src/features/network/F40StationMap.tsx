import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import Map, { Marker, NavigationControl, Popup, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useDatum } from '../../data/useData';
import type { DepoTipi, Station } from '../../data/types';
import { sayi, yuzde } from '../../lib/format';
import { useStore } from '../../store';
import { Skeleton } from '../../ui';

/** CARTO Positron — token gerektirmez, açık tema THY diliyle uyumlu. */
const BASEMAP = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const DEPO_RENK: Record<DepoTipi, string> = {
  ana_depo: '#E81932',
  ileri_depo: '#1A1D21',
  hat_stok: '#5A6472',
  yok: '#B6BDC7',
};

const DEPO_AD: Record<DepoTipi, string> = {
  ana_depo: 'Ana depo',
  ileri_depo: 'İleri depo',
  hat_stok: 'Hat stoğu',
  yok: 'Stok yok',
};

/** F40 — İstasyon ağı haritası. */
export const F40StationMap: FC = () => {
  const { data, loading } = useDatum('stations');
  const filoYili = useStore((s) => s.filoYili);
  const [secili, setSecili] = useState<Station | null>(null);
  const mapRef = useRef<MapRef>(null);

  const istasyonlar = data?.stations ?? [];

  const enBuyuk = useMemo(
    () =>
      istasyonlar.length
        ? Math.max(...istasyonlar.map((s) => (filoYili === 2033 ? s.ucak2033 : s.ucak2025)))
        : 1,
    [istasyonlar, filoYili],
  );

  /**
   * Tüm istasyonlar görünsün — JFK ve BKK dahil.
   * Harita stili yüklenmeden fitBounds çağrılırsa sessizce yutuluyor,
   * o yüzden hem onLoad'da hem yıl değişiminde çalıştırılıyor.
   */
  const sigdir = useCallback(() => {
    if (!istasyonlar.length || !mapRef.current) return;

    // Kart gridinde harita, canvas ölçüldükten sonra genişliyor. Önce resize()
    // çağrılmazsa fitBounds eski (dar) canvas'a göre hesaplanıyor ve karo
    // yüklemesi yalnız sol şeritte kalıyor.
    mapRef.current.resize();

    const lats = istasyonlar.map((s) => s.lat);
    const lons = istasyonlar.map((s) => s.lon);
    mapRef.current.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 40, duration: 0 },
    );
  }, [istasyonlar]);

  useEffect(() => {
    if (mapRef.current?.isStyleLoaded()) sigdir();
  }, [sigdir]);

  if (loading || !data) return <Skeleton className="h-[440px] w-full" />;

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative h-[440px] w-full overflow-hidden rounded border border-tk-line">
        <Map
          ref={mapRef}
          mapStyle={BASEMAP}
          initialViewState={{ longitude: 32, latitude: 39, zoom: 2.4 }}
          onLoad={sigdir}
          scrollZoom={false}
        >
          <NavigationControl position="top-right" showCompass={false} />

          {/*
            Büyükten küçüğe çiziliyor: küçük daireler üstte kalsın diye.
            IST ile SAW bu ölçekte üst üste biniyor; yarı saydam dolgu ve beyaz halka
            olmadan büyük istasyon küçüğünü tamamen yutuyor.
          */}
          {[...istasyonlar]
            .sort(
              (a, b) =>
                (filoYili === 2033 ? b.ucak2033 : b.ucak2025) -
                (filoYili === 2033 ? a.ucak2033 : a.ucak2025),
            )
            .map((s) => {
              const ucak = filoYili === 2033 ? s.ucak2033 : s.ucak2025;
              const r = 7 + 20 * Math.sqrt(ucak / enBuyuk); // alan ∝ uçak sayısı
              return (
                <Marker
                  key={s.kod}
                  longitude={s.lon}
                  latitude={s.lat}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSecili(s);
                  }}
                >
                  <button
                    type="button"
                    aria-label={`${s.ad} — ${sayi(ucak)} uçak`}
                    style={{
                      width: r,
                      height: r,
                      background: DEPO_RENK[s.depoTipi],
                      borderColor: DEPO_RENK[s.depoTipi],
                    }}
                    className="rounded-full border-2 bg-clip-padding opacity-70 shadow-sm outline outline-2 outline-white transition-transform duration-100 hover:scale-110 hover:opacity-100"
                  />
                </Marker>
              );
            })}

          {secili && (
            <Popup
              longitude={secili.lon}
              latitude={secili.lat}
              onClose={() => setSecili(null)}
              closeButton
              closeOnClick={false}
              maxWidth="260px"
            >
              <div className="min-w-[190px] p-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-semibold">{secili.kod}</span>
                  <span className="truncate text-xs text-tk-slate">{secili.ad}</span>
                </div>
                <dl className="mt-2 space-y-1 text-xs">
                  {[
                    ['Uçak', `${sayi(filoYili === 2033 ? secili.ucak2033 : secili.ucak2025)} (${filoYili})`],
                    ['Depo tipi', DEPO_AD[secili.depoTipi]],
                    ['Stok', `${sayi(secili.stokKalem)} kalem · ${sayi(secili.stokAdet)} adet`],
                    [
                      'IST transfer',
                      secili.transferSaatIST === 0
                        ? 'ana üs'
                        : `${sayi(secili.transferSaatIST, 1)} saat`,
                    ],
                    ['AOG kapsam', yuzde(secili.aogKapsam * 100, 0)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-tk-slate">{k}</dt>
                      <dd className="tnum font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-tk-slate">
        {(Object.keys(DEPO_RENK) as DepoTipi[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border border-white"
              style={{ background: DEPO_RENK[t] }}
            />
            {DEPO_AD[t]}
          </span>
        ))}
        <span className="ml-auto">
          daire alanı {filoYili} uçak sayısıyla orantılı · {sayi(istasyonlar.length)} istasyon
        </span>
      </div>
    </div>
  );
};

export default F40StationMap;
