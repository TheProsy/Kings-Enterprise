import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const templatePath = join(distDir, 'index.html');
const FALLBACK_SITE_URL = 'https://www.blessedkingsenterprises.com.ng';
const BUSINESS_ID = process.env.BUSINESS_ID || 'default-business';

const envFile = join(rootDir, '.env');
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    console.warn(`[static-pages] Could not load .env: ${error.message}`);
  }
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf8'));
}

const business = readJson('src/content/business.json');
const sitePages = readJson('src/content/site-pages.json');
const guides = readJson('src/content/guides.json').guides;
const categoryContent = readJson('src/content/category-content.json');
const SITE_URL = String(business.website || FALLBACK_SITE_URL).replace(/\/+$/, '');
const SITE_NAME = business.name || 'Kings Building Materials';
const LEGAL_NAME = business.legalName || 'Blessed Kings Enterprises';
const PHONE = business.phone || '';
const PHONE_HREF = business.phoneHref || '';
const ADDRESS = business.address || 'Lokoja, Kogi State, Nigeria';

const STATIC_META = {
  '/about': {
    title: `About Blessed Kings Enterprises (Kings Building Materials) | Lokoja`,
    description:
      'Learn about Blessed Kings Enterprises, trading as Kings Building Materials in Lokoja, Kogi State. Certified cement, TMT iron rods, roofing, timber and plumbing supplies backed by fair pricing and reliable site delivery.',
    h1: `About ${LEGAL_NAME}`,
    intro:
      'Blessed Kings Enterprises, trading as Kings Building Materials, serves contractors, builders and homeowners across Lokoja and Kogi State with certified building materials, transparent pricing and dependable site delivery.',
    sections: [
      {
        heading: 'Why builders buy from us',
        paragraphs: [
          'We source cement, iron rods, roofing, timber, plumbing supplies and tools from trusted suppliers and keep stock moving through our Lokoja depot.',
          'Our sales desk helps customers confirm sizes, quantities and current prices before payment, and arranges pickup or delivery for site orders.',
        ],
      },
      {
        heading: 'Visit our Lokoja depot',
        paragraphs: [
          'Materials can be collected from our depot in Lokoja or delivered to sites within Lokoja and surrounding communities, subject to quantity and schedule.',
          `Call or WhatsApp ${PHONE} to confirm stock, prices and delivery before travelling.`,
        ],
      },
    ],
  },
  '/products': {
    title: `Building Materials Catalogue & Prices in Lokoja | ${SITE_NAME}`,
    description:
      'Browse live prices for cement, iron rods, roofing sheets, timber, plumbing, paints, nails and tools at Kings Building Materials in Lokoja. Wholesale and retail supply.',
    h1: 'Building Materials Catalogue',
    intro:
      'Browse cement, iron rods, roofing, timber, plumbing, paints, nails, tools and general building materials available from our Lokoja depot. Confirm current stock and pricing with our sales desk before ordering.',
    sections: [
      {
        heading: 'Wholesale and retail supply',
        paragraphs: [
          'We supply both small purchases and bulk project orders. Send your full material list and quantities for a combined quote, stock confirmation and delivery schedule.',
          `Call or WhatsApp ${PHONE} for help choosing the right sizes and quantities.`,
        ],
      },
    ],
  },
  '/contact': {
    title: `Contact ${SITE_NAME} | Lokoja, Kogi State`,
    description:
      'Call or WhatsApp Kings Building Materials in Lokoja, Kogi State for building material prices, stock checks, bulk orders and site delivery.',
    h1: 'Contact Kings Building Materials',
    intro:
      'Reach our Lokoja sales desk for current prices, stock checks, bulk orders, delivery scheduling and material advice.',
    sections: [
      {
        heading: 'Call or WhatsApp',
        paragraphs: [
          `Phone and WhatsApp: ${PHONE}.`,
          `Depot location: ${ADDRESS}. Call ahead for large orders and special sizes.`,
        ],
      },
    ],
  },
  '/request-quote': {
    title: `Request a Building Materials Quote | ${SITE_NAME}`,
    description:
      'Send your material list to Kings Building Materials for a fast quote. Cement, iron rods, roofing, timber, plumbing and construction tools in Lokoja, Kogi State.',
    h1: 'Request a Building Materials Quote',
    intro:
      'Send your material list and quantities to our sales desk. We will confirm current prices, available stock and delivery options for your project.',
    sections: [
      {
        heading: 'What to include in your request',
        bullets: [
          'Material names, sizes and required quantities.',
          'Your site location and preferred delivery date.',
          'Any brand, grade or specification required by your builder.',
          'Your phone or WhatsApp number for follow-up.',
        ],
      },
      {
        heading: 'Send your list',
        paragraphs: [
          `Call or WhatsApp ${PHONE} with your material list. You can also use the quote form on this page.`,
        ],
      },
    ],
  },
};

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[<>&'"]/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&#39;',
        '"': '&quot;',
      })[character],
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function absoluteUrl(path) {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function formatMoney(kobo) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function titleCase(value) {
  return String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function truncate(value, length = 155) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).replace(/[,.;:\s]+\S*$/, '')}…`;
}

function parseValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, entry]) => [
        key,
        parseValue(entry),
      ]),
    );
  }
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(parseValue);
  }
  return undefined;
}

function parseDocument(document) {
  const segments = document.name.split('/');
  return {
    id: decodeURIComponent(segments[segments.length - 1]),
    ...Object.fromEntries(
      Object.entries(document.fields || {}).map(([key, value]) => [
        key,
        parseValue(value),
      ]),
    ),
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, options = {}, attempts = 2) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) return response;
      if (attempt < attempts && (response.status === 429 || response.status >= 500)) {
        await delay(attempt * 1000);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(attempt * 1000);
    }
  }

  throw lastError;
}

function firestoreBase() {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new Error('VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID are required');
  }
  return {
    apiKey,
    url:
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents`,
  };
}

