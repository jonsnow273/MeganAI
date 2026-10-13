import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Sparkles, User } from "lucide-react";
import type { Message } from "../../types/chat";

interface Props {
  message: Message;
}

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
      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-zinc-700/80 hover:bg-zinc-600 text-zinc-400 hover:text-white"
      aria-label="Copy code"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  );
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  const formattedTime = (() => {
    try {
      return new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  })();

  return (
    <div className={`flex gap-3 mb-5 message-enter ${isUser ? "flex-row-reverse" : "flex-row"}`}>

      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5
        ${isUser
          ? "bg-surface-700 border border-surface-600 text-zinc-400"
          : "border border-megan-700/50 bg-megan-900/60 shadow-glow-sm"
        }
      `}>
        {isUser
          ? <User className="w-4 h-4" />
          : <Sparkles className="w-4 h-4 text-megan-400" />
        }
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>

        {/* Name + time row */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className={`text-[11px] font-semibold ${isUser ? "text-zinc-500" : "text-megan-400"}`}>
            {isUser ? "You" : "Megan"}
          </span>
          {formattedTime && (
            <span className="text-[10px] text-zinc-700">{formattedTime}</span>
          )}
        </div>

        {/* Content card */}
        <div className={`
          relative rounded-2xl px-4 py-3 text-sm leading-relaxed
          transition-shadow duration-200
          ${isUser
            ? "bg-megan-800/70 border border-megan-700/50 text-zinc-100 rounded-tr-sm shadow-glow-sm"
            : "bg-surface-800 border border-surface-700/60 text-zinc-100 rounded-tl-sm hover:border-surface-600 hover:shadow-inner-glow"
          }
        `}>
          {isUser ? (
            /* User messages: plain text, preserve whitespace */
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            /* Assistant messages: full markdown */
            <ReactMarkdown
              className="prose prose-invert prose-sm max-w-none
                prose-p:my-1 prose-p:leading-relaxed
                prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-1
                prose-strong:text-zinc-100 prose-strong:font-semibold
                prose-em:text-zinc-300
                prose-ul:my-1.5 prose-ul:pl-4 prose-li:my-0.5
                prose-ol:my-1.5 prose-ol:pl-4
                prose-blockquote:border-l-2 prose-blockquote:border-megan-600 prose-blockquote:pl-3 prose-blockquote:text-zinc-400 prose-blockquote:my-2 prose-blockquote:italic
                prose-code:text-megan-300 prose-code:bg-surface-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                prose-a:text-accent-400 prose-a:no-underline hover:prose-a:underline
                prose-hr:border-surface-600
              "
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeString = String(children).replace(/\n$/, "");
                  const isBlock = !!(node?.position && codeString.includes("\n")) || !!match;

                  if (isBlock) {
                    return (
                      <div className="relative group my-3 rounded-xl overflow-hidden border border-surface-600">
                        {/* Lang badge */}
                        {match && (
                          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-700/80 border-b border-surface-600">
                            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                              {match[1]}
                            </span>
                          </div>
                        )}
                        <CopyButton text={codeString} />
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match?.[1] ?? "text"}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            background: "#0f0f1a",
                            fontSize: "0.78rem",
                            lineHeight: "1.6",
                            padding: "1rem",
                          }}
                          codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }

                  // Inline code
                  return (
                    <code
                      className="text-megan-300 bg-surface-700 px-1.5 py-0.5 rounded text-xs font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // Custom table styling
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-3">
                      <table className="w-full text-xs border-collapse border border-surface-600 rounded-xl overflow-hidden">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="bg-surface-700 border border-surface-600 px-3 py-2 text-left text-zinc-300 font-semibold">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="border border-surface-600 px-3 py-2 text-zinc-400">
                      {children}
                    </td>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
