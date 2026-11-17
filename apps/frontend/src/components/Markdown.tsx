import type { JSX } from 'react'
import type { Components, ExtraProps } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// react-markdown passes a `node` prop that must not reach the DOM element.
const styled =
  <Tag extends keyof JSX.IntrinsicElements>(Tag: Tag, className: string) =>
  ({ node: _node, ...props }: JSX.IntrinsicElements[Tag] & ExtraProps) => {
    const Element = Tag as 'div'
    return (
      <Element
        className={className}
        {...(props as JSX.IntrinsicElements['div'])}
      />
    )
  }

const components: Components = {
  p: styled('p', 'my-2 first:mt-0 last:mb-0'),
  h1: styled('h1', 'my-2 text-lg font-bold'),
  h2: styled('h2', 'my-2 text-base font-bold'),
  h3: styled('h3', 'my-2 font-bold'),
  ul: styled('ul', 'my-2 list-disc pl-5'),
  ol: styled('ol', 'my-2 list-decimal pl-5'),
  a: ({ node: _node, children, ...props }) => (
    <a
      className="text-blue-pretty underline"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ),
  code: styled('code', 'bg-schedule-bg-grey rounded px-1 py-0.5 text-sm'),
  pre: styled(
    'pre',
    'bg-schedule-bg-grey my-2 overflow-x-auto rounded p-2 text-sm [&_code]:bg-transparent [&_code]:p-0'
  ),
  blockquote: styled(
    'blockquote',
    'border-schedule-border-grey my-2 border-l-4 pl-3 italic'
  ),
  table: ({ node: _node, ...props }) => (
    <div className="my-2 overflow-x-auto">
      <table
        className="border-schedule-border-grey border-collapse border text-sm"
        {...props}
      />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th
      scope="col"
      className="border-schedule-border-grey border px-2 py-1 text-left font-bold"
      {...props}
    />
  ),
  td: styled('td', 'border-schedule-border-grey border px-2 py-1'),
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  )
}
