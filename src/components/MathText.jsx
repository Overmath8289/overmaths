import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

/*
  MathText
  --------

  Purpose:
  - Render existing LaTeX.
  - Clean common raw mathematical notation from Supabase.
  - Convert common Unicode maths symbols to LaTeX.
  - Convert fractions, powers, subscripts and set notation.
  - Support:
      $x^2$
      $$x^2$$
      \(x^2\)
      \[x^2\]
      raw LaTeX
      raw/plain mathematical expressions
      normal text mixed with mathematics.

  Important:
  - Existing \[...\] and \(...\) are preserved.
  - Existing $...$ and $$...$$ are preserved.
  - Normal English text is not converted into mathematics.
*/

/* =========================================================
   BASIC CLEANING
========================================================= */

function cleanText(text) {
  return String(text)
    .replace(/\uFEFF/g, "")
    .replace(/\u200B/g, "")
    .replace(/\u200C/g, "")
    .replace(/\u200D/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/* =========================================================
   LATEX COMMAND MAP
========================================================= */

const GREEK = {
  α: "\\alpha",
  β: "\\beta",
  γ: "\\gamma",
  δ: "\\delta",
  ε: "\\epsilon",
  ϵ: "\\varepsilon",
  ζ: "\\zeta",
  η: "\\eta",
  θ: "\\theta",
  ϑ: "\\vartheta",
  ι: "\\iota",
  κ: "\\kappa",
  λ: "\\lambda",
  μ: "\\mu",
  ν: "\\nu",
  ξ: "\\xi",
  ο: "o",
  π: "\\pi",
  ϖ: "\\varpi",
  ρ: "\\rho",
  ϱ: "\\varrho",
  σ: "\\sigma",
  ς: "\\varsigma",
  τ: "\\tau",
  υ: "\\upsilon",
  φ: "\\phi",
  ϕ: "\\varphi",
  χ: "\\chi",
  ψ: "\\psi",
  ω: "\\omega",

  Γ: "\\Gamma",
  Δ: "\\Delta",
  Θ: "\\Theta",
  Λ: "\\Lambda",
  Ξ: "\\Xi",
  Π: "\\Pi",
  Σ: "\\Sigma",
  Υ: "\\Upsilon",
  Φ: "\\Phi",
  Ψ: "\\Psi",
  Ω: "\\Omega",
};

const SYMBOLS = {
  "≤": "\\leq",
  "≥": "\\geq",
  "≠": "\\neq",
  "≈": "\\approx",
  "≃": "\\simeq",
  "≅": "\\cong",
  "∞": "\\infty",
  "∈": "\\in",
  "∉": "\\notin",
  "⊂": "\\subset",
  "⊃": "\\supset",
  "⊆": "\\subseteq",
  "⊇": "\\supseteq",
  "∩": "\\cap",
  "∪": "\\cup",
  "∅": "\\varnothing",
  "→": "\\to",
  "←": "\\leftarrow",
  "↔": "\\leftrightarrow",
  "±": "\\pm",
  "∓": "\\mp",
  "×": "\\times",
  "÷": "\\div",
  "·": "\\cdot",
  "∝": "\\propto",
  "∑": "\\sum",
  "∏": "\\prod",
  "∫": "\\int",
  "∂": "\\partial",
  "∇": "\\nabla",
};

/* =========================================================
   SMALL HELPERS
========================================================= */

function replaceUnicodeSymbols(text) {
  let result = text;

  Object.entries(GREEK).forEach(([symbol, latex]) => {
    result = result.replaceAll(symbol, latex);
  });

  Object.entries(SYMBOLS).forEach(([symbol, latex]) => {
    result = result.replaceAll(symbol, latex);
  });

  return result;
}

/*
  Convert Unicode superscripts.
  Example:
    x²     -> x^2
    x³     -> x^3
    10⁻⁴   -> 10^-4
*/

function convertUnicodeSuperscripts(text) {
  const superscriptMap = {
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
  };

  let result = text;

  result = result.replace(
    /([A-Za-z0-9.)]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾]+)/g,
    (_, base, superscripts) => {
      const converted = [...superscripts]
        .map((char) => superscriptMap[char] ?? char)
        .join("");

      return `${base}^{${converted}}`;
    }
  );

  return result;
}

/*
  Convert Unicode subscripts.
  Example:
    x₁ -> x_1
    R₂ -> R_2
*/

