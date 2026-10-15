import { useCallback, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";

/**
 * wallet-connect's `CodeBlock`: Prism with the vscDarkPlus theme, copy button
 * in the corner. It imports the full `Prism` build, which registers every
 * language it ships with; this takes `PrismLight` and registers the four we
 * actually render, for the same tokens and colours without the bundle.
 *
 * The component comes from the package root rather than
 * `react-syntax-highlighter/dist/esm/prism-light`. Both resolve to the same
 * module, but the root is a single entry Vite pre-bundles as a unit, while the
 * deep path pulls the CJS `refractor` bridge in separately — and when that
 * bridge is served from a half-rebuilt dep cache its AST nodes reach React as
 * plain objects, which render as `[object Object],[object Object],…` until a
 * reload. See `optimizeDeps` in vite.config.ts.
 */
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("jsx", jsx);

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    // Rejects outside a secure context — serving this over plain http on a LAN
    // IP for phone testing is exactly that case, so don't let it go unhandled.
    navigator.clipboard.writeText(code).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false),
    );
  }, [code]);

  return (
    <div className="code-block">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          fontSize: "13px",
          margin: 0,
          padding: "16px",
          paddingTop: "40px",
          borderRadius: "8px",
        }}
      >
        {code}
      </SyntaxHighlighter>
      <button type="button" className="copy" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
