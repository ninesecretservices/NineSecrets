import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import useTitle from '../utils/useTitle';
import { getCommerceSettings } from '../utils/settings';

function LegalShell({ title, updated, children }) {
  return (
    <div className="min-h-[60vh] bg-cream font-body text-ink">
      <div className="bg-beige py-12">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <h1
            className="font-heading italic text-ink"
            style={{ fontSize: 'clamp(30px, 3.5vw, 44px)' }}
          >
            {title}
          </h1>
          <p className="mt-2 text-xs text-mauve-dark">
            Last updated: {updated}
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-7 px-6 py-12 text-[14px] leading-[1.85] text-mauve-dark md:px-10">
        {children}
        <ContactBlock />
      </div>
    </div>
  );
}

function H({ children }) {
  return (
    <h2 className="mb-2 font-heading text-xl italic text-ink">{children}</h2>
  );
}

function ContactBlock() {
  const [contact, setContact] = useState({ contactPhone: '', contactEmail: '', contactAddress: '' });
  useEffect(() => { getCommerceSettings().then(setContact); }, []);

  if (!contact.contactPhone && !contact.contactEmail && !contact.contactAddress) return null;

  return (
    <div className="border border-beige bg-surface p-6">
      <H>Questions? Contact us</H>
      <div className="mt-3 flex flex-col gap-2.5 text-[13px]">
        {contact.contactPhone && (
          <a
            href={`tel:${contact.contactPhone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center gap-2 hover:text-ink"
          >
            <Phone size={14} strokeWidth={1.5} /> {contact.contactPhone}
          </a>
        )}
        {contact.contactEmail && (
          <a
            href={`mailto:${contact.contactEmail}`}
            className="flex items-center gap-2 hover:text-ink"
          >
            <Mail size={14} strokeWidth={1.5} /> {contact.contactEmail}
          </a>
        )}
        {contact.contactAddress && (
          <p className="flex items-start gap-2">
            <MapPin
              size={14}
              strokeWidth={1.5}
              className="mt-0.5 flex-shrink-0"
            />{' '}
            {contact.contactAddress}
          </p>
        )}
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  useTitle('Privacy Policy');
  const [contact, setContact] = useState({ contactEmail: '' });
  useEffect(() => { getCommerceSettings().then(setContact); }, []);
  const email = contact.contactEmail || 'our support team';

  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <div>
        <H>What we collect</H>
        <p>
          When you shop with Nine Secrets we collect the information needed to
          serve you: your name, email address, phone number, delivery address,
          and order history. If you create an account, we also store your saved
          addresses and wishlist. Payment details are handled by our payment
          partners and are never stored on our servers.
        </p>
      </div>
      <div>
        <H>How we use it</H>
        <p>
          Your information is used to process and deliver orders, send order
          updates, provide customer support, and — only if you opt in — share
          offers and new-collection announcements. We use aggregate, anonymised
          data to understand what our customers love so we can make better
          products.
        </p>
      </div>
      <div>
        <H>What we never do</H>
        <p>
          We never sell, rent, or trade your personal information to third
          parties. We share data only with the partners essential to fulfilling
          your order (payment gateways, delivery partners) and only what they
          need.
        </p>
      </div>
      <div>
        <H>Cookies</H>
        <p>
          Our site uses cookies and local storage to keep you signed in,
          remember your bag and wishlist, and understand site usage. You can
          clear these at any time from your browser settings; the site will
          still work, though you'll be signed out.
        </p>
      </div>
      <div>
        <H>Your rights</H>
        <p>
          You may request a copy of the personal data we hold about you, ask us
          to correct it, or ask us to delete your account entirely. Write to{' '}
          {contact.contactEmail ? <a href={`mailto:${email}`} className="text-ink underline">{email}</a> : email}{' '}
          and we'll act within 30 days.
        </p>
      </div>
      <div>
        <H>Security</H>
        <p>
          All traffic to our site is encrypted, passwords are stored using
          industry-standard hashing, and access to customer data inside our team
          is limited to those who need it for support and fulfilment.
        </p>
      </div>
    </LegalShell>
  );
}

export function ReturnPolicy() {
  useTitle('Return & Cancellation Policy');
  return (
    <LegalShell title="Return & Cancellation Policy" updated="July 2026">
      <div>
        <H>7-day easy exchange & return</H>
        <p>
          If something isn't right, you have 7 days from delivery to request a
          return or exchange from{' '}
          <Link to="/account" className="text-ink underline">
            My Account → Your Orders
          </Link>
          . Items must be unworn, unwashed, and in their original packaging with
          tags attached.
        </p>
      </div>
      <div>
        <H>Hygiene exceptions</H>
        <p>
          For hygiene reasons, briefs and panties can only be exchanged if the
          hygiene seal is intact. Products marked "final sale" cannot be
          returned unless defective.
        </p>
      </div>
      <div>
        <H>Cancelling an order</H>
        <p>
          You can cancel an order free of charge any time before it ships — the
          Cancel button appears on the order in My Account while it is still
          processing. Once shipped, please use the return flow after delivery
          instead.
        </p>
      </div>
      <div>
        <H>Refunds</H>
        <p>
          Once your return reaches us and passes inspection, refunds are issued
          to the original payment method within 5–7 business days.
          Cash-on-delivery orders are refunded to your bank account or as store
          credit, whichever you prefer.
        </p>
      </div>
      <div>
        <H>Damaged or wrong items</H>
        <p>
          If your order arrives damaged or incorrect, contact us within 48 hours
          with a photo and we'll ship a replacement immediately at no cost — no
          need to wait for the return to reach us first.
        </p>
      </div>
    </LegalShell>
  );
}

export function ShippingPolicy() {
  useTitle('Shipping Policy');
  const [commerce, setCommerce] = useState({ freeShippingThreshold: 599, shippingFee: 50 });
  useEffect(() => { getCommerceSettings().then(setCommerce); }, []);

  return (
    <LegalShell title="Shipping Policy" updated="July 2026">
      <div>
        <H>Dispatch</H>
        <p>
          Orders placed before 4 PM on business days ship within 24 hours.
          Orders placed on Sundays or public holidays ship the next business
          day. You'll receive a confirmation email as soon as your order is
          placed.
        </p>
      </div>
      <div>
        <H>Delivery time & charges</H>
        <p>
          Standard delivery takes 3–5 business days across India (metros usually
          faster, remote pin codes may take up to 7). Shipping is free on orders
          of ₹{commerce.freeShippingThreshold} and above; a flat ₹{commerce.shippingFee} applies below that. Any current
          threshold is always shown live in your bag.
        </p>
      </div>
      <div>
        <H>Order tracking</H>
        <p>
          Track every order from{' '}
          <Link to="/account" className="text-ink underline">
            My Account → Your Orders
          </Link>
          , where the status moves from Processing → Shipped → Delivered.
        </p>
      </div>
      <div>
        <H>Packaging</H>
        <p>
          Every order ships in discreet, plain packaging with no external
          branding describing the contents — your privacy matters to us.
        </p>
      </div>
      <div>
        <H>Serviceability</H>
        <p>
          We currently ship within India only. If your pin code isn't
          serviceable, we'll contact you within 24 hours to arrange an
          alternative or a full refund.
        </p>
      </div>
    </LegalShell>
  );
}

export function TermsOfService() {
  useTitle('Terms of Service');
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <div>
        <H>About these terms</H>
        <p>
          These terms govern your use of the Nine Secrets website and your
          purchases from us. By placing an order you agree to them. Nothing here
          limits your statutory rights as a consumer under Indian law.
        </p>
      </div>
      <div>
        <H>Products & pricing</H>
        <p>
          We do our best to display colours and details accurately, but screens
          vary — minor differences between photos and the delivered product
          aren't defects. All prices are in Indian Rupees and include applicable
          taxes unless stated otherwise. We may correct obvious pricing errors
          and will offer you a full refund if you'd rather not proceed at the
          corrected price.
        </p>
      </div>
      <div>
        <H>Orders & availability</H>
        <p>
          An order is accepted when we confirm dispatch. If an item becomes
          unavailable after you order, we'll refund it in full and let you know
          immediately. We reserve the right to limit unusually large quantities
          per customer.
        </p>
      </div>
      <div>
        <H>Accounts</H>
        <p>
          You're responsible for keeping your account credentials safe. Let us
          know immediately if you suspect unauthorised use, and we'll help
          secure it.
        </p>
      </div>
      <div>
        <H>Coupons & offers</H>
        <p>
          Offers can't be combined unless stated, apply only during their
          validity window, and may be withdrawn at any time. Misuse of coupon
          codes may lead to order cancellation.
        </p>
      </div>
      <div>
        <H>Intellectual property</H>
        <p>
          All content on this site — photography, copy, designs, and the Nine
          Secrets name — belongs to us and may not be reproduced without written
          permission.
        </p>
      </div>
      <div>
        <H>Governing law</H>
        <p>
          These terms are governed by the laws of India, with courts in Surat,
          Gujarat having jurisdiction over any dispute.
        </p>
      </div>
    </LegalShell>
  );
}

export function Blog() {
  useTitle('Blog');
  return (
    <div className="min-h-[60vh] bg-cream font-body text-ink">
      <div className="bg-beige py-12">
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          <h1
            className="font-heading italic text-ink"
            style={{ fontSize: 'clamp(30px, 3.5vw, 44px)' }}
          >
            The Journal
          </h1>
          <p className="mt-2 text-sm text-mauve-dark">
            Fit advice, fabric stories, and life in Nine Secrets.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-6 py-14 md:px-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            'How to find your true bra size',
            'Why we obsess over fabrics',
            'Caring for delicates: a 2-minute guide',
          ].map((t) => (
            <div key={t} className="border border-beige bg-surface p-6">
              <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-mauve">
                Coming soon
              </p>
              <h2 className="font-heading text-lg italic text-ink">{t}</h2>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-mauve">
          Our first stories are being written. Meanwhile, the{' '}
          <a href="/fit-guide" className="text-ink underline">
            Fit Guide
          </a>{' '}
          has everything you need to size yourself perfectly.
        </p>
      </div>
    </div>
  );
}
