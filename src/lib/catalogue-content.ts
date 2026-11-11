import categoryContentData from '@/content/category-content.json';

export interface ContentFaq {
  question: string;
  answer: string;
}

export interface CategoryContent {
  intro: string;
  buyingTips: string[];
  faqs: ContentFaq[];
}

const CATEGORY_CONTENT = categoryContentData as Record<string, CategoryContent>;
const DEFAULT_CATEGORY_CONTENT = CATEGORY_CONTENT._default;

export function getCategoryContent(
  categoryId?: string,
  categoryName?: string,
): CategoryContent {
  if (categoryId && CATEGORY_CONTENT[categoryId]) {
    return CATEGORY_CONTENT[categoryId];
  }

  if (categoryName) {
    const normalized = categoryName.toLowerCase();
    const match = Object.entries(CATEGORY_CONTENT).find(
      ([key, value]) =>
        key !== '_default' &&
        (normalized.includes(key.replace(/-/g, ' ')) ||
          key.replace(/-/g, ' ').includes(normalized)) &&
        value,
    );
    if (match) return match[1];
  }

  return DEFAULT_CATEGORY_CONTENT;
}

const PLACEHOLDER_PATTERN = /\b(draft|confirm|confirmation|needs? confirmation|to be confirmed|tbc)\b/i;

export function isUsableDescription(value?: string): boolean {
  const text = value?.trim();
  if (!text || text.length < 40) return false;
  return !PLACEHOLDER_PATTERN.test(text);
}

export function cleanDescription(value?: string): string | undefined {
  const text = value?.trim();
  return isUsableDescription(text) ? text : undefined;
}

interface ProductDescriptionInput {
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  unit?: string;
  brand?: string;
}

export function getProductDescription({
  name,
  description,
  categoryId,
  categoryName,
  unit,
  brand,
}: ProductDescriptionInput): string {
  const saved = cleanDescription(description);
  if (saved) return saved;

  const categoryIntro = getCategoryContent(categoryId, categoryName).intro;
  const brandCopy = brand ? ` Brand: ${brand}.` : '';
  const unitCopy = unit ? ` Sold per ${unit}.` : '';

  return `Buy ${name} from Blessed Kings Enterprises, trading as Kings Building Materials, in Lokoja, Kogi State.${brandCopy}${unitCopy} ${categoryIntro} Contact our sales desk for the current price, available quantity, bulk rates and delivery to your site.`;
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  optionsOnList: 'Options',
  alternativeName: 'Also called',
  typeOptions: 'Type',
  material: 'Material',
  materialOptions: 'Material options',
  sizes: 'Sizes',
  sizeOptions: 'Size options',
  sheetSizes: 'Sheet sizes',
  thicknessOptions: 'Thickness',
  brandOptions: 'Brands available',
  finishOptions: 'Finish options',
  colourOptions: 'Colour options',
  weightOptions: 'Weight options',
  lengthOptions: 'Length options',
  diameterOptions: 'Diameter options',
  gradeOptions: 'Grade options',
};

function labelForAttribute(key: string): string {
  if (ATTRIBUTE_LABELS[key]) return ATTRIBUTE_LABELS[key];
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export interface SpecEntry {
  label: string;
  value: string;
}

export function getSpecEntries(
  attributes?: Record<string, string> | null,
): SpecEntry[] {
  if (!attributes) return [];

  return Object.entries(attributes)
    .map(([key, value]) => ({
      label: labelForAttribute(key),
      value: String(value ?? '').trim(),
    }))
    .filter(
      (entry) =>
        entry.value.length > 0 &&
        !PLACEHOLDER_PATTERN.test(entry.value) &&
        !PLACEHOLDER_PATTERN.test(entry.label),
    );
}

export function getStockLabel(quantity?: number): string {
  if (quantity === undefined || Number.isNaN(quantity)) return 'Ask for availability';
  return quantity > 0 ? 'In stock' : 'Out of stock';
}
