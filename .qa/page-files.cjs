// Keep the playable page and its stylesheet separate, including after a rebuild.
const fs = require('node:fs');
const path = require('node:path');
const stylesheet = 'codebreakers_tripleA_cinematic_polish_v3.css';
const sectionPattern = /\/\* @page-style ([^\n]+) \*\/\n([\s\S]*?)\n\/\* @end-page-style \*\//g;

function readSections(css) {
  // Git may check text files out with CRLF on Windows.
  return [...css.replace(/\r\n?/g, '\n').matchAll(sectionPattern)].map(m => ({ id: m[1], css: m[2] }));
}

// The original builder expects inline base styles. Restore them in memory only;
// the generated HELM styles are recreated from their existing source files.
function hydrate(html, directory = process.cwd()) {
  const link = /<link\b[^>]*\bid="page-styles"[^>]*>/i;
  if (!link.test(html)) return html;
  const css = fs.readFileSync(path.join(directory, stylesheet), 'utf8');
  const sections = readSections(css).filter(s => !s.id.startsWith('helm-'));
  if (!sections.length) throw new Error('The page stylesheet contains no base styles.');
  return html.replace(link, () => sections.map(s => '<style id="' + s.id + '">\n' + s.css + '\n</style>').join('\n'));
}

// Format declarations without touching quoted strings, URLs or embedded data.
function formatCss(source) {
  let output = '', indent = 0, parentheses = 0, quote = '', comment = false;
  const line = () => { output = output.trimEnd() + '\n' + '  '.repeat(indent); };
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (comment) {
      output += c;
      if (c === '*' && next === '/') { output += next; i++; comment = false; }
      continue;
    }
    if (quote) {
      output += c;
      if (c === '\\' && next) { output += next; i++; }
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && next === '*') { output += '/*'; i++; comment = true; continue; }
    if (c === '"' || c === "'") { quote = c; output += c; continue; }
    if (c === '(') parentheses++;
    if (c === ')') parentheses--;
    if (!parentheses && c === '{') { output = output.trimEnd() + ' {'; indent++; line(); }
    else if (!parentheses && c === '}') { indent = Math.max(0, indent - 1); line(); output += '}'; line(); }
    else if (!parentheses && c === ';') { output += c; line(); }
    else if (/\s/.test(c)) { if (output && !/\s$/.test(output)) output += ' '; }
    else output += c;
  }
  return output.trim() + '\n';
}

// Preserve mixed inline content and raw script/editor/SVG contents exactly.
// Only structural tag boundaries receive newlines and indentation.
function formatHtml(html) {
  const tokens = html.match(/<(script|pre|textarea|svg)\b[^>]*>[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+|</gi) || [];
  const structural = /^(html|head|body|section|div|aside|header|footer|main|nav|article|form|fieldset|details|summary|ul|ol|li|dl|dt|dd|table|thead|tbody|tr|th|td|h[1-6]|p|meta|link|audio|script|svg)$/i;
  const voidTag = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
  let depth = 0, output = '', previous = null;
  for (const token of tokens) {
    const match = token.match(/^<(\/?)([\w-]+)/);
    const tag = match?.[2] || '', closing = match?.[1] === '/';
    const raw = /^(script|pre|textarea|svg)$/i.test(tag) && !closing;
    const comment = token.startsWith('<!--') || token.startsWith('<!');
    const whitespace = /^\s+$/.test(token);
    if (whitespace) { if (output && !/\s$/.test(output)) output += ' '; continue; }
    if (closing) depth = Math.max(0, depth - 1);
    const boundary = comment || (match && structural.test(tag) && !closing) ||
      (previous && (previous.comment || previous.structural && (previous.closing || previous.voidTag || previous.raw))) ||
      (closing && previous?.tag && structural.test(previous.tag));
    if (boundary && output.trim()) output = output.trimEnd() + '\n' + '  '.repeat(depth);
    output += boundary ? token.trimStart() : token;
    if (match && !closing && !raw && !voidTag.test(tag) && !/\/>$/.test(token)) depth++;
    previous = { tag, closing, raw, comment, structural: structural.test(tag), voidTag: voidTag.test(tag) };
  }
  return output.trim() + '\n';
}

function organize(html) {
  // One authoritative value per metadata name.
  for (const name of ['description', 'theme-color']) {
    const pattern = new RegExp('<meta\\b(?=[^>]*\\bname="' + name + '")[^>]*>', 'gi');
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 1) {
      const keep = matches[matches.length - 1].index;
      html = html.replace(pattern, (tag, offset) => offset === keep ? tag : '');
    }
  }
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>CodeBreakers: NULL Protocol \u2014 Interactive Planet Missions</title>');
  const sections = [];
  let anonymous = 0;
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) => {
    const id = attrs.match(/\bid="([^"]+)"/)?.[1] || 'base-' + (++anonymous);
    sections.push({ id, css });
    return '';
  });
  if (!sections.length) throw new Error('No styles were found to organize.');
  const css = '/* CodeBreakers stylesheet. Sections retain the original cascade order.\n' +
    '   Keep this file beside the HTML page for offline play. */\n\n' +
    sections.map(s => '/* @page-style ' + s.id + ' */\n' + formatCss(s.css).trimEnd() + '\n/* @end-page-style */').join('\n\n') + '\n';
  html = html.replace(/<\/head>/i, '  <link id="page-styles" rel="stylesheet" href="' + stylesheet + '">\n</head>');
  return { html: formatHtml(html), css };
}

module.exports = { hydrate, organize, stylesheet, formatCss, formatHtml };
