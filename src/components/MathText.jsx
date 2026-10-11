
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./MathText.css";

/**
 * Overmaths MathText
 *
 * Supports:
 * - \( inline math \), \[ display math \]
 * - $ inline math $, $$ display math $$
 * - Multiline display equations
 * - Backtick-wrapped formulas
 * - Common Unicode mathematical symbols and powers
 * - Safe fallback when KaTeX cannot parse a formula
 */

const ENTITY_MAP = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&times;": "×",
  "&divide;": "÷",
  "&minus;": "−",
  "&le;": "≤",
  "&ge;": "≥",
  "&ne;": "≠",
};

const SUPER_MAP = {
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
  "⁽": "(",
  "⁾": ")",
  "ⁿ": "n",
  "ⁱ": "i",
};

const SUB_MAP = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
  "₌": "=",
  "₍": "(",
  "₎": ")",
  "ₐ": "a",
  "ₑ": "e",
  "ₕ": "h",
  "ₖ": "k",
  "ₘ": "m",
  "ₙ": "n",
  "ₚ": "p",
  "ₛ": "s",
  "ₜ": "t",
  "ₓ": "x",
};

/**
 * Decode common HTML entities sometimes stored by forms or spreadsheets.
 */
function decodeEntities(value) {
  let result = String(value ?? "");

  Object.entries(ENTITY_MAP).forEach(([entity, replacement]) => {
    result = result.replace(
      new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
      replacement
    );
  });

  // Decode numeric HTML entities, e.g. &#215; or &#xD7;.
  result = result.replace(/&#(x[0-9a-f]+|\d+);?/gi, (match, code) => {
    const isHex = code[0].toLowerCase() === "x";
    const number = Number.parseInt(isHex ? code.slice(1) : code, isHex ? 16 : 10);

    if (!Number.isFinite(number) || number < 0 || number > 0x10ffff) {
      return match;
    }

    try {
      return String.fromCodePoint(number);
    } catch {
      return match;
    }
  });

  return result;
}

/**
 * Normalize source text without splitting equations into separate lines.
 */
function normalizeSource(value) {
  return decodeEntities(value)
    .replace(/\r\n?/g, "\n")
    // Repair escaped delimiters such as \\( ... \\) and \\[ ... \\].
    .replace(/\\\\([()[\]])/g, "\\$1")
    // Convert common HTML line breaks into real line breaks.
    .replace(/<br\s*\/?>/gi, "\n")
    .trim();
}

/**
 * Convert common Unicode notation into LaTeX-compatible notation.
 * This is applied to mathematical expressions, not ordinary prose.
 */
function normalizeLatex(value) {
  let math = String(value ?? "")
    .replace(/`/g, "")
    .trim();

  // Repair double-escaped LaTeX commands such as \\times and \\frac.
  math = math.replace(/\\\\(?=[a-zA-Z()[\]])/g, "\\");

  // Unicode symbols commonly found in imported questions.
  math = math
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/[−–]/g, "-")
    .replace(/≤/g, "\\leq ")
    .replace(/≥/g, "\\geq ")
    .replace(/≠/g, "\\neq ")
    .replace(/≈/g, "\\approx ")
    .replace(/±/g, "\\pm ")
    .replace(/π/g, "\\pi ")
    .replace(/θ/g, "\\theta ")
    .replace(/α/g, "\\alpha ")
    .replace(/β/g, "\\beta ")
    .replace(/μ/g, "\\mu ")
    .replace(/ρ/g, "\\rho ")
    .replace(/λ/g, "\\lambda ")
    .replace(/°/g, "^{\\circ}");

  // Repair copied logarithms such as log⁡2(8) or log₂(8).
  math = math
    .replace(/log\s*[⁡]\s*([0-9]+)/gi, "\\log_{$1}")
    .replace(/log([₀₁₂₃₄₅₆₇₈₉]+)/gi, (_, digits) => {
      const base = [...digits]
        .map((character) => SUB_MAP[character] ?? character)
        .join("");
      return `\\log_{${base}}`;
    });

  // Convert Unicode superscripts into grouped powers, e.g. x⁻² -> x^{-2}.
  math = math.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿⁱ]+/g, (group) => {
    const power = [...group]
      .map((character) => SUPER_MAP[character] ?? character)
      .join("");
    return `^{${power}}`;
  });

  // Convert Unicode subscripts into grouped subscripts, e.g. H₂O -> H_{2}O.
  math = math.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕₖₘₙₚₛₜₓ]+/g, (group) => {
    const subscript = [...group]
      .map((character) => SUB_MAP[character] ?? character)
      .join("");
    return `_{${subscript}}`;
  });

  return math;
}

/**
 * Avoid treating ordinary prose inside backticks as an equation.
 */
function looksMathematical(value) {
  const text = String(value ?? "").trim();

  if (!text) return false;

  return (
    /[=<>±×÷≤≥≠≈]/.test(text) ||
    /\\(?:frac|sqrt|log|sin|cos|tan|pi|theta|alpha|beta|angle|times|div|cdot|boxed|therefore|sum|int|mathrm|text|circ)\b/.test(
      text
    ) ||
    /[A-Za-z0-9][_^]\{?[-+A-Za-z0-9]/.test(text) ||
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉]/.test(text)
  );
}

/**
 * Catch common complete equations that were imported without delimiters.
 * Do not wrap full English question sentences just because they contain
 * a mathematical symbol.
 */
function looksLikeWholeFormula(value) {
  const text = String(value ?? "").trim();

  if (!text || text.length > 180) return false;
  if (!/[=<>]/.test(text)) return false;

  const words = text.match(/[A-Za-z]{2,}/g) ?? [];
  const ordinaryWords = words.filter(
    (word) =>
      ![
        "frac",
        "sqrt",
        "times",
        "theta",
        "alpha",
        "beta",
        "pi",
        "log",
        "sin",
        "cos",
        "tan",
        "mathrm",
        "text",
        "circ",
        "boxed",
        "therefore",
      ].includes(word.toLowerCase())
  );

  return ordinaryWords.length <= 2;
}

function SafeMath({ math, display = false }) {
  const normalized = normalizeLatex(math);

  try {
    if (display) {
      return (
        <div className="math-text-block">
          <BlockMath math={normalized} />
        </div>
      );
    }

    return <InlineMath math={normalized} />;
  } catch {
    return (
      <span className="math-text-error">
        {String(math ?? "").replace(/`/g, "")}
      </span>
    );
  }
}

