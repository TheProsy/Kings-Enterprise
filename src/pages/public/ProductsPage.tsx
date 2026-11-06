import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProductImage } from '@/components/ui/ProductImage';
import { SearchInput } from '@/components/forms/SearchInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatMoney } from '@/lib/formatters';
import { catalogueService, type CatalogueItem } from '@/services';
import { Package, FileText } from 'lucide-react';
import { ROUTES } from '@/constants';
import { getProductImage } from '@/constants/images';

interface DisplayProduct {
  key: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  brand?: string;
  imageUrl?: string;
}

const FALLBACK_PRODUCTS: DisplayProduct[] = [
  {
    key: 'p1',
    name: 'Dangote Cement 42.5R 50kg',
    category: 'Cement',
    price: 520000,
    unit: 'bag',
    brand: 'Dangote',
    imageUrl: '/images/products/dangote-cement.jpg',
  },
  {
    key: 'p2',
    name: 'BUA Cement 42.5 50kg',
    category: 'Cement',
    price: 500000,
    unit: 'bag',
    brand: 'BUA',
    imageUrl: '/images/products/bua-cement.jpg',
  },
  {
    key: 'p3',
    name: '12mm High-Tensile Iron Rod (12m)',
    category: 'Iron Rods',
    price: 450000,
    unit: 'length',
    brand: 'Tiger',
    imageUrl: '/images/products/tmt-iron-rods-12mm.jpg',
  },
  {
    key: 'p4',
    name: '10mm High-Tensile Iron Rod (12m)',
    category: 'Iron Rods',
    price: 320000,
    unit: 'length',
    brand: 'Tiger',
    imageUrl: '/images/products/tmt-iron-rods-10mm.jpg',
  },
  {
    key: 'p5',
    name: '8mm Iron Rod (12m)',
    category: 'Iron Rods',
    price: 220000,
    unit: 'length',
    brand: 'Standard',
    imageUrl: '/images/products/iron-rod-8mm.jpg',
  },
  {
    key: 'p6',
    name: '6mm Iron Rod (12m)',
    category: 'Iron Rods',
    price: 150000,
    unit: 'length',
    brand: 'Standard',
    imageUrl: '/images/products/iron-rod-6mm.jpg',
  },
  {
    key: 'p7',
    name: 'Common Wire Nails 2.5 inches',
    category: 'Nails',
    price: 120000,
    unit: 'kg',
    brand: 'Diamond',
    imageUrl: '/images/products/wire-nails-2-5.jpg',
  },
  {
    key: 'p8',
    name: 'Common Wire Nails 3 inches',
    category: 'Nails',
    price: 120000,
    unit: 'kg',
    brand: 'Diamond',
    imageUrl: '/images/products/wire-nails-3.jpg',
  },
  {
    key: 'p9',
    name: 'Hardened Concrete Nails 2 inches',
    category: 'Nails',
    price: 150000,
    unit: 'pack',
    brand: 'Steel',
    imageUrl: '/images/products/concrete-nails-2.jpg',
  },
  {
    key: 'p10',
    name: 'Marine Plywood 12mm (4x8ft)',
    category: 'Wood',
    price: 850000,
    unit: 'sheet',
    brand: 'Standard',
    imageUrl: '/images/products/marine-plywood-12mm.jpg',
  },
  {
    key: 'p11',
    name: 'Emulsion Wall Paint White 20L',
    category: 'Paint',
    price: 450000,
    unit: 'drum',
    brand: 'Dulux',
    imageUrl: '/images/products/emulsion-paint-white.jpg',
  },
  {
    key: 'p12',
    name: 'Textured Exterior Paint 20L',
    category: 'Paint',
    price: 550000,
    unit: 'drum',
    brand: 'Berger',
    imageUrl: '/images/products/textured-paint-20l.jpg',
  },
  {
    key: 'p13',
    name: 'PVC Ceiling Panels (0.25x5.95m)',
    category: 'Ceiling',
    price: 350000,
    unit: 'bundle',
    brand: 'Star',
    imageUrl: '/images/products/pvc-ceiling-panels.jpg',
  },
  {
    key: 'p14',
    name: 'Annealed Binding Wire Roll',
    category: 'Binding',
    price: 80000,
    unit: 'roll',
    brand: 'Standard',
    imageUrl: '/images/products/binding-wire-roll.jpg',
  },
  {
    key: 'p15',
    name: 'Heavy-Duty Paint Brush 2.5"',
    category: 'Tools',
    price: 25000,
    unit: 'piece',
    brand: 'Harris',
    imageUrl: '/images/products/paint-brush-heavy-duty.jpg',
  },
  {
    key: 'p16',
    name: 'Pro Roller Brush Kit 9"',
    category: 'Tools',
    price: 40000,
    unit: 'set',
    brand: 'Harris',
    imageUrl: '/images/products/roller-brush-kit.jpg',
  },
];

