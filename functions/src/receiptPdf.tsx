import * as path from 'path';
import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import {
  BUSINESS_ID,
  RECEIPT_TEMPLATE_VERSION,
  db,
  formatNaira,
  paymentMethodLabel,
  paymentStatusLabel,
  receiptStoragePath,
  type BusinessSnapshot,
} from './receiptShared';

type PdfModule = typeof import('@react-pdf/renderer');

let pdfModulePromise: Promise<PdfModule> | null = null;
let fontsRegistered = false;

const dynamicImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<any>;

function loadPdfModule(): Promise<PdfModule> {
  if (!pdfModulePromise) {
    pdfModulePromise = dynamicImport('@react-pdf/renderer') as Promise<PdfModule>;
  }
  return pdfModulePromise;
}

function registerFonts(pdf: PdfModule) {
  if (fontsRegistered) return;
  const fontDir = path.join(__dirname, '..', 'assets', 'fonts');
  pdf.Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(fontDir, 'Inter-Regular.ttf'), fontWeight: 400 },
      { src: path.join(fontDir, 'Inter-SemiBold.ttf'), fontWeight: 600 },
      { src: path.join(fontDir, 'Inter-Bold.ttf'), fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function valueOrDash(value: unknown): string {
  const text = String(value ?? '').trim();
  return text || '\u2014';
}

function contactLine(business: BusinessSnapshot): string {
  return [
    business.address,
    business.phone ? `Tel: ${business.phone}` : '',
    business.whatsapp ? `WhatsApp: ${business.whatsapp}` : '',
    business.website,
  ]
    .filter(Boolean)
    .join('  \u00B7  ');
}

function dateLabel(receipt: Record<string, any>): string {
  if (receipt.issuedDateLabel) return String(receipt.issuedDateLabel);
  const issued = receipt.issuedAt?.toDate ? receipt.issuedAt.toDate() : new Date(receipt.issuedAt || Date.now());
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(issued);
}

function timeLabel(receipt: Record<string, any>): string {
  if (receipt.issuedTimeLabel) return String(receipt.issuedTimeLabel);
  const issued = receipt.issuedAt?.toDate ? receipt.issuedAt.toDate() : new Date(receipt.issuedAt || Date.now());
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(issued);
}

function documentTitle(receipt: Record<string, any>): string {
  switch (receipt.receiptType) {
    case 'payment':
      return 'PAYMENT RECEIPT';
    case 'return':
      return 'RETURN RECEIPT';
    case 'void':
      return 'VOID RECEIPT';
    default:
      return 'SALES RECEIPT';
  }
}

async function loadLogoDataUri(logoUrl?: string): Promise<string | null> {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('data:image/')) return logoUrl;
  if (!/^https?:\/\//i.test(logoUrl)) return null;

  try {
    const response = await fetch(logoUrl, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 1_500_000) return null;
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

interface PagePlan {
  items: Array<Record<string, any>>;
  showSummary: boolean;
  continuation: boolean;
}

function planPages(items: Array<Record<string, any>>): PagePlan[] {
  if (!items.length) {
    return [{ items: [], showSummary: true, continuation: false }];
  }
  if (items.length <= 10) {
    return [{ items, showSummary: true, continuation: false }];
  }

  const plans: PagePlan[] = [
    { items: items.slice(0, 10), showSummary: false, continuation: false },
  ];
  let cursor = 10;
  while (cursor < items.length) {
    const chunk = items.slice(cursor, cursor + 20);
    cursor += chunk.length;
    plans.push({
      items: chunk,
      showSummary: cursor >= items.length,
      continuation: true,
    });
  }
  return plans;
}

function buildDocument(
  pdf: PdfModule,
  receipt: Record<string, any>,
  logoDataUri: string | null,
) {
  const { Document, Page, Text, View, Image, StyleSheet } = pdf;
  const business = (receipt.businessSnapshot || {}) as BusinessSnapshot;
  const primaryColor = business.primaryColor || '#172b4d';
  const showLogo = business.showLogo !== false && Boolean(logoDataUri);
  const showCustomer = business.showCustomerDetails !== false;
  const showEmployee = business.showEmployeeName !== false;
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const payments = Array.isArray(receipt.paymentMethods)
    ? receipt.paymentMethods
    : [];
  const plans = planPages(items);
  const isSale = receipt.receiptType === 'sale';
  const isPayment = receipt.receiptType === 'payment';
  const isReturn = receipt.receiptType === 'return';
  const isVoid = receipt.receiptType === 'void';

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Inter',
      fontSize: 8.5,
      color: '#172b4d',
      backgroundColor: '#ffffff',
      paddingTop: 28,
      paddingBottom: 40,
      paddingHorizontal: 34,
      lineHeight: 1.38,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 14,
    },
    brandRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
    logo: { width: 44, height: 44, objectFit: 'contain' },
    businessName: {
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: -0.2,
      color: primaryColor,
    },
    tagline: { fontSize: 8, color: '#52637a', marginTop: 1.5 },
    contact: { fontSize: 7.2, color: '#52637a', marginTop: 3, lineHeight: 1.35 },
    headerRight: { alignItems: 'flex-end', maxWidth: 220 },
    documentTitle: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: 1.1,
      color: primaryColor,
    },
    receiptNumber: { fontSize: 8.5, fontWeight: 600, marginTop: 3 },
    statusPill: {
      marginTop: 5,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 3,
      fontSize: 7,
      fontWeight: 700,
      letterSpacing: 0.6,
      color: '#ffffff',
      backgroundColor:
        receipt.paymentStatus === 'paid'
          ? '#18845b'
          : receipt.paymentStatus === 'unpaid'
            ? '#b33535'
            : '#b8761a',
    },
    accent: { height: 2.2, backgroundColor: primaryColor, marginTop: 11, marginBottom: 11 },
    infoGrid: { flexDirection: 'row', gap: 10 },
    infoBox: {
      flex: 1,
      border: '0.6 solid #dbe2ea',
      borderRadius: 3,
      padding: 7,
      backgroundColor: '#f8fafc',
    },
    infoLabel: {
      fontSize: 6.5,
      fontWeight: 700,
      letterSpacing: 0.7,
      color: '#64748b',
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    infoValue: { fontSize: 8.5, fontWeight: 600, color: '#172b4d' },
    infoMuted: { fontSize: 7.5, color: '#475569', marginTop: 1.5 },
    sectionTitle: {
      fontSize: 8.5,
      fontWeight: 700,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      marginTop: 13,
      marginBottom: 5,
      color: primaryColor,
    },
    table: { border: '0.6 solid #dbe2ea', borderRadius: 3, overflow: 'hidden' },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primaryColor,
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    tableHeaderText: {
      color: '#ffffff',
      fontSize: 7,
      fontWeight: 700,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottom: '0.5 solid #e8edf3',
      alignItems: 'flex-start',
    },
    itemName: { fontSize: 8.2, fontWeight: 600 },
    itemVariation: { fontSize: 7, color: '#64748b', marginTop: 1.2 },
    cellQty: { width: 54, textAlign: 'right' },
    cellUnit: { width: 70, textAlign: 'right' },
    cellAmount: { width: 80, textAlign: 'right', fontWeight: 600 },
    rightText: { textAlign: 'right' },
    summaryWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    summary: { width: 250 },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2.2,
      borderBottom: '0.4 solid #edf1f5',
    },
    summaryLabel: { fontSize: 8, color: '#475569' },
    summaryValue: { fontSize: 8, fontWeight: 600, textAlign: 'right' },
    summaryTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 5,
      marginTop: 2,
      borderTop: '1.4 solid #172b4d',
    },
    summaryTotalLabel: { fontSize: 9.5, fontWeight: 700 },
    summaryTotalValue: { fontSize: 11, fontWeight: 700, color: primaryColor },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 7,
      backgroundColor: receipt.balanceDueKobo > 0 ? '#fff5e5' : '#eaf7f0',
      borderRadius: 3,
      marginTop: 6,
    },
    balanceLabel: { fontSize: 8.2, fontWeight: 700 },
    balanceValue: {
      fontSize: 9.5,
      fontWeight: 700,
      color: receipt.balanceDueKobo > 0 ? '#955c12' : '#0f5238',
    },
    paymentBox: {
      marginTop: 11,
      border: '0.6 solid #dbe2ea',
      borderRadius: 3,
      padding: 7,
    },
    paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 1.8,
    },
    servedBox: {
      marginTop: 11,
      paddingTop: 7,
      borderTop: '0.6 solid #dbe2ea',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    servedLabel: { fontSize: 7, color: '#64748b', fontWeight: 700, letterSpacing: 0.5 },
    servedValue: { fontSize: 8.5, fontWeight: 600 },
    footer: {
      marginTop: 16,
      paddingTop: 9,
      borderTop: '1 solid #dbe2ea',
      textAlign: 'center',
    },
    footerTitle: {
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 0.6,
      color: primaryColor,
      textTransform: 'uppercase',
    },
    footerText: { fontSize: 7.3, color: '#52637a', marginTop: 2.5, lineHeight: 1.4 },
    legalText: { fontSize: 6.7, color: '#64748b', marginTop: 3 },
    pageNumber: {
      position: 'absolute',
      bottom: 18,
      left: 34,
      right: 34,
      fontSize: 6.7,
      color: '#94a3b8',
      textAlign: 'center',
    },
    continuationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 6,
      borderBottom: `1 solid ${primaryColor}`,
      marginBottom: 9,
    },
    continuationName: { fontSize: 9, fontWeight: 700, color: primaryColor },
    voidBanner: {
      marginTop: 9,
      padding: 6,
      border: '1 solid #b33535',
      borderRadius: 3,
      backgroundColor: '#fceeee',
      color: '#9b2b2b',
      fontSize: 8,
      fontWeight: 700,
      textAlign: 'center',
      letterSpacing: 0.7,
    },
  });

  const metaBox = (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>Receipt Information</Text>
      <Text style={styles.infoValue}>{dateLabel(receipt)}</Text>
      <Text style={styles.infoMuted}>{timeLabel(receipt)} (Africa/Lagos)</Text>
      {receipt.documentStatus === 'voided' && (
        <Text style={[styles.infoMuted, { color: '#9b2b2b', fontWeight: 700 }]}>
          VOIDED
        </Text>
      )}
    </View>
  );

  const customerName =
    receipt.customerSnapshot?.name || 'Walk-in Customer';
  const customerPhone = receipt.customerSnapshot?.phone;
  const customerAddress = receipt.customerSnapshot?.address;

  return (
    <Document
      title={`${documentTitle(receipt)} ${receipt.receiptNumber || ''}`.trim()}
      author={business.name || 'Business'}
      subject={`Receipt ${receipt.receiptNumber || ''}`.trim()}
      creator="BuildStore"
    >
      {plans.map((plan, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page} wrap>
          {plan.continuation ? (
            <View style={styles.continuationHeader}>
              <Text style={styles.continuationName}>{business.name || 'Business'}</Text>
              <Text style={{ fontSize: 7.5, color: '#52637a' }}>
                {documentTitle(receipt)}
                {' \u00B7 '}
                {receipt.receiptNumber || ''}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.headerRow}>
                <View style={styles.brandRow}>
                  {showLogo && logoDataUri ? (
                    <Image src={logoDataUri} style={styles.logo} />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.businessName}>
                      {business.name || 'Business'}
                    </Text>
                    {business.tagline ? (
                      <Text style={styles.tagline}>{business.tagline}</Text>
                    ) : null}
                    {contactLine(business) ? (
                      <Text style={styles.contact}>{contactLine(business)}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.documentTitle}>{documentTitle(receipt)}</Text>
                  <Text style={styles.receiptNumber}>
                    No: {receipt.receiptNumber || '\u2014'}
                  </Text>
                  <Text style={styles.statusPill}>
                    {paymentStatusLabel(receipt.paymentStatus)}
                  </Text>
                </View>
              </View>

              <View style={styles.accent} />

              <View style={styles.infoGrid}>
                {showCustomer ? (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Customer</Text>
                    <Text style={styles.infoValue}>{customerName}</Text>
                    {customerPhone ? (
                      <Text style={styles.infoMuted}>{customerPhone}</Text>
                    ) : (
                      <Text style={styles.infoMuted}>Phone not provided</Text>
                    )}
                    {customerAddress ? (
                      <Text style={styles.infoMuted}>{customerAddress}</Text>
                    ) : null}
                  </View>
                ) : null}
                {metaBox}
              </View>

              {isVoid && receipt.voidReason ? (
                <View style={styles.voidBanner}>
                  VOIDED: {String(receipt.voidReason)}
                </View>
              ) : null}
              {!isVoid && receipt.documentStatus === 'voided' ? (
                <View style={styles.voidBanner}>
                  THIS RECEIPT HAS BEEN VOIDED. REFER TO THE VOID DOCUMENT.
                </View>
              ) : null}
            </>
          )}

          {!isSale && !isReturn ? (
            <View>
              <Text style={styles.sectionTitle}>
                {isPayment
                  ? 'Payment Details'
                  : isVoid
                    ? 'Void Details'
                    : 'Receipt Details'}
              </Text>
              <View style={styles.paymentBox}>
                <View style={styles.paymentRow}>
                  <Text style={styles.summaryLabel}>Original Sale Receipt</Text>
                  <Text style={styles.summaryValue}>
                    {receipt.originalReceiptNumber || valueOrDash(receipt.saleReceiptNumber)}
                  </Text>
                </View>
                {isPayment ? (
                  <>
                    <View style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>Sale Total</Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(receipt.saleTotalKobo ?? receipt.totalKobo ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>Payment Received</Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(receipt.amountPaidKobo ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>Outstanding Balance</Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(receipt.balanceDueKobo ?? 0)}
                      </Text>
                    </View>
                  </>
                ) : null}
                {isVoid ? (
                  <>
                    <View style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>Original Sale Total</Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(receipt.totalKobo ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>Amount Paid on Sale</Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(receipt.amountPaidKobo ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>Authorised By</Text>
                      <Text style={styles.summaryValue}>
                        {receipt.processedBy?.displayName || '\u2014'}
                      </Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>Reason</Text>
                      <Text style={styles.summaryValue}>
                        {receipt.voidReason || '\u2014'}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
              {payments.length ? (
                <View style={styles.paymentBox}>
                  <Text style={styles.infoLabel}>Payment Method</Text>
                  {payments.map((payment: any, index: number) => (
                    <View key={index} style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>
                        {payment.label || paymentMethodLabel(payment.method)}
                        {payment.reference ? ` \u00B7 Ref: ${payment.reference}` : ''}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(payment.amountKobo ?? 0)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {isPayment && receipt.balanceDueKobo > 0 ? (
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Balance Still Due</Text>
                  <Text style={styles.balanceValue}>
                    {formatNaira(receipt.balanceDueKobo)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>
                {isReturn ? 'Items Returned' : 'Items Purchased'}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader} fixed>
                  <Text style={[styles.tableHeaderText, { flex: 1 }]}>Item</Text>
                  <Text style={[styles.tableHeaderText, styles.cellQty]}>Qty</Text>
                  <Text style={[styles.tableHeaderText, styles.cellUnit]}>Unit Price</Text>
                  <Text style={[styles.tableHeaderText, styles.cellAmount]}>Amount</Text>
                </View>
                {plan.items.map((item, index) => (
                  <View key={index} style={styles.tableRow} wrap={false}>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.itemName}>{item.productName || 'Item'}</Text>
                      {item.variationName && item.variationName !== 'Standard' ? (
                        <Text style={styles.itemVariation}>{item.variationName}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.summaryValue, styles.cellQty]}>
                      {item.quantity} {item.unit || ''}
                    </Text>
                    <Text style={[styles.summaryValue, styles.cellUnit]}>
                      {formatNaira(item.unitPriceKobo ?? 0)}
                    </Text>
                    <Text style={[styles.summaryValue, styles.cellAmount]}>
                      {formatNaira(item.lineTotalKobo ?? 0)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {plan.showSummary ? (
            <>
              {isSale || isReturn ? (
                <View style={styles.summaryWrap}>
                  <View style={styles.summary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        {isReturn ? 'Return Value' : 'Subtotal'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(
                          isReturn
                            ? receipt.totalKobo ?? 0
                            : receipt.subtotalKobo ?? 0,
                        )}
                      </Text>
                    </View>
                    {Number(receipt.discountKobo ?? 0) > 0 ? (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Discount</Text>
                        <Text style={styles.summaryValue}>
                          -{formatNaira(receipt.discountKobo)}
                        </Text>
                      </View>
                    ) : null}
                    {Number(receipt.additionalChargesKobo ?? 0) > 0 ? (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Additional Charges</Text>
                        <Text style={styles.summaryValue}>
                          {formatNaira(receipt.additionalChargesKobo)}
                        </Text>
                      </View>
                    ) : null}
                    {Number(receipt.taxKobo ?? 0) > 0 ? (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tax</Text>
                        <Text style={styles.summaryValue}>
                          {formatNaira(receipt.taxKobo)}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.summaryTotal}>
                      <Text style={styles.summaryTotalLabel}>
                        {isReturn ? 'Total Returned' : 'TOTAL'}
                      </Text>
                      <Text style={styles.summaryTotalValue}>
                        {formatNaira(receipt.totalKobo ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        {isReturn ? 'Refund Paid' : 'Amount Paid'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(receipt.amountPaidKobo ?? 0)}
                      </Text>
                    </View>
                    {!isReturn ? (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Balance Due</Text>
                        <Text style={styles.summaryValue}>
                          {formatNaira(receipt.balanceDueKobo ?? 0)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Reason</Text>
                        <Text style={styles.summaryValue}>
                          {receipt.returnReason || '\u2014'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : null}

              {payments.length && (isSale || isReturn) ? (
                <View style={styles.paymentBox}>
                  <Text style={styles.infoLabel}>Payment Details</Text>
                  {payments.map((payment: any, index: number) => (
                    <View key={index} style={styles.paymentRow}>
                      <Text style={styles.summaryLabel}>
                        {payment.label || paymentMethodLabel(payment.method)}
                        {payment.reference ? ` \u00B7 Ref: ${payment.reference}` : ''}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formatNaira(payment.amountKobo ?? 0)}
                      </Text>
                    </View>
                  ))}
                  <Text style={styles.infoMuted}>
                    {dateLabel(receipt)}
                    {' \u00B7 '}
                    {timeLabel(receipt)}
                  </Text>
                </View>
              ) : null}

              {receipt.notes ? (
                <View style={styles.paymentBox}>
                  <Text style={styles.infoLabel}>Notes</Text>
                  <Text style={styles.infoMuted}>{String(receipt.notes)}</Text>
                </View>
              ) : null}

              <View style={styles.servedBox}>
                <Text style={styles.servedLabel}>
                  {isReturn || isVoid ? 'Documented By' : 'Served By'}
                </Text>
                <Text style={styles.servedValue}>
                  {showEmployee
                    ? receipt.processedBy?.displayName || '\u2014'
                    : '\u2014'}
                </Text>
              </View>
              {isPayment ? (
                <View style={styles.servedBox}>
                  <Text style={styles.servedLabel}>Original Sale Processed By</Text>
                  <Text style={styles.servedValue}>
                    {receipt.originalProcessedByName || '\u2014'}
                  </Text>
                </View>
              ) : null}

              <View style={styles.footer}>
                <Text style={styles.footerTitle}>Thank You for Your Patronage!</Text>
                <Text style={styles.footerText}>
                  {business.footerMessage ||
                    'We appreciate your business. For enquiries and further purchases, please contact us using the details above.'}
                </Text>
                {contactLine(business) ? (
                  <Text style={styles.footerText}>{contactLine(business)}</Text>
                ) : null}
                {business.registrationNumber ? (
                  <Text style={styles.legalText}>
                    Registration: {business.registrationNumber}
                  </Text>
                ) : null}
                {business.taxId ? (
                  <Text style={styles.legalText}>Tax ID: {business.taxId}</Text>
                ) : null}
              </View>
            </>
          ) : null}

          <Text
            fixed
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `${business.name || 'Business'} \u00B7 ${receipt.receiptNumber || ''} \u00B7 Page ${pageNumber} of ${totalPages}`
            }
          />
        </Page>
      ))}
    </Document>
  );
}

export async function renderReceiptPdf(
  receipt: Record<string, any>,
): Promise<Buffer> {
  const pdf = await loadPdfModule();
  registerFonts(pdf);
  const logoDataUri = await loadLogoDataUri(receipt.businessSnapshot?.logoUrl);
  const document = buildDocument(pdf, receipt, logoDataUri);
  return pdf.renderToBuffer(document);
}

export interface PdfGenerationResult {
  status: 'ready' | 'generating' | 'failed';
  path?: string;
  error?: string;
  checksum?: string;
  size?: number;
  templateVersion?: number;
}

export async function generateReceiptPdfInternal(
  receiptId: string,
  options: { forceNewVersion?: boolean } = {},
): Promise<PdfGenerationResult> {
  const receiptRef = db.doc(
    `businesses/${BUSINESS_ID}/receipts/${receiptId}`,
  );

  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(receiptRef);
    if (!snap.exists) {
      throw new Error(`Receipt ${receiptId} not found.`);
    }
    const data = snap.data() as Record<string, any>;

    if (
      !options.forceNewVersion &&
      data.pdfStatus === 'ready' &&
      data.pdfPath
    ) {
      return { mode: 'ready' as const, data };
    }

    const lastAttempt = data.pdfLastAttemptAt?.toDate?.();
    if (
      !options.forceNewVersion &&
      data.pdfStatus === 'generating' &&
      lastAttempt &&
      Date.now() - lastAttempt.getTime() < 120_000
    ) {
      return { mode: 'busy' as const, data };
    }

    const currentVersion = Math.max(
      1,
      Number(data.templateVersion || RECEIPT_TEMPLATE_VERSION),
    );
    const targetVersion = options.forceNewVersion
      ? currentVersion + 1
      : currentVersion;

    tx.update(receiptRef, {
      pdfStatus: 'generating',
      pdfAttempts: admin.firestore.FieldValue.increment(1),
      pdfLastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      pdfGenerationError: null,
    });

    return { mode: 'generate' as const, data, targetVersion };
  });

  if (claim.mode === 'ready') {
    return {
      status: 'ready',
      path: claim.data.pdfPath,
      checksum: claim.data.pdfChecksum,
      size: claim.data.pdfSize,
      templateVersion: claim.data.templateVersion,
    };
  }

  if (claim.mode === 'busy') {
    return { status: 'generating', path: claim.data.pdfPath };
  }

  const targetVersion = claim.targetVersion || RECEIPT_TEMPLATE_VERSION;

  try {
    const receipt = { id: receiptId, ...claim.data };
    const buffer = await renderReceiptPdf(receipt);
    const checksum = sha256(buffer);
    const storagePath = receiptStoragePath(receiptId, targetVersion);
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      contentType: 'application/pdf',
      resumable: false,
      metadata: {
        cacheControl: 'private, max-age=0, no-transform',
        metadata: {
          businessId: BUSINESS_ID,
          receiptId,
          receiptNumber: String(claim.data.receiptNumber || ''),
          templateVersion: String(targetVersion),
          checksum,
          generatedBy: 'cloud-function',
        },
      },
    });

    const history = Array.isArray(claim.data.pdfHistory)
      ? claim.data.pdfHistory
      : [];
    const previousEntry =
      claim.data.pdfPath && claim.data.pdfStatus !== 'generating'
        ? [
            {
              path: claim.data.pdfPath,
              checksum: claim.data.pdfChecksum || '',
              templateVersion: claim.data.templateVersion || 1,
              generatedAt: claim.data.pdfGeneratedAt || null,
            },
          ]
        : [];

    await receiptRef.set(
      {
        pdfStatus: 'ready',
        pdfPath: storagePath,
        pdfChecksum: checksum,
        pdfSize: buffer.length,
        pdfGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        pdfGeneratedBy: 'cloud-function',
        pdfGenerationError: admin.firestore.FieldValue.delete(),
        templateVersion: targetVersion,
        pdfVersion: `v${targetVersion}`,
        pdfHistory: [...history, ...previousEntry],
      },
      { merge: true },
    );

    return {
      status: 'ready',
      path: storagePath,
      checksum,
      size: buffer.length,
      templateVersion: targetVersion,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown PDF generation error.';
    await receiptRef.set(
      {
        pdfStatus: 'failed',
        pdfGenerationError: message.slice(0, 700),
        pdfLastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { status: 'failed', error: message };
  }
}

export async function readReceiptPdfBuffer(
  receipt: Record<string, any>,
): Promise<Buffer | null> {
  if (receipt.pdfStatus !== 'ready' || !receipt.pdfPath) return null;
  const bucket = admin.storage().bucket();
  const [buffer] = await bucket.file(String(receipt.pdfPath)).download();
  return buffer;
}
