import MarkdownIt from 'markdown-it'

type Token = ReturnType<InstanceType<typeof MarkdownIt>['parse']>[number]

// Model output is untrusted. This module turns Markdown into a small tree of
// allow-listed nodes. The interface draws that tree with Vue elements, so no
// HTML string is ever built from model text and `v-html` is never needed.
//
// - markdown-it runs with `html: false`: raw HTML in the text stays text.
// - A link keeps its address only for http, https, and mailto.
// - An image is never loaded. It becomes a link, or plain text.

export type MdNode =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'fence'; lang: string; value: string }
  | { type: 'br' }
  | { type: 'hr' }
  | { type: 'el'; tag: ElementTag; href?: string; start?: number; children: MdNode[] }

export type ElementTag =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'ul'
  | 'ol'
  | 'li'
  | 'blockquote'
  | 'strong'
  | 'em'
  | 's'
  | 'a'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tr'
  | 'th'
  | 'td'

const TAGS = new Set<string>([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
  'strong', 'em', 's', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
])

const ALLOWED_LINK = /^(https?:|mailto:)/i

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false })

export function isSafeLink(href: string): boolean {
  return ALLOWED_LINK.test(href.trim())
}

type Frame = { node: MdNode & { type: 'el' } | null; children: MdNode[] }

export function parseMarkdown(source: string): MdNode[] {
  const root: Frame = { node: null, children: [] }
  const stack: Frame[] = [root]
  walk(md.parse(source, {}), stack)
  return root.children
}

function attr(token: Token, name: string): string {
  const value = token.attrGet(name)
  return value === null ? '' : String(value)
}

function walk(tokens: Token[], stack: Frame[]): void {
  const top = (): Frame => stack[stack.length - 1] ?? { node: null, children: [] }
  for (const token of tokens) {
    switch (token.type) {
      case 'inline':
        walk(token.children ?? [], stack)
        break
      case 'text':
        top().children.push({ type: 'text', value: token.content })
        break
      case 'code_inline':
        top().children.push({ type: 'code', value: token.content })
        break
      case 'fence':
        top().children.push({ type: 'fence', lang: token.info.trim().split(/\s+/)[0] ?? '', value: token.content })
        break
      case 'code_block':
        top().children.push({ type: 'fence', lang: '', value: token.content })
        break
      case 'softbreak':
        top().children.push({ type: 'text', value: '\n' })
        break
      case 'hardbreak':
        top().children.push({ type: 'br' })
        break
      case 'hr':
        top().children.push({ type: 'hr' })
        break
      case 'image': {
        const src = attr(token, 'src')
        const label = token.content || src
        top().children.push(
          isSafeLink(src)
            ? { type: 'el', tag: 'a', href: src, children: [{ type: 'text', value: label }] }
            : { type: 'text', value: label },
        )
        break
      }
      default:
        if (token.nesting === 1) open(token, stack)
        else if (token.nesting === -1) close(stack)
        break
    }
  }
}

function open(token: Token, stack: Frame[]): void {
  const parent = stack[stack.length - 1]
  if (!parent) return
  const tag = token.tag
  // A tight list item hides its paragraph: keep the children, drop the wrapper.
  if (token.hidden || !TAGS.has(tag)) {
    stack.push({ node: null, children: parent.children })
    return
  }

  if (tag === 'a') {
    const href = attr(token, 'href')
    if (!isSafeLink(href)) {
      stack.push({ node: null, children: parent.children })
      return
    }

    const node: MdNode & { type: 'el' } = { type: 'el', tag: 'a', href, children: [] }
    parent.children.push(node)
    stack.push({ node, children: node.children })
    return
  }

  const node: MdNode & { type: 'el' } = { type: 'el', tag: tag as ElementTag, children: [] }
  if (tag === 'ol') {
    const start = Number(attr(token, 'start') || 1)
    if (Number.isInteger(start) && start !== 1) node.start = start
  }

  parent.children.push(node)
  stack.push({ node, children: node.children })
}

function close(stack: Frame[]): void {
  if (stack.length > 1) stack.pop()
}
