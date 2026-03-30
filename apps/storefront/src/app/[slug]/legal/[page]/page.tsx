import { notFound } from "next/navigation";
import { api } from "@/lib/api";

const LEGAL_PAGES = ["privacy", "terms", "disclaimer"] as const;
type LegalPage = (typeof LEGAL_PAGES)[number];

const DEFAULT_TITLES: Record<LegalPage, string> = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  disclaimer: "Disclaimer",
};

function getDefaultContent(page: LegalPage, storeName: string): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  if (page === "privacy") {
    return `# Privacy Policy

**Last updated: ${today}**

${storeName} ("we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our store.

## 1. Information We Collect

We may collect the following types of information:

- **Personal identification information**: name, email address, phone number, shipping and billing address.
- **Payment information**: processed securely through our payment provider; we do not store card details.
- **Order history**: products purchased, order status, and transaction records.
- **Usage data**: pages visited, browser type, IP address, and device information (collected anonymously for analytics).

## 2. How We Use Your Information

We use the information we collect to:

- Process and fulfil your orders.
- Send order confirmations and shipping notifications.
- Respond to customer service enquiries.
- Improve our store and product offerings.
- Comply with legal obligations.

## 3. Sharing Your Information

We do not sell or rent your personal information to third parties. We may share information with:

- **Payment processors** to complete transactions.
- **Shipping partners** to deliver your orders.
- **Service providers** who assist in operating our website (under strict confidentiality agreements).
- **Law enforcement** when required by applicable law.

## 4. Data Retention

We retain your personal data for as long as necessary to fulfil the purposes outlined in this policy or as required by law. You may request deletion of your account and data at any time.

## 5. Cookies

Our website may use cookies to enhance your browsing experience and gather analytics data. You can disable cookies in your browser settings; however, some features of our store may not function correctly as a result.

## 6. Security

We implement industry-standard security measures to protect your information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.

## 7. Your Rights

Depending on your location, you may have the right to:

- Access the personal information we hold about you.
- Request correction of inaccurate data.
- Request deletion of your data.
- Withdraw consent at any time.

To exercise these rights, contact us at the details below.

## 8. Children's Privacy

Our store is not intended for children under 13 years of age. We do not knowingly collect personal information from children.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised effective date.

## 10. Contact Us

If you have questions about this Privacy Policy, please contact us:

**${storeName}**
Email us through the Contact page on our website.`;
  }

  if (page === "terms") {
    return `# Terms & Conditions

**Last updated: ${today}**

Welcome to ${storeName}. By accessing or using our website and placing an order, you agree to be bound by the following Terms & Conditions. Please read them carefully.

## 1. General

These terms govern your use of our online store and any purchases made through it. We reserve the right to update these terms at any time; continued use of our store constitutes acceptance of the updated terms.

## 2. Products and Pricing

- All product descriptions, images, and specifications are provided in good faith.
- Prices are displayed in the applicable currency and are subject to change without notice.
- We reserve the right to limit quantities, discontinue products, or correct pricing errors at any time.
- Product colours and appearances may vary slightly from the images shown due to screen calibration differences.

## 3. Orders and Payment

- Placing an order constitutes an offer to purchase at the stated price.
- We reserve the right to accept or decline any order.
- Payment must be received in full before an order is dispatched.
- We accept payment methods as displayed at checkout. All transactions are processed securely.

## 4. Shipping and Delivery

- Estimated delivery times are provided in good faith but are not guaranteed.
- Risk of loss passes to the customer upon handover to the shipping carrier.
- We are not responsible for delays caused by carriers, customs, or circumstances beyond our control.
- Shipping costs are calculated at checkout based on your location and chosen method.

## 5. Returns and Refunds

- You may return most items within 7 days of delivery, provided they are unused, in original packaging, and accompanied by proof of purchase.
- Custom-made, digital, and perishable products are non-refundable unless defective.
- Refunds are processed to the original payment method within 5–10 business days of receiving the returned item.
- Return shipping costs are the customer's responsibility unless the item is defective or incorrectly sent.

## 6. Warranty and Liability

- Products are covered by the manufacturer's warranty where applicable.
- We are not liable for indirect, incidental, or consequential damages arising from the use of our products.
- Our total liability shall not exceed the purchase price of the item in question.

## 7. Intellectual Property

All content on this website — including images, text, logos, and design — is the property of ${storeName} or its licensors and may not be reproduced without written permission.

## 8. Privacy

Your use of our store is also governed by our Privacy Policy, which is incorporated into these Terms by reference.

## 9. Governing Law

These terms are governed by and construed in accordance with the laws of the jurisdiction in which ${storeName} operates.

## 10. Contact Us

For questions or concerns about these Terms, please contact us through the Contact page on our website.`;
  }

  // disclaimer
  return `# Disclaimer

**Last updated: ${today}**

## General Disclaimer

The information provided on the ${storeName} website and through our products is for general informational purposes only. While we strive to keep information accurate and up-to-date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the information, products, or services contained on this website.

## Product Information

- Product descriptions, specifications, and images are provided as accurately as possible.
- Actual product appearance, dimensions, or performance may vary slightly from what is displayed.
- We reserve the right to modify product specifications without prior notice.

## Health and Safety

Any product-related guidance provided on this website is general in nature. For health, safety, or professional advice related to specific product use, please consult an appropriate qualified professional.

## Third-Party Links

Our website may contain links to third-party websites for your convenience. These links do not signify our endorsement of those sites. We have no control over the content or availability of external sites and accept no responsibility for them.

## Limitation of Liability

To the maximum extent permitted by applicable law, ${storeName} shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, or use of, this website or our products.

## No Professional Advice

Nothing on this website constitutes professional, legal, financial, or medical advice. You should seek appropriate professional counsel before making decisions based on any information found here.

## Errors and Omissions

We endeavour to ensure that all information on our website is correct, but errors may occur. If you notice any inaccuracies, please contact us so we can correct them promptly.

## Changes to This Disclaimer

We may update this Disclaimer from time to time. The current version will always be available on this page.

## Contact Us

If you have any questions about this Disclaimer, please contact us through the Contact page on our website.`;
}

