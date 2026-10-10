
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./MathText.css";

const GREEK = {
  "α": "\\alpha", "β": "\\beta", "γ": "\\gamma",
  "δ": "\\delta", "ε": "\\epsilon", "ϵ": "\\varepsilon",
  "θ": "\\theta", "λ": "\\lambda", "μ": "\\mu",
  "π": "\\pi", "ρ": "\\rho", "σ": "\\sigma",
  "φ": "\\phi", "ϕ": "\\varphi", "ω": "\\omega",
  "Γ": "\\Gamma", "Δ": "\\Delta", "Θ": "\\Theta",
  "Λ": "\\Lambda", "Π": "\\Pi", "Σ": "\\Sigma",
  "Φ": "\\Phi", "Ω": "\\Omega"
};

const SYMBOLS = {
  "≤": "\\leq",
  "≥": "\\geq",
  "≠": "\\neq",
  "≈": "\\approx",
  "∞": "\\infty",
  "∈": "\\in",
  "∉": "\\notin",
  "⊂": "\\subset",
  "⊆": "\\subseteq",
  "⊃": "\\supset",
  "⊇": "\\supseteq",
  "∩": "\\cap",
  "∪": "\\cup",
  "∅": "\\varnothing",
  "±": "\\pm",
  "∓": "\\mp",
  "×": "\\times",
  "÷": "\\div",
  "·": "\\cdot",
  "→": "\\to",
  "←": "\\leftarrow",
  "↔": "\\leftrightarrow",
  "∝": "\\propto",
  "√": "\\sqrt{}",
  "∑": "\\sum",
  "∏": "\\prod",
  "∫": "\\int",
  "∂": "\\partial",
  "∇": "\\nabla"
};

const SUPER = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3",
  "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7",
  "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-",
  "⁽": "(", "⁾": ")"
};

const SUB = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3",
  "₄": "4", "₅": "5", "₆": "6", "₇": "7",
  "₈": "8", "₉": "9", "₊": "+", "₋": "-",
  "₍": "(", "₎": ")"
};

function cleanText(value) {
  return String(value)
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\bExplanation\s+Explanation\s*:/gi, "Explanation:")
    .replace(/\bExplanationExplanation\s*:/gi, "Explanation:");
}

function replaceSymbols(text) {
  let result = text;

  for (const [symbol, command] of Object.entries(GREEK)) {
    result = result.replaceAll(symbol, command);
  }

  for (const [symbol, command] of Object.entries(SYMBOLS)) {
    if (symbol === "√") continue;
    result = result.replaceAll(symbol, command);
  }

  return result;
}

function convertSuperscripts(text) {
  return text.replace(
    /([A-Za-z0-9.)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾]+)/g,
    (_, base, exponent) =>
      `${base}^{${[...exponent].map(c => SUPER[c]).join("")}}`
  );
}

function convertSubscripts(text) {
  return text.replace(
    /([A-Za-z])([₀₁₂₃₄₅₆₇₈₉₊₋₍₎]+)/g,
    (_, base, subscript) =>
      `${base}_{${[...subscript].map(c => SUB[c]).join("")}}`
  );
}

function convertRoots(text) {
  return text
    .replace(/√\s*\(([^()]+)\)/g, "\\sqrt{$1}")
    .replace(/√\s*([A-Za-z0-9]+)/g, "\\sqrt{$1}");
}

function convertFractions(text) {
  return text.replace(
    /(?<![A-Za-z0-9])(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)(?![A-Za-z0-9])/g,
    "\\frac{$1}{$2}"
  );
}

function normalizePowers(text) {
  return text.replace(
    /([A-Za-z0-9)])\^(-?[A-Za-z0-9.+-]+)/g,
    (_, base, exponent) => `${base}^{${exponent}}`
  );
}

function normalizeSubscriptSyntax(text) {
  // Avoid adding braces a second time to already formatted subscripts.
  return text
    .replace(
      /([A-Za-zΑ-Ωα-ω])\\?_([A-Za-z0-9]+)(?![A-Za-z0-9])/g,
      (_, base, sub) => `${base}_{${sub}}`
    )
    .replace(
      /([A-Za-zΑ-Ωα-ω])_\{([^{}]+)\}/g,
      "$1_{$2}"
    );
}

