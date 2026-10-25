import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Sparkles, Volume2, VolumeX } from "lucide-react";
import type { Message } from "../../types/chat";

interface Props {
  message: Message;
  onRegenerate?: () => void;
  isSpeaking?: boolean;
  onSpeak?: (text: string, id: string) => void;
  onStopSpeech?: () => void;
}

const PROSE_CLASSES = `prose prose-sm max-w-none text-zinc-200
  prose-p:my-2 prose-p:leading-relaxed prose-p:text-zinc-200 text-sm
  prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
  prose-h1:text-base prose-h2:text-sm prose-h3:text-xs
  prose-strong:text-zinc-100 prose-strong:font-semibold
  prose-em:text-zinc-400
  prose-ul:my-2 prose-ul:pl-5 prose-li:my-1 prose-li:text-zinc-200
  prose-ol:my-2 prose-ol:pl-5 prose-li:my-1 prose-li:text-zinc-200
  prose-blockquote:border-l-2 prose-blockquote:border-rose-500 prose-blockquote:pl-3 prose-blockquote:text-zinc-400 prose-blockquote:my-2.5 prose-blockquote:italic
  prose-code:text-rose-300 prose-code:bg-[#18181c] prose-code:border prose-code:border-[#27272e] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
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
      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c] transition-colors"
      aria-label="Copy"
      title="Copy text"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-[#27272e] bg-[#0c0c0f] shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[#27272e] bg-[#141418]">
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
          padding: "0.9rem",
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

export function MessageBubble({ message, onRegenerate, isSpeaking, onSpeak, onStopSpeech }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    // User message: distinct rectangular chat bubble on the right
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[75%] bg-[#1a1a20] border border-[#27272e] text-zinc-100 text-sm rounded-2xl px-4 py-2.5 shadow-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  // Megan Assistant message: ChatGPT style (NO card box, flows naturally on background)
  return (
    <div className="group mb-6 flex gap-3 animate-fade-in">
      {/* Megan Avatar Sparkle */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-coral-glow-sm">
        <Sparkles className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {/* Content rendered directly with NO bounding box */}
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

        {/* Hover action toolbar */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={message.content} />

          {/* Read Aloud Button */}
          {onSpeak && (
            <button
              onClick={() => {
                if (isSpeaking) {
                  onStopSpeech?.();
                } else {
                  onSpeak(message.content, message.id);
                }
              }}
              className={`p-1.5 rounded-md transition-colors ${
                isSpeaking
                  ? "text-rose-400 bg-rose-500/15 ring-1 ring-rose-500/30 animate-pulse"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c]"
              }`}
              aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
              title={isSpeaking ? "Stop reading" : "Read aloud with Megan's voice"}
            >
              {isSpeaking ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c] transition-colors"
              aria-label="Regenerate"
              title="Regenerate response"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c] transition-colors"
            aria-label="Good response"
            title="Good response"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c] transition-colors"
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
