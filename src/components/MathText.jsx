import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

/*
  MathText
  --------
  Handles:
  - $x^2$
  - $$x^2$$
  - \(x^2\)
  - \[x^2\]
  - Raw LaTeX such as \frac{1}{2}, \sqrt{x}, \Omega, \times
  - Simple expressions such as R_1/R_2
  - Powers such as x^2
  - Greek letters
  - Normal explanatory text mixed with mathematics
*/

/* -------------------------------------------------------
   BASIC HELPERS
------------------------------------------------------- */

function escapeText(text) {
  return text
    .replace(/\uFEFF/g, "")
    .replace(/\u200B/g, "")
    .replace(/\u200C/g, "")
    .replace(/\u200D/g, "")
    .replace(/\u00A0/g, " ");
}

/* Convert simple plain-text math into LaTeX */
function convertPlainMath(text) {
  let result = text;

  // Multiplication symbol
  result = result.replace(/\s*[×]\s*/g, " \\times ");

  // Subscripts:
  // R_1 -> R_{1}
  // x_2 -> x_{2}
  result = result.replace(
    /([A-Za-zΑ-Ωα-ω])_([A-Za-z0-9]+)/g,
    "$1_{$2}"
  );

  // Powers:
  // x^2 -> x^{2}
  // x^-2 -> x^{-2}
  // 10^4 -> 10^{4}
  result = result.replace(
    /([A-Za-z0-9)])\^(-?[A-Za-z0-9.+-]+)/g,
    "$1^{$2}"
  );

  // Square root:
  // √x -> \sqrt{x}
  // √(x+1) -> \sqrt{x+1}
  result = result.replace(
    /√\s*\(([^()]*)\)/g,
    "\\sqrt{$1}"
  );

  result = result.replace(
    /√\s*([A-Za-z0-9.+\-]+)/g,
    "\\sqrt{$1}"
  );

  // Greek letters
  const greek = {
    α: "\\alpha",
    β: "\\beta",
    γ: "\\gamma",
    δ: "\\delta",
    ε: "\\epsilon",
    θ: "\\theta",
    λ: "\\lambda",
    μ: "\\mu",
    π: "\\pi",
    ρ: "\\rho",
    σ: "\\sigma",
    φ: "\\phi",
    ω: "\\omega",
    Δ: "\\Delta",
    Ω: "\\Omega",
    Σ: "\\Sigma",
    Π: "\\Pi",
    Φ: "\\Phi",
  };

  Object.entries(greek).forEach(([symbol, latex]) => {
    result = result.replaceAll(symbol, latex);
  });

  return result;
}

/* -------------------------------------------------------
   LATEX DETECTION
------------------------------------------------------- */

function containsLatex(text) {
  return (
    /\\(?:frac|sqrt|text|mathrm|mathbf|times|div|pm|cdot|Omega|alpha|beta|gamma|delta|theta|lambda|mu|pi|rho|sigma|phi|omega|Delta|Sigma|Pi|Phi)\b/.test(
      text
    ) ||
    /_[{]?[A-Za-z0-9.+-]+[}]?/.test(text) ||
    /\^[{]?-?[A-Za-z0-9.+-]+[}]?/.test(text)
  );
}

/* -------------------------------------------------------
   BALANCED LATEX READING
------------------------------------------------------- */

/*
  Finds a LaTeX command and consumes its arguments.

  Example:
  \frac{R_1}{R_2}

  or:

  \sqrt{x+1}
*/

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

/* -------------------------------------------------------
   RAW LATEX SEGMENT DETECTOR
------------------------------------------------------- */

function findLatexSegment(text, startIndex) {
  const commandMatch = text.slice(startIndex).match(
    /^\\(?:frac|sqrt|text|mathrm|mathbf|times|div|pm|cdot|Omega|alpha|beta|gamma|delta|theta|lambda|mu|pi|rho|sigma|phi|omega|Delta|Sigma|Pi|Phi)/
  );

  if (!commandMatch) {
    return null;
  }

  const command = commandMatch[0];

  let position = startIndex + command.length;

  /*
    Commands such as:
    \times
    \Omega
    \alpha

    do not need braces.
  */
  if (
    [
      "\\times",
      "\\div",
      "\\pm",
      "\\cdot",
      "\\Omega",
      "\\alpha",
      "\\beta",
      "\\gamma",
      "\\delta",
      "\\theta",
      "\\lambda",
      "\\mu",
      "\\pi",
      "\\rho",
      "\\sigma",
      "\\phi",
      "\\omega",
      "\\Delta",
      "\\Sigma",
      "\\Pi",
      "\\Phi",
    ].includes(command)
  ) {
    return {
      text: command,
      end: position,
    };
  }

  /*
    Commands such as:
    \frac{1}{2}
    \sqrt{x}
    \text{cm}
    \mathrm{kg}
  */

  if (text[position] === "{") {
    const first = readBalanced(text, position);

    position = first.end;

    let second = null;

    if (command === "\\frac" && text[position] === "{") {
      second = readBalanced(text, position);
      position = second.end;
    }

    if (second) {
      return {
        text:
          command +
          "{" +
          first.value +
          "}{" +
          second.value +
          "}",
        end: position,
      };
    }

    return {
      text: command + "{" + first.value + "}",
      end: position,
    };
  }

  return null;
}