export default async function LegalPageRoute({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page } = await params;

  if (!LEGAL_PAGES.includes(page as LegalPage)) {
    notFound();
  }

  const legalPage = page as LegalPage;
  let shop: Awaited<ReturnType<typeof api.public.resolveShop.query>> | null = null;

  try {
    shop = await api.public.resolveShop.query({ slug });
  } catch {
    notFound();
  }

  const customContent = shop.tenant.legalPages?.[legalPage];
  const content = customContent ?? getDefaultContent(legalPage, shop.tenant.name);
  const title = DEFAULT_TITLES[legalPage];

  // Parse markdown-style content into structured blocks
  const lines = content.split("\n");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-xs text-gray-400 mb-8">
        <a href={`/${slug}`} className="hover:text-gray-700 transition-colors">{shop.tenant.name}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-600">{title}</span>
      </nav>

      <article className="space-y-2">
        {lines.map((line, i) => {
          if (line.startsWith("# ")) {
            return <h1 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-2">{line.slice(2)}</h1>;
          }
          if (line.startsWith("## ")) {
            return <h2 key={i} className="text-lg font-semibold text-gray-900 mt-6 mb-1">{line.slice(3)}</h2>;
          }
          if (line.startsWith("### ")) {
            return <h3 key={i} className="text-base font-semibold text-gray-800 mt-4">{line.slice(4)}</h3>;
          }
          if (line.startsWith("- ")) {
            const text = line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            return (
              <li
                key={i}
                className="ml-5 text-sm text-gray-700 leading-relaxed list-disc"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            );
          }
          if (line.startsWith("**") && line.endsWith("**")) {
            return <p key={i} className="text-sm font-semibold text-gray-900">{line.slice(2, -2)}</p>;
          }
          if (line.trim() === "") {
            return <div key={i} className="h-2" />;
          }
          const text = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
          return (
            <p
              key={i}
              className="text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          );
        })}
      </article>
    </div>
  );
}
