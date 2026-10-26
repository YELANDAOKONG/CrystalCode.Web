import type { HighlighterCore } from 'shiki/core'

// Shiki with its JavaScript regex engine and a short fixed list of grammars.
// Grammars and themes are bundled and loaded on first use, so highlighting
// never fetches anything from another origin. The result is token data, not
// HTML: the interface draws each token as a text node, and sets its color
// through the CSSOM, which a strict Content Security Policy allows.

type LanguageLoader = () => Promise<{ default: Parameters<HighlighterCore['loadLanguage']>[0] }>

const LANGUAGES: Record<string, LanguageLoader> = {
  bash: () => import('shiki/langs/bash.mjs'),
  shell: () => import('shiki/langs/bash.mjs'),
  sh: () => import('shiki/langs/bash.mjs'),
  zsh: () => import('shiki/langs/bash.mjs'),
  csharp: () => import('shiki/langs/csharp.mjs'),
  cs: () => import('shiki/langs/csharp.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  jsonc: () => import('shiki/langs/jsonc.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  ts: () => import('shiki/langs/typescript.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  js: () => import('shiki/langs/javascript.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  py: () => import('shiki/langs/python.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  yml: () => import('shiki/langs/yaml.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  md: () => import('shiki/langs/markdown.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  vue: () => import('shiki/langs/vue.mjs'),
}

export interface CodeToken {
  text: string
  light: string | null
  dark: string | null
  italic: boolean
  bold: boolean
}

const THEMES = { light: 'github-light', dark: 'github-dark' } as const

let instance: Promise<HighlighterCore> | null = null
const loaded = new Set<string>()

function core(): Promise<HighlighterCore> {
  instance ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, light, dark] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ])
    return createHighlighterCore({
      themes: [light.default, dark.default],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    })
  })()
  return instance
}

export function canHighlight(lang: string): boolean {
  return lang.toLowerCase() in LANGUAGES
}

/** Returns one array of tokens per line, or null when the language is unknown or loading fails. */
export async function highlight(code: string, lang: string): Promise<CodeToken[][] | null> {
  const key = lang.toLowerCase()
  const load = LANGUAGES[key]
  if (!load) return null
  try {
    const highlighter = await core()
    if (!loaded.has(key)) {
      await highlighter.loadLanguage((await load()).default)
      loaded.add(key)
    }

    const lines = highlighter.codeToTokensWithThemes(code, { lang: key, themes: THEMES })
    return lines.map((line) =>
      line.map((token) => {
        const light = token.variants.light
        const dark = token.variants.dark
        const style = (light?.fontStyle ?? 0) | (dark?.fontStyle ?? 0)
        return {
          text: token.content,
          light: light?.color ?? null,
          dark: dark?.color ?? null,
          italic: (style & 1) !== 0,
          bold: (style & 2) !== 0,
        }
      }),
    )
  } catch {
    return null
  }
}