async function fetchCollection(pathSegments) {
  const { apiKey, url: baseUrl } = firestoreBase();
  const path = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
  const documents = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({ key: apiKey, pageSize: '300' });
    if (pageToken) params.set('pageToken', pageToken);
    const url =
      `${baseUrl}/businesses/${encodeURIComponent(BUSINESS_ID)}/${path}` +
      `?${params.toString()}`;
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Firestore ${path} request failed with ${response.status}${
          detail ? `: ${detail.slice(0, 200)}` : ''
        }`,
      );
    }
    const payload = await response.json();
    if (Array.isArray(payload.documents)) {
      documents.push(...payload.documents.map(parseDocument));
    }
    pageToken = payload.nextPageToken || '';
  } while (pageToken);

  return documents;
}

async function fetchCollectionGroup(collectionId) {
  const { apiKey, url: baseUrl } = firestoreBase();
  const url = `${baseUrl}:runQuery?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId, allDescendants: true }],
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Firestore ${collectionId} collection group failed with ${response.status}${
        detail ? `: ${detail.slice(0, 200)}` : ''
      }`,
    );
  }

  const payload = await response.json();
  return payload
    .filter((entry) => entry.document)
    .map((entry) => parseDocument(entry.document));
}

async function loadCatalogue() {
  const [products, categories, variants] = await Promise.all([
    fetchCollection(['products']),
    fetchCollection(['categories']),
    fetchCollectionGroup('variants'),
  ]);

  const activeProducts = products.filter((product) => product.active === true);
  const activeCategories = categories.filter((category) => category.active === true);
  const activeVariants = variants.filter(
    (variant) =>
      variant.businessId === BUSINESS_ID &&
      variant.active === true &&
      activeProducts.some((product) => product.id === variant.productId),
  );

  const categoryById = new Map(activeCategories.map((category) => [category.id, category]));
  const variantsByProduct = new Map();
  for (const variant of activeVariants) {
    const list = variantsByProduct.get(variant.productId) || [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  return {
    products: activeProducts.map((product) => ({
      ...product,
      categoryName: categoryById.get(product.categoryId)?.name,
    })),
    categories: activeCategories,
    variantsByProduct,
  };
}

const PLACEHOLDER_PATTERN =
  /\b(draft|confirm|confirmation|needs? confirmation|to be confirmed|tbc)\b/i;

function usableDescription(value) {
  const text = String(value || '').trim();
  return text.length >= 40 && !PLACEHOLDER_PATTERN.test(text);
}

function categoryContentFor(categoryId, categoryName) {
  if (categoryId && categoryContent[categoryId]) return categoryContent[categoryId];
  if (categoryName) {
    const normalized = categoryName.toLowerCase();
    const match = Object.entries(categoryContent).find(
      ([key, value]) =>
        key !== '_default' &&
        value &&
        (normalized.includes(key.replace(/-/g, ' ')) ||
          key.replace(/-/g, ' ').includes(normalized)),
    );
    if (match) return match[1];
  }
  return categoryContent._default;
}

function productDescription(product, variants) {
  if (usableDescription(product.description)) return product.description.trim();
  const variant = variants[0] || {};
  const content = categoryContentFor(product.categoryId, product.categoryName);
  const brand = variant.brand ? ` Brand: ${variant.brand}.` : '';
  const unit = variant.unit ? ` Sold per ${variant.unit}.` : '';
  return `Buy ${product.name} from ${LEGAL_NAME}, trading as ${SITE_NAME}, in Lokoja, Kogi State.${brand}${unit} ${content.intro} Contact our sales desk for the current price, available quantity, bulk rates and delivery to your site.`;
}

function productPriceCopy(variants) {
  const prices = variants
    .map((variant) => Number(variant.sellingPrice) || 0)
    .filter((price) => price > 0);
  if (prices.length === 0) {
    return 'Current price is available on request. Contact our sales desk for today’s rate.';
  }
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const unit = variants[0]?.unit ? ` per ${variants[0].unit}` : '';
  return minimum === maximum
    ? `Current depot rate: ${formatMoney(minimum)}${unit}. Confirm price and quantity before payment.`
    : `Current depot rates: ${formatMoney(minimum)} to ${formatMoney(maximum)}${unit}. Confirm price and quantity before payment.`;
}

function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function faqSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

function webpageSchema(page) {
  return {
    '@type': 'WebPage',
    '@id': `${absoluteUrl(page.path)}#webpage`,
    url: absoluteUrl(page.path),
    name: page.title,
    description: page.description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#store` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/images/og/kings-building-materials.jpg`,
    },
    inLanguage: 'en-NG',
  };
}

