
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./MathText.css";

export default function MathText({
  text,
  children,
  className = "",
  as: Component = "div",
}) {
  const content = text ?? children;

  if (content === null || content === undefined) {
    return null;
  }

  const source = String(content);

  // Match LaTeX delimiters:
  // \( ... \) inline math
  // \[ ... \] display math
  // $ ... $ inline math
  // $$ ... $$ display math
  const delimiter =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;

  const parts = source.split(delimiter);

  return (
    <Component className={`math-text ${className}`.trim()}>
      {parts.map((part, index) => {
        if (!part) return null;

        try {
          if (part.startsWith("$$") && part.endsWith("$$")) {
            return (
              <div className="math-text-block" key={index}>
                <BlockMath math={part.slice(2, -2).trim()} />
              </div>
            );
          }

          if (part.startsWith("\\[") && part.endsWith("\\]")) {
            return (
              <div className="math-text-block" key={index}>
                <BlockMath math={part.slice(2, -2).trim()} />
              </div>
            );
          }

          if (part.startsWith("\\(") && part.endsWith("\\)")) {
            return (
              <InlineMath
                key={index}
                math={part.slice(2, -2).trim()}
                renderError={(error) => (
                  <span className="math-text-error">
                    {part}
                  </span>
                )}
              />
            );
          }

          if (part.startsWith("$") && part.endsWith("$")) {
            return (
              <InlineMath
                key={index}
                math={part.slice(1, -1).trim()}
                renderError={() => (
                  <span className="math-text-error">{part}</span>
                )}
              />
            );
          }

          // Ordinary text must always remain visible.
          return (
            <React.Fragment key={index}>
              {part.split("\n").map((line, lineIndex, lines) => (
                <React.Fragment key={lineIndex}>
                  {line}
                  {lineIndex < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        } catch {
          // If a math expression fails, display its original text.
          return (
            <React.Fragment key={index}>
              {part}
            </React.Fragment>
          );
        }
      })}
    </Component>
  );
}
