import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { BUSINESS } from '@/config/business';
import { BrandLogo } from '@/components/common/BrandLogo';
import { PAGE_IMAGES } from '@/constants/images';

const CURRENT_YEAR = new Date().getFullYear();

const POINTS = [
  'Ring up sales in seconds with live stock checks',
  'Know exactly who owes you, and how much',
  'Track every naira in and every naira out',
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 z-0">
          <img
            src={PAGE_IMAGES.aboutDepotFacility}
            alt="Kings Building Materials Depot"
            className="h-full w-full object-cover filter brightness-[0.25] contrast-[1.1]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/85 to-brand-950/70" />
        </div>

        <div className="relative z-10">
          <BrandLogo variant="white" size="md" className="h-11" />
        </div>

        <div className="relative z-10 max-w-md">
          <span className="inline-block rounded-md bg-brand-500/30 px-3 py-1 text-xs font-bold text-brand-300 backdrop-blur-xs">
            MANAGEMENT & POS PORTAL
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight">
            Simple to use. Powerful behind the scenes.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Sell materials, track stock, record debts and understand your profit — all from one
            screen built for the shop floor.
          </p>

          <ul className="mt-8 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-white/80">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {CURRENT_YEAR} {BUSINESS.name}
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        {children}
      </div>
    </div>
  );
}
