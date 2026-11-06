import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BUSINESS } from '@/config/business';
import { enquiryService } from '@/services';
import { toast } from '@/lib/toast';
import { PAGE_IMAGES } from '@/constants/images';
import { Phone, Truck, CheckCircle2, Send } from 'lucide-react';

const STEPS = [
  {
    title: 'Inventory & Price Verification',
    body: 'Our depot team confirms warehouse stock and locks in wholesale depot rates.',
  },
  {
    title: 'Written Estimate Delivered',
    body: 'You receive an itemized breakdown including unit rates and haulage via WhatsApp or email.',
  },
  {
    title: 'Payment & Dispatch',
    body: 'Upon confirmation, trucks are loaded at our depot and dispatched directly to your site.',
  },
];

export function RequestQuotePage() {
  const [searchParams] = useSearchParams();
  const productInterest = searchParams.get('product') ?? '';
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    product: productInterest,
    quantity: '',
    deliveryLocation: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.product.trim()) {
      toast('Please provide your name, phone number, and required materials.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await enquiryService.create({
        type: 'quote',
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        message: form.product.trim(),
        productInterest: form.product.trim(),
        quantity: form.quantity.trim() || undefined,
        deliveryLocation: form.deliveryLocation.trim() || undefined,
      });
      setSubmitted(true);
      setForm({
        name: '',
        phone: '',
        email: '',
        product: '',
        quantity: '',
        deliveryLocation: '',
      });
      toast('Your quote request has been submitted successfully!', 'success');
    } catch (error) {
      console.error(error);
      toast('Could not send quote request. Please try again or call us.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Request a Material Quote"
            description="Submit your required materials list or bill of quantities for instant pricing, stock checks, and haulage estimates."
          />
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Card variant="soft" className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-text-primary">Materials Order Form</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Provide your requirements and project location below.
                  </p>
                </div>

                {submitted ? (
                  <div className="space-y-4 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
                      <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">
                      Quote Request Received!
                    </h3>
                    <p className="mx-auto max-w-md text-sm text-text-secondary">
                      Thank you! Our estimating department is calculating current depot pricing
                      and delivery costs. We will send you an itemized quote via WhatsApp or
                      phone.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                      Submit Another Quote Request
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Full Name"
                        placeholder="e.g. Engr. Samuel Ojo"
                        value={form.name}
                        onChange={(event) => update('name', event.target.value)}
                        required
                      />
                      <Input
                        label="Phone Number (WhatsApp preferred)"
                        type="tel"
                        placeholder="e.g. 0803 123 4567"
                        value={form.phone}
                        onChange={(event) => update('phone', event.target.value)}
                        required
                      />
                    </div>

                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      placeholder="e.g. samuel@example.com"
                      value={form.email}
                      onChange={(event) => update('email', event.target.value)}
                    />

                    <Textarea
                      label="Required Building Materials"
                      rows={4}
                      placeholder="e.g. 200 bags Dangote Cement 42.5R, 50 lengths 12mm Tiger iron rods, 10 rolls binding wire…"
                      value={form.product}
                      onChange={(event) => update('product', event.target.value)}
                      required
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Estimated Quantities"
                        placeholder="e.g. Full truck load, 100 bags…"
                        helper="Optional — if known"
                        value={form.quantity}
                        onChange={(event) => update('quantity', event.target.value)}
                      />
                      <Input
                        label="Site Delivery Location"
                        placeholder="e.g. Felele, Lokoja / Ganaja Village"
                        helper="For site haulage calculations"
                        value={form.deliveryLocation}
                        onChange={(event) => update('deliveryLocation', event.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full sm:w-auto sm:min-w-[180px]"
                        isLoading={submitting}
                      >
                        {!submitting && <Send className="h-4 w-4" aria-hidden="true" />}
                        Request Price List
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>

            <div className="space-y-6 lg:col-span-5">
              <Card variant="soft" className="overflow-hidden p-0">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-3">
                  <img
                    src={PAGE_IMAGES.quoteMaterialTakeoff}
                    alt="Architectural Material Takeoff and Blueprints"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="inline-block rounded-md bg-brand-500/90 px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                      Bill of Quantities & Direct Depot Pricing
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-7">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
                    <Truck className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h2 className="mb-2 text-lg font-bold text-text-primary">
                    Our Fulfillment Process
                  </h2>
                  <p className="mb-6 text-sm leading-relaxed text-text-secondary">
                    How your quote request turns into materials delivered to your foundation.
                  </p>

                  <ol className="space-y-5">
                    {STEPS.map((step, index) => (
                      <li key={step.title} className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-text-primary">
                            {step.title}
                          </span>
                          <span className="mt-0.5 block text-sm leading-relaxed text-text-secondary">
                            {step.body}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Card>

              <div className="space-y-2 rounded-2xl border border-border bg-surface p-5 text-center shadow-xs">
                <p className="text-2xs font-semibold uppercase tracking-wider text-text-secondary">
                  Urgent Same-Day Requirement?
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4 text-brand" aria-hidden="true" />
                  <a
                    href={BUSINESS.phoneHref}
                    className="text-sm font-bold text-brand hover:underline"
                  >
                    Call Desk: {BUSINESS.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
