import { useEffect, useMemo, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/forms/SearchInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { checkoutService, catalogueService, customerService } from '@/services';
import type { CatalogueItem } from '@/services';
import type { Customer, PaymentMethod } from '@/types';
import { formatMoney, toKobo } from '@/lib/formatters';
import { PAYMENT_METHODS, ROUTES, CURRENCY_SYMBOL, buildRoute } from '@/constants';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import { Plus, Minus, Trash2, CreditCard, Wallet, Phone, ShoppingCart, Receipt, Check, ChevronUp, Boxes } from 'lucide-react';
import { cn } from '@/lib/utilities';

interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  brand?: string;
  unit: string;
  quantity: number;
  unitSellingPrice: number;
  costBasis: number;
  lineTotal: number;
  stock: number;
}

function variantLabel(item: CatalogueItem) {
  const attributeLabel = Object.entries(item.attributes || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  return item.brand || attributeLabel || 'Standard';
}

export function SalesPage() {
  const navigate = useNavigate();
  const { user, firebaseUser } = useAuth();
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    receiptId?: string;
    receiptNumber?: string;
    totalKobo: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([catalogueService.list(), customerService.list()])
      .then(([catalogue, customerList]) => {
        if (!active) return;
        setItems(catalogue.items);
        setCategories(catalogue.categories);
        setCustomers(customerList);
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
      items.filter((item) => {
        const term = search.toLowerCase();
        const matchesSearch =
          item.productName.toLowerCase().includes(term) ||
          (item.brand && item.brand.toLowerCase().includes(term)) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(term));
        const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [items, search, selectedCategory],
  );

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal;
  const amountPaid = toKobo(parseFloat(amountPaidInput) || 0);
  const balanceDue = total - amountPaid;
  const change = amountPaid - total;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const resetSale = useCallback(() => {
    setCart([]);
    setAmountPaidInput('');
    setCustomerId('');
    setNotes('');
    setPaymentMethod('cash');
    setMobileCartOpen(false);
  }, []);

  const addToCart = useCallback(
    (variant: CatalogueItem, quantity = 1) => {
      if (variant.quantityOnHand <= 0) {
        toast(`${variant.productName} is out of stock.`, 'warning');
        return;
      }

      setCart((current) => {
        const existing = current.find((item) => item.variantId === variant.id);
        if (existing) {
          const newQuantity = existing.quantity + quantity;
          if (newQuantity > variant.quantityOnHand) {
            toast(`Only ${variant.quantityOnHand} ${variant.unit} available in stock.`, 'warning');
            return current;
          }
          return current.map((item) =>
            item.variantId === variant.id
              ? {
                  ...item,
                  quantity: newQuantity,
                  lineTotal: item.unitSellingPrice * newQuantity,
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
            unitSellingPrice: variant.sellingPrice,
            costBasis: variant.costPrice,
            lineTotal: variant.sellingPrice * quantity,
            stock: variant.quantityOnHand,
          },
        ];
      });
    },
    [],
  );

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setCart((current) => {
      if (quantity < 1) return current.filter((item) => item.variantId !== variantId);
      const item = current.find((entry) => entry.variantId === variantId);
      if (item && quantity > item.stock) {
        toast(`Cannot exceed available stock (${item.stock} ${item.unit})`, 'warning');
        return current;
      }
      return current.map((entry) =>
        entry.variantId === variantId
          ? { ...entry, quantity, lineTotal: entry.unitSellingPrice * quantity }
          : entry,
      );
    });
  }, []);

  const removeFromCart = useCallback((variantId: string) => {
    setCart((current) => current.filter((item) => item.variantId !== variantId));
  }, []);

  const setExactAmount = () => {
    setAmountPaidInput((total / 100).toFixed(2));
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    if (amountPaid < total && !customerId) {
      toast('Partial payment requires selecting a registered customer for debt tracking.', 'warning');
      return;
    }
    if (customerId && amountPaid === 0) {
      const proceed = window.confirm('Record this transaction as fully on credit (₦0 paid)?');
      if (!proceed) return;
    }

    setLoading(true);
    try {
      const customer = customers.find((entry) => entry.id === customerId);
      const result = await checkoutService.createSale({
        idempotencyKey: crypto.randomUUID(),
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          unit: item.unit,
          quantity: item.quantity,
          unitSellingPrice: item.unitSellingPrice,
        })),
        amountPaid: Math.min(amountPaid, total),
        paymentMethod,
        customerId: customerId || undefined,
        customerName: customer?.name,
        employeeId: user?.id || firebaseUser?.uid || 'unknown',
        employeeName: user?.name || firebaseUser?.email || 'Staff',
        notes: notes.trim() || undefined,
      });

      const receiptNumber = result.sale?.receiptNumber;
      setLastReceipt({
        receiptId: result.sale?.receiptId,
        receiptNumber,
        totalKobo: Number(result.sale?.total ?? total),
      });
      toast(
        receiptNumber ? `Sale recorded! Receipt #${receiptNumber}` : 'Sale completed successfully.',
        'success',
      );
      resetSale();
    } catch (error) {
      console.error(error);
      toast(
        error instanceof Error && error.message
          ? error.message
          : 'Sale failed. Make sure stock is available and connection is active.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Items', count: items.length },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
        count: items.filter((item) => item.categoryId === category.id).length,
      })),
    ],
    [categories, items],
  );

  const cartContent = (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-2.5 overflow-y-auto">
        {cart.length > 0 ? (
          <ul className="space-y-2.5">
            {cart.map((item) => (
              <li
                key={item.variantId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold leading-tight text-text-primary">
                    {item.productName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {item.variantName} · {formatMoney(item.unitSellingPrice)}/{item.unit}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
                    aria-label={`Decrease quantity of ${item.productName}`}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold tabular-nums text-text-primary">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
                    aria-label={`Increase quantity of ${item.productName}`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="whitespace-nowrap text-sm font-bold tabular-nums text-text-primary">
                    {formatMoney(item.lineTotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.variantId)}
                    className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    aria-label={`Remove ${item.productName} from cart`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Cart is empty"
            description="Tap any material to add it to this sale."
            icon={<ShoppingCart className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />}
            className="py-8"
          />
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3.5 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Items</span>
            <span className="font-semibold tabular-nums text-text-primary">{itemCount}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {formatMoney(subtotal)}
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="font-bold text-text-primary">Total Payable</span>
            <span className="text-xl font-bold tabular-nums text-brand">
              {formatMoney(total)}
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="pos-customer"
            className="mb-1.5 block text-xs font-semibold text-text-secondary"
          >
            Customer Account
          </label>
          <Select
            id="pos-customer"
            options={[
              { value: '', label: 'Walk-in Customer (Instant Cash/POS)' },
              ...customers.map((customer) => ({
                value: customer.id,
                label: `${customer.name}${
                  customer.balanceDue > 0
                    ? ` (Owes ${formatMoney(customer.balanceDue)})`
                    : ''
                }`,
              })),
            ]}
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="pos-amount" className="text-xs font-semibold text-text-secondary">
              Amount Paid ({CURRENCY_SYMBOL})
            </label>
            {total > 0 && (
              <button
                type="button"
                onClick={setExactAmount}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Exact Amount
              </button>
            )}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
              {CURRENCY_SYMBOL}
            </span>
            <input
              id="pos-amount"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="0.00"
              value={amountPaidInput}
              onChange={(event) => setAmountPaidInput(event.target.value)}
              className="h-11 w-full rounded-lg border border-border-strong bg-surface pl-9 pr-3.5 text-sm font-bold tabular-nums text-text-primary outline-none transition-colors placeholder:font-normal placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
            Payment Method
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = paymentMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors',
                    isSelected
                      ? 'border-transparent bg-brand text-white'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-2 hover:text-text-primary',
                  )}
                >
                  {method.value === 'cash' && <Wallet className="h-3.5 w-3.5" aria-hidden="true" />}
                  {method.value === 'transfer' && (
                    <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {method.value === 'pos' && <Phone className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span className="truncate">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="pos-notes" className="sr-only">
            Sale remarks
          </label>
          <input
            id="pos-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Remarks or delivery address (optional)…"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-text-secondary">
              {balanceDue > 0 ? 'Remaining Balance (Credit)' : 'Change Due'}
            </span>
            <span
              className={cn(
                'font-bold tabular-nums',
                balanceDue > 0 ? 'text-danger' : 'text-success',
              )}
            >
              {balanceDue > 0 ? formatMoney(balanceDue) : formatMoney(Math.max(0, change))}
            </span>
          </div>
        )}

        <Button
          onClick={completeSale}
          disabled={cart.length === 0 || loading}
          className="h-12 w-full text-sm font-bold"
          isLoading={loading}
        >
          {!loading && <Check className="h-4 w-4" aria-hidden="true" />}
          Complete Sale ({formatMoney(total)})
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <PageHeader
        title="Point of Sale"
        description="Select building materials, ring up items, and issue instant receipts."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetSale}>
              Clear Cart
            </Button>
            <Button variant="outline" size="sm" asChild>
              <NavLink to={ROUTES.APP_SALES}>
                <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                Sales History
              </NavLink>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search materials (cement, rod, sand, wire)…"
              ariaLabel="Search materials"
            />

            {categoryOptions.length > 1 && (
              <SegmentedControl
                options={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                size="sm"
                ariaLabel="Filter by category"
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {loadingCatalogue ? (
              [1, 2, 3, 4, 5, 6].map((key) => (
                <div
                  key={key}
                  className="space-y-2 rounded-xl border border-border bg-surface p-4 shadow-xs"
                >
                  <div className="h-4 w-3/4 animate-pulse rounded bg-surface-3" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-surface-3" />
                  <div className="mt-3 h-6 w-1/3 animate-pulse rounded bg-surface-3" />
                </div>
              ))
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const inCart = cart.find((entry) => entry.variantId === item.id);
                const isOutOfStock = item.quantityOnHand <= 0;
                const isLow = !isOutOfStock && item.quantityOnHand <= item.minimumStock;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    disabled={isOutOfStock}
                    className={cn(
                      'flex flex-col justify-between rounded-xl border p-4 text-left transition-all',
                      isOutOfStock && 'cursor-not-allowed opacity-50',
                      inCart
                        ? 'border-brand bg-brand-soft'
                        : 'border-border bg-surface shadow-xs hover:-translate-y-0.5 hover:border-brand-soft-border hover:shadow-md',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-snug text-text-primary">
                        {item.productName}
                      </span>
                      {inCart && (
                        <Badge variant="info" size="sm" className="shrink-0">
                          {inCart.quantity} in cart
                        </Badge>
                      )}
                    </span>

                    <span className="mt-1 block truncate text-xs text-text-muted">
                      {variantLabel(item)} · {item.unit}
                    </span>

                    <span className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                      <span className="text-sm font-bold tabular-nums tracking-tight text-text-primary">
                        {formatMoney(item.sellingPrice)}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-2xs font-semibold',
                          isOutOfStock
                            ? 'bg-danger-soft text-danger-fg'
                            : isLow
                              ? 'bg-warning-soft text-warning-fg'
                              : 'bg-success-soft text-success-fg',
                        )}
                      >
                        {isOutOfStock
                          ? 'Out of stock'
                          : `${item.quantityOnHand} ${item.unit}`}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="col-span-full">
                <EmptyState
                  title="No items found"
                  description="Adjust your search query or select another category."
                  icon={<Boxes className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />}
                  className="py-10"
                />
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:col-span-5 lg:block lg:sticky lg:top-20">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3 pb-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                <ShoppingCart className="h-4 w-4 text-brand" aria-hidden="true" />
                Active Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={resetSale}
                  className="text-sm font-medium text-text-muted transition-colors hover:text-danger"
                >
                  Clear All
                </button>
              )}
            </div>
            {cartContent}
          </div>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-surface px-3 py-3 shadow-lg lg:hidden">
          <div>
            <span className="block text-xs font-medium text-text-secondary">
              Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </span>
            <span className="block text-lg font-bold tabular-nums text-text-primary">
              {formatMoney(total)}
            </span>
          </div>
          <Button onClick={() => setMobileCartOpen(true)} className="font-bold">
            Review & Pay
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <Drawer
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        title="Customer Checkout"
        description="Verify quantities and payment details"
        position="bottom"
      >
        {cartContent}
      </Drawer>

      <Modal
        open={Boolean(lastReceipt)}
        onClose={() => setLastReceipt(null)}
        title="Sale Completed"
        description="Your receipt has been issued and the stock ledger updated."
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-center">
            <Receipt className="mx-auto h-8 w-8 text-brand" aria-hidden="true" />
            <p className="mt-2 text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Receipt Number
            </p>
            <p className="text-lg font-bold text-text-primary">
              {lastReceipt?.receiptNumber || 'Pending'}
            </p>
            {lastReceipt ? (
              <p className="mt-1 text-sm font-semibold text-success-fg">
                {formatMoney(lastReceipt.totalKobo)}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-text-muted">
            A PDF copy is prepared in the background. Open the receipt to print, share, download
            or issue payment, return and void documents.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setLastReceipt(null)}>
              Close
            </Button>
            {lastReceipt?.receiptId ? (
              <Button
                size="sm"
                onClick={() => {
                  const receiptId = lastReceipt.receiptId;
                  setLastReceipt(null);
                  if (receiptId) {
                    navigate(buildRoute(ROUTES.APP_RECEIPT_DETAIL, { receiptId }));
                  }
                }}
              >
                <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                View Receipt
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
