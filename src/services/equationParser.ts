// Extracted from ProgressiveAlignedEquation.tsx — no React/CSS deps so it works in Node pipelines
export interface TextNode { type: "text"; text: string; weight?: number; }
export interface FixedNode { type: "fixed"; text: string; weight?: number; }
export interface CommandNode { type: "command"; command: string; optionalArg: string | null; args: ASTNode[]; weight?: number; }
export interface ScriptedNode { type: "scripted"; base: ASTNode; sub?: ASTNode; sup?: ASTNode; weight?: number; }
export interface GroupNode { type: "group"; children: ASTNode[]; weight?: number; }
export interface EnvironmentNode { type: "environment"; env: string; envConfig: string | null; content: ASTNode[]; weight?: number; }
export interface LeftRightNode { type: "leftright"; left: string; content: ASTNode[]; right: string; weight?: number; }

export type ASTNode = TextNode | FixedNode | CommandNode | ScriptedNode | GroupNode | EnvironmentNode | LeftRightNode;

const commandSignatures: Record<string, number> = {
  frac: 2, dfrac: 2, tfrac: 2, cfrac: 2, binom: 2, dbinom: 2,
  overset: 2, underset: 2, stackrel: 2, rule: 2,
  color: 2, textcolor: 2, boxed: 1, cancel: 1, smash: 1,
  sqrt: 1, mathbf: 1, mathit: 1, mathrm: 1, mathbb: 1, mathcal: 1, boldsymbol: 1,
  mathscr: 1, mathfrak: 1, mathsf: 1, mathtt: 1,
  hat: 1, vec: 1, tilde: 1, bar: 1, overline: 1, underline: 1,
  underbrace: 1, overbrace: 1, check: 1, breve: 1, acute: 1, grave: 1,
  ddot: 1, mathring: 1, overrightarrow: 1,
  text: 1, operatorname: 1, hspace: 1, vspace: 1,
  sum: 0, prod: 0, int: 0, lim: 0
};

const structuralCommands = new Set<string>(["text", "hspace", "vspace", "rule", "operatorname"]);
const literalFirstArgCommands = new Set<string>(["color", "textcolor"]);
export const boundingCommands = new Set<string>(["cancel", "boxed", "smash"]);
const spacingCommands = new Set<string>(["quad", "qquad", ",", ";", ":", "!", " ", "enspace", "thinspace", "choose", "over"]);

export function smartSplitLines(equation: string): string[] {
  const lines: string[] = [];
  let currentLine = "", depth = 0, envDepth = 0, lrDepth = 0, i = 0;
  while (i < equation.length) {
    if (equation.startsWith("\\begin{", i)) { envDepth++; currentLine += "\\begin{"; i += 7; }
    else if (equation.startsWith("\\end{", i)) { envDepth = Math.max(0, envDepth - 1); currentLine += "\\end{"; i += 5; }
    else if (equation.startsWith("\\left", i)) { lrDepth++; currentLine += "\\left"; i += 5; }
    else if (equation.startsWith("\\right", i)) { lrDepth = Math.max(0, lrDepth - 1); currentLine += "\\right"; i += 6; }
    else if (equation[i] === "{") { depth++; currentLine += "{"; i++; }
    else if (equation[i] === "}") { depth = Math.max(0, depth - 1); currentLine += "}"; i++; }
    else if (depth === 0 && envDepth === 0 && lrDepth === 0 && equation.startsWith("\\\\", i)) {
      lines.push(currentLine.trim()); currentLine = ""; i += 2;
    } else if (equation[i] === "\\") {
      currentLine += "\\"; i++;
      if (i < equation.length) { currentLine += equation[i]; i++; }
    } else { currentLine += equation[i]; i++; }
  }
  if (currentLine.trim().length > 0) lines.push(currentLine.trim());
  return lines;
}

export function parseGroup(equation: string, index: number): [string, number] {
  let depth = 1, content = ""; index++;
  while (index < equation.length && depth > 0) {
    const ch = equation[index++];
    if (ch === "\\") { content += ch; if (index < equation.length) content += equation[index++]; continue; }
    if (ch === "{") { depth++; content += ch; }
    else if (ch === "}") { depth--; if (depth > 0) content += ch; }
    else { content += ch; }
  }
  return [content, index];
}