function renderSections(sections = []) {
  return sections
    .map((section) => {
      const paragraphs = (section.paragraphs || [])
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('');
      const bullets = section.bullets?.length
        ? `<ul>${section.bullets
            .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
            .join('')}</ul>`
        : '';
      return `<section><h2>${escapeHtml(section.heading)}</h2>${paragraphs}${bullets}</section>`;
    })
    .join('');
}

function renderFaqs(faqs = []) {
  if (faqs.length === 0) return '';
  return `<section><h2>Frequently asked questions</h2>${faqs
    .map(
      (faq) =>
        `<div><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></div>`,
    )
    .join('')}</section>`;
}

function renderLinks(links = []) {
  if (links.length === 0) return '';
  return `<ul>${links
    .map(
      (link) =>
        `<li><a href="${escapeHtml(link.path)}">${escapeHtml(link.label)}</a></li>`,
    )
    .join('')}</ul>`;
}

function renderFallback(page) {
  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Products', path: '/products' },
    { label: 'Guides', path: '/guides' },
    { label: 'Contact', path: '/contact' },
    { label: 'Request a quote', path: '/request-quote' },
  ];
  return `<div class="seo-fallback">
<header>
  <a class="seo-brand" href="/">${escapeHtml(SITE_NAME)}</a>
  <nav aria-label="Primary">${navLinks
    .map((link) => `<a href="${link.path}">${escapeHtml(link.label)}</a>`)
    .join('')}</nav>
</header>
<main>
  ${
    page.breadcrumbs?.length
      ? `<nav aria-label="Breadcrumb">${page.breadcrumbs
          .map((item) =>
            item.path
              ? `<a href="${item.path}">${escapeHtml(item.name)}</a>`
              : `<span>${escapeHtml(item.name)}</span>`,
          )
          .join(' / ')}</nav>`
      : ''
  }
  <h1>${escapeHtml(page.h1)}</h1>
  <p>${escapeHtml(page.intro)}</p>
  ${renderSections(page.sections)}
  ${renderFaqs(page.faqs)}
  ${renderLinks(page.links)}
  <p><a href="${escapeHtml(PHONE_HREF)}">Call ${escapeHtml(PHONE)}</a></p>
</main>
<footer>
  <p>${escapeHtml(LEGAL_NAME)} (${escapeHtml(SITE_NAME)}) · ${escapeHtml(ADDRESS)} · ${escapeHtml(PHONE)}</p>
</footer>
</div>`;
}

