import { T, FONT_D } from "../lib/theme";
import {
  TOS_VERSION,
  PRIVACY_VERSION,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_ADDRESS,
} from "../lib/legal.js";

const CO = "NAP Orbit";

export { TOS_VERSION, PRIVACY_VERSION, SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_ADDRESS };

export function LegalHeading({ children }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT_D, color: T.ink, margin: "18px 0 6px" }}>
      {children}
    </div>
  );
}

export function LegalParagraph({ children }) {
  return (
    <p style={{ fontSize: 14.5, color: T.sub, lineHeight: 1.65, margin: "0 0 8px" }}>
      {children}
    </p>
  );
}

/** Compact variants for in-dashboard legal tab */
export function LegalHeadingCompact({ children }) {
  return (
    <div style={{ fontSize: 13.5, fontWeight: 800, fontFamily: FONT_D, color: T.ink, margin: "8px 0 3px" }}>
      {children}
    </div>
  );
}

export function LegalParagraphCompact({ children }) {
  return (
    <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.55, margin: "0 0 6px" }}>
      {children}
    </p>
  );
}

export function TermsOfServiceBody({ H = LegalHeading, P = LegalParagraph, co = CO }) {
  return (
    <div>
      <H>1. Agreement to Terms</H>
      <P>
        By creating an account, checking the acceptance box at checkout, or using the {co} platform (the &quot;Service&quot;),
        operated by Rank Orbit (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;), you (&quot;you,&quot; &quot;Client&quot;) agree to be bound by these Terms &amp;
        Conditions (&quot;Terms&quot;). If you do not agree, do not use the Service.
      </P>
      <P>
        You confirm you are at least 18 years old and authorized to enter this agreement on behalf of yourself or the
        business you represent.
      </P>

      <H>2. Description of Service</H>
      <P>
        {co} is a subscription-based digital software-as-a-service (SaaS) platform that manages local business visibility,
        including directory listings, NAP (Name, Address, Phone) consistency, listing monitoring, unauthorized-edit
        protection, Google Business Profile management, and AI-search optimization, according to your selected plan.
      </P>
      <P>The Service is a digital service delivered electronically. No physical goods are shipped.</P>

      <H>3. Delivery of Service (chargeback-critical)</H>
      <P>You acknowledge and agree that:</P>
      <P>
        The Service is delivered immediately upon successful payment, when we grant you access to your account and the
        platform is made available to you.
      </P>
      <P>
        &quot;Delivery&quot; of this digital Service means the provision of account access and platform availability, not the
        shipment or receipt of any physical item.
      </P>
      <P>
        Access to your dashboard, submission of your business to directories, and availability of platform features
        constitute full delivery of the Service for the billing period paid.
      </P>

      <H>4. Fees, Billing &amp; Auto-Renewal</H>
      <P>
        Plan prices are as displayed at checkout (Essentials, Growth, GMB Pro, or as offered). Prices may change with
        notice for future billing periods.
      </P>
      <P>Subscriptions bill in advance on a recurring basis (monthly unless stated otherwise).</P>
      <P>
        <b>Auto-renewal:</b> Your subscription automatically renews at the end of each billing period and your payment
        method is charged, until you cancel. You consent to this recurring charge at checkout via a separate, clearly
        labeled acceptance.
      </P>
      <P>We will send a receipt for each charge and, where applicable, a renewal reminder before billing.</P>

      <H>5. Non-Refundable Policy (chargeback-critical)</H>
      <P>All payments are final and non-refundable.</P>
      <P>
        Because the Service is a digital service delivered and consumed immediately, fees paid are non-refundable, in
        whole or in part, including for unused time, partial billing periods, or if you stop using the Service.
      </P>
      <P>We do not provide prorated refunds upon cancellation.</P>
      <P>This policy is presented to you and affirmatively accepted before payment.</P>
      <P>Exceptions, if any, are at our sole discretion and do not waive this policy.</P>

      <H>6. Cancellation</H>
      <P>
        You may cancel your subscription at any time from your account dashboard (&quot;Billing&quot; section) or by contacting
        support.
      </P>
      <P>
        Cancellation stops future renewals. You retain access to the Service until the end of the current paid billing
        period.
      </P>
      <P>Cancellation does not refund the current or any prior billing period (see Section 5).</P>
      <P>
        We make cancellation available directly in-app so you are never required to contact us to stop billing.
      </P>

      <H>7. Chargebacks &amp; Payment Disputes (chargeback-critical)</H>
      <P>
        If you believe a charge is in error, you agree to contact us first at {SUPPORT_EMAIL} before initiating a
        chargeback or payment dispute with your bank or card issuer. We aim to resolve billing concerns promptly.
      </P>
      <P>
        Filing a chargeback for a Service you authorized and accessed is a breach of these Terms.
      </P>
      <P>
        We maintain records including your acceptance of these Terms (with timestamp and IP address), your login and
        usage history, and delivery of the Service. We will submit this evidence to the card network in response to any
        dispute.
      </P>
      <P>
        Accounts with a pending or lost chargeback may be suspended, and outstanding balances plus dispute fees may be
        pursued.
      </P>
      <P>Fraudulent or bad-faith disputes may be referred for collection or legal action.</P>

      <H>8. Client Responsibilities</H>
      <P>You agree to:</P>
      <P>Provide accurate, current business information (name, address, phone, etc.).</P>
      <P>Maintain the security of your login credentials.</P>
      <P>
        Use the Service only for lawful business purposes and only for a business you own or are authorized to represent.
      </P>
      <P>Not misuse, resell, or attempt to disrupt the Service.</P>
      <P>You are responsible for the accuracy of information you submit for listings.</P>
      <P>
        If you subscribe to a plan that includes Google Business Profile management (such as GMB Pro), you agree to grant{" "}
        {co} (or our designated staff) Manager access on your Google Business Profile when required to deliver that
        service.
      </P>

      <H>9. Service Availability &amp; Results</H>
      <P>
        We work to keep the Service available but do not guarantee uninterrupted access or specific results (e.g., search
        rankings, call volume, or placement on any third-party directory or platform).
      </P>
      <P>
        Third-party platforms (Google, Apple, Yelp, Bing, etc.) control their own listings and may change, reject, or
        remove data outside our control.
      </P>
      <P>Directory submission counts and features are defined by your plan.</P>

      <H>10. Limitation of Liability</H>
      <P>To the maximum extent permitted by law:</P>
      <P>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.</P>
      <P>
        Our total liability for any claim is limited to the amount you paid us in the three (3) months preceding the
        claim.
      </P>
      <P>
        We are not liable for indirect, incidental, or consequential damages, or for the acts of third-party platforms.
      </P>

      <H>11. Suspension and Termination</H>
      <P>
        {co} may suspend or terminate accounts that violate these Terms, misuse the Service, fail payment, or are
        involved in chargebacks. Fees already paid remain non-refundable per Section 5.
      </P>

      <H>12. Governing Law</H>
      <P>
        These Terms are governed by the laws of the State of California, United States, without regard to conflict-of-law
        principles, except where applicable consumer law requires otherwise.
      </P>

      <H>13. Changes to These Terms</H>
      <P>
        We may update these Terms. Material changes will be communicated (e.g., by email or in-app notice), and continued
        use after changes constitutes acceptance. Each version is dated and archived (current version: {TOS_VERSION}).
      </P>

      <H>14. Contact</H>
      <P>
        Questions about these Terms or billing: {SUPPORT_EMAIL} · {SUPPORT_PHONE} · Rank Orbit, {SUPPORT_ADDRESS}
      </P>
      <P>
        By checking &quot;I agree&quot; at checkout, you acknowledge you have read, understood, and accepted these Terms &amp;
        Conditions, including the non-refundable and auto-renewal provisions, on the date and from the IP address recorded
        at acceptance.
      </P>
    </div>
  );
}