function convertUnicodeSubscripts(text) {
  const subscriptMap = {
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
    "₍": "(",
    "₎": ")",
  };

  return text.replace(
    /([A-Za-z])([₀₁₂₃₄₅₆₇₈₉₊₋₍₎]+)/g,
    (_, base, subscripts) => {
      const converted = [...subscripts]
        .map((char) => subscriptMap[char] ?? char)
        .join("");

      return `${base}_{${converted}}`;
    }
  );
}

/*
  Convert a normal slash fraction when it clearly looks mathematical.

  Examples:
    5/9       -> \frac{5}{9}
    3/4       -> \frac{3}{4}

  We deliberately do NOT convert every slash.
*/

function convertSimpleFractions(text) {
  return text.replace(
    /(?<![A-Za-z0-9])(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)(?![A-Za-z0-9])/g,
    "\\frac{$1}{$2}"
  );
}

/*
  Convert common powers.

  Examples:
    x^2       -> x^{2}
    x^-2      -> x^{-2}
    10^4      -> 10^{4}
    10^{-4}   stays essentially unchanged
*/

function normalizePowers(text) {
  return text.replace(
    /([A-Za-z0-9)])\^(-?[A-Za-z0-9.+-]+)/g,
    (_, base, exponent) => `${base}^{${exponent}}`
  );
}

/*
  Convert escaped/plain subscripts.

  Examples:
    R_1       -> R_{1}
    R\_1      -> R_{1}
    x_12      -> x_{12}
*/

function normalizeSubscripts(text) {
  return text
    .replace(
      /([A-Za-zΑ-Ωα-ω])\\?_([A-Za-z0-9]+)/g,
      "$1_{$2}"
    )
    .replace(
      /([A-Za-zΑ-Ωα-ω])_([A-Za-z0-9]+)/g,
      "$1_{$2}"
    );
}

/*
  Square root.

  Examples:
    √x       -> \sqrt{x}
    √(x+1)   -> \sqrt{x+1}
*/

function normalizeSquareRoots(text) {
  let result = text;

  result = result.replace(
    /√\s*\(([^()]*)\)/g,
    "\\sqrt{$1}"
  );

  result = result.replace(
    /√\s*([A-Za-z0-9]+)/g,
    "\\sqrt{$1}"
  );

  return result;
}

/*
  Normalize multiplication.

  We only change multiplication inside mathematical content.
*/

function normalizeMultiplication(text) {
  return text
    .replace(/\s*[×]\s*/g, " \\times ")
    .replace(/\s+\*\s+/g, " \\times ");
}

/*
  Escape set braces when the expression looks like set notation.

  Example:
    M={x:3<x≤8}

  becomes:
    M=\{x:3<x\leq8\}
*/

function normalizeSetNotation(text) {
  let result = text;

  result = result.replace(
    /([A-Za-z])\s*=\s*\{([^{}]+)\}/g,
    (_, name, contents) => {
      return `${name}=\\{${contents}\\}`;
    }
  );

  return result;
}

/*
  Clean raw mathematical content.
*/

function cleanMath(math) {
  let result = math.trim();

  result = replaceUnicodeSymbols(result);
  result = convertUnicodeSuperscripts(result);
  result = convertUnicodeSubscripts(result);
  result = normalizeSquareRoots(result);
  result = normalizeSubscripts(result);
  result = normalizePowers(result);
  result = convertSimpleFractions(result);
  result = normalizeMultiplication(result);
  result = normalizeSetNotation(result);

  /*
    Clean common spacing around operators.
    We do not aggressively remove all spaces because
    readable LaTeX is useful for debugging.
  */
  result = result
    .replace(/\s*≤\s*/g, " \\leq ")
    .replace(/\s*≥\s*/g, " \\geq ")
    .replace(/\s*∈\s*/g, " \\in ")
    .replace(/\s*∩\s*/g, " \\cap ")
    .replace(/\s*∪\s*/g, " \\cup ");

  return result.trim();
}

/* =========================================================
   DETECT EXPLICIT MATH
========================================================= */

function hasExplicitMathDelimiters(text) {
  return (
    text.includes("\\[") ||
    text.includes("\\]") ||
    text.includes("\\(") ||
    text.includes("\\)") ||
    text.includes("$$") ||
    /\$[^$]+\$/.test(text)
  );
}

