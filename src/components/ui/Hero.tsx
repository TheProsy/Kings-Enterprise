import { ArrowRight, MessageCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utilities';
import { BUSINESS } from '@/config/business';
import { PAGE_IMAGES } from '@/constants/images';

interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

export function Hero({
  title = 'Everything You Need to Build. All in One Place.',
  subtitle = 'Blessed Kings Enterprises, trading as Kings Building Materials, is a wholesale and retail supplier of certified Dangote and BUA cement, high-tensile iron rods, hardwood timber, roofing sheets and plumbing supplies in Lokoja, Kogi State.',
  ctaLabel = 'Explore Materials',
  ctaHref = '/products',
  secondaryLabel = 'Request Wholesale Quote',
  secondaryHref = '/request-quote',
  className,
}: HeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden bg-brand-950 text-white',
        className,
      )}
    >
      {/* Background Depot Image with High-End Lighting & Contrast Overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src={PAGE_IMAGES.heroDepot}
          alt="Kings Building Materials Warehouse Depot Yard"
          className="h-full w-full object-cover object-center filter brightness-[0.4] contrast-[1.05]"
          loading="eager"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/85 to-brand-950/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,var(--brand-400)_0%,transparent_50%),radial-gradient(circle_at_85%_0%,color-mix(in_srgb,var(--warning)_25%,transparent)_0%,transparent_40%)] opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-950 to-transparent"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
              Depot Open · Monday to Saturday
            </span>

            <h1 className="mt-6 max-w-2xl text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-display">
              {title}
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-white/75 sm:text-base lg:text-lg">
              {subtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <NavLink
                to={ctaHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-7 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-hover"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </NavLink>
              <NavLink
                to={secondaryHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                {secondaryLabel}
              </NavLink>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {[
                { label: 'Years in business', value: '10+' },
                { label: 'Materials in stock', value: '500+' },
                { label: 'Projects supplied', value: '2,500+' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-2xs font-medium uppercase tracking-wide text-white/50">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Value card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-6 sm:p-7">
              <h2 className="text-sm font-bold uppercase tracking-wide text-white/60">
                Why builders choose us
              </h2>
              <ul className="mt-5 space-y-4">
                {[
                  {
                    title: 'Certified factory stock',
                    body: 'Direct supply of certified Dangote and BUA cement, standard TMT rebar and BRC mesh.',
                  },
                  {
                    title: 'Fair wholesale pricing',
                    body: 'Transparent rates with bulk discounts for contractors, builders and developers.',
                  },
                  {
                    title: 'Same-day site delivery',
                    body: 'Dependable dispatch to construction sites across Lokoja and Kogi State.',
                  },
                  {
                    title: 'Trade credit accounts',
                    body: 'Structured supply agreements for registered recurring contractors.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-white/65">
                        {item.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={BUSINESS.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-brand-800 transition-colors hover:bg-white/90"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
