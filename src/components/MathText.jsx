
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./MathText.css";

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
  "₄": "4", "₅": "5", "₆": "6", "₇": "7",
  "₈": "8", "₉": "9", "₊": "+", "₋": "-",
  "₌": "=", "₍": "(", "₎": ")", "ₐ": "a",
  "ₑ": "e", "ₕ": "h", "ₖ": "k", "ₘ": "m",
  "ₙ": "n", "ₚ": "p", "ₛ": "s", "ₜ": "t",
  "ₓ": "x",
};

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

function normalizeSource(value) {
  return decodeEntities(value)
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .trim();
}

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

  math = math.replace(/log([₀₁₂₃₄₅₆₇₈₉]+)/g, (_, digits) => {
    const base = [...digits]
      .map((char) => SUB_MAP[char] ?? char)
      .join("");

    return `\\log_{${base}}`;
  });

  math = math.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿⁱ]+/g, (group) => {
    const power = [...group]
      .map((char) => SUPER_MAP[char] ?? char)
      .join("");

    return `^{${power}}`;
  });

  math = math.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕₖₘₙₚₛₜₓ]+/g, (group) => {
    const subscript = [...group]
      .map((char) => SUB_MAP[char] ?? char)
      .join("");

    return `_{${subscript}}`;
  });

  return math;
}

function looksMathematical(value) {
  const text = String(value ?? "").trim();

  return (
    /[=<>±×÷≤≥≠≈√∫∑]/.test(text) ||
    /\\(?:frac|sqrt|log|sin|cos|tan|pi|theta|alpha|beta|angle|times|div|cdot|boxed|therefore|sum|int|mathrm|text|circ|left|right)\b/.test(text) ||
    /[A-Za-z0-9][_^]\{?[-+A-Za-z0-9]/.test(text) ||
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉]/.test(text)
  );
}

function SafeMath({ math, display = false }) {
  const normalized = normalizeLatex(math);

  try {
    return display ? (
      <div className="math-text-block">
        <BlockMath math={normalized} />
      </div>
    ) : (
      <InlineMath math={normalized} />
    );
  } catch {
    return <span className="math-text-error">{math}</span>;
  }
}

function renderPlainText(text, keyPrefix) {
  const pieces = String(text ?? "").split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g);

  return pieces.map((piece, index) => {
    const key = `${keyPrefix}-${index}`;

    if (piece.startsWith("`") && piece.endsWith("`")) {
      const inside = piece.slice(1, -1);

      return looksMathematical(inside) ? (
        <SafeMath key={key} math={inside} />
      ) : (
        <code key={key}>{inside}</code>
      );
    }

    if (piece.startsWith("**") && piece.endsWith("**")) {
      return (
        <strong key={key}>
          {piece.slice(2, -2)}
        </strong>
      );
    }

    return <React.Fragment key={key}>{piece}</React.Fragment>;
  });
}

function renderContent(source) {
  const delimiterPattern =
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g;

  return source.split(delimiterPattern).map((piece, index) => {
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

    const lines = piece.split("\n");

    return lines.map((line, lineIndex) => (
      <React.Fragment key={`${key}-line-${lineIndex}`}>
        {renderPlainText(line, `${key}-text-${lineIndex}`)}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  });
}

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