/* =========================================================
   PARSE \[...\] AND \(...\)
========================================================= */

function parseExplicitLatex(text) {
  const parts = [];
  let buffer = "";
  let i = 0;

  const flushText = () => {
    if (buffer) {
      parts.push({
        type: "text",
        value: buffer,
      });

      buffer = "";
    }
  };

  while (i < text.length) {
    /* Block math \[...\] */
    if (text.startsWith("\\[", i)) {
      const end = text.indexOf("\\]", i + 2);

      if (end !== -1) {
        flushText();

        parts.push({
          type: "block",
          value: text.slice(i + 2, end),
        });

        i = end + 2;
        continue;
      }
    }

    /* Inline math \(...\) */
    if (text.startsWith("\\(", i)) {
      const end = text.indexOf("\\)", i + 2);

      if (end !== -1) {
        flushText();

        parts.push({
          type: "inline",
          value: text.slice(i + 2, end),
        });

        i = end + 2;
        continue;
      }
    }

    buffer += text[i];
    i++;
  }

  flushText();

  return parts;
}

/* =========================================================
   PARSE $...$ AND $$...$$
========================================================= */

function parseDollarMath(text) {
  const parts = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }

    const value = match[0];

    if (value.startsWith("$$")) {
      parts.push({
        type: "block",
        value: value.slice(2, -2),
      });
    } else {
      parts.push({
        type: "inline",
        value: value.slice(1, -1),
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return parts;
}

/* =========================================================
   FIND RAW LATEX COMMANDS
========================================================= */

const LATEX_COMMANDS =
  /\\(?:frac|sqrt|text|mathrm|mathbf|times|div|pm|mp|cdot|Omega|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|phi|omega|Delta|Sigma|Pi|Phi|leq|geq|neq|in|cap|cup|subset|subseteq|supset|supseteq|infty|sum|prod|int|partial|nabla)\b/;

function containsRawLatex(text) {
  return LATEX_COMMANDS.test(text);
}

/* =========================================================
   RAW LATEX READER
========================================================= */

function readBalanced(text, startIndex) {
  if (text[startIndex] !== "{") {
    return {
      value: "",
      end: startIndex,
    };
  }

  let depth = 0;

  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === "{") {
      depth++;
    } else if (text[i] === "}") {
      depth--;

      if (depth === 0) {
        return {
          value: text.slice(startIndex + 1, i),
          end: i + 1,
        };
      }
    }
  }

  return {
    value: text.slice(startIndex + 1),
    end: text.length,
  };
}

/* =========================================================
   RAW MATH DETECTION
========================================================= */

/*
  We only automatically treat a chunk as mathematics when
  there are recognizable mathematical signals.

  This prevents ordinary English from becoming math.
*/

function looksLikeMath(text) {
  const value = text.trim();

  if (!value) return false;

  /* Already has LaTeX commands */
  if (containsRawLatex(value)) return true;

  /* Mathematical Unicode symbols */
  if (
    /[≤≥≠≈∈∉⊂⊃⊆⊇∩∪∅√∞±∓×÷·∝∑∏∫∂∇αβγδεζηθικλμνξπρστφχψωΑΒΓΔΘΛΞΠΣΥΦΨΩ]/.test(
      value
    )
  ) {
    return true;
  }

  /* Fractions */
  if (
    /^\s*-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?\s*$/.test(
      value
    )
  ) {
    return true;
  }

  /* Powers */
  if (/^[A-Za-z0-9()]+\s*\^\s*-?[A-Za-z0-9.+-]+$/.test(value)) {
    return true;
  }

  /* Simple equation / inequality */
  if (
    /[A-Za-z0-9)]\s*(?:=|<|>|≤|≥|≠)\s*[A-Za-z0-9({√π]/.test(
      value
    )
  ) {
    return true;
  }

  /* Set notation */
  if (
    /^[A-Za-z]\s*=\s*\{[\s\S]+\}$/.test(value)
  ) {
    return true;
  }

  /* Expressions containing multiple mathematical operators */
  const operatorCount = (
    value.match(/[=<>+\-*/^]/g) || []
  ).length;

  if (
    operatorCount >= 2 &&
    /[A-Za-z0-9]/.test(value)
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   CONVERT A RAW MATH CHUNK
========================================================= */

function convertRawMathChunk(text) {
  return cleanMath(text);
}

/* =========================================================
   AUTOMATIC RAW MATH PARSER
========================================================= */

/*
  This parser is intentionally conservative.

  It looks for:
  - equations
  - inequalities
  - fractions
  - powers
  - set expressions
  - mathematical Unicode
  - obvious mathematical chunks
*/

function parseAutomaticMath(text) {
  const parts = [];
  let buffer = "";

  const flushText = () => {
    if (buffer) {
      parts.push({
        type: "text",
        value: buffer,
      });

      buffer = "";
    }
  };

  /*
    First handle line-by-line mathematical expressions.

    This is particularly useful for Supabase explanations
    where formulas may appear on their own line.
  */

  const lines = text.split("\n");

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    if (trimmed && looksLikeMath(trimmed)) {
      flushText();

      parts.push({
        type: "block",
        value: convertRawMathChunk(trimmed),
      });
    } else {
      buffer += line;

      if (lineIndex < lines.length - 1) {
        buffer += "\n";
      }
    }
  });

  flushText();

  return parts;
}

/* =========================================================
   MIXED CONTENT
========================================================= */

function renderParts(parts, keyPrefix) {
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.type === "block") {
      return (
        <BlockMath
          key={key}
          math={cleanMath(part.value)}
        />
      );
    }

    if (part.type === "inline") {
      return (
        <InlineMath
          key={key}
          math={cleanMath(part.value)}
        />
      );
    }

    return (
      <React.Fragment key={key}>
        {renderTextWithAutomaticMath(part.value, key)}
      </React.Fragment>
    );
  });
}

