import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BUSINESS, BUSINESS_HOURS_SUMMARY } from '@/config/business';
import { enquiryService } from '@/services';
import { toast } from '@/lib/toast';
import { PAGE_IMAGES } from '@/constants/images';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  Send,
  CheckCircle2,
} from 'lucide-react';

const DETAILS = [
  {
    label: 'Depot Location',
    icon: <MapPin className="h-4 w-4" aria-hidden="true" />,
    value: BUSINESS.address,
    href: undefined,
  },
  {
    label: 'Sales Hotlines',
    icon: <Phone className="h-4 w-4" aria-hidden="true" />,
    value: BUSINESS.phone,
    href: BUSINESS.phoneHref,
  },
  {
    label: 'Support Email',
    icon: <Mail className="h-4 w-4" aria-hidden="true" />,
    value: BUSINESS.email,
    href: `mailto:${BUSINESS.email}`,
  },
  {
    label: 'Opening Hours',
    icon: <Clock className="h-4 w-4" aria-hidden="true" />,
    value: BUSINESS_HOURS_SUMMARY,
    href: undefined,
  },
];

export function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      toast('Please provide your name, phone number, and message.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await enquiryService.create({
        type: 'contact',
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        message: form.message.trim(),
      });
      setSubmitted(true);
      setForm({ name: '', phone: '', email: '', message: '' });
      toast('Your message has been received! We will get back to you promptly.', 'success');
    } catch (error) {
      console.error(error);
      toast('Could not deliver your message. Please try calling our desk directly.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            as="h1"
            title="Contact Our Store"
            description="Visit our warehouse depot in Lokoja or get in touch for immediate price checks and orders."
          />
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-5">
              <Card variant="soft" className="overflow-hidden p-0">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-3">
                  <img
                    src={PAGE_IMAGES.contactStorefront}
                    alt="Kings Building Materials Depot Office and Customer Desk"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="inline-block rounded-md bg-brand-500/90 px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                      Lokoja Main Depot Desk
                    </span>
                  </div>
                </div>

                <div className="space-y-6 p-6">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      Depot Office & Warehouse
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Centrally located with drive-in loading bays for light trucks and trailers.
                    </p>
                  </div>

                <dl className="space-y-5">
                  {DETAILS.filter((detail) => detail.value).map((detail) => (
                    <div key={detail.label} className="flex items-start gap-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                        {detail.icon}
                      </div>
                      <div className="min-w-0">
                        <dt className="text-2xs font-bold uppercase tracking-wider text-text-secondary">
                          {detail.label}
                        </dt>
                        <dd className="mt-0.5 text-sm leading-snug text-text-primary">
                          {detail.href ? (
                            <a
                              href={detail.href}
                              className="font-semibold text-brand hover:underline"
                            >
                              {detail.value}
                            </a>
                          ) : (
                            detail.value
                          )}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
                </div>
              </Card>

              <Card variant="soft" className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success-fg">
                    <MessageCircle className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-text-primary">
                      Instant WhatsApp Order
                    </h3>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      Send a snapshot of your bill of quantities for rapid quoting.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href={`https://wa.me/${BUSINESS.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${BUSINESS.name}, I would like to inquire about materials.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="secondary" className="w-full">
                      Chat with Sales Desk
                    </Button>
                  </a>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-7">
              <Card variant="soft" className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-text-primary">Send Us an Inquiry</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Fill out the form below and an account representative will reply within 30
                    minutes.
                  </p>
                </div>

                {submitted ? (
                  <div className="space-y-4 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
                      <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">
                      Inquiry Dispatched Successfully
                    </h3>
                    <p className="mx-auto max-w-md text-sm text-text-secondary">
                      Thank you for contacting {BUSINESS.name}. Our inventory manager is
                      reviewing your message and will reach out promptly.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Your Full Name"
                        placeholder="e.g. Arc. Bello Musa"
                        value={form.name}
                        onChange={(event) => update('name', event.target.value)}
                        required
                      />
                      <Input
                        label="Phone Number"
                        type="tel"
                        placeholder="e.g. 0803 000 0000"
                        value={form.phone}
                        onChange={(event) => update('phone', event.target.value)}
                        required
                      />
                    </div>

                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      placeholder="e.g. bello@example.com"
                      value={form.email}
                      onChange={(event) => update('email', event.target.value)}
                    />

                    <Textarea
                      label="Message / Materials Needed"
                      placeholder="Describe what building materials, quantities, or delivery requirements you need…"
                      rows={5}
                      value={form.message}
                      onChange={(event) => update('message', event.target.value)}
                      required
                    />

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full sm:w-auto sm:min-w-[160px]"
                        isLoading={submitting}
                      >
                        {!submitting && <Send className="h-4 w-4" aria-hidden="true" />}
                        Send Inquiry
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
