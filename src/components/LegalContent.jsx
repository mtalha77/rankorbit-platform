import { T, FONT_D } from "../lib/theme";

const CO = "NAP Orbit";

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
      <H>1. Agreement</H>
      <P>These Terms of Service govern your use of the {co} platform and services ("Services"). By creating an account or subscribing, you agree to these terms. If you are accepting on behalf of a business, you confirm you are authorized to bind that business.</P>
      <H>2. The Services</H>
      <P>{co} provides local business visibility services, including directory listing submissions and management, NAP (Name, Address, Phone) consistency monitoring, unauthorized-edit protection, and, on eligible plans, Google Business Profile management. Deliverables and volumes depend on your selected plan.</P>
      <H>3. Subscriptions and Billing</H>
      <P>Services are billed as recurring monthly subscriptions via our payment processor (Stripe). Your subscription renews automatically each month until cancelled. By subscribing, you authorize {co} to charge your payment method on each renewal date.</P>
      <H>4. Cancellation</H>
      <P>You may cancel at any time from your billing dashboard. Cancellation takes effect at the end of your current billing period: you retain full access until that date, and you will not be charged for the following period. To avoid the next charge, you must cancel before your renewal date.</P>
      <H>5. No Refunds</H>
      <P><b>All fees are non-refundable.</b> Due to the nature of the Services, which involve immediate allocation of work, third-party submissions, and labor performed on your behalf, any amount you have already paid is not refundable, in whole or in part, including for partial billing periods, unused quota, or after cancellation. This clause applies to the fullest extent permitted by law.</P>
      <H>6. Client Responsibilities</H>
      <P>You agree to provide accurate business information and to hold the necessary rights to the data you submit. You are responsible for maintaining the confidentiality of your account credentials. Results such as search rankings and visibility depend on third-party platforms and are not guaranteed.</P>
      <H>7. Third-Party Platforms</H>
      <P>The Services interact with third-party directories and platforms (e.g., Google, Apple, Bing). {co} is not responsible for changes, outages, policy decisions, or removals made by those platforms.</P>
      <H>8. Limitation of Liability</H>
      <P>To the maximum extent permitted by law, {co}'s total liability for any claim arising from the Services is limited to the amount you paid in the one (1) month preceding the claim. {co} is not liable for indirect, incidental, or consequential damages.</P>
      <H>9. Suspension and Termination</H>
      <P>{co} may suspend or terminate accounts that violate these terms, misuse the Services, or fail payment. Fees already paid remain non-refundable per Section 5.</P>
      <H>10. Changes to Terms</H>
      <P>{co} may update these terms. Material changes will be communicated by email or in-platform notice. Continued use after changes constitutes acceptance.</P>
      <H>11. Contact</H>
      <P>Questions about these terms: sales@naporbit.com.</P>
    </div>
  );
}

export function PrivacyPolicyBody({ H = LegalHeading, P = LegalParagraph, co = CO }) {
  return (
    <div>
      <H>1. Overview</H>
      <P>This Privacy Policy explains how {co} collects, uses, and protects information when you use our Services. We are committed to handling your data responsibly and transparently.</P>
      <H>2. Information We Collect</H>
      <P>Account information (name, business name, email, phone), business listing data you provide (address, categories, website), billing information processed securely by our payment processor, and usage data such as activity logs and platform interactions. We do not store full card numbers on our servers; payment details are handled by Stripe.</P>
      <H>3. How We Use Information</H>
      <P>To deliver the Services (submit and manage listings, monitor consistency), to communicate about your account and subscription, to process payments, to provide support, and to improve the platform.</P>
      <H>4. Data Sharing</H>
      <P>We share your business information with third-party directories and platforms strictly as needed to deliver the Services. We use trusted processors (e.g., Stripe for payments, our hosting and database providers). We do not sell your personal data.</P>
      <H>5. Data Security</H>
      <P>We use industry-standard measures including encryption in transit (HTTPS), access controls and row-level security on our database, hashed credentials, and restricted staff access. No system is perfectly secure, but we work continuously to protect your data.</P>
      <H>6. Data Retention</H>
      <P>We retain account data for as long as your account is active. Deleted items are held in a recoverable state for 30 days, then permanently purged. You may request export or deletion of your data at any time.</P>
      <H>7. Your Rights</H>
      <P>You can access, export, or request deletion of your personal data. Use the "Download my data" option in Billing, or contact us. Depending on your jurisdiction, you may have additional rights under laws such as GDPR.</P>
      <H>8. Cookies and Sessions</H>
      <P>We use essential cookies and local session storage to keep you signed in and operate the platform. We do not use them to sell your data.</P>
      <H>9. Changes</H>
      <P>We may update this policy and will notify you of material changes by email or in-platform notice.</P>
      <H>10. Contact</H>
      <P>Privacy questions or data requests: sales@naporbit.com.</P>
    </div>
  );
}
