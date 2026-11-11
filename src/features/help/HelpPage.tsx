import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';

import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { Phone, Mail, MapPin, ChevronDown, BookOpen, ShoppingCart, Truck, CreditCard, Users, Printer } from 'lucide-react';
import { BUSINESS } from '@/config/business';
import { cn } from '@/lib/utilities';

const GUIDES = [
  {
    icon: ShoppingCart,
    title: 'Recording a Customer Sale (POS)',
    summary: 'How to look up items, select variations, accept cash or transfer, and generate customer receipts.',
    steps: [
      'Navigate to Sales or tap the central Sell button on mobile.',
      'Use the search bar or category chips to find cement, iron rods, or roofing materials.',
      'Tap "Add" or enter exact quantity to place items in the active cart.',
      'Optionally select a registered customer to track credit receivables.',
      'Enter the amount received and choose the payment method (Cash, Bank Transfer, or POS).',
      'Click "Complete Sale" to instantly register the transaction and view the receipt.',
    ],
  },
  {
    icon: Truck,
    title: 'Receiving Stock from Suppliers',
    summary: 'Steps to log inbound inventory shipments and update supplier balance accounts.',
    steps: [
      'Navigate to Purchases → "New Purchase".',
      'Select your vendor or supplier depot from the dropdown.',
      'Add the delivered materials to the intake list.',
      'Verify received quantities and current unit procurement costs.',
      'Add any offloading or trailer transportation costs incurred.',
      'Record initial payment made to the supplier; any remaining balance is tracked automatically as accounts payable.',
    ],
  },
  {
    icon: BookOpen,
    title: 'Searching & Updating Catalogue Products',
    summary: 'Quick filtering, checking stockouts, and modifying selling prices.',
    steps: [
      'Open Products & Inventory from the sidebar or bottom menu.',
      'Type product keywords, brand names, or select category chips.',
      'Tap any product card to view stock remaining, minimum thresholds, and unit prices.',
      'Use the "Add New Product" button to introduce new materials or variant sizes.',
    ],
  },
  {
    icon: CreditCard,
    title: 'Logging Store Operating Expenses',
    summary: 'Keep accurate daily cashbook accounts by logging routine operational spending.',
    steps: [
      'Navigate to Store Expenses.',
      'Click "Record Expense".',
      'Specify the description, amount paid, and category (e.g. Fuel, Offloading, Generator, Staff).',
      'Select the payment method and date, then confirm.',
      'View automatic impacts on your General Cashbook and monthly profit statements.',
    ],
  },
  {
    icon: Users,
    title: 'Tracking & Collecting Customer Debts',
    summary: 'Managing contractors with outstanding balances on materials bought on credit.',
    steps: [
      'Open Customers or go to Money & Finance → Customer Debts.',
      'View the list of all debtor accounts sorted by amount owed.',
      'Tap a customer name to open their account ledger and purchase history.',
      'Use the "Collect Outstanding Debt" panel to enter the payment amount received.',
      'Customer balances update immediately in real-time.',
    ],
  },
  {
    icon: Printer,
    title: 'Thermal Receipts & Invoices',
    summary: 'How customer receipts and order printouts are handled.',
    steps: [
      'Whenever a sale completes, the receipt summary displays with items, prices, and staff signature.',
      'To view or reprint past receipts, go to Sales Records and click on any row.',
      'Customize store headers, contact numbers, and thank-you notes in Settings → Receipt Template.',
    ],
  },
];

export function HelpPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true });

  const filteredGuides = useMemo(() => {
    const q = search.toLowerCase();
    return GUIDES.filter(
      (g) => g.title.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q),
    );
  }, [search]);

  const toggle = (i: number) => {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Operations Guide"
        description="Step-by-step illustrated workflows for building materials store management."
      />

      {/* Guide Search Bar */}
      <div className="max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search guides (e.g. POS, Debt, Stock)..."
        />
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuides.map((guide, i) => {
          const isOpen = expanded[i] ?? false;
          const Icon = guide.icon;
          return (
            <Card
              key={guide.title}
              variant="soft"
              className="p-5 shadow-sm transition-all"
            >
              <div
                onClick={() => toggle(i)}
                className="flex items-start justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-3 border border-border/80 shadow-xs flex items-center justify-center text-brand flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text-primary leading-snug">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {guide.summary}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-1 rounded text-text-muted hover:text-text-primary"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                >
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      isOpen ? 'rotate-180 text-brand' : '',
                    )}
                  />
                </button>
              </div>

              {isOpen && (
                <div className="mt-4 pt-3 border-t border-border/60 space-y-2 animate-fade-in">
                  {guide.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-brand-soft text-brand font-bold text-3xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-text-primary leading-relaxed flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Support Contacts Card */}
      <Card variant="soft" className="p-6 shadow-sm">
        <h3 className="font-bold text-base text-text-primary mb-2">Need Technical Assistance?</h3>
        <p className="text-xs text-text-secondary mb-4 max-w-xl">
          For network setup, thermal Bluetooth printer pairing, user access recovery, or inventory audit questions, reach our operations support team:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface border border-border shadow-xs flex items-center gap-3">
            <Phone className="h-4 w-4 text-brand" />
            <div>
              <p className="text-text-muted text-3xs uppercase font-semibold">Support Line</p>
              <p className="font-bold text-text-primary">{BUSINESS.phone}</p>
            </div>
          </div>
          {BUSINESS.email && (
            <div className="p-3 rounded-xl bg-surface border border-border shadow-xs flex items-center gap-3">
              <Mail className="h-4 w-4 text-brand" />
              <div>
                <p className="text-text-muted text-3xs uppercase font-semibold">Store Email</p>
                <p className="font-bold text-text-primary truncate">{BUSINESS.email}</p>
              </div>
            </div>
          )}
          <div className="p-3 rounded-xl bg-surface border border-border shadow-xs flex items-center gap-3">
            <MapPin className="h-4 w-4 text-brand" />
            <div>
              <p className="text-text-muted text-3xs uppercase font-semibold">Depot Depot</p>
              <p className="font-bold text-text-primary truncate">{BUSINESS.address}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
