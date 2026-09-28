// CRAP requires observed coverage: uninstrumented functions are reported separately, not assigned invented 0% coverage.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache',
]);
const EXTENSIONS = new Set(['.ts', '.tsx']);

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }
  return files;
}

function normalise(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function parseLcov(filePath) {
  const coverage = new Map();
  if (!fs.existsSync(filePath)) return coverage;

  let current = null;
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (raw.startsWith('SF:')) {
      current = normalise(raw.slice(3));
      if (path.isAbsolute(current)) current = normalise(path.relative(ROOT, current));
      if (!coverage.has(current)) coverage.set(current, new Map());
      continue;
    }
    if (raw === 'end_of_record') {
      current = null;
      continue;
    }
    if (!current || !raw.startsWith('DA:')) continue;
    const [lineText, hitsText] = raw.slice(3).split(',');
    const line = Number(lineText);
    const hits = Number(hitsText);
    if (!Number.isFinite(line) || !Number.isFinite(hits)) continue;
    const lines = coverage.get(current);
    lines.set(line, Math.max(lines.get(line) ?? 0, hits));
  }
  return coverage;
}

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node);
}

function functionName(node, sourceFile) {
  if (node.name?.getText) return node.name.getText(sourceFile);
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && parent.name) return parent.name.getText(sourceFile);
  if (ts.isPropertyAssignment(parent) && parent.name) return parent.name.getText(sourceFile);
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  return `<anonymous>@${line}`;
}

function decisionIncrement(node) {
  if (
    ts.isIfStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isCatchClause(node) ||
    ts.isConditionalExpression(node)
  ) return 1;

  if (ts.isCaseClause(node)) return 1;

  if (
    ts.isBinaryExpression(node) &&
    [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
    ].includes(node.operatorToken.kind)
  ) return 1;

  return 0;
}

function complexityOf(functionNode) {
  let complexity = 1;
  function visit(node) {
    if (node !== functionNode && isFunctionLike(node)) return;
    complexity += decisionIncrement(node);
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(functionNode, visit);
  return complexity;
}

function coverageFor(lines, startLine, endLine) {
  if (!lines) return { ratio: 0, status: 'unavailable', instrumented: 0 };
  let instrumented = 0;
  let covered = 0;
  for (const [line, hits] of lines) {
    if (line < startLine || line > endLine) continue;
    instrumented += 1;
    if (hits > 0) covered += 1;
  }
  return {
    ratio: instrumented ? covered / instrumented : 0,
    status: instrumented ? (covered ? 'measured' : 'uncovered') : 'unavailable',
    instrumented,
  };
}

function crap(complexity, coverage) {
  return complexity ** 2 * (1 - coverage) ** 3 + complexity;
}

const lcov = parseLcov(path.join(ROOT, 'coverage', 'lcov.info'));
const scored = [];

for (const absolute of walk(ROOT)) {
  const relative = normalise(path.relative(ROOT, absolute));
  const sourceText = fs.readFileSync(absolute, 'utf8');
  const sourceFile = ts.createSourceFile(
    relative,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    relative.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const coverageLines = lcov.get(relative);

  function collect(node) {
    if (isFunctionLike(node)) {
      const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
      const complexity = complexityOf(node);
      const coverage = coverageFor(coverageLines, startLine, endLine);
      scored.push({
        file: relative,
        function: functionName(node, sourceFile),
        start_line: startLine,
        end_line: endLine,
        complexity,
        coverage: Number(coverage.ratio.toFixed(4)),
        coverage_status: coverage.status,
        instrumented_lines: coverage.instrumented,
        crap: Number(crap(complexity, coverage.ratio).toFixed(2)),
      });
    }
    ts.forEachChild(node, collect);
  }
  collect(sourceFile);
}

scored.sort((a, b) =>
  b.crap - a.crap ||
  b.complexity - a.complexity ||
  a.file.localeCompare(b.file) ||
  a.start_line - b.start_line
);

const measured = scored.filter((row) => row.instrumented_lines > 0);
const unmeasured = scored
  .filter((row) => row.instrumented_lines === 0)
  .sort((a, b) =>
    b.complexity - a.complexity ||
    a.file.localeCompare(b.file) ||
    a.start_line - b.start_line
  );

const result = {
  audit_method: 'TypeScript compiler AST + LCOV CRAP',
  files_scanned: new Set(scored.map((row) => row.file)).size,
  functions_scored: scored.length,
  measured_functions: measured.length,
  unmeasured_functions: unmeasured.length,
  headline_crap: measured[0]?.crap ?? null,
  worst: measured[0] ?? null,
  top: measured.slice(0, 25),
  unmeasured_top: unmeasured.slice(0, 25),
};
console.log('TS_CRAP4ALL_RESULT=' + JSON.stringify(result));

if (result.headline_crap !== null && result.headline_crap >= 30) {
  console.log(`TS_CRAP4ALL_GATE=FAIL headline=${result.headline_crap} threshold=<30`);
  process.exit(1);
}
console.log(`TS_CRAP4ALL_GATE=PASS headline=${result.headline_crap} threshold=<30`);