function cleanMath(value) {
  let result = value.trim();

  result = replaceSymbols(result);
  result = convertSuperscripts(result);
  result = convertSubscripts(result);
  result = convertRoots(result);
  result = normalizeSubscriptSyntax(result);
  result = normalizePowers(result);
  result = convertFractions(result);

  // Convert multiplication symbols without modifying normal words.
  result = result.replace(/×/g, "\\times");

  return result.trim();
}

function looksLikeMath(value) {
  const text = value.trim();
  if (!text) return false;

  // Raw LaTeX commands are a strong signal.
  if (
    /\\(?:frac|sqrt|mathrm|mathbf|times|div|alpha|beta|theta|pi|leq|geq|neq|infty|sum|int)\b/.test(text)
  ) {
    return true;
  }

  // Recognizable mathematical symbols.
  if (/[≤≥≠≈∈∉⊂⊃⊆⊇∩∪∅√∞±∓×÷∝∑∏∫∂∇αβγδεθλμπρσφω]/.test(text)) {
    return true;
  }

  // Simple numeric fraction, such as 3/4.
  if (/^-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?$/.test(text)) {
    return true;
  }

  // Powers, equations and inequalities.
  if (/^[A-Za-z0-9()]+\s*\^\s*-?[A-Za-z0-9.+-]+$/.test(text)) {
    return true;
  }

  if (/^[A-Za-z0-9()]+\s*(?:=|<|>|≤|≥|≠)\s*.+$/.test(text)) {
    return true;
  }

  // Do not convert arbitrary English sentences just because
  // they contain a plus sign, slash or equals sign.
  return false;
}

function renderMath(math, display, key) {
  const value = cleanMath(math);

  if (!value) return null;

  return display ? (
    <div className="math-text-block" key={key}>
      <BlockMath math={value} />
    </div>
  ) : (
    <InlineMath math={value} key={key} />
  );
}

function parseContent(text, prefix = "math") {
  // Recognize existing delimiters without changing the original text.
  const delimiter =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;

  const parts = [];
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = delimiter.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
        key: `${prefix}-${index++}`
      });
    }

    const token = match[0];
    let value;
    let display = false;

    if (token.startsWith("$$")) {
      value = token.slice(2, -2);
      display = true;
    } else if (token.startsWith("\\[")) {
      value = token.slice(2, -2);
      display = true;
    } else if (token.startsWith("\\(")) {
      value = token.slice(2, -2);
    } else {
      value = token.slice(1, -1);
      display = token.startsWith("$$");
    }

    parts.push({
      type: "math",
      value,
      display,
      key: `${prefix}-${index++}`
    });

    lastIndex = delimiter.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      value: text.slice(lastIndex),
      key: `${prefix}-${index++}`
    });
  }

  // Automatically render only lines that are clearly equations.
  return parts.flatMap(part => {
    if (part.type !== "text") return [part];

    const lines = part.value.split("\n");

    return lines.flatMap((line, lineIndex) => {
      const output = [];

      if (looksLikeMath(line)) {
        output.push({
          type: "math",
          value: line,
          display: true,
          key: `${part.key}-auto-${lineIndex}`
        });
      } else if (line) {
        output.push({
          type: "text",
          value: line,
          key: `${part.key}-text-${lineIndex}`
        });
      }

      if (lineIndex < lines.length - 1) {
        output.push({
          type: "newline",
          key: `${part.key}-newline-${lineIndex}`
        });
      }

      return output;
    });
  });
}

export default function MathText({
  children,
  className = "",
  as: Component = "div"
}) {
  if (children === null || children === undefined) return null;

  const text = cleanText(children);
  const parts = parseContent(text);

  return (
    <Component className={`math-text ${className}`.trim()}>
      {parts.map(part => {
        if (part.type === "math") {
          return renderMath(part.value, part.display, part.key);
        }

        if (part.type === "newline") {
          return <br key={part.key} />;
        }

        return <React.Fragment key={part.key}>{part.value}</React.Fragment>;
      })}
    </Component>
  );
}
