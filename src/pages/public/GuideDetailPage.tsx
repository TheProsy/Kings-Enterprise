import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, MessageCircle, Phone } from 'lucide-react';
import {
  Breadcrumbs,
  FaqList,
  ProseSections,
  RelatedGuides,
} from '@/components/content/ContentBlocks';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BUSINESS } from '@/config/business';
import { DEFAULT_OG_IMAGE, absoluteUrl } from '@/config/site';
import { ROUTES } from '@/constants';
import {
  applyNoIndex,
  applySeo,
  setBreadcrumbSchema,
  setFaqSchema,
  setJsonLd,
} from '@/lib/seo';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';
import { GUIDES } from './GuidesPage';

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = GUIDES.find((item) => item.slug === slug);

  useEffect(() => {
    if (!guide) {
      applyNoIndex('Guide Not Found | Kings Building Materials');
      return;
    }

    const path = `${ROUTES.GUIDES}/${guide.slug}`;
    applySeo({
      title: guide.seoTitle,
      description: guide.description,
      path,
      type: 'article',
    });
    setBreadcrumbSchema('page-breadcrumb-schema', [
      { name: 'Home', path: '/' },
      { name: 'Guides', path: ROUTES.GUIDES },
      { name: guide.title, path },
    ]);
    setFaqSchema('faq-schema', guide.faqs);
    setJsonLd('article-schema', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      datePublished: guide.published,
      dateModified: guide.updated,
      inLanguage: 'en-NG',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': absoluteUrl(path),
      },
      image: [DEFAULT_OG_IMAGE],
      author: {
        '@type': 'Organization',
        name: 'Blessed Kings Enterprises',
        alternateName: 'Kings Building Materials',
        url: absoluteUrl('/'),
      },
      publisher: {
        '@id': `${absoluteUrl('/')}#store`,
      },
    });
  }, [guide]);

  if (!guide) return <NotFoundPage />;

  return (
    <div className="min-h-screen bg-canvas">
      <section className="border-b border-border bg-brand-950 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Home', to: ROUTES.HOME },
              { label: 'Guides', to: ROUTES.GUIDES },
              { label: guide.title },
            ]}
          />
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
            {guide.intro}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/60">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Updated {formatDate(guide.updated)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {guide.readingTime}
            </span>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <article className="lg:col-span-8">
            <ProseSections sections={guide.sections} />
            <FaqList faqs={guide.faqs} />

            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-2 p-6">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  Ready to price your materials?
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Send your list to our Lokoja sales desk for current rates and availability.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={ROUTES.REQUEST_QUOTE}>
                  <Button size="sm">Request a quote</Button>
                </Link>
                <Link to={ROUTES.GUIDES}>
                  <Button size="sm" variant="outline">
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    All guides
                  </Button>
                </Link>
              </div>
            </div>
          </article>

          <aside className="space-y-6 lg:col-span-4">
            <Card variant="soft" className="p-6">
              <h2 className="text-base font-bold text-text-primary">Talk to our sales desk</h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Confirm current prices, stock and delivery for your project before ordering.
              </p>
              <div className="mt-4 space-y-2">
                <a href={BUSINESS.phoneHref} className="block">
                  <Button className="w-full">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {BUSINESS.phone}
                  </Button>
                </a>
                <a
                  href={BUSINESS.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="secondary" className="w-full">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    WhatsApp us
                  </Button>
                </a>
              </div>
            </Card>

            <Card variant="soft" className="p-6">
              <RelatedGuides excludeSlug={guide.slug} />
            </Card>

            <Card variant="soft" className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Shop by material
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li>
                  <Link
                    to="/categories/cement-building"
                    className="text-text-secondary transition-colors hover:text-brand"
                  >
                    Cement, iron rods and building materials
                  </Link>
                </li>
                <li>
                  <Link
                    to="/categories/roofing-ceiling"
                    className="text-text-secondary transition-colors hover:text-brand"
                  >
                    Roofing sheets and ceiling materials
                  </Link>
                </li>
                <li>
                  <Link
                    to={ROUTES.PRODUCTS}
                    className="font-semibold text-brand transition-colors hover:text-brand-hover"
                  >
                    Full materials catalogue
                  </Link>
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}