function parseDelimiter(equation: string, index: number): [string, number] {
  while (index < equation.length && /\s/.test(equation[index] || "")) index++;
  if (index >= equation.length) return ["", index];
  if (equation[index] === "\\") {
    let delim = "\\";
    index++;
    if (/[A-Za-z]/.test(equation[index] || "")) {
      while (index < equation.length && /[A-Za-z]/.test(equation[index] || "")) delim += equation[index++];
    } else { delim += equation[index++] || ""; }
    return [delim, index];
  }
  return [equation[index++], index];
}

function parseLeftRight(equation: string, index: number): [ASTNode, number] {
  const [leftDelim, mid1] = parseDelimiter(equation, index);
  index = mid1;
  const [children, mid2] = parseEquationRecursive(equation, index, true);
  index = mid2;
  while (index < equation.length && /\s/.test(equation[index] || "")) index++;

  if (!equation.startsWith("\\right", index)) return [{ type: "fixed", text: leftDelim, weight: 1 }, index];

  index += 6;
  const [rightDelim, endIdx] = parseDelimiter(equation, index);
  return [{ type: "leftright", left: leftDelim, content: children, right: rightDelim }, endIdx];
}

export function parseSingleArgument(equation: string, index: number): [ASTNode, number] {
  while (index < equation.length && /\s/.test(equation[index] || "")) index++;
  if (index >= equation.length) return [{ type: "text", text: "" }, index];

  const ch = equation[index];
  if (ch === "{") {
    const [g, nxt] = parseGroup(equation, index);
    const [inner] = parseEquationRecursive(g);
    return [inner.length === 1 ? inner[0] : { type: "group", children: inner }, nxt];
  }
  if (ch === "\\") {
    index++;
    let cmd = "";
    if (/[A-Za-z]/.test(equation[index] || "")) {
      while (index < equation.length && /[A-Za-z]/.test(equation[index] || "")) cmd += equation[index++];
    } else if (index < equation.length) {
      cmd = equation[index++];
    }
    if (spacingCommands.has(cmd)) return [{ type: "fixed", text: `\\${cmd}`, weight: 0 }, index];
    return [{ type: "fixed", text: `\\${cmd}`, weight: 1 }, index];
  }
  return [{ type: "text", text: ch }, index + 1];
}

