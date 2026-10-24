import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import type { Message } from "../../types/chat";

interface Props {
  message: Message;
  onRegenerate?: () => void;
}

const PROSE_CLASSES = `prose prose-sm max-w-none text-zinc-200
  prose-p:my-2.5 prose-p:leading-relaxed prose-p:text-zinc-300
  prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-2
  prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
  prose-strong:text-zinc-100 prose-strong:font-semibold
  prose-em:text-zinc-400
  prose-ul:my-2 prose-ul:pl-5 prose-li:my-1 prose-li:text-zinc-300
  prose-ol:my-2 prose-ol:pl-5 prose-li:my-1 prose-li:text-zinc-300
  prose-blockquote:border-l-4 prose-blockquote:border-rose-500 prose-blockquote:pl-4 prose-blockquote:text-zinc-400 prose-blockquote:my-3 prose-blockquote:italic
  prose-code:text-rose-300 prose-code:bg-rose-950/50 prose-code:border prose-code:border-rose-900/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
  prose-code:before:content-none prose-code:after:content-none
  prose-a:text-rose-400 prose-a:underline hover:prose-a:text-rose-300 prose-a:font-medium
  prose-hr:border-[#27272e]`;

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
      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#1f1f26] transition-colors"
      aria-label="Copy"
      title="Copy text"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  return (
    <div className="relative group/code my-3.5 rounded-xl overflow-hidden border border-[#27272e] bg-[#0c0c0f] shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#27272e] bg-[#141418]">
        <span className="text-xs text-zinc-400 font-mono uppercase tracking-wide">
          {language || "text"}
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: "#0c0c0f",
          fontSize: "0.82rem",
          lineHeight: "1.55",
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
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[75%] bg-gradient-to-r from-rose-600 to-rose-700 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-coral-glow-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group mb-6 flex gap-3 animate-fade-in">
      {/* Megan Avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-coral-glow-sm">
        <Sparkles className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="p-4 rounded-2xl bg-[#121216] border border-[#27272e] shadow-sm">
          <ReactMarkdown
            className={PROSE_CLASSES}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
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
                  <div className="overflow-x-auto my-3">
                    <table className="w-full text-xs border-collapse border border-[#27272e] rounded-lg overflow-hidden bg-[#141418]">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="bg-[#1c1c22] border border-[#27272e] px-3 py-2 text-left text-zinc-200 font-semibold">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="border border-[#27272e] px-3 py-2 text-zinc-300">
                    {children}
                  </td>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Hover action toolbar */}
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={message.content} />
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c] transition-colors"
              aria-label="Regenerate"
              title="Regenerate response"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c] transition-colors"
            aria-label="Good response"
            title="Good response"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c] transition-colors"
            aria-label="Bad response"
            title="Bad response"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