const FALLBACK_STYLE = `<style id="seo-fallback-style">
.seo-fallback{font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;max-width:1120px;margin:0 auto;padding:24px 16px;color:#172B4D;line-height:1.65}
.seo-fallback header{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;border-bottom:1px solid #dfe1e6;padding-bottom:16px;margin-bottom:24px}
.seo-fallback .seo-brand{font-size:18px;font-weight:800;color:#172B4D;text-decoration:none}
.seo-fallback nav a{display:inline-block;margin:0 12px 4px 0;color:#0b5fff;text-decoration:none;font-size:14px;font-weight:600}
.seo-fallback nav span{font-size:13px;color:#6b778c}
.seo-fallback h1{font-size:clamp(26px,4vw,38px);line-height:1.2;margin:16px 0 12px}
.seo-fallback h2{font-size:20px;line-height:1.3;margin:26px 0 8px}
.seo-fallback h3{font-size:16px;margin:16px 0 4px}
.seo-fallback p,.seo-fallback li{font-size:15px;color:#42526e}
.seo-fallback ul{padding-left:20px}
.seo-fallback a{color:#0b5fff}
.seo-fallback footer{margin-top:36px;border-top:1px solid #dfe1e6;padding-top:16px;font-size:13px;color:#6b778c}
</style>`;

function replaceMeta(html, attribute, key, value) {
  const pattern = new RegExp(
    `<meta\\s+${attribute}="${escapeRegExp(key)}"[^>]*>`,
    'i',
  );
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `${tag}\n</head>`);
}

function replaceCanonical(html, url) {
  return html.replace(
    /<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
  );
}

function replaceAlternate(html, hreflang, url) {
  const pattern = new RegExp(
    `<link\\s+rel="alternate"\\s+hreflang="${escapeRegExp(hreflang)}"[^>]*>`,
    'i',
  );
  return html.replace(
    pattern,
    `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(url)}" />`,
  );
}

function breadcrumbSchemaId(path) {
  if (path.startsWith('/products/')) return 'product-breadcrumb-schema';
  if (path.startsWith('/categories/')) return 'category-breadcrumb-schema';
  return 'page-breadcrumb-schema';
}

function schemaIdFor(schema) {
  if (schema['@type'] === 'Product') return 'product-schema';
  if (schema['@type'] === 'Article') return 'article-schema';
  if (schema['@type'] === 'ItemList') return 'itemlist-schema';
  if (schema['@type'] === 'FAQPage') return 'faq-schema';
  if (schema['@type'] === 'BreadcrumbList') return 'page-breadcrumb-schema';
  return undefined;
}

