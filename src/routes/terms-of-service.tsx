import { createFileRoute } from '@tanstack/react-router'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'

export const Route = createFileRoute('/terms-of-service')({
  head: () => ({
    meta: [
      { title: 'Terms of Service – Hotel Lobby AI' },
      {
        name: 'description',
        content: 'Read the Hotel Lobby AI Terms of Service covering acceptable use, uploaded content, AI-generated results, accounts, and service limitations.',
      },
      { name: 'robots', content: 'index,follow' },
    ],
    links: [{ rel: 'canonical', href: 'https://hotel-lobby-ai.pro/terms-of-service' }],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="legal-hero">
        <span className="eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p>Effective date: October 1, 2026</p>
      </section>

      <article className="legal-page">
        <p>
          These Terms of Service ("Terms") govern your use of hotel-lobby-ai.pro and related features
          (the "Service"). By accessing or using the Service, you agree to these Terms.
        </p>

        <h2>1. Eligibility and accounts</h2>
        <p>
          You must be legally capable of entering into these Terms. If you use the Service on behalf of an organization,
          you represent that you have authority to bind that organization. You are responsible for activity under your
          account and for keeping your login credentials secure.
        </p>

        <h2>2. The Service</h2>
        <p>
          Hotel Lobby AI provides tools that use uploaded images, reference videos, prompts, and generation settings to
          request AI-generated video outputs. Features, models, limits, availability, processing times, and supported
          formats may change over time.
        </p>

        <h2>3. Your content</h2>
        <p>
          You retain whatever rights you already have in content you upload. You grant us a limited, non-exclusive,
          worldwide license to host, copy, transmit, process, and otherwise use your submitted content only as reasonably
          necessary to operate, secure, and provide the Service, including sending it to service providers involved in
          generation, storage, authentication, and infrastructure.
        </p>
        <p>
          You represent that you have all rights, permissions, and consents necessary to upload and use the content you
          submit, including rights relating to copyright, trademarks, privacy, publicity, and a person's likeness.
        </p>

        <h2>4. AI-generated output</h2>
        <p>
          AI-generated content may be inaccurate, inconsistent, unexpected, or similar to content generated for other
          users. We do not guarantee that output will preserve identity, clothing, motion, composition, or other details
          exactly as requested. You are responsible for reviewing generated output before publishing or relying on it.
        </p>
        <p>
          To the extent permitted by applicable law, we do not claim ownership of your uploaded content. Rights in
          AI-generated output may vary by jurisdiction and may also be affected by third-party rights or provider terms.
          You are responsible for determining whether you have the rights needed for your intended use.
        </p>

        <h2 id="acceptable-use">5. Acceptable use</h2>
        <p>You may not use the Service to create, upload, request, distribute, or facilitate content that:</p>
        <ul>
          <li>violates applicable law or another person's rights;</li>
          <li>uses a person's likeness without required permission or in a deceptive, defamatory, harassing, or exploitative way;</li>
          <li>creates, requests, uploads, or distributes NSFW, pornographic, nude, sexually suggestive, or sexually explicit content;</li>
          <li>creates or distributes non-consensual intimate imagery or any sexual content involving minors;</li>
          <li>facilitates fraud, impersonation, scams, identity theft, or misleading representations of real people;</li>
          <li>creates deceptive deepfakes, impersonates a real person, or falsely represents that a real person participated in, endorsed, said, or performed something they did not;</li>
          <li>infringes copyright, trademark, privacy, publicity, or other intellectual-property rights;</li>
          <li>contains malware, attempts unauthorized access, or interferes with the Service or its infrastructure; or</li>
          <li>attempts to bypass safety systems, usage limits, access controls, or technical restrictions.</li>
        </ul>

        <h2>6. Payments, subscriptions, credits, and refunds</h2>
        <p>
          Paid plans and credit packs may be processed by CREEM or another payment provider identified at checkout.
          Prices, billing periods, included credits, and renewal terms are shown before purchase. Subscription plans renew
          automatically until canceled. You may schedule cancellation through the Service, and access normally continues
          through the paid billing period unless applicable law requires otherwise.
        </p>
        <p>
          Credits are a limited, non-transferable service entitlement and have no cash value. Credits used for a generation
          that fails because of a verified service or provider error may be automatically returned. Completed generations
          and consumed compute are generally non-refundable. Payment refunds, chargebacks, or disputes may cause unused
          purchased credits or related service access to be revoked, subject to applicable law.
        </p>

        <h2>7. Third-party services</h2>
        <p>
          The Service relies on third-party providers for authentication, hosting, storage, networking, and AI generation.
          Their services may be unavailable, delayed, changed, or interrupted. Your use of certain third-party features
          may also be subject to those providers' terms and policies.
        </p>

        <h2>8. Availability and changes</h2>
        <p>
          We may modify, suspend, limit, or discontinue all or part of the Service at any time. We do not guarantee that
          the Service, a particular AI model, uploaded file, generated result, or account history will remain available
          indefinitely.
        </p>

        <h2>9. Suspension and termination</h2>
        <p>
          We may restrict or terminate access to the Service when reasonably necessary to protect users or infrastructure,
          respond to legal requirements, investigate abuse, enforce these Terms, or address conduct that creates risk for
          the Service or third parties.
        </p>

        <h2>10. Disclaimers</h2>
        <p>
          The Service is provided on an "as is" and "as available" basis to the maximum extent permitted by law. We make
          no warranty that the Service will be uninterrupted, error-free, secure, or suitable for a particular purpose,
          or that generated content will meet your expectations.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Hotel Lobby AI and its operators will not be liable for
          indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, data,
          goodwill, business opportunities, or other intangible losses arising from or related to your use of the Service.
          Where liability cannot legally be excluded, it will be limited to the extent permitted by applicable law.
        </p>

        <h2>12. Indemnity</h2>
        <p>
          To the extent permitted by law, you agree to be responsible for claims, losses, or expenses arising from your
          content, your use of the Service, or your violation of these Terms or another person's rights.
        </p>

        <h2>13. Changes to these Terms</h2>
        <p>
          We may update these Terms as the Service evolves. If you continue using the Service after updated Terms become
          effective, that continued use constitutes acceptance of the updated Terms to the extent permitted by law.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these Terms may be sent through the contact information or support channel published on the
          Hotel Lobby AI website.
        </p>
      </article>
      <SiteFooter />
    </main>
  )
}
