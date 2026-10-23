import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import type { Message } from "../../types/chat";

interface Props {
  message: Message;
  onRegenerate?: () => void;
}

const PROSE_CLASSES = `prose prose-invert prose-sm max-w-none
  prose-p:my-3 prose-p:leading-relaxed
  prose-headings:text-dark-text prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
  prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
  prose-strong:text-dark-text prose-strong:font-semibold
  prose-em:text-dark-muted
  prose-ul:my-3 prose-ul:pl-5 prose-li:my-1
  prose-ol:my-3 prose-ol:pl-5
  prose-blockquote:border-l-2 prose-blockquote:border-dark-border prose-blockquote:pl-4 prose-blockquote:text-dark-muted prose-blockquote:my-3
  prose-code:text-dark-text prose-code:bg-dark-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
  prose-code:before:content-none prose-code:after:content-none
  prose-a:text-dark-text prose-a:underline hover:prose-a:text-dark-muted
  prose-hr:border-dark-border`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  return (
    <div className="relative group/code my-4 rounded-lg overflow-hidden border border-dark-border bg-dark-surface">
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-border bg-dark-bg">
        <span className="text-xs text-dark-subtle uppercase tracking-wide">
          {language || "text"}
        </span>
        <CopyButton text={code} />
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: "#171717",
          fontSize: "0.8rem",
          lineHeight: "1.5",
          padding: "1rem",
        }}
        codeTagProps={{
          style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

interface ElementProps {
  className?: string;
  children?: ReactNode;
}

function elementProps(node: ReactNode): ElementProps {
  if (node && typeof node === "object" && "props" in node) {
    return (node as { props: ElementProps }).props ?? {};
  }
  return {};
}

function nodeText(node: ReactNode): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeText((node as { props: ElementProps }).props?.children);
  }
  return "";
}

export function MessageBubble({ message, onRegenerate }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    // User message: small right-aligned grey bubble
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%] bg-dark-surface text-dark-text text-sm rounded-2xl px-4 py-2.5 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message: markdown with hover actions
  return (
    <div className="group mb-6">
      <ReactMarkdown
        className={PROSE_CLASSES}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Fenced code blocks: the `code` child carries the language class and raw text.
          pre({ children }) {
            const child = Array.isArray(children) ? children[0] : children;
            const { className, children: codeChildren } = elementProps(child);
            const code = nodeText(codeChildren).replace(/\n$/, "");
            const match = /language-([\w-]+)/.exec(className || "");
            return <CodeBlock language={match?.[1]} code={code} />;
          },
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="w-full text-xs border-collapse border border-dark-border rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="bg-dark-surface border border-dark-border px-3 py-2 text-left text-dark-text font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-dark-border px-3 py-2 text-dark-muted">
                {children}
              </td>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>

      {/* Hover actions */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={message.content} />
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="p-1.5 rounded text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
            aria-label="Regenerate"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          className="p-1.5 rounded text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
          aria-label="Good response"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
          aria-label="Bad response"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
