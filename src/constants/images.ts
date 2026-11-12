export const BRAND_ASSETS = {
  logo: '/logo.png',
  logoWhite: '/logo-white.png',
  logoIcon: '/logo-icon.png',
  logoStacked: '/logo-stacked.png',
  logoStackedWhite: '/logo-stacked-white.png',
  favicon: '/favicon.ico',
} as const;

export const PAGE_IMAGES = {
  heroDepot: '/images/hero/depot-hero.jpg',
  aboutDepotFacility: '/images/about/depot-facility.jpg',
  aboutFleetDelivery: '/images/about/fleet-delivery.jpg',
  aboutQualityAssurance: '/images/about/quality-assurance.jpg',
  contactStorefront: '/images/contact/depot-storefront.jpg',
  quoteMaterialTakeoff: '/images/quote/material-takeoff.jpg',
} as const;

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'Cement & Aggregates': '/images/categories/cement.jpg',
  'Cement & Building Materials': '/images/categories/cement.jpg',
  'Cement': '/images/categories/cement.jpg',
  'TMT Iron Rods & Steel': '/images/categories/steel.jpg',
  'Iron Rods': '/images/categories/steel.jpg',
  'Hardwood Timber & Boards': '/images/categories/timber.jpg',
  'Timber': '/images/categories/timber.jpg',
  'Wood': '/images/categories/timber.jpg',
  'Roofing Sheets & Ceilings': '/images/categories/roofing.jpg',
  'Roofing & Ceiling': '/images/categories/roofing.jpg',
  'Roofing': '/images/categories/roofing.jpg',
  'Ceiling': '/images/categories/roofing.jpg',
  'Plumbing & PVC Pipes': '/images/categories/plumbing.jpg',
  'Plumbing & Pipes': '/images/categories/plumbing.jpg',
  'Plumbing': '/images/categories/plumbing.jpg',
  'Wire Mesh & Nails': '/images/categories/nails-wire.jpg',
  'Nails & Hardware': '/images/categories/nails-wire.jpg',
  'Wire Mesh, Binding Wire & Nails': '/images/categories/nails-wire.jpg',
  'Nails': '/images/categories/nails-wire.jpg',
  'Binding': '/images/categories/nails-wire.jpg',
  'Paints & Finishes': '/images/categories/paints.jpg',
  'Painting Materials': '/images/categories/paints.jpg',
  'Paint': '/images/categories/paints.jpg',
  'Construction Tools & Equipment': '/images/categories/tools.jpg',
  'Construction Tools & Hardware': '/images/categories/tools.jpg',
  'Ropes & Measuring': '/images/categories/tools.jpg',
  'Electrical & Lighting': '/images/categories/tools.jpg',
  'Sand, Granite & Aggregates': '/images/categories/cement.jpg',
  'Tiles & Finishing': '/images/categories/paints.jpg',
  'Tools': '/images/categories/tools.jpg',
};

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // Cement
  'dangote': '/images/products/dangote-cement.jpg',
  'bua': '/images/products/bua-cement.jpg',

  // Iron Rods
  '12mm': '/images/products/tmt-iron-rods-12mm.jpg',
  '10mm': '/images/products/tmt-iron-rods-10mm.jpg',
  '8mm': '/images/products/iron-rod-8mm.jpg',
  '6mm': '/images/products/iron-rod-6mm.jpg',

  // Nails
  'nails 2.5': '/images/products/wire-nails-2-5.jpg',
  'nails 3': '/images/products/wire-nails-3.jpg',
  'concrete nails': '/images/products/concrete-nails-2.jpg',

  // Timber / Plywood
  'plywood 12mm': '/images/products/marine-plywood-12mm.jpg',
  'plywood 18mm': '/images/products/marine-plywood-18mm.jpg',

  // Roofing
  'roofing': '/images/products/roofing-sheet-longspan.jpg',
  'pvc ceiling': '/images/products/pvc-ceiling-panels.jpg',

  // Paint
  'emulsion': '/images/products/emulsion-paint-white.jpg',
  'textured': '/images/products/textured-paint-20l.jpg',

  // Wire & Tools
  'binding wire': '/images/products/binding-wire-roll.jpg',
  'paint brush': '/images/products/paint-brush-heavy-duty.jpg',
  'roller': '/images/products/roller-brush-kit.jpg',
};

