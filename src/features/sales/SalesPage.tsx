import { useEffect, useMemo, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/forms/SearchInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input, Select } from '@/components/ui/Input';
import { PriceInput } from '@/components/ui/PriceInput';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { checkoutService, catalogueService, customerService } from '@/services';
import type { CatalogueItem } from '@/services';
import type { Customer, PaymentMethod } from '@/types';
import { formatMoney, fromKobo, toKobo } from '@/lib/formatters';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/lib/stock';
import {
  catalogueItemSearchText,
  describeVariant,
  groupCatalogueItems,
  type CatalogueGroup,
} from '@/lib/catalogue';
import { PAYMENT_METHODS, PERMISSIONS, ROUTES, CURRENCY_SYMBOL, buildRoute } from '@/constants';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import {
  Banknote,
  Boxes,
  Check,
  ChevronUp,
  CreditCard,
  Phone,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utilities';

interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  unit: string;
  quantity: number;
  unitSellingPrice: number;
  lineTotal: number;
  stock: number;
}

const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Wallet,
  transfer: CreditCard,
  pos: Phone,
  mixed: Banknote,
};

export function SalesPage() {
  const navigate = useNavigate();
  const { user, firebaseUser, hasPermission } = useAuth();
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    DEFAULT_LOW_STOCK_THRESHOLD,
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    'cash',
    'transfer',
    'pos',
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerId, setCustomerId] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [customerAddressInput, setCustomerAddressInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [catalogueError, setCatalogueError] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [confirmCreditOpen, setConfirmCreditOpen] = useState(false);
  const [variantPicker, setVariantPicker] = useState<CatalogueGroup | null>(null);
  const [lastReceipt, setLastReceipt] = useState<{
    receiptId?: string;
    receiptNumber?: string;
    totalKobo: number;
    balanceDue: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([catalogueService.list({ fresh: true }), customerService.list()])
      .then(([catalogue, customerList]) => {
        if (!active) return;
        setItems(catalogue.items);
        setCategories(catalogue.categories);
        setLowStockThreshold(catalogue.lowStockThreshold);
        setPaymentMethods(catalogue.paymentMethods);
        setCustomers(customerList);
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setCatalogueError(true);
          toast('Could not load products. Check your connection.', 'error');
        }
      })
      .finally(() => {
        if (active) setLoadingCatalogue(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshData = useCallback(async (options: { silent?: boolean } = {}) => {
    try {
      const [catalogue, customerList] = await Promise.all([
        catalogueService.list({ fresh: true }),
        customerService.list(),
      ]);
      setItems(catalogue.items);
      setCategories(catalogue.categories);
      setLowStockThreshold(catalogue.lowStockThreshold);
      setPaymentMethods(catalogue.paymentMethods);
      setCustomers(customerList);
      setCart((current) =>
        current.map((item) => {
          const latest = catalogue.items.find((entry) => entry.id === item.variantId);
          return latest ? { ...item, stock: latest.quantityOnHand } : item;
        }),
      );
      setCatalogueError(false);
    } catch (error) {
      console.error(error);
      if (!options.silent) {
        setCatalogueError(true);
        toast('Could not load products. Check your connection.', 'error');
      }
    }
  }, []);

  useEffect(() => {
    if (cart.length > 0) return;
    const handleFocus = () => {
      void refreshData({ silent: true });
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [cart.length, refreshData]);

  const availablePaymentMethods = useMemo(
    () => PAYMENT_METHODS.filter((method) => paymentMethods.includes(method.value)),
    [paymentMethods],
  );

  useEffect(() => {
    if (!paymentMethods.includes(paymentMethod)) {
      setPaymentMethod(paymentMethods[0] ?? 'cash');
    }
  }, [paymentMethod, paymentMethods]);

  const selectedCustomer = useMemo(
    () => customers.find((entry) => entry.id === customerId),
    [customers, customerId],
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const term = search.trim().toLowerCase();
        const matchesSearch = !term || catalogueItemSearchText(item).includes(term);
        const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [items, search, selectedCategory],
  );

  const filteredGroups = useMemo(
    () => groupCatalogueItems(filteredItems),
    [filteredItems],
  );

  const allGroups = useMemo(() => groupCatalogueItems(items), [items]);

  const total = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const enteredAmountKobo = useMemo(() => {
    const parsed = parseFloat(amountPaidInput);
    return Number.isFinite(parsed) ? Math.max(0, toKobo(parsed)) : 0;
  }, [amountPaidInput]);
  const hasEnteredAmount = amountPaidInput.trim() !== '';
  const amountPaid = hasEnteredAmount ? Math.min(enteredAmountKobo, total) : total;
  const balanceDue = Math.max(0, total - amountPaid);
  const changeDue = Math.max(0, enteredAmountKobo - total);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const resetSale = useCallback(() => {
    setCart([]);
    setAmountPaidInput('');
    setCustomerId('');
    setCustomerNameInput('');
    setCustomerPhoneInput('');
    setCustomerAddressInput('');
    setNotes('');
    setPaymentMethod('cash');
    setMobileCartOpen(false);
    setConfirmCreditOpen(false);
  }, []);

  const retryCatalogue = () => {
    setCatalogueError(false);
    setLoadingCatalogue(true);
    void refreshData().finally(() => setLoadingCatalogue(false));
  };

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
            variantName: describeVariant(variant),
            unit: variant.unit,
            quantity,
            unitSellingPrice: variant.sellingPrice,
            lineTotal: variant.sellingPrice * quantity,
            stock: variant.quantityOnHand,
          },
        ];
      });
    },
    [],
  );

  const addVariantToCart = useCallback(
    (variant: CatalogueItem) => {
      addToCart(variant);
      if (variant.sellingPrice <= 0 && variant.quantityOnHand > 0) {
        toast('Price not set for this option. Enter it in the cart.', 'info');
      }
      setVariantPicker(null);
    },
    [addToCart],
  );

  const handleGroupClick = useCallback(
    (group: CatalogueGroup) => {
      if (!group.inStock) return;
      if (group.variants.length === 1) {
        addVariantToCart(group.variants[0]);
        return;
      }
      setVariantPicker(group);
    },
    [addVariantToCart],
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

  const updatePrice = useCallback((variantId: string, nairaPrice: number) => {
    const priceKobo = Math.max(0, toKobo(nairaPrice));
    setCart((current) =>
      current.map((entry) =>
        entry.variantId === variantId
          ? {
              ...entry,
              unitSellingPrice: priceKobo,
              lineTotal: priceKobo * entry.quantity,
            }
          : entry,
      ),
    );
  }, []);

  const handleCustomerChange = useCallback(
    (nextCustomerId: string) => {
      setCustomerId(nextCustomerId);
      const customer = customers.find((entry) => entry.id === nextCustomerId);
      setCustomerNameInput(customer?.name || '');
      setCustomerPhoneInput(customer?.phone || '');
      setCustomerAddressInput(customer?.address || '');
    },
    [customers],
  );

  const removeFromCart = useCallback((variantId: string) => {
    setCart((current) => current.filter((item) => item.variantId !== variantId));
  }, []);

  const setExactAmount = () => {
    setAmountPaidInput((total / 100).toFixed(2));
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
  };

  const recordSale = async () => {
    setLoading(true);
    try {
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
        amountPaid,
        paymentMethod,
        customerId: customerId || undefined,
        customerName: selectedCustomer?.name || customerNameInput.trim() || undefined,
        customerPhone: selectedCustomer?.phone || customerPhoneInput.trim() || undefined,
        customerAddress: selectedCustomer?.address || customerAddressInput.trim() || undefined,
        employeeId: user?.id || firebaseUser?.uid || 'unknown',
        employeeName: user?.name || firebaseUser?.email || 'Staff',
        notes: notes.trim() || undefined,
      });

      const receiptNumber = result.sale?.receiptNumber;
      setLastReceipt({
        receiptId: result.sale?.receiptId,
        receiptNumber,
        totalKobo: Number(result.sale?.total ?? total),
        balanceDue: Number(result.sale?.balanceDue ?? 0),
      });
      toast(
        receiptNumber ? `Sale recorded! Receipt #${receiptNumber}` : 'Sale completed successfully.',
        'success',
      );
      resetSale();
      void refreshData({ silent: true });
    } catch (error) {
      console.error(error);
      toast(
        error instanceof Error && error.message
          ? error.message
          : 'Sale failed. Make sure stock is available and connection is active.',
        'error',
      );
      void refreshData({ silent: true });
    } finally {
      setLoading(false);
    }
  };

  const completeSale = () => {
    if (cart.length === 0) return;
    const unpricedItem = cart.find((item) => item.unitSellingPrice <= 0);
    if (unpricedItem) {
      toast(
        `Set a selling price for ${unpricedItem.productName} before completing the sale.`,
        'warning',
      );
      return;
    }
    if (balanceDue > 0 && !customerId) {
      toast('Select a customer account to record the unpaid balance.', 'warning');
      return;
    }
    if (total > 0 && hasEnteredAmount && enteredAmountKobo === 0 && customerId) {
      setConfirmCreditOpen(true);
      return;
    }
    void recordSale();
  };

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Items', count: allGroups.length },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
        count: allGroups.filter((group) => group.categoryId === category.id).length,
      })),
    ],
    [allGroups, categories],
  );

  const renderCartContent = (idPrefix: string) => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-2.5 overflow-y-auto">
        {cart.length > 0 ? (
          <ul className="space-y-2.5">
            {cart.map((item) => (
              <li
                key={item.variantId}
                className="rounded-xl border border-border bg-surface-2 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight text-text-primary">
                      {item.productName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-muted">
                      {item.variantName} · {item.stock} {item.unit} in stock
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.variantId)}
                    className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    aria-label={`Remove ${item.productName} from cart`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                  <div className="w-28 shrink-0">
                    <label
                      htmlFor={`${idPrefix}-price-${item.variantId}`}
                      className="mb-0.5 block text-3xs font-semibold uppercase tracking-wider text-text-muted"
                    >
                      Price
                    </label>
                    <PriceInput
                      id={`${idPrefix}-price-${item.variantId}`}
                      value={fromKobo(item.unitSellingPrice)}
                      onChange={(value) => updatePrice(item.variantId, value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="shrink-0">
                    <span className="mb-0.5 block text-3xs font-semibold uppercase tracking-wider text-text-muted">
                      Quantity
                    </span>
                    <QuantityInput
                      value={item.quantity}
                      onChange={(value) => updateQuantity(item.variantId, value)}
                      max={item.stock}
                      ariaLabel={`Quantity of ${item.productName}`}
                    />
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="mb-0.5 block text-3xs font-semibold uppercase tracking-wider text-text-muted">
                      Total
                    </span>
                    <span className="block text-sm font-bold tabular-nums text-text-primary">
                      {formatMoney(item.lineTotal)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Cart is empty"
            description="Tap a product to add it to this sale."
            icon={<ShoppingCart className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />}
            className="py-8"
          />
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="rounded-xl border border-border bg-surface-2 p-3.5 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Items</span>
            <span className="font-semibold tabular-nums text-text-primary">{itemCount}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
            <span className="font-bold text-text-primary">Total</span>
            <span className="text-xl font-bold tabular-nums text-brand">
              {formatMoney(total)}
            </span>
          </div>
        </div>

        <Select
          id={`${idPrefix}-customer`}
          label="Customer account"
          helper="Choose a customer to track credit, or leave as a walk-in sale."
          options={[
            { value: '', label: 'Walk-in customer (no account)' },
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
          onChange={(event) => handleCustomerChange(event.target.value)}
        />

        {selectedCustomer ? (
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">
              {selectedCustomer.name}
            </span>
            {selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ''}
            {selectedCustomer.address ? ` · ${selectedCustomer.address}` : ''}
            {selectedCustomer.balanceDue > 0 ? (
              <span className="mt-1 block font-semibold text-danger-fg">
                Outstanding balance: {formatMoney(selectedCustomer.balanceDue)}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                label="Name (optional)"
                value={customerNameInput}
                onChange={(event) => setCustomerNameInput(event.target.value)}
                placeholder="Walk-in customer name"
              />
              <Input
                label="Phone (optional)"
                type="tel"
                inputMode="tel"
                value={customerPhoneInput}
                onChange={(event) => setCustomerPhoneInput(event.target.value)}
                placeholder="0803 000 0000"
              />
            </div>
            <Input
              label="Address (optional)"
              value={customerAddressInput}
              onChange={(event) => setCustomerAddressInput(event.target.value)}
              placeholder="Delivery address or landmark"
            />
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
            Payment method
          </span>
          {availablePaymentMethods.length > 1 ? (
            <div className="grid grid-cols-2 gap-2">
              {availablePaymentMethods.map((method) => {
                const isSelected = paymentMethod === method.value;
                const Icon = PAYMENT_ICONS[method.value];
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
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="truncate">{method.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs font-semibold text-text-primary">
              {availablePaymentMethods[0]?.label ?? 'Cash'}
            </div>
          )}
          {availablePaymentMethods.length === 1 && (
            <p className="mt-1 text-2xs text-text-muted">
              Only this method is enabled in Settings.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              htmlFor={`${idPrefix}-amount`}
              className="text-xs font-semibold text-text-secondary"
            >
              Amount received ({CURRENCY_SYMBOL})
            </label>
            <div className="flex items-center gap-2">
              {hasEnteredAmount && total > 0 && (
                <button
                  type="button"
                  onClick={setExactAmount}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Full amount
                </button>
              )}
              {customerId && total > 0 && enteredAmountKobo > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountPaidInput('0')}
                  className="text-xs font-semibold text-text-muted transition-colors hover:text-danger"
                >
                  Sell on credit
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
              {CURRENCY_SYMBOL}
            </span>
            <input
              id={`${idPrefix}-amount`}
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
          <p className="mt-1 text-2xs text-text-muted">
            Leave blank if the customer paid the full amount.
            {customerId
              ? ' Enter 0 to sell on credit.'
              : ' Select a customer to sell on credit.'}
          </p>
        </div>

        {total > 0 && (balanceDue > 0 || changeDue > 0) && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            <span className="font-medium text-text-secondary">
              {balanceDue > 0 ? 'Balance owed' : 'Change due'}
            </span>
            <span
              className={cn(
                'font-bold tabular-nums',
                balanceDue > 0 ? 'text-danger' : 'text-success',
              )}
            >
              {formatMoney(balanceDue > 0 ? balanceDue : changeDue)}
            </span>
          </div>
        )}

        <div>
          <label
            htmlFor={`${idPrefix}-notes`}
            className="mb-1.5 block text-xs font-semibold text-text-secondary"
          >
            Sale note (optional)
          </label>
          <input
            id={`${idPrefix}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything to remember about this sale…"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <Button
          onClick={completeSale}
          disabled={cart.length === 0 || loading}
          className="h-12 w-full text-sm font-bold"
          isLoading={loading}
        >
          {!loading && <Check className="h-4 w-4" aria-hidden="true" />}
          {loading ? 'Recording sale…' : `Complete Sale · ${formatMoney(total)}`}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <PageHeader
        title="New Sale"
        description="Search products, add them to the cart, and take payment. Stock and receipts update automatically."
        action={
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <Button variant="outline" size="sm" onClick={resetSale}>
                Clear cart
              </Button>
            )}
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
              placeholder="Search by product, brand, size or spec…"
              ariaLabel="Search products"
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
            ) : catalogueError ? (
              <div className="col-span-full">
                <ErrorState
                  title="Products could not load"
                  description="Check your internet connection, then try again."
                  onRetry={retryCatalogue}
                />
              </div>
            ) : filteredGroups.length > 0 ? (
              filteredGroups.map((group) => {
                const groupCartQuantity = cart
                  .filter((entry) => entry.productId === group.productId)
                  .reduce((sum, entry) => sum + entry.quantity, 0);
                const inStockOptions = group.variants.filter(
                  (variant) => variant.quantityOnHand > 0,
                );
                const isOutOfStock = !group.inStock;
                const isLow =
                  group.inStock &&
                  inStockOptions.some(
                    (variant) => variant.quantityOnHand <= lowStockThreshold,
                  );
                const priceLabel =
                  group.minimumPrice > 0
                    ? group.minimumPrice === group.maximumPrice
                      ? formatMoney(group.minimumPrice)
                      : `From ${formatMoney(group.minimumPrice)}`
                    : 'Set price';
                const stockLabel = isOutOfStock
                  ? 'Out of stock'
                  : group.variants.length === 1
                    ? `${group.totalStock} ${group.variants[0].unit} left`
                    : `${inStockOptions.length} of ${group.variants.length} options in stock`;

                return (
                  <button
                    key={group.productId}
                    type="button"
                    onClick={() => handleGroupClick(group)}
                    disabled={isOutOfStock}
                    className={cn(
                      'flex flex-col justify-between rounded-xl border p-4 text-left transition-all',
                      isOutOfStock && 'cursor-not-allowed opacity-50',
                      groupCartQuantity > 0
                        ? 'border-brand bg-brand-soft'
                        : 'border-border bg-surface shadow-xs hover:-translate-y-0.5 hover:border-brand-soft-border hover:shadow-md',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-snug text-text-primary">
                        {group.productName}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {group.variants.length > 1 && (
                          <Badge variant="default" size="sm">
                            {group.variants.length} options
                          </Badge>
                        )}
                        {groupCartQuantity > 0 && (
                          <Badge variant="info" size="sm">
                            {groupCartQuantity} in cart
                          </Badge>
                        )}
                      </span>
                    </span>

                    <span className="mt-1 block truncate text-xs text-text-muted">
                      {group.variants.length === 1
                        ? `${describeVariant(group.variants[0])} · ${group.variants[0].unit}`
                        : group.categoryName || 'Multiple options'}
                    </span>

                    <span className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums tracking-tight',
                          group.minimumPrice > 0 ? 'text-text-primary' : 'text-brand',
                        )}
                      >
                        {priceLabel}
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
                        {stockLabel}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : items.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="No products yet"
                  description="Add active products to your catalogue before recording a sale."
                  icon={<Boxes className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />}
                  action={
                    hasPermission(PERMISSIONS.PRODUCTS_CREATE) ? (
                      <Button variant="outline" size="sm" asChild>
                        <NavLink to={ROUTES.APP_PRODUCTS_NEW}>
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add Product
                        </NavLink>
                      </Button>
                    ) : undefined
                  }
                  className="py-10"
                />
              </div>
            ) : (
              <div className="col-span-full">
                <EmptyState
                  title="No matching products"
                  description="Try another search term or choose a different category."
                  icon={<Boxes className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />}
                  action={
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  }
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
                Cart ({itemCount})
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={resetSale}
                  className="text-sm font-medium text-text-muted transition-colors hover:text-danger"
                >
                  Clear all
                </button>
              )}
            </div>
            {renderCartContent('desktop')}
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
        title="Cart & payment"
        description="Review items and take payment"
        position="bottom"
      >
        {renderCartContent('mobile')}
      </Drawer>

      <Modal
        open={Boolean(variantPicker)}
        onClose={() => setVariantPicker(null)}
        title={variantPicker?.productName ?? 'Choose an option'}
        description="Choose the size, grade or brand to add to this sale."
        size="md"
      >
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {variantPicker?.variants.map((variant) => {
            const outOfStock = variant.quantityOnHand <= 0;
            const inCart = cart.find((entry) => entry.variantId === variant.id);
            return (
              <button
                key={variant.id}
                type="button"
                disabled={outOfStock}
                onClick={() => addVariantToCart(variant)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors',
                  outOfStock
                    ? 'cursor-not-allowed border-border bg-surface-2 opacity-50'
                    : 'border-border bg-surface hover:border-brand hover:bg-brand-soft',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text-primary">
                    {describeVariant(variant)}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    {variant.sellingPrice > 0
                      ? formatMoney(variant.sellingPrice)
                      : 'Set price'}{' '}
                    / {variant.unit} ·{' '}
                    {outOfStock ? 'Out of stock' : `${variant.quantityOnHand} in stock`}
                  </span>
                </span>
                {inCart ? (
                  <Badge variant="info" size="sm" className="shrink-0">
                    {inCart.quantity} in cart
                  </Badge>
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </Modal>

      <ConfirmModal
        open={confirmCreditOpen}
        onClose={() => setConfirmCreditOpen(false)}
        onConfirm={() => {
          setConfirmCreditOpen(false);
          void recordSale();
        }}
        title="Sell on credit?"
        message={`${
          selectedCustomer?.name ?? 'This customer'
        } will owe ${formatMoney(total)} for this sale. You can record the payment later from the receipt.`}
        confirmText="Record credit sale"
        variant="primary"
        isLoading={loading}
      />

      <Modal
        open={Boolean(lastReceipt)}
        onClose={() => setLastReceipt(null)}
        title="Sale completed"
        description="Stock has been updated and the receipt is ready."
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-center">
            <Receipt className="mx-auto h-8 w-8 text-brand" aria-hidden="true" />
            <p className="mt-2 text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Receipt number
            </p>
            <p className="text-lg font-bold text-text-primary">
              {lastReceipt?.receiptNumber || 'Pending'}
            </p>
            {lastReceipt ? (
              <p className="mt-1 text-sm font-semibold text-success-fg">
                {formatMoney(lastReceipt.totalKobo)}
              </p>
            ) : null}
            {lastReceipt && lastReceipt.balanceDue > 0 ? (
              <p className="mt-1 text-xs font-semibold text-danger-fg">
                Balance owed: {formatMoney(lastReceipt.balanceDue)}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-text-muted">
            Open the receipt to print it, save a PDF copy, share it, or record payments,
            returns and voids.
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
