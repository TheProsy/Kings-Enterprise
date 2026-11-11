import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import guideData from '@/content/guides.json';
import { Breadcrumbs } from '@/components/content/ContentBlocks';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { absoluteUrl } from '@/config/site';
import { ROUTES } from '@/constants';
import { setBreadcrumbSchema, setJsonLd } from '@/lib/seo';

export interface Guide {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  published: string;
  updated: string;
  readingTime: string;
  intro: string;
  sections: Array<{
    heading: string;
    paragraphs?: string[];
    bullets?: string[];
  }>;
  faqs: Array<{ question: string; answer: string }>;
}

export const GUIDES = (guideData as { guides: Guide[] }).guides;

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function GuidesPage() {
  useEffect(() => {
    setBreadcrumbSchema('page-breadcrumb-schema', [
      { name: 'Home', path: '/' },
      { name: 'Building material guides', path: ROUTES.GUIDES },
    ]);
    setJsonLd('itemlist-schema', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Building material buying guides',
      itemListElement: GUIDES.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: guide.title,
        url: absoluteUrl(`${ROUTES.GUIDES}/${guide.slug}`),
      })),
    });
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <section className="border-b border-border bg-brand-950 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[{ label: 'Home', to: ROUTES.HOME }, { label: 'Guides' }]}
          />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Building material buying guides
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
            Practical guides for builders, contractors and homeowners in Lokoja and Kogi State:
            cement grades, iron rod sizes, quantity estimates, roofing, plumbing and delivery.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((guide) => (
              <Card
                key={guide.slug}
                variant="interactive"
                className="flex h-full flex-col p-6"
              >
                <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-text-muted">
                  <BookOpen className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  <span>Buying guide</span>
                  <span aria-hidden="true">·</span>
                  <span>{guide.readingTime}</span>
                </div>
                <h2 className="mt-3 text-lg font-bold leading-snug text-text-primary">
                  <Link
                    to={`${ROUTES.GUIDES}/${guide.slug}`}
                    className="transition-colors hover:text-brand"
                  >
                    {guide.title}
                  </Link>
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                  {guide.description}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(guide.updated)}
                  </span>
                  <Link
                    to={`${ROUTES.GUIDES}/${guide.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand transition-colors hover:text-brand-hover"
                  >
                    Read guide
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-border bg-surface-2 p-6 text-center sm:p-8">
            <h2 className="text-xl font-bold text-text-primary">
              Need materials for your project?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Send your material list to our Lokoja sales desk for current prices, stock
              confirmation and delivery scheduling.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to={ROUTES.REQUEST_QUOTE}>
                <Button>Request a quote</Button>
              </Link>
              <Link to={ROUTES.PRODUCTS}>
                <Button variant="outline">Browse materials</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
