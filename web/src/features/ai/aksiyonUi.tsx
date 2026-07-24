import type { FC } from 'react';
import {
  ArrowLeftRight,
  Eye,
  Repeat,
  ShoppingCart,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { AKSIYON_META, type AiAksiyon } from '../../lib/aiEngine';
import { Badge } from '../../ui';

/**
 * Aksiyon ikonları — renk körlüğü için her aksiyon rengi + ikon + metin taşır
 * (spec 1.6). Rozet, markanın standart Badge tonlarını kullanır.
 */
export const AKSIYON_IKON: Record<AiAksiyon, LucideIcon> = {
  EXCHANGE: Repeat,
  SIPARIS: ShoppingCart,
  TAMIR: Wrench,
  TRANSFER: ArrowLeftRight,
  IZLE: Eye,
};

interface Props {
  aksiyon: AiAksiyon;
  boyut?: 'sm' | 'md';
  className?: string;
}

export const AksiyonRozeti: FC<Props> = ({ aksiyon, className = '' }) => {
  const meta = AKSIYON_META[aksiyon];
  const Ikon = AKSIYON_IKON[aksiyon];

  return (
    <Badge tone={meta.ton} icon={<Ikon size={11} strokeWidth={2.4} />} className={className}>
      {meta.etiket}
    </Badge>
  );
};

export default AksiyonRozeti;