/**
 * Render plain-text portions. Backtick-wrapped mathematical expressions
 * become inline equations; ordinary backtick text remains readable.
 */
function renderPlainText(text, keyPrefix) {
  const pieces = String(text ?? "").split(/(`[^`\n]+`)/g);

  return pieces.map((piece, index) => {
    const key = `${keyPrefix}-${index}`;

    if (piece.startsWith("`") && piece.endsWith("`")) {
      const inside = piece.slice(1, -1);

      if (looksMathematical(inside)) {
        return <SafeMath key={key} math={inside} />;
      }

      return <code key={key}>{inside}</code>;
    }

    // Preserve simple Markdown bold text in question content.
    const boldPieces = piece.split(/(\*\*[^*\n]+\*\*)/g);

    return (
      <React.Fragment key={key}>
        {boldPieces.map((boldPiece, boldIndex) => {
          if (
            boldPiece.startsWith("**") &&
            boldPiece.endsWith("**")
          ) {
            return (
              <strong key={`${key}-bold-${boldIndex}`}>
                {boldPiece.slice(2, -2)}
              </strong>
            );
          }

          return (
            <React.Fragment key={`${key}-text-${boldIndex}`}>
              {boldPiece}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  });
}

/**
 * Parse the entire source before rendering any lines.
 * This is important: display math can span multiple lines.
 */
function renderContent(source) {
  const delimiterPattern =
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\]|\$[^$\n]+\$)/g;

  const pieces = source.split(delimiterPattern);

  return pieces.map((piece, index) => {
    const key = `math-piece-${index}`;

    if (!piece) return null;

    if (piece.startsWith("$$") && piece.endsWith("$$")) {
      return (
        <SafeMath
          key={key}
          math={piece.slice(2, -2)}
          display
        />
      );
    }

    if (piece.startsWith("\\[") && piece.endsWith("\\]")) {
      return (
        <SafeMath
          key={key}
          math={piece.slice(2, -2)}
          display
        />
      );
    }

    if (piece.startsWith("\\(") && piece.endsWith("\\)")) {
      return (
        <SafeMath
          key={key}
          math={piece.slice(2, -2)}
        />
      );
    }

    if (piece.startsWith("$") && piece.endsWith("$")) {
      return (
        <SafeMath
          key={key}
          math={piece.slice(1, -1)}
        />
      );
    }

    // Render ordinary text and preserve its line breaks.
    const lines = piece.split("\n");

    return (
      <React.Fragment key={key}>
        {lines.map((line, lineIndex) => (
          <React.Fragment key={`${key}-line-${lineIndex}`}>
            {looksLikeWholeFormula(line) ? (
              <SafeMath math={line} />
            ) : (
              renderPlainText(line, `${key}-text-${lineIndex}`)
            )}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  });
}

export default function MathText({
  text,
  children,
  className = "",
  as: Component = "div",
}) {
  const source = normalizeSource(text ?? children ?? "");

  return (
    <Component className={`math-text ${className}`.trim()}>
      {renderContent(source)}
    </Component>
  );
}
