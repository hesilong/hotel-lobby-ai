import { createFileRoute } from '@tanstack/react-router'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'

export const Route = createFileRoute('/privacy-policy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy – Hotel Lobby AI' },
      {
        name: 'description',
        content: 'Read the Hotel Lobby AI Privacy Policy, including how account information, uploaded media, prompts, generated content, and technical data are handled.',
      },
      { name: 'robots', content: 'index,follow' },
    ],
    links: [{ rel: 'canonical', href: 'https://hotel-lobby-ai.pro/privacy-policy' }],
  }),
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  return (
    <main>
      <SiteHeader />
      <section className="legal-hero">
        <span className="eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p>Effective date: September 30, 2026</p>
      </section>

      <article className="legal-page">
        <p>
          This Privacy Policy explains how Hotel Lobby AI ("Hotel Lobby AI," "we," "us," or "our")
          handles information when you use hotel-lobby-ai.pro and related features (the "Service").
          By using the Service, you acknowledge the practices described below.
        </p>

        <h2>1. Information we collect</h2>
        <h3>Account information</h3>
        <p>
          When you create an account or sign in, we may receive information such as your email address,
          account identifier, and basic authentication profile information. If you use Google sign-in,
          the authentication provider may send us information necessary to identify and authenticate your account.
        </p>

        <h3>Content you provide</h3>
        <p>
          The Service may process images, reference videos, prompts, generation settings, and other files or text
          that you choose to upload or submit. We may also store generated videos, generation task records, status
          information, and error details so the Service can display your results and operate reliably.
        </p>

        <h3>Technical and usage information</h3>
        <p>
          We may collect limited technical information needed to operate, secure, and troubleshoot the Service,
          such as timestamps, request metadata, browser or device information, IP-derived security signals,
          session information, and application logs.
        </p>

        <h2>2. How we use information</h2>
        <p>We use information to provide and improve the Service, including to:</p>
        <ul>
          <li>authenticate users and maintain account sessions;</li>
          <li>upload, process, and generate requested AI videos;</li>
          <li>store and display generation history and results;</li>
          <li>detect abuse, investigate failures, and protect the Service;</li>
          <li>measure reliability and improve product performance; and</li>
          <li>comply with applicable legal obligations.</li>
        </ul>

        <h2>3. AI processing and service providers</h2>
        <p>
          To generate videos, information you submit may be transmitted to third-party AI generation providers
          that process the input on our behalf or as part of providing the requested generation service. We also
          use infrastructure and authentication providers for database services, object storage, hosting, security,
          and sign-in functionality. These providers may process data according to their own terms and privacy policies.
        </p>

        <h2>4. Uploaded media and generated content</h2>
        <p>
          Uploaded images, videos, and generated results may be stored in cloud object storage so they can be used
          for generation, displayed in your account, or downloaded by you. Do not upload content unless you have the
          rights, permissions, and consents necessary to use it. In particular, you should not upload another person's
          image or likeness in a way that violates their privacy, publicity, intellectual-property, or other rights.
        </p>

        <h2>5. Cookies and session storage</h2>
        <p>
          The Service uses cookies or similar browser storage that are necessary for authentication, session continuity,
          security, and core functionality. We may also use local browser storage for temporary interface state.
        </p>

        <h2>6. How we share information</h2>
        <p>
          We do not sell your personal information. We may disclose information to service providers that help operate
          the Service, when you direct us to do so, when reasonably necessary to protect users or the Service, or when
          required by law, regulation, legal process, or valid governmental request.
        </p>

        <h2>7. Data retention</h2>
        <p>
          We retain account information, generation records, uploaded files, generated results, and operational logs
          for as long as reasonably necessary to provide the Service, maintain security and reliability, resolve disputes,
          meet legal obligations, or enforce our agreements. Retention periods may differ depending on the type of data
          and the systems involved.
        </p>

        <h2>8. Data security</h2>
        <p>
          We use reasonable technical and organizational measures intended to protect information against unauthorized
          access, alteration, disclosure, or destruction. No online service or storage system can be guaranteed to be
          completely secure, and you use the Service with that understanding.
        </p>

        <h2>9. Your choices and rights</h2>
        <p>
          Depending on where you live, you may have rights relating to access, correction, deletion, portability,
          restriction, or objection to certain processing of personal information. You may also stop using the Service
          at any time. Requests may be subject to identity verification and applicable legal exceptions.
        </p>

        <h2>10. International processing</h2>
        <p>
          Our service providers may process information in countries other than the country where you live. Those
          countries may have different data-protection laws. Where required, appropriate safeguards may be used for
          international transfers.
        </p>

        <h2>11. Children</h2>
        <p>
          The Service is not intended for children who are not legally able to consent to use of an online service in
          their jurisdiction. Do not submit images or videos of minors in sexual, exploitative, abusive, or otherwise
          unlawful contexts.
        </p>

        <h2>12. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy as the Service changes. When we make material changes, we will update the
          effective date shown above and may provide additional notice where appropriate.
        </p>

        <h2>13. Contact</h2>
        <p>
          If you have a privacy question or request, use the contact information or support channel published on the
          Hotel Lobby AI website. We may need to verify your identity before completing certain requests.
        </p>
      </article>
      <SiteFooter />
    </main>
  )
}
