
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./MathText.css";

function decodeEntities(value) {
  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&times;": "×",
    "&divide;": "÷",
    "&minus;": "−",
  };

  return value.replace(
    /&(?:#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entity) => {
      if (entities[entity]) return entities[entity];

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
}

function normalizeSource(value) {
  return decodeEntities(String(value ?? ""))
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    // Repair double-escaped math delimiters from stored text.
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)")
    .replace(/\\\\\[/g, "\\[")
    .replace(/\\\\\]/g, "\\]");
}

function normalizeLatex(value) {
  return value
    .trim()
    .replace(/\\{2,}(?=[A-Za-z])/g, "\\")
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/≠/g, "\\ne ")
    .replace(/−/g, "-")
    .replace(/π/g, "\\pi ")
    .replace(/θ/g, "\\theta ")
    .replace(/α/g, "\\alpha ")
    .replace(/β/g, "\\beta ");
}

const superscriptMap = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3",
  "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7",
  "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-"
};

function normalizeUnicodePowers(value) {
  return value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (match) => {
    const power = [...match].map((character) => superscriptMap[character]).join("");
    return `^{${power}}`;
  });
}

function renderFormula(expression, display, key) {
  const math = normalizeLatex(normalizeUnicodePowers(expression));

  const fallback = (
    <span className="math-text-error" title="Formula could not be rendered">
      {expression}
    </span>
  );

  return display ? (
    <div className="math-text-block" key={key}>
      <BlockMath math={math} renderError={() => fallback} />
    </div>
  ) : (
    <InlineMath
      key={key}
      math={math}
      renderError={() => fallback}
    />
  );
}

function looksLikeWholeFormula(line) {
  const value = line.trim();

  if (!value || value.length > 300) return false;

  // Avoid treating normal sentences as equations.
  if (/[.!?]\s+[A-Za-z]/.test(value)) return false;

  const words = value.match(/[A-Za-z]{2,}/g) || [];
  const ordinaryWords = words.filter(
    (word) =>
      ![
        "log", "sin", "cos", "tan", "cot", "sec",
        "sqrt", "frac", "times", "cdot", "div",
        "text", "mathrm", "pi", "theta", "alpha",
        "beta", "left", "right", "infty", "lim"
      ].includes(word.toLowerCase())
  );

  const hasMathMarker =
    /\\(?:frac|sqrt|times|cdot|div|pi|log|text|angle)\b|[\^_=<>≤≥≠±×÷]/.test(value);

  return hasMathMarker && ordinaryWords.length === 0;
}

function renderTextWithLineBreaks(value, key) {
  return value.split("\n").map((line, index) => (
    <React.Fragment key={`${key}-${index}`}>
      {line}
      {index < value.split("\n").length - 1 && <br />}
    </React.Fragment>
  ));
}

function renderMixedLine(line, lineKey) {
  // Render explicit delimiters, and common unwrapped LaTeX commands
  // inside prose, without converting the entire sentence to math.
  const tokenPattern =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$|\\(?:frac|sqrt|text|mathrm)\s*\{[^{}]*\}(?:\s*\{[^{}]*\})?|\\(?:times|cdot|div|pi|theta|alpha|beta|angle|degree|log|sin|cos|tan|le|ge|ne|pm)\b|[A-Za-z0-9]+(?:\^\{[^{}]*\}|_\{[^{}]*\}|\^[0-9]+|_[0-9]+)|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g;

  const parts = line.split(tokenPattern);

  return parts.map((part, index) => {
    if (!part) return null;

    try {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        return renderFormula(part.slice(2, -2), true, `${lineKey}-${index}`);
      }

      if (part.startsWith("\\[") && part.endsWith("\\]")) {
        return renderFormula(part.slice(2, -2), true, `${lineKey}-${index}`);
      }

      if (part.startsWith("\\(") && part.endsWith("\\)")) {
        return renderFormula(part.slice(2, -2), false, `${lineKey}-${index}`);
      }

      if (part.startsWith("$") && part.endsWith("$")) {
        return renderFormula(part.slice(1, -1), false, `${lineKey}-${index}`);
      }

      if (
        /^\\(?:frac|sqrt|text|mathrm|times|cdot|div|pi|theta|alpha|beta|angle|degree|log|sin|cos|tan|le|ge|ne|pm)\b/.test(part) ||
        /^[A-Za-z0-9]+(?:\^\{[^{}]*\}|_\{[^{}]*\}|\^[0-9]+|_[0-9]+)$/.test(part) ||
        /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/.test(part)
      ) {
        return renderFormula(part, false, `${lineKey}-${index}`);
      }

      return (
        <React.Fragment key={`${lineKey}-${index}`}>
          {renderTextWithLineBreaks(part, `${lineKey}-${index}`)}
        </React.Fragment>
      );
    } catch {
      return (
        <React.Fragment key={`${lineKey}-${index}`}>
          {part}
        </React.Fragment>
      );
    }
  });
}

export default function MathText({
  text,
  children,
  className = "",
  as: Component = "div",
}) {
  const content = text ?? children;

  if (content === null || content === undefined) return null;

  const source = normalizeSource(content);

  return (
    <Component className={`math-text ${className}`.trim()}>
      {source.split("\n").map((line, index) => (
        <React.Fragment key={index}>
          {looksLikeWholeFormula(line)
            ? renderFormula(line, false, `formula-${index}`)
            : renderMixedLine(line, `line-${index}`)}
          {index < source.split("\n").length - 1 && <br />}
        </React.Fragment>
      ))}
    </Component>
  );
}
