import {
  DEFAULT_OG_IMAGE,
  DEFAULT_ROBOTS,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from '@/config/site';

export interface SeoOptions {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'product' | 'article';
  robots?: string;
  image?: string;
  imageAlt?: string;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function applySeo({
  title,
  description,
  path,
  type = 'website',
  robots = DEFAULT_ROBOTS,
  image,
  imageAlt,
}: SeoOptions) {
  const canonical = absoluteUrl(path);
  const socialImage = image ? absoluteUrl(image) : DEFAULT_OG_IMAGE;
  const socialImageAlt =
    imageAlt || `${SITE_NAME} depot in Lokoja, Kogi State`;
  const socialImageType = /\.png$/i.test(socialImage)
    ? 'image/png'
    : /\.webp$/i.test(socialImage)
      ? 'image/webp'
      : 'image/jpeg';
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots);
  upsertCanonical(canonical);
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:locale', 'en_NG');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:image', socialImage);
  upsertMeta('property', 'og:image:secure_url', socialImage);
  upsertMeta('property', 'og:image:type', socialImageType);
  if (!image) {
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
  } else {
    document.head.querySelector('meta[property="og:image:width"]')?.remove();
    document.head.querySelector('meta[property="og:image:height"]')?.remove();
  }
  upsertMeta('property', 'og:image:alt', socialImageAlt);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', socialImage);
  upsertMeta('name', 'twitter:image:alt', socialImageAlt);

  setJsonLd('webpage-schema', {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#store` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: socialImage,
    },
    inLanguage: 'en-NG',
  });
}

export function applyNoIndex(
  title: string,
  description = 'Private management area for Kings Building Materials.',
) {
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', 'noindex, nofollow');
  document.head.querySelector('link[rel="canonical"]')?.remove();
  document.head.querySelector('meta[property="og:url"]')?.remove();
  removeJsonLd('webpage-schema');
  removeJsonLd('breadcrumb-schema');
  removeJsonLd('product-schema');
  removeJsonLd('product-breadcrumb-schema');
  removeJsonLd('category-breadcrumb-schema');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
}

export function setJsonLd(id: string, data: Record<string, unknown>) {
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.id = id;
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}