/**
 * Returns a high-quality product image based on product name and optional category
 */
export function getProductImage(productName?: string, categoryName?: string): string {
  if (!productName) return '/images/hero/depot-hero.jpg';
  const nameLower = productName.toLowerCase();

  // Match specific products by keyword
  if (nameLower.includes('dangote')) return '/images/products/dangote-cement.jpg';
  if (nameLower.includes('bua')) return '/images/products/bua-cement.jpg';
  if (nameLower.includes('12mm')) return '/images/products/tmt-iron-rods-12mm.jpg';
  if (nameLower.includes('10mm')) return '/images/products/tmt-iron-rods-10mm.jpg';
  if (nameLower.includes('8mm')) return '/images/products/iron-rod-8mm.jpg';
  if (nameLower.includes('6mm')) return '/images/products/iron-rod-6mm.jpg';
  if (nameLower.includes('concrete nail') || nameLower.includes('hardened')) {
    return '/images/products/concrete-nails-2.jpg';
  }
  if (nameLower.includes('2.5') && nameLower.includes('nail')) {
    return '/images/products/wire-nails-2-5.jpg';
  }
  if (nameLower.includes('nail')) {
    return '/images/products/wire-nails-3.jpg';
  }
  if (nameLower.includes('plywood 18mm') || (nameLower.includes('plywood') && nameLower.includes('18'))) {
    return '/images/products/marine-plywood-18mm.jpg';
  }
  if (nameLower.includes('plywood') || nameLower.includes('timber') || nameLower.includes('board')) {
    return '/images/products/marine-plywood-12mm.jpg';
  }
  if (nameLower.includes('roofing') || nameLower.includes('long span') || nameLower.includes('aluminium')) {
    return '/images/products/roofing-sheet-longspan.jpg';
  }
  if (nameLower.includes('conduit')) {
    return '/images/categories/tools.jpg';
  }
  if (nameLower.includes('pipe') || nameLower.includes('tank')) {
    return '/images/categories/plumbing.jpg';
  }
  if (nameLower.includes('cable') || nameLower.includes('switch') || nameLower.includes('socket')) {
    return '/images/categories/tools.jpg';
  }
  if (nameLower.includes('tile')) {
    return '/images/categories/paints.jpg';
  }
  if (nameLower.includes('pvc') || nameLower.includes('ceiling')) {
    return '/images/products/pvc-ceiling-panels.jpg';
  }
  if (nameLower.includes('textured')) {
    return '/images/products/textured-paint-20l.jpg';
  }
  if (nameLower.includes('paint') || nameLower.includes('emulsion')) {
    return '/images/products/emulsion-paint-white.jpg';
  }
  if (nameLower.includes('binding wire') || nameLower.includes('annealed') || nameLower.includes('wire roll')) {
    return '/images/products/binding-wire-roll.jpg';
  }
  if (nameLower.includes('brush') && !nameLower.includes('roller')) {
    return '/images/products/paint-brush-heavy-duty.jpg';
  }
  if (nameLower.includes('roller')) {
    return '/images/products/roller-brush-kit.jpg';
  }

  // Fallback to category image if available
  if (categoryName && CATEGORY_IMAGE_MAP[categoryName]) {
    return CATEGORY_IMAGE_MAP[categoryName];
  }

  return '/images/products/dangote-cement.jpg';
}

/**
 * Returns a high-quality category image
 */
export function getCategoryImage(categoryName?: string): string {
  if (!categoryName) return '/images/categories/cement.jpg';
  if (CATEGORY_IMAGE_MAP[categoryName]) return CATEGORY_IMAGE_MAP[categoryName];

  const catLower = categoryName.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (catLower.includes(key.toLowerCase()) || key.toLowerCase().includes(catLower)) {
      return url;
    }
  }

  return '/images/categories/cement.jpg';
}