export function ProductsPage() {
  const { productId, categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('q') || '';

  const [items, setItems] = useState<CatalogueItem[]>([]);
  const activeCategory = categoryParam || 'All';
  const [search, setSearch] = useState(searchParam);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    catalogueService
      .list()
      .then(({ items: catalogueItems }) => {
        if (active) setItems(catalogueItems);
      })
      .catch((error) => {
        console.error('Unable to load public catalogue:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const products = useMemo<DisplayProduct[]>(() => {
    if (loading) return [];
    if (items.length === 0) return FALLBACK_PRODUCTS;
    return items.map((item) => ({
      key: item.id,
      name: item.productName,
      category: item.categoryName || 'Building Materials',
      price: item.sellingPrice,
      unit: item.unit,
      brand: item.brand,
      imageUrl: item.imageUrl || getProductImage(item.productName, item.categoryName),
    }));
  }, [items, loading]);

  const selectCategory = (category: string) => {
    const next = new URLSearchParams(searchParams);
    if (category === 'All') next.delete('category');
    else next.set('category', category);
    setSearchParams(next, { replace: true });
  };

  const categories = useMemo(() => {
    const names = Array.from(new Set(products.map((product) => product.category)));
    return ['All', ...names];
  }, [products]);

  const filtered = products.filter((product) => {
    const matchesCategory =
      activeCategory === 'All' || product.category === activeCategory;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      product.name.toLowerCase().includes(term) ||
      product.brand?.toLowerCase().includes(term);
    const matchesProduct = !productId || product.key === productId;
    const matchesCategoryId =
      !categoryId ||
      items.some(
        (item) =>
          item.id === product.key &&
          (item.categoryId === categoryId || item.categoryName === categoryId),
      );
    return matchesCategory && matchesSearch && matchesProduct && matchesCategoryId;
  });

  return (
    <div className="min-h-screen bg-canvas">
      <section className="border-b border-border bg-surface py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Building Materials Catalogue"
            description="Browse verified wholesale and retail inventory available for immediate dispatch across Kogi State."
            action={
              <Button variant="primary" size="sm" asChild>
                <Link to={ROUTES.REQUEST_QUOTE}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Request Full Quote
                </Link>
              </Button>
            }
          />

          <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
            <SegmentedControl
              options={categories.map((category) => ({ value: category, label: category }))}
              value={activeCategory}
              onChange={selectCategory}
              size="sm"
              ariaLabel="Filter by category"
              className="md:flex-1"
            />

            <div className="w-full shrink-0 md:max-w-xs">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search materials or brands…"
                ariaLabel="Search materials"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {loading
              ? 'Loading materials catalogue…'
              : `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`}
          </p>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((product) => (
                <Card
                  key={product.key}
                  variant="soft"
                  className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="aspect-[4/3] w-full rounded-none"
                    />
                    <div className="absolute left-3 top-3">
                      <Badge variant="default" size="sm">
                        {product.category}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="flex flex-1 flex-col justify-between p-5">
                    <div className="space-y-1">
                      <h3 className="line-clamp-2 text-base font-bold leading-snug text-text-primary transition-colors group-hover:text-brand">
                        {product.name}
                      </h3>
                      {product.brand && (
                        <p className="text-sm font-medium text-text-secondary">
                          Brand: <span className="text-text-primary">{product.brand}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <div>
                        <span className="block text-2xs font-semibold uppercase tracking-wide text-text-muted">
                          Depot Rate
                        </span>
                        <span className="text-lg font-extrabold tabular-nums text-text-primary">
                          {formatMoney(product.price)}
                        </span>
                        <span className="ml-1 text-xs text-text-secondary">/ {product.unit}</span>
                      </div>

                      <Button variant="secondary" size="sm" asChild className="shrink-0">
                        <Link to={`${ROUTES.REQUEST_QUOTE}?product=${encodeURIComponent(product.name)}`}>
                          Add to Quote
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            !loading && (
              <EmptyState
                icon={<Package className="h-8 w-8" aria-hidden="true" />}
                title="No materials found"
                description={`No products match your current search “${search}”. Try searching for cement, iron rods, or roofing materials.`}
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      setSearch('');
                      selectCategory('All');
                    }}
                  >
                    Clear Search Filters
                  </Button>
                }
              />
            )
          )}
        </div>
      </section>
    </div>
  );
}
