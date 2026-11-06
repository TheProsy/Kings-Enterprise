import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { PanelSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { receiptService } from '@/services';
import { buildRoute, PAYMENT_METHODS, PERMISSIONS, ROUTES } from '@/constants';
import { formatDateTime, formatMoney, toKobo } from '@/lib/formatters';
import { paymentMethodLabel, paymentStatusLabel, receiptTypeLabel } from '@/lib/receipts';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import type { Receipt } from '@/types';
import { ReceiptDocument } from './ReceiptDocument';
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  Printer,
  RotateCcw,
  Share2,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

type PaperFormat = 'a4' | 'thermal80';

function failureMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function printReceipt(mode: PaperFormat) {
  document.documentElement.dataset.printMode = mode;
  const cleanup = () => {
    delete document.documentElement.dataset.printMode;
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  paid: 'success',
  partially_paid: 'warning',
  unpaid: 'danger',
  refunded: 'info',
};

export function ReceiptDetailPage() {
  const { receiptId = '' } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paperFormat, setPaperFormat] = useState<PaperFormat>('a4');

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recording, setRecording] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnMethod, setReturnMethod] = useState('cash');
  const [returning, setReturning] = useState(false);

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const loadReceipt = async () => {
    if (!receiptId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const data = await receiptService.get(receiptId);
      if (!data) {
        setNotFound(true);
      } else {
        setReceipt(data);
        setNotFound(false);
        setPaymentAmount(
          Number(data.balanceDueKobo || 0) > 0
            ? (Number(data.balanceDueKobo || 0) / 100).toFixed(2)
            : '',
        );
      }
    } catch (error) {
      console.error(error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void loadReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptId]);

  const canManagePayments =
    hasPermission(PERMISSIONS.FINANCE_RECORD_PAYMENT) ||
    hasPermission(PERMISSIONS.SALES_CREATE) ||
    hasPermission(PERMISSIONS.RECEIPTS_CREATE);
  const canReturn =
    hasPermission(PERMISSIONS.SALES_REFUND) ||
    hasPermission(PERMISSIONS.SALES_EDIT) ||
    hasPermission(PERMISSIONS.RECEIPTS_REFUND);
  const canVoid = hasPermission(PERMISSIONS.SALES_CANCEL) || hasPermission(PERMISSIONS.RECEIPTS_VOID);

  const collectibleItems = useMemo(() => receipt?.items || [], [receipt]);

  const returnTotal = useMemo(() => {
    return collectibleItems.reduce((sum, item) => {
      const quantity = Math.min(
        Number(returnQuantities[item.variantId] || 0),
        Number(item.quantity || 0),
      );
      return sum + quantity * Number(item.unitPriceKobo || 0);
    }, 0);
  }, [collectibleItems, returnQuantities]);

  const whatsappMessage = useMemo(() => {
    if (!receipt) return '';
    const businessName = receipt.businessSnapshot?.name || 'our store';
    return [
      `Hello from ${businessName}.`,
      `${receiptTypeLabel(receipt.receiptType)} ${receipt.receiptNumber}`,
      `Total: ${formatMoney(receipt.totalKobo || 0)}`,
      `Paid: ${formatMoney(receipt.amountPaidKobo || 0)}`,
      `Balance: ${formatMoney(receipt.balanceDueKobo || 0)}`,
      receipt.issuedDateLabel ? `Issued: ${receipt.issuedDateLabel}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, [receipt]);

  const handleShare = async () => {
    if (!receipt) return;
    const shareUrl = window.location.href;
    const text = `${receiptTypeLabel(receipt.receiptType)} ${receipt.receiptNumber} — ${formatMoney(
      receipt.totalKobo || 0,
    )}`;
    const shareData = {
      title: `${receiptTypeLabel(receipt.receiptType)} ${receipt.receiptNumber}`,
      text,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      toast('Receipt link copied to clipboard.', 'success');
    } catch {
      toast('Sharing is not available in this browser.', 'warning');
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank', 'noopener');
  };

  const handleRecordPayment = async () => {
    if (!receipt) return;
    const amount = toKobo(parseFloat(paymentAmount) || 0);
    if (amount <= 0) {
      toast('Enter a payment amount greater than zero.', 'warning');
      return;
    }
    if (amount > Number(receipt.balanceDueKobo || 0)) {
      toast('Payment cannot exceed the outstanding balance.', 'warning');
      return;
    }

    setRecording(true);
    try {
      const result = await receiptService.recordPayment({
        idempotencyKey: crypto.randomUUID(),
        saleId: receipt.saleId || receipt.id,
        amount,
        paymentMethod,
        reference: paymentReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      toast(`Payment receipt ${result.receiptNumber} issued.`, 'success');
      setPaymentOpen(false);
      navigate(buildRoute(ROUTES.APP_RECEIPT_DETAIL, { receiptId: result.receiptId }));
    } catch (error) {
      console.error(error);
      toast(
        failureMessage(
          error,
          'Could not record the payment. Check the amount and try again.',
        ),
        'error',
      );
    } finally {
      setRecording(false);
    }
  };

  const handleReturn = async () => {
    if (!receipt) return;
    const items = Object.entries(returnQuantities)
      .map(([variantId, quantity]) => {
        const item = collectibleItems.find((entry) => entry.variantId === variantId);
        return {
          productId: item?.productId || '',
          variantId,
          quantity: Number(quantity),
        };
      })
      .filter((item) => item.productId && item.quantity > 0);

    if (!items.length) {
      toast('Select at least one item and quantity to return.', 'warning');
      return;
    }
    if (!returnReason.trim()) {
      toast('A return reason is required.', 'warning');
      return;
    }

    setReturning(true);
    try {
      const result = await receiptService.createReturn({
        idempotencyKey: crypto.randomUUID(),
        saleId: receipt.saleId || receipt.id,
        items,
        reason: returnReason.trim(),
        refundMethod: returnMethod,
      });
      toast(`Return receipt ${result.receiptNumber} issued.`, 'success');
      setReturnOpen(false);
      navigate(buildRoute(ROUTES.APP_RECEIPT_DETAIL, { receiptId: result.receiptId }));
    } catch (error) {
      console.error(error);
      toast(
        failureMessage(
          error,
          'Could not record the return. Verify the quantities and try again.',
        ),
        'error',
      );
    } finally {
      setReturning(false);
    }
  };

  const handleVoid = async () => {
    if (!receipt) return;
    if (!voidReason.trim()) {
      toast('A void reason is required.', 'warning');
      return;
    }

    setVoiding(true);
    try {
      const result = await receiptService.voidSale({
        idempotencyKey: crypto.randomUUID(),
        saleId: receipt.saleId || receipt.id,
        reason: voidReason.trim(),
      });
      toast(`Sale voided. Void receipt ${result.receiptNumber} issued.`, 'success');
      setVoidOpen(false);
      navigate(buildRoute(ROUTES.APP_RECEIPT_DETAIL, { receiptId: result.receiptId }));
    } catch (error) {
      console.error(error);
      toast(
        failureMessage(
          error,
          'Could not void this sale. It may already be voided or have returns.',
        ),
        'error',
      );
    } finally {
      setVoiding(false);
    }
  };

  if (loading) {
    return <PanelSkeleton rows={8} />;
  }

  if (notFound || !receipt) {
    return (
      <EmptyState
        title="Receipt not found"
        description="This receipt may have been removed, or you do not have permission to view it."
        icon={<FileWarning className="h-6 w-6" />}
        action={
          <Button asChild variant="outline">
            <NavLink to={ROUTES.APP_RECEIPTS}>
              <ArrowLeft className="h-4 w-4" />
              Back to receipts
            </NavLink>
          </Button>
        }
      />
    );
  }

  const isSaleReceipt = receipt.receiptType === 'sale';
  const outstanding = Number(receipt.balanceDueKobo || 0);
  const saleLinkReceiptId = receipt.originalReceiptId;

  return (
    <div className="space-y-5 pb-10 print:space-y-0 print:pb-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <NavLink to={ROUTES.APP_RECEIPTS}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Receipts
            </NavLink>
          </Button>
          <Badge variant={STATUS_VARIANT[receipt.paymentStatus] || 'neutral'}>
            {paymentStatusLabel(receipt.paymentStatus)}
          </Badge>
          {receipt.documentStatus === 'voided' ? <Badge variant="danger">Voided</Badge> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'thermal80', label: '80mm' },
            ]}
            value={paperFormat}
            onChange={(value) => setPaperFormat(value as PaperFormat)}
            ariaLabel="Preview paper format"
          />
          <Button size="sm" variant="outline" onClick={() => printReceipt(paperFormat)}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button size="sm" variant="outline" onClick={handleWhatsApp}>
            <ExternalLink className="h-3.5 w-3.5" />
            WhatsApp
          </Button>
          <Button size="sm" onClick={() => printReceipt(paperFormat)}>
            <Download className="h-3.5 w-3.5" />
            Save as PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] print:block">
        <div className="min-w-0">
          <div className="rounded-xl border border-border bg-surface-2 p-3 shadow-xs sm:p-5 print:border-0 print:bg-transparent print:p-0 print:shadow-none">
            <ReceiptDocumentLazy receipt={receipt} paperFormat={paperFormat} />
          </div>
        </div>

        <aside className="no-print space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
            <h2 className="text-sm font-bold text-text-primary">Document Details</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Receipt</dt>
                <dd className="font-semibold text-text-primary">{receipt.receiptNumber}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Type</dt>
                <dd className="font-semibold text-text-primary">
                  {receiptTypeLabel(receipt.receiptType)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Issued</dt>
                <dd className="font-semibold text-text-primary">
                  {formatDateTime(receipt.issuedAt || receipt.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Processed by</dt>
                <dd className="font-semibold text-text-primary">
                  {receipt.processedBy?.displayName || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Payment</dt>
                <dd className="font-semibold text-text-primary">
                  {paymentMethodLabel(receipt.paymentMethod)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Total</dt>
                <dd className="font-bold text-text-primary">
                  {formatMoney(receipt.totalKobo || 0)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Balance</dt>
                <dd
                  className={`font-bold ${
                    outstanding > 0 ? 'text-warning-fg' : 'text-success-fg'
                  }`}
                >
                  {formatMoney(outstanding)}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {saleLinkReceiptId ? (
                <Button asChild size="sm" variant="outline">
                  <NavLink
                    to={buildRoute(ROUTES.APP_RECEIPT_DETAIL, { receiptId: saleLinkReceiptId })}
                  >
                    Original receipt
                  </NavLink>
                </Button>
              ) : null}
              {receipt.saleId ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`${ROUTES.APP_SALES}?search=${encodeURIComponent(receipt.saleReceiptNumber || '')}`)}
                >
                  View sale
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast('Receipt link copied.', 'success');
                  } catch {
                    toast('Could not copy the link.', 'error');
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
            </div>
          </div>

          {isSaleReceipt && receipt.documentStatus !== 'voided' ? (
            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
              <h2 className="text-sm font-bold text-text-primary">Actions</h2>
              <p className="mt-1 text-xs text-text-muted">
                Issue linked payment and return documents or void this sale.
              </p>
              <div className="mt-3 grid gap-2">
                {outstanding > 0 && canManagePayments ? (
                  <Button size="sm" onClick={() => setPaymentOpen(true)}>
                    <Wallet className="h-3.5 w-3.5" />
                    Record Payment
                  </Button>
                ) : null}
                {canReturn ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReturnQuantities({});
                      setReturnReason('');
                      setReturnOpen(true);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Record Return
                  </Button>
                ) : null}
                {canVoid ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setVoidReason('');
                      setVoidOpen(true);
                    }}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Void Sale
                  </Button>
                ) : null}
                {!canManagePayments && !canReturn && !canVoid ? (
                  <p className="text-xs text-text-muted">
                    You do not have permission to issue linked documents for this sale.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
            <h2 className="text-sm font-bold text-text-primary">Save a copy</h2>
            <p className="mt-1 text-xs text-text-muted">
              Use Print to send this receipt to a printer, or choose “Save as PDF” in
              the print dialog to download a copy. Receipts are stored securely in
              your database, so no file storage is required.
            </p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Template</dt>
                <dd className="font-semibold text-text-primary">
                  v{receipt.templateVersion || 1}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Format</dt>
                <dd className="font-semibold text-text-primary">
                  {paperFormat === 'thermal80' ? '80mm thermal' : 'A4'}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Record Payment"
        description={`Outstanding balance: ${formatMoney(outstanding)}`}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Amount"
            type="number"
            min="0"
            step="any"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
          />
          <Select
            label="Payment Method"
            options={PAYMENT_METHODS.map((method) => ({
              value: method.value,
              label: method.label,
            }))}
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          />
          <Input
            label="Reference (optional)"
            value={paymentReference}
            onChange={(event) => setPaymentReference(event.target.value)}
            placeholder="Transfer or POS reference"
          />
          <Textarea
            label="Notes (optional)"
            rows={2}
            value={paymentNotes}
            onChange={(event) => setPaymentNotes(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRecordPayment} isLoading={recording}>
              Issue Payment Receipt
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="Record Return"
        description="Returned items are restocked and a return receipt is issued."
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {collectibleItems.map((item) => (
              <div
                key={item.variantId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{item.productName}</p>
                  <p className="text-xs text-text-muted">
                    {item.variationName || 'Standard'} · Sold {item.quantity} {item.unit} @{' '}
                    {formatMoney(item.unitPriceKobo || 0)}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  max={item.quantity}
                  value={returnQuantities[item.variantId] ?? 0}
                  onChange={(event) => {
                    const value = Math.min(
                      Math.max(0, parseInt(event.target.value, 10) || 0),
                      item.quantity,
                    );
                    setReturnQuantities((current) => ({
                      ...current,
                      [item.variantId]: value,
                    }));
                  }}
                  className="h-10 w-24 rounded-lg border border-border-strong bg-surface px-3 text-right text-sm font-semibold text-text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  aria-label={`Return quantity for ${item.productName}`}
                />
              </div>
            ))}
          </div>
          <Textarea
            label="Return reason"
            rows={2}
            value={returnReason}
            onChange={(event) => setReturnReason(event.target.value)}
            placeholder="Damaged, wrong item, customer changed mind…"
          />
          <Select
            label="Refund method"
            options={PAYMENT_METHODS.map((method) => ({
              value: method.value,
              label: method.label,
            }))}
            value={returnMethod}
            onChange={(event) => setReturnMethod(event.target.value)}
          />
          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-sm font-semibold text-text-primary">
              Refund value: {formatMoney(returnTotal)}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setReturnOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleReturn} isLoading={returning}>
                Issue Return Receipt
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        title="Void Sale"
        description="This restores stock, reverses the sale ledger and issues a void receipt."
        size="sm"
      >
        <div className="space-y-4">
          <Textarea
            label="Void reason"
            rows={3}
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            placeholder="Duplicate entry, cancelled order, wrong pricing…"
          />
          <p className="rounded-lg bg-danger-soft p-3 text-xs text-danger-fg">
            Sales with recorded returns cannot be voided. Record a further return instead.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setVoidOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleVoid} isLoading={voiding}>
              Void Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ReceiptDocumentLazy({
  receipt,
  paperFormat,
}: {
  receipt: Receipt;
  paperFormat: PaperFormat;
}) {
  return <ReceiptDocument receipt={receipt} paperFormat={paperFormat} />;
}