function renderHtml(template, page) {
  const canonical = absoluteUrl(page.path);
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = replaceMeta(html, 'name', 'description', page.description);
  html = replaceCanonical(html, canonical);
  html = replaceAlternate(html, 'en-NG', canonical);
  html = replaceAlternate(html, 'x-default', canonical);
  html = replaceMeta(html, 'property', 'og:type', page.type || 'website');
  html = replaceMeta(html, 'property', 'og:title', page.title);
  html = replaceMeta(html, 'property', 'og:description', page.description);
  html = replaceMeta(html, 'property', 'og:url', canonical);
  html = replaceMeta(html, 'name', 'twitter:title', page.title);
  html = replaceMeta(html, 'name', 'twitter:description', page.description);
  html = replaceMeta(html, 'name', 'twitter:url', canonical);

  try {
    const ldPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i;
    const match = html.match(ldPattern);
    if (match) {
      const data = JSON.parse(match[1]);
      const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
      const baseGraph = graph.filter(
        (node) =>
          !['WebPage', 'BreadcrumbList', 'Product', 'Article', 'FAQPage', 'ItemList'].includes(
            node['@type'],
          ),
      );
      html = html.replace(
        match[0],
        `<script type="application/ld+json">\n${JSON.stringify(
          { '@context': 'https://schema.org', '@graph': [...baseGraph, webpageSchema(page)] },
          null,
          2,
        )}\n</script>`,
      );

      const webpagePattern =
        /<script type="application\/ld\+json" id="webpage-schema">[\s\S]*?<\/script>/i;
      if (webpagePattern.test(html)) {
        html = html.replace(
          webpagePattern,
          `<script type="application/ld+json" id="webpage-schema">${JSON.stringify({
            '@context': 'https://schema.org',
            ...webpageSchema(page),
          })}</script>`,
        );
      }

      const pageSchemas = [
        ...(page.breadcrumbs?.length
          ? [
              {
                id: breadcrumbSchemaId(page.path),
                schema: breadcrumbSchema(page.breadcrumbs),
              },
            ]
          : []),
        ...(page.schemas || []).map((schema) => ({
          id: schemaIdFor(schema),
          schema,
        })),
        ...(faqSchema(page.faqs)
          ? [{ id: 'faq-schema', schema: faqSchema(page.faqs) }]
          : []),
      ].filter((entry) => entry.id);

      const schemaScripts = pageSchemas
        .map(
          (entry) =>
            `<script type="application/ld+json" id="${entry.id}">${JSON.stringify({
              '@context': 'https://schema.org',
              ...entry.schema,
            })}</script>`,
        )
        .join('\n');

      if (schemaScripts) {
        html = html.replace('</head>', `${schemaScripts}\n</head>`);
      }
    }
  } catch (error) {
    console.warn(`[static-pages] Could not update JSON-LD for ${page.path}: ${error.message}`);
  }

  html = html.replace('</head>', `${FALLBACK_STYLE}\n</head>`);
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${renderFallback(page)}</div>`,
  );

  return html;
}

function writePage(page, template) {
  const output = renderHtml(template, page);
  const segments = page.path.split('/').filter(Boolean);
  const fileName = `${segments.pop()}.html`;
  const directory = join(distDir, ...segments);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, fileName), output, 'utf8');
}

function buildStaticPages(catalogue) {
  const pages = [];
  const categoryLinks = catalogue.categories.map((category) => ({
    label: category.name,
    path: `/categories/${encodeURIComponent(category.id)}`,
  }));

  for (const [routePath, meta] of Object.entries(STATIC_META)) {
    pages.push({
      path: routePath,
      title: meta.title,
      description: meta.description,
      h1: meta.h1,
      intro: meta.intro,
      sections: meta.sections,
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: meta.h1, path: routePath },
      ],
      links: routePath === '/products' ? categoryLinks : [],
      faqs: [],
      schemas:
        routePath === '/products' && categoryLinks.length > 0
          ? [
              {
                '@type': 'ItemList',
                name: 'Building material categories',
                itemListElement: categoryLinks.map((link, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: link.label,
                  url: absoluteUrl(link.path),
                })),
              },
            ]
          : [],
    });
  }

  for (const page of Object.values(sitePages)) {
    pages.push({
      path: page.path,
      title: page.seoTitle || page.title,
      description: page.description,
      h1: page.title,
      intro: page.intro,
      sections: page.sections,
      faqs: page.faqs || [],
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: page.title, path: page.path },
      ],
      schemas: [],
    });
  }

  pages.push({
    path: '/guides',
    title: `Building Material Buying Guides | ${SITE_NAME}`,
    description:
      'Practical buying guides for cement, iron rods, roofing, plumbing and construction materials in Lokoja, Kogi State from Kings Building Materials.',
    h1: 'Building material buying guides',
    intro:
      'Practical guides for builders, contractors and homeowners in Lokoja and Kogi State: cement grades, iron rod sizes, quantity estimates, roofing, plumbing and delivery.',
    sections: [
      {
        heading: 'Latest guides',
        paragraphs: [
          'Use these guides to plan quantities, compare common materials and ask the right questions before you order.',
        ],
      },
    ],
    links: guides.map((guide) => ({
      label: guide.title,
      path: `/guides/${encodeURIComponent(guide.slug)}`,
    })),
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Guides', path: '/guides' },
    ],
    schemas: [
      {
        '@type': 'ItemList',
        name: 'Building material buying guides',
        itemListElement: guides.map((guide, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: guide.title,
          url: absoluteUrl(`/guides/${encodeURIComponent(guide.slug)}`),
        })),
      },
    ],
  });

  for (const guide of guides) {
    const routePath = `/guides/${encodeURIComponent(guide.slug)}`;
    pages.push({
      path: routePath,
      title: guide.seoTitle || guide.title,
      description: guide.description,
      type: 'article',
      h1: guide.title,
      intro: guide.intro,
      sections: guide.sections,
      faqs: guide.faqs || [],
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Guides', path: '/guides' },
        { name: guide.title, path: routePath },
      ],
      schemas: [
        {
          '@type': 'Article',
          headline: guide.title,
          description: guide.description,
          datePublished: guide.published,
          dateModified: guide.updated,
          inLanguage: 'en-NG',
          mainEntityOfPage: { '@type': 'WebPage', '@id': `${absoluteUrl(routePath)}#webpage` },
          image: [`${SITE_URL}/images/og/kings-building-materials.jpg`],
          author: {
            '@type': 'Organization',
            name: LEGAL_NAME,
            alternateName: SITE_NAME,
            url: absoluteUrl('/'),
          },
          publisher: { '@id': `${SITE_URL}/#store` },
        },
      ],
    });
  }

  for (const category of catalogue.categories) {
    const routePath = `/categories/${encodeURIComponent(category.id)}`;
    const content = categoryContentFor(category.id, category.name);
    const products = catalogue.products.filter(
      (product) => product.categoryId === category.id,
    );
    pages.push({
      path: routePath,
      title: `${category.name} in Lokoja | ${SITE_NAME}`,
      description: truncate(
        `${content.intro} Browse available ${category.name.toLowerCase()} at ${SITE_NAME} in Lokoja, Kogi State and contact us for current prices and delivery.`,
      ),
      h1: `${category.name} in Lokoja`,
      intro: content.intro,
      sections: [
        {
          heading: `Available ${category.name.toLowerCase()}`,
          bullets: products.map(
            (product) =>
              `${product.name}${
                catalogue.variantsByProduct.get(product.id)?.[0]?.unit
                  ? ` — sold per ${catalogue.variantsByProduct.get(product.id)[0].unit}`
                  : ''
              }`,
          ),
        },
        {
          heading: 'What to confirm before buying',
          bullets: content.buyingTips,
        },
      ],
      faqs: content.faqs,
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Products', path: '/products' },
        { name: category.name, path: routePath },
      ],
      schemas: products.length
        ? [
            {
              '@type': 'ItemList',
              name: `${category.name} available in Lokoja`,
              itemListElement: products.map((product, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: product.name,
                url: absoluteUrl(`/products/${encodeURIComponent(product.id)}`),
              })),
            },
          ]
        : [],
    });
  }

  for (const product of catalogue.products) {
    const routePath = `/products/${encodeURIComponent(product.id)}`;
    const variants = catalogue.variantsByProduct.get(product.id) || [];
    const content = categoryContentFor(product.categoryId, product.categoryName);
    const description = productDescription(product, variants);
    const priceCopy = productPriceCopy(variants);
    const specs = [];
    for (const variant of variants) {
      for (const [key, value] of Object.entries(variant.attributes || {})) {
        const text = String(value ?? '').trim();
        if (text && !PLACEHOLDER_PATTERN.test(text)) {
          const label = titleCase(key);
          if (!specs.some((entry) => entry.label === label)) {
            specs.push({ label, value: text });
          }
        }
      }
    }
    const prices = variants
      .map((variant) => Number(variant.sellingPrice) || 0)
      .filter((price) => price > 0);
    const inStock = variants.some(
      (variant) =>
        variant.quantityOnHand === undefined ||
        variant.quantityOnHand === null ||
        Number(variant.quantityOnHand) > 0,
    );

    pages.push({
      path: routePath,
      title: `${product.name} | ${SITE_NAME}`,
      description: truncate(
        `Buy ${product.name} in Lokoja from ${SITE_NAME}. ${priceCopy} Order by phone or WhatsApp for pickup or site delivery in Kogi State.`,
      ),
      type: 'product',
      h1: product.name,
      intro: description,
      sections: [
        ...(specs.length
          ? [
              {
                heading: 'Available options',
                bullets: specs
                  .slice(0, 12)
                  .map((spec) => `${spec.label}: ${spec.value}`),
              },
            ]
          : []),
        {
          heading: `Buying ${(product.categoryName || 'building materials').toLowerCase()} in Lokoja`,
          paragraphs: [content.intro],
          bullets: content.buyingTips,
        },
        {
          heading: 'Price and availability',
          paragraphs: [
            priceCopy,
            `Call or WhatsApp ${PHONE} to confirm stock, bulk rates and delivery to your site.`,
          ],
        },
      ],
      faqs: content.faqs,
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Products', path: '/products' },
        ...(product.categoryName
          ? [
              {
                name: product.categoryName,
                path: `/categories/${encodeURIComponent(product.categoryId)}`,
              },
            ]
          : []),
        { name: product.name, path: routePath },
      ],
      links: [
        ...(product.categoryName
          ? [
              {
                label: `More ${product.categoryName.toLowerCase()}`,
                path: `/categories/${encodeURIComponent(product.categoryId)}`,
              },
            ]
          : []),
        { label: 'Full materials catalogue', path: '/products' },
        { label: 'Building material buying guides', path: '/guides' },
        { label: 'Delivery and pickup information', path: '/delivery' },
      ],
      schemas: [
        {
          '@type': 'Product',
          '@id': `${absoluteUrl(routePath)}#product`,
          name: product.name,
          url: absoluteUrl(routePath),
          image: [
            product.imageUrl
              ? absoluteUrl(product.imageUrl)
              : `${SITE_URL}/images/og/kings-building-materials.jpg`,
          ],
          description,
          sku: product.id,
          ...(variants[0]?.brand
            ? { brand: { '@type': 'Brand', name: variants[0].brand } }
            : {}),
          ...(product.categoryName ? { category: product.categoryName } : {}),
          ...(prices.length
            ? {
                offers: {
                  '@type': 'AggregateOffer',
                  url: absoluteUrl(routePath),
                  priceCurrency: 'NGN',
                  lowPrice: (Math.min(...prices) / 100).toFixed(2),
                  highPrice: (Math.max(...prices) / 100).toFixed(2),
                  offerCount: prices.length,
                  availability: inStock
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
                  seller: { '@type': 'Organization', name: SITE_NAME },
                },
              }
            : {}),
        },
      ],
    });
  }

  return pages;
}

async function main() {
  if (!existsSync(templatePath)) {
    console.warn('[static-pages] dist/index.html not found. Run vite build first.');
    return;
  }

  const template = readFileSync(templatePath, 'utf8');
  let catalogue = { products: [], categories: [], variantsByProduct: new Map() };

  try {
    catalogue = await loadCatalogue();
  } catch (error) {
    console.warn(`[static-pages] Live catalogue unavailable: ${error.message}`);
  }

  const pages = buildStaticPages(catalogue);
  for (const page of pages) {
    writePage(page, template);
  }

  const productCount = pages.filter((page) => page.path.startsWith('/products/')).length;
  const categoryCount = pages.filter((page) => page.path.startsWith('/categories/')).length;
  console.log(
    `[static-pages] Wrote ${pages.length} HTML pages (${productCount} products, ${categoryCount} categories).`,
  );
}

main().catch((error) => {
  console.warn(`[static-pages] Generation failed: ${error.message}`);
});
