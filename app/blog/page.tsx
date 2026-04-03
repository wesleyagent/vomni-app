import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import BlogIndex from "./BlogIndex";

export const metadata: Metadata = {
  title: "The Vomni Blog | Practical Guides for Barbers & Salons",
  description:
    "Practical guides for barbers, salons, and service businesses on getting more Google reviews, comparing booking software, and growing your client base.",
  alternates: {
    canonical: "https://vomni.io/blog",
  },
  openGraph: {
    title: "The Vomni Blog",
    description:
      "Practical guides for barbers, salons, and service businesses.",
    url: "https://vomni.io/blog",
    type: "website",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  return <BlogIndex posts={posts} />;
}
