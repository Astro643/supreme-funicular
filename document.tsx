import type { Handle, RemixNode } from "remix/component"
import { ImportMap } from "remix/component/server"

import { scriptEntry } from "../assets.ts"
import type { PageMeta } from "../lib/page.ts"

export interface DocumentProps {
  meta: PageMeta
  children?: RemixNode
}

const FONTS =
  "https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap"

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M2.5 5h19L12 20.5z' fill='%23000'/%3E%3C/svg%3E"

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    const { meta, children } = handle.props
    const { href, importMap, preloads } = scriptEntry

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <meta name="theme-color" content="#FAFAFA" />
          <title>{meta.title}</title>
          <meta property="og:title" content={meta.title} />
          <meta property="og:type" content="website" />
          {meta.description ? <meta name="description" content={meta.description} /> : null}
          {meta.description ? <meta property="og:description" content={meta.description} /> : null}
          {meta.robots ? <meta name="robots" content={meta.robots} /> : null}
          <link rel="icon" href={FAVICON} />
          <script>{'window.process = window.process || { env: { NODE_ENV: "production" } }'}</script>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={FONTS} />
          <link rel="stylesheet" href="/base.css" />
          {(meta.styles ?? []).map((style) => (
            <link key={style} rel="stylesheet" href={style} />
          ))}
          <ImportMap value={importMap} />
          {preloads.map((preload) => (
            <link key={preload} rel="modulepreload" href={preload} />
          ))}
        </head>
        <body>
          {children}
          <script type="module" src={href}></script>
        </body>
      </html>
    )
  }
}
