// A small reader for the Designer's own reference stylesheets, for the checks. Node
// built-ins only. It understands what those files contain: comments, style rules,
// @keyframes, and @media blocks that may be nested. It refuses anything else rather than
// guess, so a stylesheet edited into something surprising fails the check loudly.

/** Splits on a separator that is not inside parentheses, brackets or quotes. */
export function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const char of text) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth -= 1;
    } else if (depth === 0 && separator(char)) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map(part => part.trim()).filter(part => part !== '');
}

/**
 * Every style rule in a stylesheet as { selectors, declarations, media, source }, where
 * `media` lists the conditions of the @media blocks around it, outermost first, and each
 * declaration is [property, value]. Keyframes are returned apart as { name, steps }.
 */
export function parseStylesheet(text, file = 'stylesheet') {
  const source = text.replace(/\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, ' '));
  const rules = [];
  const keyframes = [];
  let position = 0;
  const lineAt = index => source.slice(0, index).split('\n').length;
  const fail = (message, index = position) => {
    throw new Error(`${file}:${lineAt(index)}: ${message}`);
  };

  function matching(open) {
    let depth = 0;
    let quote = null;
    for (let index = open; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return fail('a block is not closed', open);
  }

  const declarations = body => splitTopLevel(body, char => char === ';').map(line => {
    const colon = line.indexOf(':');
    if (colon < 0) fail(`not a declaration: ${line.slice(0, 40)}`);
    return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
  });

  function block(end, media) {
    while (position < end) {
      const open = source.indexOf('{', position);
      if (open < 0 || open > end) {
        if (source.slice(position, end).trim() !== '') fail(`text outside a rule: ${source.slice(position, end).trim().slice(0, 40)}`);
        position = end;
        return;
      }
      const prelude = source.slice(position, open).trim();
      const close = matching(open);
      const at = lineAt(open);
      if (prelude.startsWith('@media')) {
        position = open + 1;
        block(close, [...media, prelude.slice('@media'.length).trim()]);
      } else if (prelude.startsWith('@keyframes')) {
        const steps = [];
        let inner = open + 1;
        while (inner < close) {
          const stepOpen = source.indexOf('{', inner);
          if (stepOpen < 0 || stepOpen > close) break;
          const stepClose = matching(stepOpen);
          steps.push({ at: source.slice(inner, stepOpen).trim(), declarations: declarations(source.slice(stepOpen + 1, stepClose)) });
          inner = stepClose + 1;
        }
        keyframes.push({ name: prelude.slice('@keyframes'.length).trim(), steps, line: at });
      } else if (prelude.startsWith('@')) {
        fail(`${prelude.split(/\s/)[0]} is not used in the reference stylesheets`, open);
      } else {
        rules.push({ selectors: splitTopLevel(prelude, char => char === ','), declarations: declarations(source.slice(open + 1, close)), media, line: at });
      }
      position = close + 1;
    }
  }
  block(source.length, []);
  return { rules, keyframes };
}

/** The compound selectors of one complex selector, left to right, without combinators. */
export function compounds(selector) {
  // Outside brackets and parentheses, white space and > + ~ all separate compounds. Inside
  // them they do not: [data-art~="x"] and :has(> .y) are each part of one compound.
  return splitTopLevel(selector, char => /\s/.test(char) || char === '>' || char === '+' || char === '~');
}

/** Text without what is inside the parentheses of :has(), :not(), :is() and :where(). */
export function withoutArguments(compound) {
  let depth = 0;
  let out = '';
  for (const char of compound) {
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (depth === 0) out += char;
  }
  return out;
}
