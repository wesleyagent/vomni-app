"use client";

import Link from "next/link";
import { Scissors, UtensilsCrossed, ArrowRight } from "lucide-react";

const demos = [
  {
    slug: "kings-cuts",
    name: "Kings Cuts London",
    description: "A thriving barbershop in Shoreditch",
    stats: "66% completion rate, 4.3 avg rating, 28 Google reviews this month",
    icon: Scissors,
    color: "bg-sky-50 text-sky-600",
    border: "border-sky-200 hover:border-sky-300",
  },
  {
    slug: "bella-vista",
    name: "Bella Vista Restaurant",
    description: "A NYC restaurant that needs help",
    stats: "29% completion rate, 3.7 avg rating, needs more reviews",
    icon: UtensilsCrossed,
    color: "bg-orange-50 text-orange-600",
    border: "border-orange-200 hover:border-orange-300",
  },
];

export default function DemoSelectorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            See Vomni in Action
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Explore a live demo account to see how Vomni manages reviews, catches negative feedback, and grows Google ratings.
          </p>
        </div>

        {/* Demo Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {demos.map((demo) => {
            const Icon = demo.icon;
            return (
              <div
                key={demo.slug}
                className={`rounded-2xl border ${demo.border} bg-white p-6 shadow-sm transition-all hover:shadow-md`}
              >
                <div className={`inline-flex rounded-xl p-3 ${demo.color}`}>
                  <Icon size={28} />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {demo.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">{demo.description}</p>
                <p className="mt-3 text-sm font-medium text-gray-700">
                  {demo.stats}
                </p>
                <Link
                  href={`/demo/${demo.slug}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                >
                  Explore Demo
                  <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/signup"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Ready to try it yourself? Sign up now →
          </Link>
        </div>
      </div>
    </div>
  );
}
