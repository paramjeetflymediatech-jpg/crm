import Link from 'next/link';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Mail, 
  Layers, 
  ChevronRight, 
  Scale, 
  Building2, 
  Lock, 
  Globe 
} from 'lucide-react';

export const metadata = {
  title: 'Terms & Conditions | Enterprise CRM',
  description: 'Enterprise Multi-Tenant CRM SaaS Terms of Service, Acceptable Use Policy, and SLA Agreement.',
};

export default function TermsAndConditionsPage() {
  const lastUpdated = 'November 12, 2026';

  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'service-description', title: '2. SaaS Description & Multi-Tenancy' },
    { id: 'accounts', title: '3. Accounts, Roles & Security' },
    { id: 'acceptable-use', title: '4. Acceptable Use Policy' },
    { id: 'customer-data', title: '5. Customer Data & Intellectual Property' },
    { id: 'third-party', title: '6. Ingestion Integrations & Webhooks' },
    { id: 'availability', title: '7. Service Uptime & Maintenance' },
    { id: 'warranties', title: '8. Disclaimers & Warranties' },
    { id: 'liability', title: '9. Limitation of Liability' },
    { id: 'termination', title: '10. Term & Account Termination' },
    { id: 'governing-law', title: '11. Governing Law & Dispute Resolution' },
    { id: 'contact', title: '12. Contact & Notices' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
              title="Return to App"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-600/30">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-slate-900">Enterprise CRM</span>
                <span className="hidden text-xs text-slate-500 sm:inline"> • Legal & Compliance</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/privacy-policy"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white py-12 lg:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Scale className="h-3.5 w-3.5" />
              <span>Enterprise SaaS Agreement</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Terms & Conditions
            </h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              These Terms and Conditions govern your organization&apos;s access to and utilization of our multi-tenant CRM platform, client web portal, mobile applications, and lead ingestion APIs.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Customer Data Ownership Protected
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Multi-Tenant B2B Agreement
              </span>
              <span>•</span>
              <span>Effective Date: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Quick Nav Sidebar (Desktop) */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Agreement Outline
              </h3>
              <nav className="mt-3 space-y-1">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <span className="truncate">{sec.title}</span>
                    <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                  </a>
                ))}
              </nav>

              <hr className="my-4 border-slate-100" />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold text-slate-900">Enterprise Legal Desk</p>
                <p className="mt-1 text-xs text-slate-500">
                  Custom enterprise service agreements or compliance inquiries can be submitted directly.
                </p>
                <a
                  href="mailto:legal@socialflymediatech.com"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  <Mail className="h-3.5 w-3.5" />
                  legal@socialflymediatech.com
                </a>
              </div>
            </div>
          </aside>

          {/* Legal Prose Content */}
          <article className="prose prose-slate max-w-none lg:col-span-8">
            {/* Section 1 */}
            <section id="acceptance" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Scale className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">1. Acceptance of Terms</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                By registering an account, accessing our web dashboards, downloading our mobile applications, or invoking our ingestion endpoints, your organization (&ldquo;Customer&rdquo;, &ldquo;Subscriber&rdquo;, or &ldquo;You&rdquo;) agrees to be legally bound by these Terms and Conditions (&ldquo;Terms&rdquo;) in their entirety.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                If you are entering into these Terms on behalf of an enterprise entity, corporation, or partnership, you represent and warrant that you hold legitimate authority to bind such entity to this agreement. If you lack such authority, you must not access or utilize the platform.
              </p>
            </section>

            {/* Section 2 */}
            <section id="service-description" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Layers className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">2. SaaS Description & Multi-Tenancy</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                <strong>Socialfly Media Tech</strong> provides an enterprise cloud-based software-as-a-service (SaaS) platform facilitating:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li>Multi-tenant sales lead ingestion, stage qualification, assignment, and status updates.</li>
                <li>Real-time push notifications and audio alerts for incoming leads and scheduled task reminders.</li>
                <li>Company profile configuration, staff roster management, and role-based permissions.</li>
                <li>Web and native mobile interfaces for lead pipeline visibility, reporting, and telecommunication actions.</li>
              </ul>
              <p className="text-slate-600 text-sm leading-relaxed mt-3">
                Each organization operates within an isolated cryptographic tenant workspace. We grant you a non-exclusive, non-transferable, revocable license to access and utilize the services solely for internal business operations.
              </p>
            </section>

            {/* Section 3 */}
            <section id="accounts" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Building2 className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">3. Accounts, Roles & Security</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Access to the platform is categorized into verified administrative and staff tiers:
              </p>
              <div className="space-y-3 mt-3">
                <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <h4 className="font-semibold text-slate-900 text-xs text-indigo-600">Company Administrators</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Hold administrative control over the company workspace, including inviting staff, configuring lead ingestion tokens, updating company branding logos, and viewing all team metrics.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <h4 className="font-semibold text-slate-900 text-xs text-emerald-600">Staff Members</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Permitted to view and update leads specifically assigned to their user account or unassigned company pool records, log call/email notes, and schedule client follow-ups.
                  </p>
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mt-4">
                You are solely responsible for maintaining the strict confidentiality of your authentication credentials. You must notify us immediately at <code>security@socialflymediatech.com</code> upon discovering any unauthorized credential use or security breach.
              </p>
            </section>

            {/* Section 4 */}
            <section id="acceptable-use" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">4. Acceptable Use Policy</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Customers and authorized users expressly agree <strong>not</strong> to:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li>Reverse engineer, decompile, disassemble, or derive the source code of web or mobile application bundles.</li>
                <li>Utilize ingestion webhooks to inject malicious payloads, SQL injections, viruses, or cross-site scripting attacks.</li>
                <li>Ingest harvested lead databases obtained through unlawful spamming, fraud, or violations of privacy laws.</li>
                <li>Attempt to bypass, defeat, or probe multi-tenant isolation, row-level filters, or authentication tokens.</li>
                <li>Sub-license, resell, lease, or distribute platform access to third parties without prior written authorization.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="customer-data" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <CheckCircle2 className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">5. Customer Data & Intellectual Property</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                <strong>Your Data Remains Your Property:</strong> You retain all right, title, and interest, including all intellectual property rights, in and to all customer records, lead data, notes, and uploaded company files.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                You grant Socialfly Media Tech a limited, non-exclusive license solely to host, transmit, decrypt, and display your data as technically required to provide the CRM services. We claim no ownership over your leads.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                All platform software, user interfaces, branding, logos, documentation, and database schemas remain the exclusive intellectual property of Socialfly Media Tech.
              </p>
            </section>

            {/* Section 6 */}
            <section id="third-party" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Globe className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">6. Ingestion Integrations & Webhooks</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                The platform provides automated webhook adapters for third-party providers including Meta / Facebook Lead Ads and JustDial:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li>You acknowledge that Socialfly Media Tech does not control third-party platforms. We are not liable for downtime, API changes, or delivery failures originating on Meta or JustDial networks.</li>
                <li>You are responsible for adhering to the respective terms and privacy policies of third-party platforms with which you link your CRM workspace.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section id="availability" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">7. Service Uptime & Maintenance</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                We strive to maintain a <strong>99.9% service uptime target</strong> for core API, dashboard, and database infrastructure.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Occasional scheduled maintenance, security updates, or database optimizations are executed during low-traffic windows with advance administrative notice whenever practicable. Emergency patches for critical zero-day vulnerabilities may be deployed immediately without prior notification.
              </p>
            </section>

            {/* Section 8 */}
            <section id="warranties" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">8. Disclaimers & Warranties</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                EXCEPT AS EXPRESSLY STATED HEREIN, THE PLATFORM AND ASSOCIATED MOBILE SOFTWARE ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                WE DO NOT GUARANTEE THAT LEAD INGESTION OR TELECOMMUNICATIONS DIALING WILL BE COMPLETELY ERROR-FREE, UNINTERRUPTED, OR FREE FROM THIRD-PARTY CARRIER DELAYS.
              </p>
            </section>

            {/* Section 9 */}
            <section id="liability" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Lock className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">9. Limitation of Liability</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL SOCIALFLY MEDIA TECH, ITS DIRECTORS, EMPLOYEES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, REVENUE, GOODWILL, USE, OR DATA, RESULTING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THIS AGREEMENT SHALL BE LIMITED TO THE TOTAL AMOUNT PAID BY YOUR ORGANIZATION FOR THE PLATFORM DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM.
              </p>
            </section>

            {/* Section 10 */}
            <section id="termination" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <FileText className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">10. Term & Account Termination</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                These Terms commence upon your initial access and remain in effect until terminated by either party:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li>You may terminate your organization account at any time by requesting workspace deactivation through administrative channels.</li>
                <li>We reserve the right to suspend or terminate accounts that breach the Acceptable Use Policy, fail to remediate unauthorized API utilization, or engage in unlawful distribution of client contacts.</li>
                <li>Upon termination, your organization has a 30-day window to export existing lead and task databases before permanent deletion.</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section id="governing-law" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Scale className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">11. Governing Law & Dispute Resolution</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                These Terms shall be governed by, construed, and enforced in accordance with the laws of the jurisdiction in which Socialfly Media Tech maintains its principal operations, without regard to conflict of law principles.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Any legal suit, action, or proceeding arising out of or related to these Terms shall be instituted exclusively in competent courts of competent jurisdiction.
              </p>
            </section>

            {/* Section 12 */}
            <section id="contact" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Mail className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">12. Contact & Notices</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Official legal notices or inquiries regarding this Enterprise SaaS Agreement should be delivered to:
              </p>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 mt-4">
                <p className="font-bold text-slate-900 text-sm">Socialfly Media Tech — Legal Affairs & Compliance</p>
                <p className="text-xs text-slate-600 mt-1">Enterprise Multi-Tenant CRM Platform Agreements</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-indigo-700">
                  <a href="mailto:legal@socialflymediatech.com" className="flex items-center gap-1.5 hover:underline">
                    <Mail className="h-3.5 w-3.5" />
                    legal@socialflymediatech.com
                  </a>
                  <a href="mailto:support@socialflymediatech.com" className="flex items-center gap-1.5 hover:underline">
                    <Mail className="h-3.5 w-3.5" />
                    support@socialflymediatech.com
                  </a>
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    https://demo.socialflymediatech.com
                  </span>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Socialfly Media Tech. All rights reserved. Enterprise Multi-Tenant CRM Platform.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms-and-conditions" className="font-semibold text-slate-900 hover:underline">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" className="hover:text-slate-900 hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-900 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