/*
  Handle a normal text section.

  We don't turn every piece of text into mathematics.
*/

function renderTextWithAutomaticMath(text, keyPrefix) {
  if (!text) return null;

  /*
    First check explicit LaTeX delimiters.
  */
  if (
    text.includes("\\[") ||
    text.includes("\\(")
  ) {
    return renderParts(
      parseExplicitLatex(text),
      keyPrefix
    );
  }

  /*
    Then dollar delimiters.
  */
  if (
    text.includes("$")
  ) {
    return renderParts(
      parseDollarMath(text),
      keyPrefix
    );
  }

  /*
    Look for lines that are clearly mathematics.
  */
  const automaticParts = parseAutomaticMath(text);

  if (
    automaticParts.length === 1 &&
    automaticParts[0].type === "text"
  ) {
    return automaticParts[0].value;
  }

  return renderParts(
    automaticParts,
    keyPrefix
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function MathText({
  children,
  className = "",
}) {
  if (
    children === null ||
    children === undefined
  ) {
    return null;
  }

  let text = cleanText(children);

  /*
    Preserve your existing explanation cleanup.
  */
  text = text.replace(
    /\bExplanation\s+Explanation\s*:/gi,
    "Explanation:"
  );

  text = text.replace(
    /\bExplanationExplanation\s*:/gi,
    "Explanation:"
  );

  const trimmed = text.trim();

  /*
    Entire \[...\] expression.
  */
  if (
    trimmed.startsWith("\\[") &&
    trimmed.endsWith("\\]")
  ) {
    return (
      <span className={`math-text ${className}`}>
        <BlockMath
          math={trimmed.slice(2, -2).trim()}
        />
      </span>
    );
  }

  /*
    Entire \(...\) expression.
  */
  if (
    trimmed.startsWith("\\(") &&
    trimmed.endsWith("\\)")
  ) {
    return (
      <span className={`math-text ${className}`}>
        <InlineMath
          math={trimmed.slice(2, -2).trim()}
        />
      </span>
    );
  }

  /*
    Entire $$...$$ expression.
  */
  if (
    trimmed.startsWith("$$") &&
    trimmed.endsWith("$$")
  ) {
    return (
      <span className={`math-text ${className}`}>
        <BlockMath
          math={trimmed.slice(2, -2).trim()}
        />
      </span>
    );
  }

  /*
    Entire $...$ expression.
  */
  if (
    trimmed.startsWith("$") &&
    trimmed.endsWith("$") &&
    trimmed.length > 2
  ) {
    return (
      <span className={`math-text ${className}`}>
        <InlineMath
          math={trimmed.slice(1, -1).trim()}
        />
      </span>
    );
  }

  /*
    Normal mixed content.
  */
  return (
    <span className={`math-text ${className}`}>
      {renderTextWithAutomaticMath(
        text,
        "math"
      )}
    </span>
  );
}