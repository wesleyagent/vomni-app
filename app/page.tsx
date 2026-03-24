"use client";

import Link from "next/link";
import {
  Mail,
  Clock,
  Star,
  MessageSquare,
  Shield,
  HeartHandshake,
  BarChart3,
  Sparkles,
  Plug,
  Scissors,
  UtensilsCrossed,
  Stethoscope,
  Pen,
  Check,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">Vomni</span>
          <div className="flex items-center gap-4">
            <a
              href="#pricing"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Pricing
            </a>
            <Link
              href="/demo/kings-cuts"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              See Demo
            </Link>
            <Link
              href="/signup"
              className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — Above the Fold */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
                Get More 5-Star Google Reviews.{" "}
                <span className="text-sky-500">On Autopilot.</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl">
                Vomni automatically asks your happy customers for reviews — and
                catches unhappy ones before they go public. Set up in 10
                minutes.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"
                >
                  Start Getting Reviews — $70/month
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                30-day money back guarantee. No results, full refund.
              </p>
            </div>

            {/* Dashboard mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 sm:p-8 w-full max-w-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    This Month
                  </h3>
                  <span className="text-xs font-medium text-sky-500 bg-sky-50 px-2.5 py-1 rounded-full">
                    Live
                  </span>
                </div>
                <div className="text-5xl font-extrabold text-gray-900 mb-2">
                  28
                </div>
                <p className="text-gray-600 font-medium mb-6">
                  Google reviews this month
                </p>
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i <= 4
                          ? "fill-amber-400 text-amber-400"
                          : "fill-amber-400/50 text-amber-400/50"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-lg font-bold text-gray-900">
                    4.8
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Completion rate</span>
                    <span className="font-semibold text-gray-900">66%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-sky-500 h-2 rounded-full"
                      style={{ width: "66%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Why Reviews Matter */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Your Google Rating Is Your Most Valuable Business Asset
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                stat: "96%",
                text: "of consumers read reviews before visiting a local business",
              },
              {
                stat: "2x",
                text: "more traffic from Google when going from 3.9 to 4.0 stars",
              },
              {
                stat: "22%",
                text: "of potential customers (~30 people) driven away by 1 negative review",
              },
              {
                stat: "82%",
                text: "more annual revenue for businesses with 200+ reviews",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl font-extrabold text-sky-500 mb-3">
                  {card.stat}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {card.text}
                </p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <p className="text-gray-600 leading-relaxed">
              57% of consumers will only use a business with 4+ stars. If
              you&apos;re below that threshold, you&apos;re invisible to more
              than half your potential customers. Review velocity — how
              consistently you get new reviews — directly impacts your Google
              Maps ranking. Businesses that stop getting reviews for 3 weeks see
              measurable ranking drops.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 — How It Works */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Three simple steps to more Google reviews
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: Mail,
                step: "1",
                title: "Forward your booking confirmations to your Vomni inbox",
                desc: "Works with any booking system. No integrations needed.",
              },
              {
                icon: Clock,
                step: "2",
                title:
                  "We automatically send review requests at exactly the right time",
                desc: "SMS sent within hours of service. 98% open rate. Feels personal, not spammy.",
              },
              {
                icon: Star,
                step: "3",
                title:
                  "Happy customers go to Google. Unhappy ones come to you first.",
                desc: "Smart review gating catches problems before they become public 1-star reviews.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-50 rounded-2xl mb-6">
                  <item.icon className="w-8 h-8 text-sky-500" />
                </div>
                <div className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-2">
                  Step {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
                {i < 2 && (
                  <ChevronRight className="w-6 h-6 text-gray-300 mx-auto mt-6 hidden md:block rotate-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Features */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Everything You Need to Win at Reviews
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "Automatic SMS Review Requests",
                desc: "Personalized text messages sent at the perfect time after each appointment. High open rates, zero effort from you.",
              },
              {
                icon: Shield,
                title: "Smart Review Gating",
                desc: "Customers rate their experience first. Happy ones go to Google. Unhappy ones come directly to you — privately.",
              },
              {
                icon: HeartHandshake,
                title: "Negative Feedback Recovery",
                desc: "Catch and resolve complaints before they become public 1-star reviews. Turn frustrated customers into loyal ones.",
              },
              {
                icon: BarChart3,
                title: "Real-Time Dashboard",
                desc: "Track review requests sent, completion rates, and your rating trend all in one clean dashboard.",
              },
              {
                icon: Sparkles,
                title: "AI-Powered Insights",
                desc: "Understand what customers love and where to improve with automatic sentiment analysis of all feedback.",
              },
              {
                icon: Plug,
                title: "Works With Any Booking System",
                desc: "No complex integrations. Just forward booking confirmations to your Vomni inbox and we handle the rest.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-sky-50 rounded-xl mb-4">
                  <feature.icon className="w-6 h-6 text-sky-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Pricing */}
      <section id="pricing" className="bg-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything included. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Monthly</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-extrabold text-gray-900">
                  $70
                </span>
                <span className="text-gray-500 font-medium">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Cancel anytime",
                  "Everything included",
                  "30-day money back guarantee",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-gray-600"
                  >
                    <Check className="w-5 h-5 text-sky-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full text-center bg-white border-2 border-sky-500 text-sky-500 hover:bg-sky-50 font-semibold py-3 rounded-xl transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Annual */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-sky-500 relative hover:shadow-xl transition-shadow">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-sky-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                  Save $240
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Annual</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-gray-900">
                  $600
                </span>
                <span className="text-gray-500 font-medium">/year</span>
              </div>
              <p className="text-sm text-sky-600 font-medium mb-6">
                That&apos;s 2 months free
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything included",
                  "30-day money back guarantee",
                  "Best value",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-gray-600"
                  >
                    <Check className="w-5 h-5 text-sky-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full text-center bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-sky-500/25"
              >
                Get Started
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8 max-w-2xl mx-auto">
            Not sure? Every plan comes with a 30-day money back guarantee. If
            you don&apos;t get more Google reviews in your first 30 days,
            we&apos;ll refund you in full. No questions asked.
          </p>
        </div>
      </section>

      {/* Section 6 — Social Proof */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Join Service Businesses Getting More Reviews on Autopilot
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
            {[
              { icon: Scissors, label: "Barber" },
              { icon: Sparkles, label: "Salon" },
              { icon: UtensilsCrossed, label: "Restaurant" },
              { icon: Stethoscope, label: "Dentist" },
              { icon: Pen, label: "Tattoo Shop" },
            ].map((biz, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                  <biz.icon className="w-7 h-7 text-sky-500" />
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {biz.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 — See It In Action */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              See How Vomni Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Explore a live demo — no signup required
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                name: "Kings Cuts London",
                desc: "A thriving barber shop with 66% completion rate",
                href: "/demo/kings-cuts",
              },
              {
                name: "Bella Vista Restaurant",
                desc: "A restaurant that needs more reviews",
                href: "/demo/bella-vista",
              },
            ].map((demo, i) => (
              <Link
                key={i}
                href={demo.href}
                className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-lg hover:border-sky-200 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-sky-500 transition-colors">
                    {demo.name}
                  </h3>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-gray-600 text-sm">{demo.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8 — Final CTA */}
      <section className="bg-sky-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-8">
            Ready to Get More Google Reviews?
          </h2>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-sky-500 hover:bg-gray-50 font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg"
          >
            Start Today — $70/month
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-sky-100 text-sm">
            30-day money back guarantee
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <span className="text-xl font-bold text-white">Vomni</span>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <a
                href="#pricing"
                className="hover:text-white transition-colors"
              >
                Pricing
              </a>
              <a
                href="mailto:hello@vomni.app"
                className="hover:text-white transition-colors"
              >
                Contact
              </a>
              <Link
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            &copy; 2026 Vomni. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
