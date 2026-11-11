import { BUSINESS } from '@/config/business';

export const SITE_URL = BUSINESS.website;
export const SITE_NAME = BUSINESS.name;
export const SITE_LEGAL_NAME = BUSINESS.legalName;
export const DEFAULT_TITLE =
  'Kings Building Materials | Cement, Iron Rods & Roofing in Lokoja';
export const DEFAULT_DESCRIPTION =
  'Wholesale & retail building materials in Lokoja, Kogi State. Buy certified cement, TMT iron rods, roofing, timber, plumbing & tools with prompt site delivery.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og/kings-building-materials.jpg`;
export const DEFAULT_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