/* -------------------------------------------------------
   RAW LATEX + NORMAL TEXT PARSER
------------------------------------------------------- */

function parseMixedContent(text) {
  const parts = [];

  let normalText = "";
  let i = 0;

  const flushText = () => {
    if (normalText) {
      parts.push({
        type: "text",
        value: normalText,
      });

      normalText = "";
    }
  };

  while (i < text.length) {
    /*
      Explicit inline LaTeX:
      \( ... \)
    */
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

    /*
      Explicit block LaTeX:
      \[ ... \]
    */
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

    /*
      Raw LaTeX command.
    */
    if (text[i] === "\\") {
      const segment = findLatexSegment(text, i);

      if (segment) {
        /*
          If there is a normal word immediately before
          the LaTeX command, keep it separate.
        */
        flushText();

        parts.push({
          type: "inline",
          value: segment.text,
        });

        i = segment.end;
        continue;
      }
    }

    /*
      Subscripts:
      R_1
      x_2
    */

    const subscriptMatch = text
      .slice(i)
      .match(/^([A-Za-zΑ-Ωα-ω])_([A-Za-z0-9]+)/);

    if (subscriptMatch) {
      flushText();

      parts.push({
        type: "inline",
        value: `${subscriptMatch[1]}_{${subscriptMatch[2]}}`,
      });

      i += subscriptMatch[0].length;
      continue;
    }

    /*
      Powers:
      x^2
      10^-4
    */

    const powerMatch = text
      .slice(i)
      .match(/^([A-Za-z0-9)])\^(-?[A-Za-z0-9.+-]+)/);

    if (powerMatch) {
      flushText();

      parts.push({
        type: "inline",
        value: `${powerMatch[1]}^{${powerMatch[2]}}`,
      });

      i += powerMatch[0].length;
      continue;
    }

    normalText += text[i];
    i++;
  }

  flushText();

  return parts;
}

/* -------------------------------------------------------
   RENDER EXPLICIT $...$ CONTENT
------------------------------------------------------- */

function renderDelimitedContent(text, keyPrefix) {
  const parts = text.split(
    /(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g
  );

  return parts.map((part, index) => {
    if (!part) return null;

    const key = `${keyPrefix}-${index}`;

    if (
      part.startsWith("$$") &&
      part.endsWith("$$")
    ) {
      return (
        <BlockMath
          key={key}
          math={part.slice(2, -2).trim()}
        />
      );
    }

    if (
      part.startsWith("$") &&
      part.endsWith("$")
    ) {
      return (
        <InlineMath
          key={key}
          math={part.slice(1, -1).trim()}
        />
      );
    }

    return (
      <React.Fragment key={key}>
        {renderNormalText(part, key)}
      </React.Fragment>
    );
  });
}

/* -------------------------------------------------------
   RENDER NORMAL / MIXED TEXT
------------------------------------------------------- */

function renderNormalText(text, keyPrefix) {
  if (!text) return null;

  const parsed = parseMixedContent(text);

  return parsed.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.type === "block") {
      return (
        <BlockMath
          key={key}
          math={part.value.trim()}
        />
      );
    }

    if (part.type === "inline") {
      let math = part.value;

      /*
        Convert simple Unicode/plain math before KaTeX.
      */
      math = convertPlainMath(math);

      return (
        <InlineMath
          key={key}
          math={math.trim()}
        />
      );
    }

    /*
      Normal text.

      Keep Unicode × as a normal readable symbol.
      Do NOT turn every asterisk into multiplication.
    */
    return (
      <React.Fragment key={key}>
        {part.value}
      </React.Fragment>
    );
  });
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

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

  let text = String(children);

  text = escapeText(text);

  /*
    Clean accidental duplicate "Explanation".
    This does NOT change mathematical content.
  */
  text = text.replace(
    /\bExplanation\s+Explanation\s*:/gi,
    "Explanation:"
  );

  text = text.replace(
    /\bExplanationExplanation\s*:/gi,
    "Explanation:"
  );

  /*
    Normalize line endings.
  */
  text = text.replace(/\r\n/g, "\n");

  /*
    If the entire content is explicitly wrapped
    in $$...$$, render it as a block.
  */
  if (
    text.trim().startsWith("$$") &&
    text.trim().endsWith("$$")
  ) {
    return (
      <span className={`math-text ${className}`}>
        <BlockMath
          math={text.trim().slice(2, -2).trim()}
        />
      </span>
    );
  }

  /*
    If content contains explicit $...$ or $$...$$,
    let the delimiter renderer handle it.
  */
  if (
    /(\$\$[\s\S]*?\$\$|\$[^$]+\$)/.test(text)
  ) {
    return (
      <span className={`math-text ${className}`}>
        {renderDelimitedContent(text, "math")}
      </span>
    );
  }

  /*
    Everything else goes through the mixed parser.
  */
  return (
    <span className={`math-text ${className}`}>
      {renderNormalText(text, "mixed")}
    </span>
  );
}