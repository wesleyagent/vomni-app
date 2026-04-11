import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface FAQ {
  question: string
  answer: string
}

export interface PostMeta {
  title: string
  slug: string
  description: string
  publishedAt: string
  updatedAt: string
  primaryKeyword: string
  secondaryKeywords: string[]
  readingTime: string
  lang: string
  dir: 'ltr' | 'rtl'
  tags: string[]
  faqs?: FAQ[]
}

export interface Post extends PostMeta {
  content: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content/blog')

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'))
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8')
    const { data } = matter(raw)
    return data as PostMeta
  })
  return posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

export function getPost(slug: string): Post | null {
  try {
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`)
    const raw = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(raw)
    return { ...(data as PostMeta), content }
  } catch {
    return null
  }
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace('.mdx', ''))
}