export function parseEquationRecursive(equation: string, index: number = 0, stopAtRight: boolean = false): [ASTNode[], number] {
  const nodes: ASTNode[] = [];
  while (index < equation.length) {
    if (stopAtRight && equation.startsWith("\\right", index)) break;
    const ch = equation[index];
    if (ch === "\\") {
      index++; let cmd = "";
      if (/[A-Za-z]/.test(equation[index] || "")) { while (index < equation.length && /[A-Za-z]/.test(equation[index] || "")) cmd += equation[index++]; }
      else if (index < equation.length) cmd = equation[index++];

      if (cmd === "\\") nodes.push({ type: "fixed", text: "\\\\", weight: 0 });
      else if (cmd === "left") { const [node, nxt] = parseLeftRight(equation, index); nodes.push(node); index = nxt; }
      else if (cmd === "begin") {
        while (index < equation.length && /\s/.test(equation[index] || "")) index++;
        let env = "";
        if (equation[index] === "{") { const [g, nxt] = parseGroup(equation, index); env = g; index = nxt; }

        let envConfig: string | null = null;
        if (["array", "tabular", "alignat", "alignat*"].includes(env)) {
          while (index < equation.length && /\s/.test(equation[index] || "")) index++;
          if (equation[index] === "{") {
            const [gConfig, nxtConfig] = parseGroup(equation, index);
            envConfig = gConfig; index = nxtConfig;
          }
        }

        const startTok = `\\begin{${env}}`;
        const endTok = `\\end{${env}}`;
        let envCount = 1, scanIdx = index, endIdx = -1;

        while (scanIdx < equation.length) {
          if (equation.startsWith(endTok, scanIdx)) {
            envCount--;
            if (envCount === 0) { endIdx = scanIdx; break; }
            scanIdx += endTok.length;
          } else if (equation.startsWith(startTok, scanIdx)) { envCount++; scanIdx += startTok.length; }
          else { scanIdx++; }
        }

        if (endIdx === -1) { nodes.push({ type: "fixed", text: `\\begin{${env}}` }); continue; }
        const inner = equation.slice(index, endIdx); index = endIdx + endTok.length;
        const [child] = parseEquationRecursive(inner);
        nodes.push({ type: "environment", env, envConfig, content: child });

      } else if (spacingCommands.has(cmd)) { nodes.push({ type: "fixed", text: `\\${cmd}`, weight: 0 }); }
      else if (commandSignatures[cmd] !== undefined) {
        const numArgs = commandSignatures[cmd]; let optionalArg: string | null = null;
        while (index < equation.length && /\s/.test(equation[index] || "")) index++;
        if (equation[index] === "[") { let optContent = ""; index++; while (index < equation.length && equation[index] !== "]") optContent += equation[index++]; index++; optionalArg = optContent; }
        const args: ASTNode[] = [];
        for (let i = 0; i < numArgs; i++) {
          const [argNode, nxt] = parseSingleArgument(equation, index);
          args.push(argNode); index = nxt;
        }
        nodes.push({ type: "command", command: cmd, optionalArg, args });
      } else nodes.push({ type: "fixed", text: `\\${cmd}`, weight: 1 });
    } else if (ch === "^" || ch === "_") {
      const op = ch; index++;
      const [argNode, nxt] = parseSingleArgument(equation, index);
      index = nxt;

      let prev: ASTNode | undefined = undefined;
      const trailingSpaces: ASTNode[] = [];
      while (nodes.length > 0) {
        const popped = nodes.pop()!;
        if (popped.type === "fixed" && /^\s+$/.test(popped.text)) { trailingSpaces.push(popped); }
        else { prev = popped; break; }
      }

      if (!prev) prev = { type: "text", text: "" };

      let newNode: ASTNode;
      if (prev.type === "scripted") {
         if (op === "_" && !prev.sub) { prev.sub = argNode; newNode = prev; }
         else if (op === "^" && !prev.sup) { prev.sup = argNode; newNode = prev; }
         else { newNode = op === "_" ? { type: "scripted", base: prev, sub: argNode } : { type: "scripted", base: prev, sup: argNode }; }
      } else {
          newNode = op === "_" ? { type: "scripted", base: prev, sub: argNode } : { type: "scripted", base: prev, sup: argNode };
      }

      nodes.push(newNode);
      nodes.push(...trailingSpaces.reverse());
    } else if (ch === "{") {
      const [g, nxt] = parseGroup(equation, index); index = nxt; const [inner] = parseEquationRecursive(g); nodes.push({ type: "group", children: inner });
    } else if (ch === "&") { nodes.push({ type: "fixed", text: "&", weight: 0 }); index++; }
    else if (ch === "}") { break; }
    else {
      const chStr = equation[index++];
      if (/\s/.test(chStr)) nodes.push({ type: "fixed", text: chStr, weight: 0 });
      else nodes.push({ type: "text", text: chStr });
    }
  }
  return [nodes, index];
}

export function parseEquation(equation: string): ASTNode[] { return parseEquationRecursive(equation, 0)[0]; }

export function totalReveal(node: ASTNode): number {
  switch (node.type) {
    case "text": return 1;
    case "fixed": return node.weight ?? 1;
    case "command":
      if (structuralCommands.has(node.command)) return 1;
      if (literalFirstArgCommands.has(node.command)) return 1 + (node.args.length > 1 ? totalReveal(node.args[1]) : 0);
      return 1 + node.args.reduce((s, a) => s + totalReveal(a), 0);
    case "scripted": return totalReveal(node.base) + (node.sub ? totalReveal(node.sub) : 0) + (node.sup ? totalReveal(node.sup) : 0);
    case "group": return node.children.reduce((s, c) => s + totalReveal(c), 0);
    case "environment": return 1 + node.content.reduce((s, c) => s + totalReveal(c), 0);
    case "leftright": return 1 + node.content.reduce((s, c) => s + totalReveal(c), 0);
    default: return 0;
  }
}
