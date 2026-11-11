import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const FALLBACK_SITE_URL = 'https://www.blessedkingsenterprises.com.ng';

function readSiteUrl() {
  try {
    const data = JSON.parse(
      readFileSync(join(rootDir, 'src', 'content', 'business.json'), 'utf8'),
    );
    return typeof data.website === 'string' ? data.website : FALLBACK_SITE_URL;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

const envFile = join(rootDir, '.env');
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    console.warn(`[sitemap] Could not load .env: ${error.message}`);
  }
}

const SITE_URL = readSiteUrl().replace(/\/+$/, '');
const BUSINESS_ID = process.env.BUSINESS_ID || 'default-business';
const TODAY = new Date().toISOString().slice(0, 10);

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/products', changefreq: 'daily', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.8' },
  { path: '/request-quote', changefreq: 'monthly', priority: '0.8' },
  { path: '/guides', changefreq: 'weekly', priority: '0.8' },
  { path: '/delivery', changefreq: 'monthly', priority: '0.6' },
  { path: '/returns', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

function readGuides() {
  try {
    const data = JSON.parse(
      readFileSync(join(rootDir, 'src', 'content', 'guides.json'), 'utf8'),
    );
    return Array.isArray(data.guides) ? data.guides : [];
  } catch {
    return [];
  }
}

function escapeXml(value) {
  return String(value).replace(
    /[<>&'"]/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[character],
  );
}

function toDate(value) {
  if (!value) return TODAY;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? TODAY : parsed.toISOString().slice(0, 10);
}

function absoluteUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value, `${SITE_URL}/`).href;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, attempts = 2) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (response.ok) return response;
      if (attempt < attempts && (response.status === 429 || response.status >= 500)) {
        await delay(attempt * 1000);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay(attempt * 1000);
      }
    }
  }

  throw lastError;
}

async function fetchDocuments(pathSegments) {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID are required');
  }

  const path = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
  const documents = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({
      key: apiKey,
      pageSize: '300',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents/businesses/${encodeURIComponent(BUSINESS_ID)}` +
      `/${path}?${params.toString()}`;

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
      documents.push(...payload.documents);
    }
    pageToken = payload.nextPageToken || '';
  } while (pageToken);

  return documents;
}

function documentId(document) {
  const segments = document.name.split('/');
  return decodeURIComponent(segments[segments.length - 1]);
}

function isActive(document) {
  return document.fields?.active?.booleanValue === true;
}

async function loadCatalogue() {
  const [productDocuments, categoryDocuments] = await Promise.all([
    fetchDocuments(['products']),
    fetchDocuments(['categories']),
  ]);

  const products = productDocuments.filter(isActive).map((document) => ({
    id: documentId(document),
    imageUrl: document.fields?.imageUrl?.stringValue || '',
    lastmod: toDate(document.updateTime || document.fields?.updatedAt?.timestampValue),
  }));

  const categories = categoryDocuments.filter(isActive).map((document) => ({
    id: documentId(document),
    lastmod: toDate(document.updateTime || document.fields?.updatedAt?.timestampValue),
  }));

  return { products, categories };
}

function buildSitemap(products, categories) {
  const seen = new Set();
  const urls = [];

  for (const route of STATIC_ROUTES) {
    const loc = `${SITE_URL}${route.path}`;
    seen.add(loc);
    urls.push({
      loc,
      lastmod: TODAY,
      changefreq: route.changefreq,
      priority: route.priority,
    });
  }

  for (const guide of readGuides()) {
    const loc = `${SITE_URL}/guides/${encodeURIComponent(guide.slug)}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push({
      loc,
      lastmod: toDate(guide.updated),
      changefreq: 'monthly',
      priority: '0.6',
    });
  }

  for (const category of categories) {
    const loc = `${SITE_URL}/categories/${encodeURIComponent(category.id)}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push({
      loc,
      lastmod: category.lastmod,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  for (const product of products) {
    const loc = `${SITE_URL}/products/${encodeURIComponent(product.id)}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push({
      loc,
      lastmod: product.lastmod,
      changefreq: 'weekly',
      priority: '0.7',
      image: absoluteUrl(product.imageUrl),
    });
  }

  const entries = urls.map((entry) => {
    const children = [
      `<loc>${escapeXml(entry.loc)}</loc>`,
      `<lastmod>${entry.lastmod}</lastmod>`,
      `<changefreq>${entry.changefreq}</changefreq>`,
      `<priority>${entry.priority}</priority>`,
    ];

    if (entry.image) {
      children.push(
        `<image:image><image:loc>${escapeXml(entry.image)}</image:loc></image:image>`,
      );
    }

    return `  <url>\n    ${children.join('\n    ')}\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

async function main() {
  let products = [];
  let categories = [];
  let usedLiveCatalogue = false;

  try {
    const catalogue = await loadCatalogue();
    products = catalogue.products;
    categories = catalogue.categories;
    usedLiveCatalogue = true;
  } catch (error) {
    console.warn(`[sitemap] Using static routes only: ${error.message}`);
  }

  mkdirSync(distDir, { recursive: true });
  const output = buildSitemap(products, categories);
  writeFileSync(join(distDir, 'sitemap.xml'), output, 'utf8');

  const mode = usedLiveCatalogue ? 'live catalogue' : 'static fallback';
  console.log(
    `[sitemap] Wrote ${output.match(/<url>/g)?.length ?? 0} URLs (${mode}; ` +
      `${products.length} products, ${categories.length} categories) to dist/sitemap.xml`,
  );
}

main().catch((error) => {
  console.warn(`[sitemap] Generation failed, leaving the static sitemap in place: ${error.message}`);
});
