
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./MathText.css";

/* ---------------------------------------
   HTML ENTITY SUPPORT
--------------------------------------- */

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
  "⁰": "0", "¹": "1", "²": "2", "³": "3",
  "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7",
  "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-",
  "⁽": "(", "⁾": ")", "ⁿ": "n", "ⁱ": "i",
};

const SUB_MAP = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3",
  "₄": "4", "₅": "5", "₆": "6",
  "₇": "7", "₈": "8", "₉": "9",
  "₊": "+", "₋": "-", "₌": "=",
  "₍": "(", "₎": ")", "ₐ": "a",
  "ₑ": "e", "ₕ": "h", "ₖ": "k",
  "ₘ": "m", "ₙ": "n", "ₚ": "p",
  "ₛ": "s", "ₜ": "t", "ₓ": "x",
};

/* ---------------------------------------
   DECODE HTML ENTITIES
--------------------------------------- */

function decodeEntities(value) {
  let result = String(value ?? "");

  for (const [entity, replacement] of Object.entries(ENTITY_MAP)) {
    result = result.split(entity).join(replacement);
  }

  result = result.replace(
    /&#(x[0-9a-f]+|\d+);?/gi,
    (match, code) => {
      const isHex = code[0].toLowerCase() === "x";

      const number = Number.parseInt(
        isHex ? code.slice(1) : code,
        isHex ? 16 : 10
      );

      if (
        !Number.isFinite(number) ||
        number < 0 ||
        number > 0x10ffff
      ) {
        return match;
      }

      try {
        return String.fromCodePoint(number);
      } catch {
        return match;
      }
    }
  );

  return result;
}

/* ---------------------------------------
   NORMALIZE SOURCE TEXT
--------------------------------------- */

function normalizeSource(value) {
  return decodeEntities(value)
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Normalize repeated backslashes around math delimiters.
    .replace(/\\{2,}(?=[()[\]])/g, "\\")
    .trim();
}

/* ---------------------------------------
   NORMALIZE MATHEMATICAL EXPRESSIONS
--------------------------------------- */

function normalizeLatex(value) {
  let math = String(value ?? "").trim();

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

  // Convert logarithm subscripts: log₁₀ -> \log_{10}
  math = math.replace(
    /log([₀₁₂₃₄₅₆₇₈₉]+)/g,
    (_, digits) => {
      const base = [...digits]
        .map((char) => SUB_MAP[char] ?? char)
        .join("");

      return `\\log_{${base}}`;
    }
  );

  // Convert Unicode superscripts.
  math = math.replace(
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿⁱ]+/g,
    (group) => {
      const power = [...group]
        .map((char) => SUPER_MAP[char] ?? char)
        .join("");

      return `^{${power}}`;
    }
  );

  // Convert Unicode subscripts.
  math = math.replace(
    /[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕₖₘₙₚₛₜₓ]+/g,
    (group) => {
      const subscript = [...group]
        .map((char) => SUB_MAP[char] ?? char)
        .join("");

      return `_{${subscript}}`;
    }
  );

  return math;
}

/* ---------------------------------------
   IDENTIFY MATHEMATICAL CONTENT
--------------------------------------- */

function looksMathematical(value) {
  const text = String(value ?? "").trim();

  if (!text) return false;

  return (
    /[=<>±×÷≤≥≠≈√∫∑∞]/.test(text) ||
    /\\(?:frac|dfrac|tfrac|sqrt|log|ln|sin|cos|tan|pi|theta|alpha|beta|gamma|angle|times|div|cdot|boxed|therefore|sum|int|prod|mathrm|text|circ|left|right|overline|underline|lim|rightarrow|begin)\b/.test(text) ||
    /[A-Za-z0-9][\_^]\s*\{/.test(text) ||
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉]/.test(text)
  );
}

/* ---------------------------------------
   DETECT CLEAR STANDALONE LATEX
--------------------------------------- */

function looksLikeStandaloneMath(value) {
  const text = String(value ?? "").trim();

  if (!text || !looksMathematical(text)) {
    return false;
  }

  // A line beginning with an explicit LaTeX command
  // is a clear standalone mathematical expression.
  return /^\\(?:frac|dfrac|tfrac|sqrt|sum|int|prod|lim|log|ln|begin|left|boxed)\b/.test(text);
}

