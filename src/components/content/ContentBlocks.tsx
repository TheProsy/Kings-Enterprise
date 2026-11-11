import { Link } from 'react-router-dom';
import { ChevronRight, HelpCircle } from 'lucide-react';
import { ROUTES } from '@/constants';

export interface PageSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
            {item.to ? (
              <Link to={item.to} className="transition-colors hover:text-brand">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-text-secondary">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ProseSections({ sections }: { sections: PageSection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            {section.heading}
          </h2>
          {section.paragraphs?.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base"
            >
              {paragraph}
            </p>
          ))}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {section.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-text-secondary"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export function FaqList({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="page-faq-heading" className="mt-12">
      <h2
        id="page-faq-heading"
        className="flex items-center gap-2 text-xl font-bold tracking-tight text-text-primary sm:text-2xl"
      >
        <HelpCircle className="h-5 w-5 text-brand" aria-hidden="true" />
        Frequently asked questions
      </h2>
      <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
        {faqs.map((faq) => (
          <details key={faq.question} className="group px-5 py-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary marker:content-none">
              <span className="flex items-start justify-between gap-4">
                {faq.question}
                <ChevronRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function RelatedGuides({ excludeSlug }: { excludeSlug?: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
        Buying guides
      </h3>
      <ul className="mt-3 space-y-2.5 text-sm">
        <li>
          <Link
            to={ROUTES.GUIDES}
            className="font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            All building material guides
          </Link>
        </li>
        {excludeSlug !== 'dangote-vs-bua-cement' && (
          <li>
            <Link
              to={`${ROUTES.GUIDES}/dangote-vs-bua-cement`}
              className="text-text-secondary transition-colors hover:text-brand"
            >
              Dangote vs BUA cement
            </Link>
          </li>
        )}
        {excludeSlug !== 'estimate-cement-and-blocks' && (
          <li>
            <Link
              to={`${ROUTES.GUIDES}/estimate-cement-and-blocks`}
              className="text-text-secondary transition-colors hover:text-brand"
            >
              Estimate cement and blocks
            </Link>
          </li>
        )}
        {excludeSlug !== 'iron-rod-sizes-and-uses' && (
          <li>
            <Link
              to={`${ROUTES.GUIDES}/iron-rod-sizes-and-uses`}
              className="text-text-secondary transition-colors hover:text-brand"
            >
              Iron rod sizes and uses
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
