import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { PriceInput } from '@/components/ui/PriceInput';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { BUSINESS_ID, categoryService, productService, variantService } from '@/services';
import { fromKobo, toKobo } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import type { Category } from '@/types';

interface VariantDraft {
  key: string;
  id?: string;
  brand: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  quantityOnHand: number;
  minimumStock: number;
  attributes: Record<string, string>;
}

interface ProductFormProps {
  productId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function newVariant(): VariantDraft {
  return {
    key: crypto.randomUUID(),
    brand: '',
    unit: 'piece',
    costPrice: 0,
    sellingPrice: 0,
    quantityOnHand: 0,
    minimumStock: 0,
    attributes: {},
  };
}

export function ProductForm({ productId, onClose, onSuccess }: ProductFormProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([newVariant()]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(Boolean(productId));
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    categoryService
      .list()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch((error) => console.error('Could not load categories:', error));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!productId) return;

    let active = true;

    Promise.all([productService.get(productId), variantService.list(productId)])
      .then(([product, existingVariants]) => {
        if (!active) return;
        if (product) {
          setName(product.name);
          setCategoryId(product.categoryId || '');
          setDescription(product.description || '');
        }
        if (existingVariants.length > 0) {
          setVariants(
            existingVariants.map((variant) => ({
              key: variant.id,
              id: variant.id,
              brand: variant.brand || '',
              unit: variant.unit,
              costPrice: fromKobo(variant.costPrice ?? 0),
              sellingPrice: fromKobo(variant.sellingPrice ?? 0),
              quantityOnHand: variant.quantityOnHand ?? 0,
              minimumStock: variant.minimumStock ?? 0,
              attributes: variant.attributes || {},
            })),
          );
        }
      })
      .catch((error) => {
        console.error('Could not load product details:', error);
        toast('Could not load product details.', 'error');
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  const updateVariant = <K extends keyof VariantDraft>(
    key: string,
    field: K,
    value: VariantDraft[K],
  ) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.key === key ? { ...variant, [field]: value } : variant,
      ),
    );
  };

  const removeVariant = (variant: VariantDraft) => {
    if (variant.id) {
      setRemovedVariantIds((current) => [...current, variant.id as string]);
    }
    setVariants((current) => current.filter((entry) => entry.key !== variant.key));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast('Enter a product name.', 'warning');
      return;
    }

    const validVariants = variants.filter((variant) => variant.unit.trim());
    if (validVariants.length === 0) {
      toast('Add at least one variation with a unit.', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (productId) {
        await productService.update(productId, {
          name: name.trim(),
          categoryId: categoryId || undefined,
          description: description.trim(),
          hasVariants: validVariants.length > 1,
        });

        for (const variant of validVariants) {
          const payload = {
            brand: variant.brand.trim(),
            attributes: variant.attributes,
            unit: variant.unit.trim(),
            costPrice: toKobo(variant.costPrice),
            sellingPrice: toKobo(variant.sellingPrice),
            quantityOnHand: variant.quantityOnHand,
            minimumStock: variant.minimumStock,
            active: true,
          };

          if (variant.id) {
            await variantService.update(productId, variant.id, payload);
          } else {
            await variantService.create(productId, {
              businessId: BUSINESS_ID,
              productId,
              ...payload,
            });
          }
        }

        for (const variantId of removedVariantIds) {
          await variantService.update(productId, variantId, { active: false });
        }

        toast('Product updated.', 'success');
      } else {
        const id = await productService.create({
          businessId: BUSINESS_ID,
          name: name.trim(),
          categoryId: categoryId || undefined,
          description: description.trim(),
          imageUrl: '',
          hasVariants: validVariants.length > 1,
          active: true,
        });

        for (const variant of validVariants) {
          await variantService.create(id, {
            businessId: BUSINESS_ID,
            productId: id,
            brand: variant.brand.trim(),
            attributes: variant.attributes,
            unit: variant.unit.trim(),
            costPrice: toKobo(variant.costPrice),
            sellingPrice: toKobo(variant.sellingPrice),
            quantityOnHand: variant.quantityOnHand,
            minimumStock: variant.minimumStock,
            active: true,
          });
        }
        toast('Product added.', 'success');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast('Could not save the product. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="py-10 text-center text-sm text-text-secondary">
        Loading product details...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Product Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Dangote Cement"
        required
      />
      <Select
        label="Category"
        options={categories.map((category) => ({
          value: category.id,
          label: category.name,
        }))}
        placeholder="Uncategorised"
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={2}
        placeholder="Optional description for this product"
      />

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Variations</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setVariants((current) => [...current, newVariant()])}
          >
            + Add Variation
          </Button>
        </div>

        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={variant.key} className="p-3 border border-border rounded-input space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Variation {index + 1}
                </p>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(variant)}
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Brand / Name"
                  value={variant.brand}
                  onChange={(event) => updateVariant(variant.key, 'brand', event.target.value)}
                  placeholder="e.g. Dangote"
                />
                <Input
                  label="Unit"
                  value={variant.unit}
                  onChange={(event) => updateVariant(variant.key, 'unit', event.target.value)}
                  placeholder="e.g. bag, piece, kg"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PriceInput
                  label="Cost Price (₦)"
                  value={variant.costPrice}
                  onChange={(value) => updateVariant(variant.key, 'costPrice', value)}
                />
                <PriceInput
                  label="Selling Price (₦)"
                  value={variant.sellingPrice}
                  onChange={(value) => updateVariant(variant.key, 'sellingPrice', value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Quantity on Hand
                  </label>
                  <QuantityInput
                    value={variant.quantityOnHand}
                    onChange={(value) => updateVariant(variant.key, 'quantityOnHand', value)}
                  />
                </div>
                <Input
                  label="Minimum Stock"
                  type="number"
                  min="0"
                  value={String(variant.minimumStock)}
                  onChange={(event) =>
                    updateVariant(
                      variant.key,
                      'minimumStock',
                      parseInt(event.target.value, 10) || 0,
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={loading}>
          {productId ? 'Save Changes' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
}
