import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  FileText, 
  Server, 
  Users, 
  CheckCircle2, 
  ArrowLeft, 
  Mail, 
  ExternalLink,
  Layers,
  ChevronRight,
  Database,
  Globe
} from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Enterprise CRM',
  description: 'Enterprise Multi-Tenant CRM Privacy Policy, Data Protection, and GDPR Compliance.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'November 12, 2026';

  const sections = [
    { id: 'introduction', title: '1. Introduction & Overview' },
    { id: 'data-controller', title: '2. Data Controller & Tenant Ownership' },
    { id: 'data-collection', title: '3. Information We Collect' },
    { id: 'how-we-use', title: '4. How We Use Collected Data' },
    { id: 'multi-tenant', title: '5. Multi-Tenant Isolation & Security' },
    { id: 'third-party', title: '6. Third-Party Ingestions & APIs' },
    { id: 'retention', title: '7. Data Retention & Erasure' },
    { id: 'user-rights', title: '8. User Rights & Choices' },
    { id: 'cookies-storage', title: '9. Cookies & Storage Technologies' },
    { id: 'contact', title: '10. Contact & Data Protection' },
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
              href="/terms-and-conditions"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:text-sm"
            >
              Terms of Service
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
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Data Protection & Privacy Standards</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              We take data protection and multi-tenant security seriously. This policy describes how our CRM platform collects, handles, isolates, and protects customer and client records.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Zero Data Selling Guarantee
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-indigo-600" />
                Row-Level Multi-Tenant Isolation
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
                Table of Contents
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
                <p className="text-xs font-semibold text-slate-900">Need legal assistance?</p>
                <p className="mt-1 text-xs text-slate-500">
                  Questions regarding data processing or GDPR requests can be directed to our compliance team.
                </p>
                <a
                  href="mailto:privacy@socialflymediatech.com"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  <Mail className="h-3.5 w-3.5" />
                  privacy@socialflymediatech.com
                </a>
              </div>
            </div>
          </aside>

          {/* Legal Prose Content */}
          <article className="prose prose-slate max-w-none lg:col-span-8">
            {/* Section 1 */}
            <section id="introduction" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <FileText className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">1. Introduction & Overview</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Welcome to <strong>Enterprise CRM</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;, or the &ldquo;Platform&rdquo;), operated by <strong>Socialfly Media Tech</strong>. We provide a cloud-based, multi-tenant customer relationship management suite designed to empower organizations to capture, qualify, assign, and track client leads, sales pipelines, communication schedules, and team performance across web and mobile applications.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                This Privacy Policy outlines how personal data is collected, handled, protected, and shared when organizations and their team members register accounts, utilize our platform interfaces, invoke our ingestion APIs, or install our mobile application.
              </p>
            </section>

            {/* Section 2 */}
            <section id="data-controller" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">2. Data Controller & Tenant Data Ownership</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Our architecture distinguishes strictly between <strong>Workspace Account Data</strong> and <strong>Tenant Customer Lead Data</strong>:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li>
                  <strong>Customer Ownership:</strong> You (the subscriber / organization tenant) retain complete, exclusive ownership of all customer contacts, lead details, notes, tasks, pipeline values, and team logs imported into your workspace.
                </li>
                <li>
                  <strong>Data Processor vs. Controller:</strong> In respect to lead data stored by your users, you act as the <em>Data Controller</em>, and Socialfly Media Tech acts as the <em>Data Processor</em> under applicable privacy statutes including the General Data Protection Regulation (GDPR) and regional data protection laws.
                </li>
                <li>
                  <strong>No Data Monetization:</strong> We do not sell, rent, monetize, or broker your lead data or customer records to any third party, marketing broker, or data clearinghouse under any circumstances.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="data-collection" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Database className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">3. Information We Collect</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                We collect personal information necessary to deliver enterprise CRM services securely:
              </p>
              
              <div className="grid gap-3 mt-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Workspace User Credentials</h4>
                  <p className="mt-1 text-xs text-slate-600">
                    Full name, corporate email address, hashed passwords, designated role (Super Admin, Company Admin, Staff), profile photo, company branding logo, and contact numbers.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">CRM Lead Records</h4>
                  <p className="mt-1 text-xs text-slate-600">
                    Lead full names, email addresses, phone numbers, lead source (e.g. Website, Facebook, JustDial), assignment status, value, communication logs, and follow-up agendas.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Device & Mobile Telemetry</h4>
                  <p className="mt-1 text-xs text-slate-600">
                    Mobile FCM push notification tokens, operating system version, client application version, and diagnostic logs required for notification routing and error resolution.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Audit & Security Logs</h4>
                  <p className="mt-1 text-xs text-slate-600">
                    Timestamped audit logs of user authentications, password updates, permission modifications, lead export requests, and administrative actions.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="how-we-use" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Eye className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">4. How We Use Collected Data</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Information processed through our infrastructure is utilized strictly for the following operational objectives:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li>Providing real-time lead capture, routing, assignment, and pipeline status visualization.</li>
                <li>Executing immediate audio/push notification alerts when new leads are ingested or assigned to staff.</li>
                <li>Enabling authorized administrators to configure company details, invitation tokens, and member permissions.</li>
                <li>Validating credentials and maintaining active encrypted sessions across web dashboards and mobile clients.</li>
                <li>Maintaining tenant audit trails for forensic tracking, dispute resolution, and security governance.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="multi-tenant" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Lock className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">5. Multi-Tenant Isolation & Security Safeguards</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Our platform enforces defense-in-depth architectural safeguards to protect business data against unauthorized access or cross-tenant leaks:
              </p>
              <div className="space-y-3 mt-3">
                <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                    <Server className="h-4 w-4 text-indigo-600" />
                    Row-Level Cryptographic Tenant Isolation
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Every database query, API invocation, and WebSocket event verifies the user&apos;s authenticated <code>company_id</code>. Records belonging to one tenant are completely invisible and inaccessible to any other tenant.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    Encryption in Transit and at Rest
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    All network traffic between our mobile applications, web dashboards, and server endpoints is enforced via TLS 1.3 encryption. Passwords utilize salted bcrypt cryptographic hashes; raw passwords are never logged or stored.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    Role-Based Access Control (RBAC)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Permission boundaries are enforced at the backend controller level. Staff members may only view leads assigned to them or unassigned company pool records; administrative settings remain restricted to verified Company and Super Admins.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section id="third-party" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Globe className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">6. Third-Party Ingestions & APIs</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                When you choose to enable automated lead ingestion channels in your workspace settings:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li>
                  <strong>Meta / Facebook Lead Ads:</strong> When configured via Webhooks, inbound lead payloads from your Meta Business pages are securely parsed and ingested into your workspace. We store only the submitted lead fields.
                </li>
                <li>
                  <strong>JustDial Lead Ingestion:</strong> Inbound JustDial lead notifications delivered to your dedicated webhook endpoint are decrypted, matched to your company token, and recorded in your database.
                </li>
                <li>
                  <strong>Firebase Cloud Messaging (Google FCM):</strong> Device push tokens are registered through Google Firebase to deliver background notification alerts to mobile devices.
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section id="retention" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Database className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">7. Data Retention & Erasure</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Lead and workspace data is retained for the active duration of your organization&apos;s subscription. Organizations may at any time export all records via CSV/Excel or request complete workspace deletion:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li>Deleted leads are initially soft-deleted to prevent accidental data loss.</li>
                <li>Upon verified cancellation of an organization account, tenant databases are archived for 30 calendar days to permit final data extraction, after which all records and media uploads are permanently purged from server disks.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="user-rights" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <CheckCircle2 className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">8. User Rights & Choices</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Under relevant privacy legislation, workspace members and consumers possess the right to:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li><strong>Access:</strong> Request confirmation of personal data held about you and receive a readable copy.</li>
                <li><strong>Correction:</strong> Update inaccurate or outdated profile details directly through the Settings screen.</li>
                <li><strong>Erasure:</strong> Request the deletion of individual client records or complete account decommissioning.</li>
                <li><strong>Notification Control:</strong> Mute or disable mobile push notification alerts through system settings or mobile preferences.</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section id="cookies-storage" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Lock className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">9. Cookies & Storage Technologies</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                We employ essential browser cookies and mobile secure storage mechanisms strictly for session authentication, token preservation, and user preference persistence:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 mt-2">
                <li><code>accessToken</code> & <code>refreshToken</code>: Cryptographically verified JWT tokens stored in <code>httpOnly</code> cookies (web) and encrypted AsyncStorage (mobile).</li>
                <li>Theme & Filter State: Retained locally on client devices to maintain user interface continuity.</li>
                <li>We do not utilize cross-site tracking pixels, third-party advertising cookies, or fingerprinting scripts.</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section id="contact" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
              <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
                <Mail className="h-5 w-5" />
                <h2 className="text-xl font-bold text-slate-900 m-0">10. Contact & Data Protection Officer</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                For questions, concerns, or requests regarding this Privacy Policy or our security framework, please contact our dedicated Data Protection Officer:
              </p>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 mt-4">
                <p className="font-bold text-slate-900 text-sm">Socialfly Media Tech — Data Protection & Privacy Team</p>
                <p className="text-xs text-slate-600 mt-1">Enterprise Cloud CRM Operations & Compliance</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-indigo-700">
                  <a href="mailto:privacy@socialflymediatech.com" className="flex items-center gap-1.5 hover:underline">
                    <Mail className="h-3.5 w-3.5" />
                    privacy@socialflymediatech.com
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
            <Link href="/terms-and-conditions" className="hover:text-slate-900 hover:underline">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" className="font-semibold text-slate-900 hover:underline">
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

