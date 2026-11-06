export const BUSINESS = {
  id: 'default-business',
  name: 'Kings Building Materials',
  shortName: 'Kings Store',
  initials: 'KS',
  tagline: 'Quality Building Materials',
  description:
    'Trusted supplier of quality building materials in Lokoja, Kogi State, Nigeria. Serving builders, contractors, and homeowners with fair prices and reliable supply.',
  address: 'Lokoja, Kogi State, Nigeria',
  phone: '+234 800 000 0000',
  phoneHref: 'tel:+2348000000000',
  whatsapp: 'https://wa.me/2348000000000',
  email: 'info@kingsbuildingmaterials.com',
  hours: [
    { days: 'Monday - Friday', time: '8:00 AM - 6:00 PM' },
    { days: 'Saturday', time: '8:00 AM - 4:00 PM' },
    { days: 'Sunday', time: 'Closed' },
  ],
} as const;

export const BUSINESS_HOURS_SUMMARY = 'Mon-Fri 8AM-6PM · Sat 8AM-4PM · Sun Closed';
