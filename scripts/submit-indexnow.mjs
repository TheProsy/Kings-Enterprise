import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const KEY = '86a5b82bfe8b355f832d99a613681bc0';
const FALLBACK_SITE_URL = 'https://www.blessedkingsenterprises.com.ng';

function readSiteUrl() {
  try {
    const data = JSON.parse(
      readFileSync(join(rootDir, 'src', 'content', 'business.json'), 'utf8'),
    );
    return String(data.website || FALLBACK_SITE_URL).replace(/\/+$/, '');
  } catch {
    return FALLBACK_SITE_URL;
  }
}

async function main() {
  const siteUrl = readSiteUrl();
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const response = await fetch(sitemapUrl, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${sitemapUrl}: ${response.status}`);
  }

  const sitemap = await response.text();
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );

  if (urlList.length === 0) {
    throw new Error('No URLs found in sitemap.');
  }

  const host = new URL(siteUrl).host;
  const submit = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key: KEY,
      keyLocation: `${siteUrl}/${KEY}.txt`,
      urlList,
    }),
  });

  console.log(
    `[indexnow] Submitted ${urlList.length} URLs for ${host}: ${submit.status} ${submit.statusText}`,
  );
  if (!submit.ok) {
    console.log(await submit.text());
  }
}

main().catch((error) => {
  console.error(`[indexnow] Submission failed: ${error.message}`);
  process.exitCode = 1;
});
