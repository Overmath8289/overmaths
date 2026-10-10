
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./MathText.css";

/**
 * Overmaths MathText
 * Renders LaTeX safely and automatically recognizes common
 * mathematical expressions without requiring manual database edits.
 */

function decodeEntities(value) {
  const named = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&times;": "×",
    "&divide;": "÷",
    "&minus;": "−",
  };

  let result = value.replace(
    /&(?:#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entity) => {
      if (named[entity]) return named[entity];

      const match = entity.match(/^&#(?:x([0-9a-f]+)|(\d+));$/i);
      if (!match) return entity;

      const code = match[1]
        ? parseInt(match[1], 16)
        : parseInt(match[2], 10);

      try {
        return String.fromCodePoint(code);
      } catch {
        return entity;
      }
    }
  );

  return result;
}

function normalizeText(value) {
  return decodeEntities(String(value ?? ""))
    .replace(/\r\n?/g, "\n")
    // Remove a backslash used only to continue a line.
    .replace(/\\[ \t]*\n/g, "\n")
    .replace(/\u00a0/g, " ");
}

function normalizeLatex(value) {
  let result = value.trim();

  // Common LaTeX commands that are sometimes stored without a slash.
  result = result
    .replace(/\blog\s*_\s*\{/g, "\\log_{")
    .replace(/\bln\b/g, "\\ln")
    .replace(/\bsqrt\s*\(/g, "\\sqrt(")
    .replace(/√/g, "\\sqrt{}")
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/≠/g, "\\ne ")
    .replace(/≈/g, "\\approx ")
    .replace(/±/g, "\\pm ");

  // Convert Unicode superscript digits and signs.
  const superscripts = {
    "⁰": "0",
    "¹": "1",
    "²": "2",
    "³": "3",
    "⁴": "4",
    "⁵": "5",
    "⁶": "6",
    "⁷": "7",
    "⁸": "8",
    "⁹": "9",
    "⁺": "+",
    "⁻": "-",
  };

  result = result.replace(
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g,
    (match) => `^{${[...match]
      .map((character) => superscripts[character])
      .join("")}}`
  );

  return result;
}

function looksLikeMath(value) {
  const text = value.trim();

  if (!text || !/[=<>^_{}\\√×÷≤≥≠±]/.test(text)) {
    return false;
  }

  // Never interpret a sentence as a standalone formula.
  const words = text.match(/[A-Za-z]+/g) || [];
  const allowedWords = new Set([
    "log",
    "ln",
    "sin",
    "cos",
    "tan",
    "cot",
    "sec",
    "cosec",
    "sqrt",
    "frac",
    "times",
    "cdot",
    "div",
    "pi",
    "theta",
    "alpha",
    "beta",
    "gamma",
    "infty",
    "left",
    "right",
    "le",
    "ge",
    "ne",
    "approx",
    "pm",
    "mathrm",
    "text",
  ]);

  const hasOrdinaryWord = words.some(
    (word) => word.length > 1 && !allowedWords.has(word.toLowerCase())
  );

  if (hasOrdinaryWord) return false;

  // Accept only formula-like characters.
  return /^[\s\dA-Za-z\\{}()[\]^_+\-*/=<>.,:|!%√π∞×÷≤≥≠≈±]+$/.test(
    text
  );
}

function autoWrapInlineMath(value) {
  // Automatically recognize common unwrapped logarithms, e.g. log_{3}(a).
  let result = value.replace(
    /(^|[^\w\\])((?:\\)?log\s*_\s*\{[^{}]+\}\s*(?:\([^()\n]+\)|[A-Za-z0-9]+))/g,
    (match, prefix, expression) =>
      `${prefix}\\(${expression.replace(/^log/, "\\log").replace(/^\\log/, "\\log")}\\)`
  );

  // Recognize simple powers such as x^2 and M^{-1}.
  result = result.replace(
    /(^|[\s(,])([A-Za-z][A-Za-z0-9]*)\s*\^\s*(\{[^{}]+\}|\d+)(?=$|[\s),;])/g,
    (match, prefix, base, power) =>
      `${prefix}\\(${base}^{${power.startsWith("{") ? power.slice(1, -1) : power}}\\)`
  );

  return result;
}

function renderPlainText(value, keyPrefix) {
  const boldParts = value.split(/(\*\*[\s\S]+?\*\*)/g);

  return boldParts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    const lines = part.split("\n");

    return (
      <React.Fragment key={key}>
        {lines.map((line, lineIndex) => (
          <React.Fragment key={`${key}-line-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  });
}

function renderMath(expression, display, key) {
  const math = normalizeLatex(expression);

  if (!math.trim()) return null;

  const fallback = (
    <span className="math-text-error" title="This formula could not be rendered">
      {expression}
    </span>
  );

  if (display) {
    return (
      <div className="math-text-block" key={key}>
        <BlockMath math={math} renderError={() => fallback} />
      </div>
    );
  }

  return (
    <InlineMath
      key={key}
      math={math}
      renderError={() => fallback}
    />
  );
}

export default function MathText({
  text,
  children,
  className = "",
  as: Component = "div",
}) {
  const content = text ?? children;

  if (content === null || content === undefined) return null;

  const source = autoWrapInlineMath(normalizeText(content));

  // Recognize formulas that occupy an entire line, even without delimiters.
  const lines = source.split("\n");

  const prepared = lines.map((line) => {
    const trimmed = line.trim();

    if (
      trimmed &&
      !/\\\(|\\\[|\$\$?/.test(trimmed) &&
      looksLikeMath(trimmed)
    ) {
      return `\\(${trimmed}\\)`;
    }

    return line;
  }).join("\n");

  // Split explicit inline and display math delimiters.
  const delimiter =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;

  const parts = prepared.split(delimiter);

  return (
    <Component className={`math-text ${className}`.trim()}>
      {parts.map((part, index) => {
        if (!part) return null;

        try {
          if (part.startsWith("$$") && part.endsWith("$$")) {
            return renderMath(part.slice(2, -2), true, index);
          }

          if (part.startsWith("\\[") && part.endsWith("\\]")) {
            return renderMath(part.slice(2, -2), true, index);
          }

          if (part.startsWith("\\(") && part.endsWith("\\)")) {
            return renderMath(part.slice(2, -2), false, index);
          }

          if (part.startsWith("$") && part.endsWith("$")) {
            return renderMath(part.slice(1, -1), false, index);
          }

          return (
            <React.Fragment key={index}>
              {renderPlainText(part, `text-${index}`)}
            </React.Fragment>
          );
        } catch {
          // Keep the original content visible if rendering fails.
          return (
            <React.Fragment key={index}>
              {renderPlainText(part, `fallback-${index}`)}
            </React.Fragment>
          );
        }
      })}
    </Component>
  );
}
