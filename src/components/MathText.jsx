import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

function escapeLatexText(text) {
  return text
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/#/g, "\\#");
}

function convertPlainMath(text) {
  let result = text;

  // Multiplication
  result = result.replace(/\s*\*\s*/g, " × ");

  // Subscripts: P_2, x_1, V_max
  result = result.replace(
    /([A-Za-zΑ-Ωα-ω])_([A-Za-z0-9]+)/g,
    "$1_{$2}"
  );

  // Exponents: 10^-4, x^2, r^2
  result = result.replace(
    /([A-Za-z0-9)])\^(-?[A-Za-z0-9]+)/g,
    "$1^{$2}"
  );

  // Common square-root notation
  result = result.replace(
    /√\s*\(?([A-Za-z0-9.+\-]+)\)?/g,
    "\\sqrt{$1}"
  );

  // Greek symbols commonly found in question banks
  const greek = {
    "α": "\\alpha",
    "β": "\\beta",
    "γ": "\\gamma",
    "δ": "\\delta",
    "θ": "\\theta",
    "λ": "\\lambda",
    "μ": "\\mu",
    "π": "\\pi",
    "ρ": "\\rho",
    "σ": "\\sigma",
    "φ": "\\phi",
    "ω": "\\omega",
    "Δ": "\\Delta",
    "Ω": "\\Omega",
  };

  Object.entries(greek).forEach(([symbol, latex]) => {
    result = result.replaceAll(symbol, `\\${latex.slice(1)}`);
  });

  return result;
}

function renderPart(part, index) {
  const trimmed = part.trim();

  if (!trimmed) {
    return null;
  }

  // Block math: $$ ... $$
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
    const latex = trimmed.slice(2, -2).trim();

    return (
      <BlockMath
        key={index}
        math={latex}
      />
    );
  }

  // Inline math: $ ... $
  if (trimmed.startsWith("$") && trimmed.endsWith("$")) {
    const latex = trimmed.slice(1, -1).trim();

    return (
      <InlineMath
        key={index}
        math={latex}
      />
    );
  }

  return (
    <React.Fragment key={index}>
      {convertPlainMath(trimmed)}
    </React.Fragment>
  );
}

export default function MathText({ children, className = "" }) {
  if (children === null || children === undefined) {
    return null;
  }

  const text = String(children);

  // Split explicit KaTeX blocks while preserving them
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g);

  return (
    <span className={`math-text ${className}`}>
      {parts.map((part, index) => renderPart(part, index))}
    </span>
  );
}