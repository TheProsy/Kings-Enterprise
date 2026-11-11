import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MessageCircle, Phone, Truck } from 'lucide-react';
import sitePagesData from '@/content/site-pages.json';
import { Breadcrumbs, FaqList, ProseSections, RelatedGuides } from '@/components/content/ContentBlocks';
import type { FaqItem, PageSection } from '@/components/content/ContentBlocks';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BUSINESS, BUSINESS_HOURS_SUMMARY } from '@/config/business';
import { ROUTES } from '@/constants';
import { setBreadcrumbSchema, setFaqSchema } from '@/lib/seo';

type TrustPageKey = 'delivery' | 'returns' | 'privacy' | 'terms';

interface TrustPage {
  path: string;
  title: string;
  seoTitle: string;
  description: string;
  intro: string;
  updated: string;
  sections: PageSection[];
  faqs: FaqItem[];
}

const PAGES = sitePagesData as Record<TrustPageKey, TrustPage>;

export function ContentPage({ pageKey }: { pageKey: TrustPageKey }) {
  const page = PAGES[pageKey];

  useEffect(() => {
    setBreadcrumbSchema('page-breadcrumb-schema', [
      { name: 'Home', path: '/' },
      { name: page.title, path: page.path },
    ]);
    setFaqSchema('faq-schema', page.faqs);
  }, [page]);

  return (
    <div className="min-h-screen bg-canvas">
      <section className="border-b border-border bg-brand-950 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Home', to: ROUTES.HOME },
              { label: page.title },
            ]}
          />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
            {page.intro}
          </p>
          <p className="mt-4 text-xs font-medium text-white/60">
            Last updated{' '}
            {new Date(`${page.updated}T00:00:00`).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <article className="lg:col-span-8">
            <ProseSections sections={page.sections} />
            <FaqList faqs={page.faqs} />

            <div className="mt-12 rounded-xl border border-border bg-surface-2 p-6">
              <h2 className="text-lg font-bold text-text-primary">
                Still need help?
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Call or WhatsApp our Lokoja sales desk and we will confirm stock, current
                pricing, delivery timing and payment details for your order.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={BUSINESS.phoneHref}>
                  <Button>
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {BUSINESS.phone}
                  </Button>
                </a>
                <a href={BUSINESS.whatsapp} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    WhatsApp us
                  </Button>
                </a>
                <Link to={ROUTES.REQUEST_QUOTE}>
                  <Button variant="outline">Request a quote</Button>
                </Link>
              </div>
            </div>
          </article>

          <aside className="space-y-6 lg:col-span-4">
            <Card variant="soft" className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-base font-bold text-text-primary">
                Order pickup or delivery
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Materials can be collected from our Lokoja depot or delivered to your site
                within Lokoja and surrounding communities, subject to quantity and schedule.
              </p>
              <div className="mt-4 space-y-2">
                <Link to={ROUTES.PRODUCTS} className="block">
                  <Button variant="secondary" className="w-full">
                    Browse materials
                  </Button>
                </Link>
                <Link to={ROUTES.REQUEST_QUOTE} className="block">
                  <Button variant="outline" className="w-full">
                    Send your material list
                  </Button>
                </Link>
              </div>
            </Card>

            <Card variant="soft" className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
                <h2 className="text-sm font-bold text-text-primary">Depot hours</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {BUSINESS_HOURS_SUMMARY}
              </p>
              <p className="mt-2 text-xs text-text-muted">
                Call ahead for large orders, special sizes and delivery scheduling.
              </p>
            </Card>

            <Card variant="soft" className="p-6">
              <RelatedGuides />
            </Card>

            <Card variant="soft" className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Store information
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {[
                  { label: 'Delivery & pickup', path: ROUTES.DELIVERY },
                  { label: 'Returns & damaged goods', path: ROUTES.RETURNS },
                  { label: 'Privacy policy', path: ROUTES.PRIVACY },
                  { label: 'Terms of service', path: ROUTES.TERMS },
                ].map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-text-secondary transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}