export function PrivacyPolicyBody({ H = LegalHeading, P = LegalParagraph, co = CO }) {
  return (
    <div>
      <H>1. Overview</H>
      <P>
        This Privacy Policy explains how {co} collects, uses, and protects information when you use our Services. We are
        committed to handling your data responsibly and transparently.
      </P>
      <H>2. Information We Collect</H>
      <P>
        Account information (name, business name, email, phone), business listing data you provide (address, categories,
        website), billing information processed securely by our payment processor, and usage data such as activity logs
        and platform interactions. We also record Terms acceptance (timestamp, IP address, user agent, and document
        version) and access events (signup, checkout, login, and feature use with IP and device/user-agent) for security,
        fraud prevention, and payment-dispute evidence. We do not store full card numbers on our servers; payment details
        are handled by Stripe.
      </P>
      <H>3. How We Use Information</H>
      <P>
        To deliver the Services (submit and manage listings, monitor consistency), to communicate about your account and
        subscription, to process payments, to provide support, to prevent fraud and respond to chargebacks or payment
        disputes, and to improve the platform.
      </P>
      <H>4. Data Sharing</H>
      <P>
        We share your business information with third-party directories and platforms strictly as needed to deliver the
        Services. We use trusted processors (e.g., Stripe for payments, our hosting and database providers). We may share
        consent, IP, usage, and billing records with card networks or payment processors when responding to a dispute. We
        do not sell your personal data.
      </P>
      <H>5. Data Security</H>
      <P>
        We use industry-standard measures including encryption in transit (HTTPS), access controls and row-level security
        on our database, hashed credentials, and restricted staff access. No system is perfectly secure, but we work
        continuously to protect your data.
      </P>
      <H>6. Data Retention</H>
      <P>
        We retain account data for as long as your account is active. Consent records, access/IP logs, invoices, and
        related dispute-evidence data may be retained longer as needed for legal, billing, and fraud-prevention purposes.
        Deleted items are held in a recoverable state for 30 days, then permanently purged (except where retention is
        required for disputes or law). You may request export or deletion of your data at any time, subject to those
        limits.
      </P>
      <H>7. Your Rights</H>
      <P>
        You can access, export, or request deletion of your personal data by contacting us. Depending on your
        jurisdiction, you may have additional rights under laws such as GDPR.
      </P>
      <H>8. Cookies and Sessions</H>
      <P>
        We use essential cookies and local session storage to keep you signed in and operate the platform. We do not use
        them to sell your data.
      </P>
      <H>9. Changes</H>
      <P>We may update this policy and will notify you of material changes by email or in-platform notice.</P>
      <H>10. Contact</H>
      <P>
        Privacy questions or data requests: {SUPPORT_EMAIL} · {SUPPORT_PHONE} · Rank Orbit, {SUPPORT_ADDRESS}
      </P>
    </div>
  );
}