/* ---------------------------------------
   SAFE KATEX RENDERING
--------------------------------------- */

function SafeMath({ math, display = false }) {
  const normalized = normalizeLatex(math);

  if (!normalized) return null;

  const settings = {
    throwOnError: false,
    strict: "ignore",
    trust: false,
    output: "htmlAndMathml",
  };

  if (display) {
    return (
      <div className="math-text-block">
        <BlockMath
          math={normalized}
          settings={settings}
        />
      </div>
    );
  }

  return (
    <InlineMath
      math={normalized}
      settings={settings}
    />
  );
}

/* ---------------------------------------
   RENDER NORMAL TEXT
--------------------------------------- */

function renderPlainText(text, keyPrefix) {
  const pieces = String(text ?? "").split(
    /(`[^`\n]+`|\*\*[^\*\n]+\*\*)/g
  );

  return pieces.map((piece, index) => {
    const key = `${keyPrefix}-${index}`;

    // Inline code.
    if (
      piece.startsWith("`") &&
      piece.endsWith("`")
    ) {
      const inside = piece.slice(1, -1);

      return looksMathematical(inside) ? (
        <SafeMath key={key} math={inside} />
      ) : (
        <code key={key}>{inside}</code>
      );
    }

    // Bold text.
    if (
      piece.startsWith("**") &&
      piece.endsWith("**")
    ) {
      return (
        <strong key={key}>
          {piece.slice(2, -2)}
        </strong>
      );
    }

    return (
      <React.Fragment key={key}>
        {piece}
      </React.Fragment>
    );
  });
}

/* ---------------------------------------
   RENDER TEXT AND LATEX DELIMITERS
--------------------------------------- */

function renderContent(source) {
  /*
    Supported formats:

    $$ ... $$       Display mathematics
    \[ ... \]       Display mathematics
    \( ... \)       Inline mathematics
    $ ... $         Inline mathematics
  */

  const delimiterPattern =
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g;

  return source.split(delimiterPattern).map((piece, index) => {
    const key = `math-piece-${index}`;

    if (!piece) return null;

    // Display math using $$ ... $$
    if (
      piece.startsWith("$$") &&
      piece.endsWith("$$")
    ) {
      return (
        <SafeMath
          key={key}
          math={piece.slice(2, -2)}
          display
        />
      );
    }

    // Display math using \[ ... \]
    if (
      piece.startsWith("\\[") &&
      piece.endsWith("\\]")
    ) {
      return (
        <SafeMath
          key={key}
          math={piece.slice(2, -2)}
          display
        />
      );
    }

    // Inline math using \( ... \)
    if (
      piece.startsWith("\\(") &&
      piece.endsWith("\\)")
    ) {
      return (
        <SafeMath
          key={key}
          math={piece.slice(2, -2)}
        />
      );
    }

    // Inline math using $ ... $
    if (
      piece.startsWith("$") &&
      piece.endsWith("$")
    ) {
      return (
        <SafeMath
          key={key}
          math={piece.slice(1, -1)}
        />
      );
    }

    // Process ordinary text line by line.
    const lines = piece.split("\n");

    return lines.map((line, lineIndex) => {
      const trimmedLine = line.trim();

      const lineKey = `${key}-line-${lineIndex}`;

      if (looksLikeStandaloneMath(trimmedLine)) {
        return (
          <React.Fragment key={lineKey}>
            <SafeMath
              math={trimmedLine}
              display
            />
          </React.Fragment>
        );
      }

      return (
        <React.Fragment key={lineKey}>
          {renderPlainText(
            line,
            `${key}-text-${lineIndex}`
          )}

          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  });
}

/* ---------------------------------------
   MAIN COMPONENT
--------------------------------------- */

export default function MathText({
  text,
  children,
  className = "",
  as: Component = "div",
}) {
  const value = text ?? children ?? "";

  const source = normalizeSource(
    typeof value === "string" || typeof value === "number"
      ? value
      : ""
  );

  return (
    <Component className={`math-text ${className}`.trim()}>
      {renderContent(source)}
    </Component>
  );
}
