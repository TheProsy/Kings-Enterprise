import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';

import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { checkoutService, catalogueService, supplierService } from '@/services';
import type { CatalogueItem } from '@/services';
import type { PaymentMethod, Supplier } from '@/types';
import { formatMoney, toKobo } from '@/lib/formatters';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import { ROUTES, CURRENCY_SYMBOL } from '@/constants';
import { Truck, Plus, Trash2, Check } from 'lucide-react';

interface PurchaseItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  brand?: string;
  unit: string;
  quantity: number;
  unitCostPrice: number;
  lineTotal: number;
}

function variantLabel(item: CatalogueItem) {
  const attributeLabel = Object.entries(item.attributes || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  return item.brand || attributeLabel || 'Standard';
}

export function NewPurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, firebaseUser } = useAuth();
  const reorderRequest = (
    location.state as {
      reorder?: { variantId?: string; quantity?: number };
    } | null
  )?.reorder;
  const preselectHandled = useRef(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState(0);
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([catalogueService.list({ fresh: true }), supplierService.list()])
      .then(([catalogue, supplierList]) => {
        if (!active) return;
        setItems(catalogue.items);
        setSuppliers(supplierList);
      })
      .catch((error) => {
        console.error(error);
        toast('Could not load products. Check your connection.', 'error');
      })
      .finally(() => {
        if (active) setLoadingCatalogue(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.productName.toLowerCase().includes(search.toLowerCase()) ||
          item.brand?.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const additionalCostsKobo = toKobo(additionalCosts);
  const total = subtotal + additionalCostsKobo;
  const amountPaid = toKobo(parseFloat(amountPaidInput) || 0);
  const balanceDue = total - amountPaid;

  const resetPurchase = () => {
    setCart([]);
    setSupplierId('');
    setAmountPaidInput('');
    setAdditionalCosts(0);
    setNotes('');
    setPaymentMethod('cash');
  };

  const addToCart = (variant: CatalogueItem, quantity = 1) => {
    setCart((current) => {
      const existing = current.find((item) => item.variantId === variant.id);
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        return current.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: newQuantity,
                lineTotal: item.unitCostPrice * newQuantity,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          variantId: variant.id,
          productId: variant.productId,
          productName: variant.productName,
          variantName: variantLabel(variant),
          brand: variant.brand,
          unit: variant.unit,
          quantity,
          unitCostPrice: variant.costPrice,
          lineTotal: variant.costPrice * quantity,
        },
      ];
    });
    toast(`Added ${variant.productName}`, 'info');
  };

  useEffect(() => {
    if (!reorderRequest?.variantId || preselectHandled.current || items.length === 0) {
      return;
    }

    const target = items.find((item) => item.id === reorderRequest.variantId);
    if (!target) {
      preselectHandled.current = true;
      toast('That item is no longer available. Search for it in the list.', 'warning');
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    preselectHandled.current = true;
    addToCart(target, Math.max(1, Math.round(reorderRequest.quantity ?? 1)));
    navigate(location.pathname, { replace: true, state: null });
  }, [items, reorderRequest, navigate, location.pathname]);

  const updateQuantity = (variantId: string, quantity: number) => {
    setCart((current) => {
      if (quantity < 1) {
        return current.filter((item) => item.variantId !== variantId);
      }
      return current.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity,
              lineTotal: item.unitCostPrice * quantity,
            }
          : item,
      );
    });
  };

  const updateUnitCost = (variantId: string, unitCostPrice: number) => {
    const costKobo = toKobo(unitCostPrice);
    setCart((current) =>
      current.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              unitCostPrice: costKobo,
              lineTotal: costKobo * item.quantity,
            }
          : item,
      ),
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((current) => current.filter((item) => item.variantId !== variantId));
  };

  const completePurchase = async () => {
    if (cart.length === 0) {
      toast('Select at least one product to receive.', 'warning');
      return;
    }
    if (!supplierId) {
      toast('Please select a supplier for this purchase.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const supplier = suppliers.find((entry) => entry.id === supplierId);
      const result = await checkoutService.createPurchase({
        idempotencyKey: crypto.randomUUID(),
        supplierId,
        supplierName: supplier?.name,
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          unit: item.unit,
          quantity: item.quantity,
          unitCostPrice: item.unitCostPrice,
        })),
        additionalCosts: additionalCostsKobo,
        amountPaid: Math.min(amountPaid, total),
        paymentMethod,
        notes: notes.trim() || undefined,
        employeeId: user?.id || firebaseUser?.uid || 'unknown',
        employeeName: user?.name || firebaseUser?.email || 'Staff',
      });

      toast(
        result.purchase?.purchaseNumber
          ? `Stock received! Purchase #${result.purchase.purchaseNumber}`
          : 'Purchase recorded successfully.',
        'success',
      );
      resetPurchase();
      navigate(ROUTES.APP_PURCHASES);
    } catch (error) {
      console.error(error);
      toast('Could not save the purchase. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receive Stock"
        description="Record delivered inventory from suppliers, update unit costs, and adjust supplier payables."
        action={
          <Button variant="outline" size="sm" asChild>
            <NavLink to={ROUTES.APP_PURCHASES}>
              <Truck className="h-3.5 w-3.5 mr-1" />
              Purchase History
            </NavLink>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Material Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="soft" className="p-4 sm:p-5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search catalogue to restock..."
            />
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
            {loadingCatalogue ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-surface border border-border space-y-2">
                  <div className="h-4 bg-surface-3 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-surface-3 rounded w-1/2 animate-pulse" />
                </div>
              ))
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-4 rounded-xl bg-surface border border-border/80 shadow-xs hover:border-brand-soft-border hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between select-none group"
                >
                  <div>
                    <h4 className="font-semibold text-xs text-text-primary group-hover:text-brand transition-colors truncate">
                      {item.productName}
                    </h4>
                    <p className="text-2xs text-text-muted truncate mt-0.5">
                      {variantLabel(item)} · Current Stock: {item.quantityOnHand} {item.unit}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-xs">
                    <span className="font-semibold text-text-primary">
                      Cost: {formatMoney(item.costPrice)}
                    </span>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState
                  title="No items found"
                  description="Adjust your search or add the item to your products first."
                  className="py-8"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Supplier Selection & Purchase Order Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="soft" className="p-5 shadow-sm">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand" />
                Purchase Summary ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2 space-y-4">
              {/* Supplier Selection */}
              <div className="space-y-1">
                <label className="text-2xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Supplier *
                </label>
                <Select
                  options={[
                    { value: '', label: 'Select a Supplier...' },
                    ...suppliers.map((s) => ({
                      value: s.id,
                      label: `${s.name} ${s.balanceDue > 0 ? `(We owe: ${formatMoney(s.balanceDue)})` : ''}`,
                    })),
                  ]}
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                />
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <div
                      key={item.variantId}
                      className="p-3 rounded-xl bg-surface-3 border border-border/80 shadow-xs space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-text-primary">{item.productName}</p>
                          <p className="text-2xs text-text-muted">{item.variantName} ({item.unit})</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variantId)}
                          className="text-text-muted hover:text-danger-fg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                        <div>
                          <span className="text-3xs text-text-muted uppercase block">Qty to receive</span>
                          <QuantityInput
                            value={item.quantity}
                            onChange={(value) => updateQuantity(item.variantId, value)}
                            min={1}
                            ariaLabel={`Quantity of ${item.productName}`}
                            className="mt-0.5"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-3xs text-text-muted uppercase block">Unit Cost ({CURRENCY_SYMBOL})</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            value={item.unitCostPrice / 100}
                            onChange={(e) => updateUnitCost(item.variantId, parseFloat(e.target.value) || 0)}
                            className="w-24 text-right px-2 py-1 rounded bg-surface border border-border font-bold text-text-primary outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted text-center py-6">
                    No items selected yet. Tap products on the left.
                  </p>
                )}
              </div>

              {/* Extra Delivery / Loading Costs */}
              <div className="space-y-1">
                <label className="text-2xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Offloading / Delivery Fees ({CURRENCY_SYMBOL})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={additionalCosts === 0 ? '' : additionalCosts}
                  onChange={(e) => setAdditionalCosts(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/80 bg-surface-3 shadow-xs text-text-primary outline-none"
                />
              </div>

              {/* Soft Blue Informational Panel for Purchase Summary */}
              <div className="p-4 rounded-xl bg-brand-soft border border-brand/25 shadow-xs space-y-2 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Materials Subtotal:</span>
                  <span className="font-semibold text-text-primary">{formatMoney(subtotal)}</span>
                </div>
                {additionalCosts > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Offloading / Transit:</span>
                    <span className="font-semibold text-text-primary">{formatMoney(additionalCostsKobo)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1.5 border-t border-brand-soft-border text-sm font-bold">
                  <span className="text-text-primary">Total Purchase Cost:</span>
                  <span className="text-brand text-base">
                    {formatMoney(total)}
                  </span>
                </div>
              </div>

              {/* Amount Paid Now to Supplier */}
              <div className="space-y-1">
                <label className="text-2xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Amount Paid to Supplier Now ({CURRENCY_SYMBOL})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountPaidInput}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-surface-3 shadow-xs text-sm font-bold text-text-primary outline-none"
                />
              </div>

              {/* Outstanding Supplier Debt */}
              <div className="flex justify-between text-xs pt-1">
                <span className="text-text-secondary font-medium">Payable Balance (Owed to Supplier):</span>
                <span className="font-bold text-danger-fg">
                  {formatMoney(Math.max(0, balanceDue))}
                </span>
              </div>

              {/* Confirm / Receive Button */}
              <Button
                onClick={completePurchase}
                disabled={cart.length === 0 || !supplierId || loading}
                className="w-full py-3 text-sm font-bold shadow-xs"
                variant="primary"
                isLoading={loading}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Confirm Stock Intake ({formatMoney(total)})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
