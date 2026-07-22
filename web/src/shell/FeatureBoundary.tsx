import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Tek bir feature patlarsa tüm dashboard'u götürmesin — demo günü sigortası.
 * Kart yerinde ne olduğunu söyleyen bir mesaj kalır.
 */
export class FeatureBoundary extends Component<
  { featureId: string; children: ReactNode },
  { hata: Error | null }
> {
  state = { hata: null as Error | null };

  static getDerivedStateFromError(hata: Error) {
    return { hata };
  }

  componentDidCatch(hata: Error, bilgi: ErrorInfo) {
    console.error(`[${this.props.featureId}] render hatası`, hata, bilgi);
  }

  render() {
    if (this.state.hata) {
      return (
        <div className="rounded border border-tk-red/30 bg-tk-red-wash p-5">
          <p className="text-sm font-semibold text-tk-red-deep">
            {this.props.featureId} yüklenemedi
          </p>
          <p className="mt-1 text-xs text-tk-slate">
            Bu bileşen render sırasında hata verdi. Diğer kartlar çalışmaya devam ediyor.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default FeatureBoundary;
