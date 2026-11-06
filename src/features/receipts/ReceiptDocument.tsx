import { BUSINESS } from '@/config/business';
import { formatMoney } from '@/lib/formatters';
import {
  DEFAULT_RECEIPT_SETTINGS,
  businessSnapshotFromSettings,
  paymentMethodLabel,
  paymentStatusLabel,
  receiptTypeLabel,
} from '@/lib/receipts';
import type { Receipt } from '@/types';
import { cn } from '@/lib/utilities';

interface ReceiptDocumentProps {
  receipt: Receipt;
  paperFormat?: 'a4' | 'thermal80';
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-success text-white',
  partially_paid: 'bg-warning text-white',
  unpaid: 'bg-danger text-white',
  refunded: 'bg-info text-white',
};

export function ReceiptDocument({
  receipt,
  paperFormat = 'a4',
  className,
}: ReceiptDocumentProps) {
  const business =
    receipt.businessSnapshot ||
    businessSnapshotFromSettings(DEFAULT_RECEIPT_SETTINGS);
  const primary = business.primaryColor || '#172b4d';
  const items = receipt.items || [];
  const payments = receipt.paymentMethods || [];
  const isThermal = paperFormat === 'thermal80';
  const customer = receipt.customerSnapshot;

  return (
    <article
      className={cn(
        'receipt-print-area mx-auto w-full bg-white text-[#172b4d] shadow-sm',
        isThermal
          ? 'max-w-[80mm] rounded-lg border border-slate-200 px-4 py-5 text-[11px]'
          : 'max-w-3xl rounded-xl border border-slate-200 px-7 py-8 text-sm sm:px-10 sm:py-10',
        className,
      )}
      aria-label={`${receiptTypeLabel(receipt.receiptType)} ${receipt.receiptNumber}`}
    >
      {receipt.documentStatus === 'voided' ? (
        <div className="mb-4 border-2 border-red-600 bg-red-50 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-red-700">
          Voided — {receipt.voidReason || 'Refer to the void receipt'}
        </div>
      ) : null}

      <header className={cn('flex gap-4', isThermal ? 'flex-col items-center text-center' : 'items-start justify-between')}>
        <div className={cn('flex min-w-0 gap-3', isThermal && 'flex-col items-center')}>
          {business.showLogo !== false && business.logoUrl ? (
            <img
              src={business.logoUrl}
              alt=""
              className={cn('shrink-0 rounded-md object-contain', isThermal ? 'h-10 w-10' : 'h-14 w-14')}
            />
          ) : null}
          <div className="min-w-0">
            <h1
              className={cn('font-bold leading-tight tracking-tight', isThermal ? 'text-base' : 'text-xl sm:text-2xl')}
              style={{ color: primary }}
            >
              {business.name || BUSINESS.name}
            </h1>
            {business.tagline ? (
              <p className="mt-0.5 text-[11px] text-slate-500">{business.tagline}</p>
            ) : null}
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-500">
              {[business.address, business.phone ? `Tel: ${business.phone}` : '', business.email]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {business.website || business.whatsapp ? (
              <p className="text-[10.5px] text-slate-500">
                {[business.website, business.whatsapp ? `WhatsApp: ${business.whatsapp}` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        </div>

        <div className={cn('shrink-0', isThermal ? 'text-center' : 'text-right')}>
          <p
            className={cn('font-bold uppercase tracking-[0.14em]', isThermal ? 'text-[11px]' : 'text-sm')}
            style={{ color: primary }}
          >
            {receiptTypeLabel(receipt.receiptType)}
          </p>
          <p className="mt-1 text-[11px] font-semibold">No: {receipt.receiptNumber}</p>
          <span
            className={cn(
              'mt-2 inline-block rounded px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
              STATUS_STYLES[receipt.paymentStatus] || 'bg-slate-200 text-slate-700',
            )}
          >
            {paymentStatusLabel(receipt.paymentStatus)}
          </span>
          <p className="mt-2 text-[10.5px] text-slate-500">
            {receipt.issuedDateLabel || '—'}
            {receipt.issuedTimeLabel ? ` · ${receipt.issuedTimeLabel}` : ''}
          </p>
        </div>
      </header>

      <div className="my-4 h-[2px] w-full" style={{ backgroundColor: primary }} />

      <section className={cn('grid gap-3', isThermal ? 'grid-cols-1' : 'grid-cols-2')}>
        {business.showCustomerDetails !== false ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Customer
            </p>
            <p className="mt-0.5 text-[12px] font-semibold">
              {customer?.name || receipt.customerName || 'Walk-in Customer'}
            </p>
            {customer?.phone ? (
              <p className="text-[10.5px] text-slate-500">{customer.phone}</p>
            ) : null}
            {customer?.address ? (
              <p className="text-[10.5px] text-slate-500">{customer.address}</p>
            ) : null}
          </div>
        ) : null}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Receipt Information
          </p>
          <p className="mt-0.5 text-[12px] font-semibold">{receipt.issuedDateLabel || '—'}</p>
          <p className="text-[10.5px] text-slate-500">
            {receipt.issuedTimeLabel || ''}
            {receipt.issuedTimeLabel ? ' (Africa/Lagos)' : ''}
          </p>
          {receipt.saleReceiptNumber && receipt.receiptType !== 'sale' ? (
            <p className="mt-1 text-[10.5px] text-slate-500">
              Original sale: {receipt.saleReceiptNumber}
            </p>
          ) : null}
        </div>
      </section>

      {receipt.receiptType === 'payment' || receipt.receiptType === 'void' ? (
        <section className="mt-4 rounded-lg border border-slate-200 px-3.5 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {receipt.receiptType === 'payment' ? 'Payment Details' : 'Void Details'}
          </p>
          <dl className="mt-2 space-y-1.5 text-[11px]">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Original Sale Receipt</dt>
              <dd className="font-semibold">
                {receipt.originalReceiptNumber || receipt.saleReceiptNumber || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Sale Total</dt>
              <dd className="font-semibold">{formatMoney(receipt.totalKobo || 0)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                {receipt.receiptType === 'payment' ? 'Payment Received' : 'Amount Paid on Sale'}
              </dt>
              <dd className="font-semibold">{formatMoney(receipt.amountPaidKobo || 0)}</dd>
            </div>
            {receipt.receiptType === 'payment' ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Outstanding Balance</dt>
                <dd className="font-semibold">{formatMoney(receipt.balanceDueKobo || 0)}</dd>
              </div>
            ) : null}
            {receipt.receiptType === 'void' ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Authorised By</dt>
                  <dd className="font-semibold">{receipt.processedBy?.displayName || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Reason</dt>
                  <dd className="font-semibold">{receipt.voidReason || '—'}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      {receipt.receiptType === 'sale' || receipt.receiptType === 'return' ? (
        <section className="mt-4">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {receipt.receiptType === 'return' ? 'Items Returned' : 'Items Purchased'}
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr style={{ backgroundColor: primary }}>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-white">Item</th>
                  <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-white">Qty</th>
                  <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-white">Unit</th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-white">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.variantId}-${index}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 align-top">
                      <p className="text-[11px] font-semibold">{item.productName}</p>
                      {item.variationName && item.variationName !== 'Standard' ? (
                        <p className="text-[9.5px] text-slate-500">{item.variationName}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right align-top text-[10.5px]">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right align-top text-[10.5px]">
                      {formatMoney(item.unitPriceKobo ?? item.unitSellingPrice ?? 0)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top text-[11px] font-semibold">
                      {formatMoney(item.lineTotalKobo ?? item.lineTotal ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={cn('mt-4 flex', isThermal ? 'justify-stretch' : 'justify-end')}>
        <div className={cn('space-y-1.5 text-[11px]', isThermal ? 'w-full' : 'w-full max-w-xs')}>
          {receipt.receiptType === 'sale' || receipt.receiptType === 'return' ? (
            <>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">
                  {receipt.receiptType === 'return' ? 'Return Value' : 'Subtotal'}
                </span>
                <span className="font-semibold">
                  {formatMoney(
                    receipt.receiptType === 'return'
                      ? receipt.totalKobo || 0
                      : receipt.subtotalKobo || 0,
                  )}
                </span>
              </div>
              {Number(receipt.discountKobo || 0) > 0 ? (
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-semibold">-{formatMoney(receipt.discountKobo || 0)}</span>
                </div>
              ) : null}
              {Number(receipt.additionalChargesKobo || 0) > 0 ? (
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Additional Charges</span>
                  <span className="font-semibold">{formatMoney(receipt.additionalChargesKobo || 0)}</span>
                </div>
              ) : null}
              <div className="flex items-end justify-between gap-4 border-t-2 pt-1.5" style={{ borderColor: primary }}>
                <span className="text-[12px] font-bold uppercase">
                  {receipt.receiptType === 'return' ? 'Total Returned' : 'Total'}
                </span>
                <span className="text-lg font-bold" style={{ color: primary }}>
                  {formatMoney(receipt.totalKobo || 0)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">
                  {receipt.receiptType === 'return' ? 'Refund Paid' : 'Amount Paid'}
                </span>
                <span className="font-semibold">{formatMoney(receipt.amountPaidKobo || 0)}</span>
              </div>
              {receipt.receiptType === 'return' && receipt.returnReason ? (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Reason</span>
                  <span className="max-w-[60%] text-right font-semibold">{receipt.returnReason}</span>
                </div>
              ) : null}
            </>
          ) : null}

          {receipt.receiptType === 'sale' || receipt.receiptType === 'return' ? (
            <div
              className="mt-2 flex items-center justify-between rounded-md px-2.5 py-2"
              style={{
                backgroundColor: Number(receipt.balanceDueKobo || 0) > 0 ? '#fff5e5' : '#eaf7f0',
              }}
            >
              <span className="text-[11px] font-bold">
                {Number(receipt.balanceDueKobo || 0) > 0 ? 'Balance Due' : 'Fully Settled'}
              </span>
              <span
                className="text-[12px] font-bold"
                style={{ color: Number(receipt.balanceDueKobo || 0) > 0 ? '#955c12' : '#0f5238' }}
              >
                {formatMoney(receipt.balanceDueKobo || 0)}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {payments.length ? (
        <section className="mt-4 rounded-lg border border-slate-200 px-3.5 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Payment Details
          </p>
          <dl className="mt-2 space-y-1 text-[11px]">
            {payments.map((payment, index) => (
              <div key={index} className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  {payment.label || paymentMethodLabel(payment.method)}
                  {payment.reference ? ` · Ref: ${payment.reference}` : ''}
                </dt>
                <dd className="font-semibold">{formatMoney(payment.amountKobo || 0)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {receipt.notes ? (
        <section className="mt-4 rounded-lg border border-slate-200 px-3.5 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Notes</p>
          <p className="mt-1 text-[10.5px] text-slate-600">{receipt.notes}</p>
        </section>
      ) : null}

      <footer className="mt-5 border-t border-slate-200 pt-3 text-center">
        {business.showEmployeeName !== false ? (
          <div className="mb-2 flex items-center justify-between text-[10.5px]">
            <span className="font-semibold text-slate-500">
              {receipt.receiptType === 'return' || receipt.receiptType === 'void'
                ? 'Documented By'
                : 'Served By'}
            </span>
            <span className="font-semibold">{receipt.processedBy?.displayName || '—'}</span>
          </div>
        ) : null}
        <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: primary }}>
          Thank You for Your Patronage!
        </p>
        <p className="mx-auto mt-1 max-w-md text-[9.5px] leading-relaxed text-slate-500">
          {business.footerMessage ||
            'We appreciate your business. For enquiries and further purchases, please contact us.'}
        </p>
        {business.registrationNumber ? (
          <p className="mt-1 text-[9px] text-slate-400">Registration: {business.registrationNumber}</p>
        ) : null}
        {business.taxId ? (
          <p className="text-[9px] text-slate-400">Tax ID: {business.taxId}</p>
        ) : null}
      </footer>
    </article>
  );
}
