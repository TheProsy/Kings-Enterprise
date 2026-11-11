import { Card, CardContent } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Button } from '@/components/ui/Button';
import { BUSINESS, BUSINESS_HOURS_SUMMARY } from '@/config/business';
import { PAGE_IMAGES } from '@/constants/images';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Truck,
  ShieldCheck,
  Handshake,
  Building2,
  Award,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';

const PILLARS = [
  {
    title: 'Quality Guaranteed',
    body: 'All cement grades and tensile iron rods meet strict national structural standards with zero substandard counterfeits.',
    icon: <ShieldCheck className="h-5 w-5" aria-hidden="true" />,
    tone: 'bg-success-soft text-success-fg',
  },
  {
    title: 'Direct Site Haulage',
    body: 'Dependable logistical fleet delivering heavy orders directly to site coordinates across Lokoja without delays.',
    icon: <Truck className="h-5 w-5" aria-hidden="true" />,
    tone: 'bg-brand-soft text-brand-fg',
  },
  {
    title: 'Transparent Pricing',
    body: 'Honest depot-rate pricing with clear bulk discounts, itemized receipts, and no surprise loading fees.',
    icon: <Handshake className="h-5 w-5" aria-hidden="true" />,
    tone: 'bg-warning-soft text-warning-fg',
  },
  {
    title: 'Technical Guidance',
    body: 'Experienced staff available to help you calculate rod counts, cement ratios, and roofing quantities accurately.',
    icon: <Award className="h-5 w-5" aria-hidden="true" />,
    tone: 'bg-info-soft text-info-fg',
  },
];

const CONTACT_CARDS = [
  {
    title: 'Store Address',
    body: BUSINESS.address,
    icon: <MapPin className="h-5 w-5" aria-hidden="true" />,
    href: undefined,
  },
  {
    title: 'Call Direct',
    body: BUSINESS.phone,
    icon: <Phone className="h-5 w-5" aria-hidden="true" />,
    href: BUSINESS.phoneHref,
  },
  {
    title: 'Official Email',
    body: BUSINESS.email,
    icon: <Mail className="h-5 w-5" aria-hidden="true" />,
    href: `mailto:${BUSINESS.email}`,
  },
  {
    title: 'Depot Hours',
    body: BUSINESS_HOURS_SUMMARY,
    icon: <Clock className="h-5 w-5" aria-hidden="true" />,
    href: undefined,
  },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <section className="relative overflow-hidden border-b border-border bg-brand-950 py-16 text-white md:py-24">
        <div className="absolute inset-0 z-0">
          <img
            src={PAGE_IMAGES.heroDepot}
            alt="Kings Building Materials Depot"
            className="h-full w-full object-cover filter brightness-[0.35]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/90 to-brand-950/75" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
              <Building2 className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
              Trusted Building Supplies Depot
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              About {BUSINESS.name}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
              Blessed Kings Enterprises, trading as Kings Building Materials, serves professional
              contractors, builders, and homeowners across Lokoja and Kogi State with certified,
              premium-grade materials and dependable depot service.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-brand-950 p-8 text-white shadow-xl md:p-10">
                <img
                  src={PAGE_IMAGES.aboutDepotFacility}
                  alt="Kings Warehouse Facility"
                  className="absolute inset-0 h-full w-full object-cover filter brightness-[0.4] contrast-[1.1]"
                  loading="lazy"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/80 to-brand-950/50"
                />

                <div className="relative z-10 space-y-6">
                  <div className="inline-flex rounded-lg border border-brand-300/40 bg-brand-500/20 px-3 py-1 text-xs font-bold text-brand-300">
                    CENTRAL DEPOT FACILITY
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-white">Built to Last</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">
                      “Building strong foundations across Kogi State since day one with
                      uncompromising quality, honesty, and verified weights.”
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
                    <div>
                      <dt className="text-2xl font-extrabold text-white">100%</dt>
                      <dd className="text-xs text-white/70">Certified Steel & Cement</dd>
                    </div>
                    <div>
                      <dt className="text-2xl font-extrabold text-white">Same-Day</dt>
                      <dd className="text-xs text-white/70">Site Truck Dispatch</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-7">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                  Our Uncompromising Commitments
                </h2>
                <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
                  We understand that your building is a generational investment. That is why we
                  never compromise on structural standards, sourcing directly from approved
                  primary manufacturers.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                {PILLARS.map((pillar) => (
                  <Card
                    key={pillar.title}
                    variant="soft"
                    className="transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <CardContent className="p-5">
                      <div
                        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${pillar.tone}`}
                      >
                        {pillar.icon}
                      </div>
                      <h3 className="mb-1 text-base font-bold text-text-primary">{pillar.title}</h3>
                      <p className="text-sm leading-relaxed text-text-secondary">{pillar.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Operations Showcase */}
      <section className="bg-surface-2 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Depot Operations & Field Logistics"
            description="Equipped with modern warehousing facilities and our dedicated haulage fleet to deliver directly onto your site."
            align="center"
            className="mx-auto mb-12 max-w-2xl"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="group overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-all hover:shadow-md">
              <div className="relative aspect-[16/10] overflow-hidden bg-surface-3">
                <img
                  src={PAGE_IMAGES.aboutDepotFacility}
                  alt="Kings Building Materials Warehouse Depot"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-text-primary">High-Capacity Depot</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  Continuous supply of fresh cement stock kept completely dry and sheltered, with high-tensile steel rebars neatly racked.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-all hover:shadow-md">
              <div className="relative aspect-[16/10] overflow-hidden bg-surface-3">
                <img
                  src={PAGE_IMAGES.aboutFleetDelivery}
                  alt="Direct Construction Site Delivery Truck"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-text-primary">Prompt Direct Haulage</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  Our heavy flatbed trucks dispatch large tonnage orders directly to residential, commercial, and civil work sites.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-all hover:shadow-md">
              <div className="relative aspect-[16/10] overflow-hidden bg-surface-3">
                <img
                  src={PAGE_IMAGES.aboutQualityAssurance}
                  alt="Certified Quality Assurance Inspection"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-text-primary">Certified Structural Standards</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  Strict batch verification ensures full gauge compliance on all iron rods, genuine Portland cement, and seasoned hardwood.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Visit Our Main Depot"
            description="Our distribution warehouse is conveniently located in Lokoja for on-site pickup and immediate loading."
            action={
              <Button variant="primary" size="sm" asChild>
                <Link to={ROUTES.CONTACT}>
                  Contact Depot
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {CONTACT_CARDS.filter((card) => card.body).map((card) => (
              <Card key={card.title} variant="soft">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
                    {card.icon}
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-text-primary">{card.title}</h3>
                  {card.href ? (
                    <a
                      href={card.href}
                      className="block truncate text-sm font-medium text-brand hover:underline"
                    >
                      {card.body}
                    </a>
                  ) : (
                    <p className="text-sm leading-relaxed text-text-secondary">{card.body}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
