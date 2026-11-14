import type { PageMeta } from "../lib/page.ts"
import { Layout, PREFETCH } from "../ui/chrome.tsx"

export const meta: PageMeta = {
  title: "Page not found · Controller",
  robots: "noindex",
  styles: ["/site.css"],
}

export function NotFoundPage() {
  return () => (
    <Layout>
      <div class="page">
        <h1>Page not found</h1>
        <p class="lead">That page does not exist. Head back to the home page or open the Console.</p>
        <div class="cta">
          <a class="btn btn-primary" href="/" {...PREFETCH}>Home</a>
          <a class="btn" href="/dashboard" {...PREFETCH}>Open Console</a>
        </div>
      </div>
    </Layout>
  )
}
