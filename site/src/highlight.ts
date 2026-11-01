/** Small, lossless lexical highlighter: no Markdown rendering or executable HTML. */
export interface SourceToken {
  kind?: 'heading' | 'marker' | 'code' | 'strong' | 'link' | 'comment' | 'key' | 'string' | 'literal' | 'keyword' | 'variable' | 'builtin';
  text: string;
}

const plain = (text: string): SourceToken => ({ text });

interface ShellState {
  quote?: "'" | '"';
  heredocs: { delimiter: string; stripTabs: boolean }[];
  inHeredoc?: boolean;
}

function shellLine(line: string, state: ShellState): SourceToken[] {
  if (state.inHeredoc) {
    const doc = state.heredocs[0];
    if ((doc.stripTabs ? line.replace(/^\t+/, '') : line) === doc.delimiter) {
      state.heredocs.shift();
      state.inHeredoc = state.heredocs.length > 0;
      return [{ kind: 'marker', text: line }];
    }
    return [{ kind: 'string', text: line }];
  }
  const out: SourceToken[] = [];
  const add = (text: string, kind?: SourceToken['kind']) => {
    const last = out.at(-1);
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let cursor = 0;
  while (cursor < line.length) {
    const char = line[cursor];
    const rest = line.slice(cursor);
    if (char === '\\' && state.quote !== "'") {
      add(line.slice(cursor, cursor + 2), state.quote ? 'string' : undefined);
      cursor += 2;
      continue;
    }
    if (state.quote === "'") {
      add(char, 'string');
      if (char === "'") state.quote = undefined;
      cursor++;
      continue;
    }
    if (char === '$') {
      const variable = /^\$(?:\{[^}]*\}|[A-Za-z_][\w]*|\d+|[?#$!@*_-])/.exec(rest);
      if (variable) {
        add(variable[0], 'variable');
        cursor += variable[0].length;
        continue;
      }
    }
    if (state.quote === '"') {
      add(char, 'string');
      if (char === '"') state.quote = undefined;
      cursor++;
      continue;
    }
    if (char === "'" || char === '"') {
      state.quote = char;
      add(char, 'string');
      cursor++;
      continue;
    }
    if (char === '#' && (cursor === 0 || /[\s;|&()]/.test(line[cursor - 1]))) {
      add(rest, 'comment');
      break;
    }
    const heredoc = /^<<(-?)(?!<)\s*(['"]?)([A-Za-z_][\w]*)\2/.exec(rest);
    if (heredoc) {
      state.heredocs.push({ delimiter: heredoc[3], stripTabs: heredoc[1] === '-' });
      add(heredoc[0], 'marker');
      cursor += heredoc[0].length;
      continue;
    }
    const operator = /^(?:&&|\|\||>>|<<|;;|[;|&<>(){}])/.exec(rest);
    const word = /^[A-Za-z_][\w-]*|^\d+\b/.exec(rest);
    if (operator) {
      add(operator[0], 'marker');
      cursor += operator[0].length;
    } else if (word) {
      const value = word[0];
      const kind = /^(?:if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|select|time)$/.test(value) ? 'keyword'
        : /^(?:echo|printf|read|export|local|readonly|return|exit|source|set|unset|shift|trap|test|exec|cd|pwd|command|eval|break|continue)$/.test(value) ? 'builtin'
        : line[cursor + value.length] === '=' ? 'variable' : /^\d/.test(value) ? 'literal' : undefined;
      add(value, kind);
      cursor += value.length;
    } else {
      add(char);
      cursor++;
    }
  }
  if (!state.quote && state.heredocs.length) state.inHeredoc = true;
  return out;
}

function yamlLine(line: string): SourceToken[] {
  // Quoted strings consume their # characters before comments are considered.
  const pattern = /"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|(?:^|(?<=\s))#[^\r\n]*|[\w.-]+(?=\s*:(?:\s|$|[\[\]{},]))|\b(?:true|false|null|yes|no|on|off)\b|[+-]?\b\d+(?:\.\d+)?\b|^[ \t]*(?:---|\.\.\.)(?=\s|$)|[{}\[\],]|(?:^|(?<=\s))[-?:](?=\s|$)|[|>][-+]?\d?(?=\s|$)/gi;
  const out: SourceToken[] = [];
  let cursor = 0;
  for (const match of line.matchAll(pattern)) {
    const start = match.index;
    const value = match[0];
    out.push(plain(line.slice(cursor, start)));
    let kind: SourceToken['kind'];
    if (value.startsWith('#')) kind = 'comment';
    else if (/^["']/.test(value)) kind = /^\s*:/.test(line.slice(start + value.length)) ? 'key' : 'string';
    else if (/^\s*:/.test(line.slice(start + value.length))) kind = 'key';
    else if (/^(?:true|false|null|yes|no|on|off|[+-]?\d)/i.test(value)) kind = 'literal';
    else kind = 'marker';
    out.push({ kind, text: value });
    cursor = start + value.length;
  }
  out.push(plain(line.slice(cursor)));
  return out;
}

function markdownLine(line: string): SourceToken[] {
  if (/^ {0,3}#{1,6}\s/.test(line)) return [{ kind: 'heading', text: line }];
  const out: SourceToken[] = [];
  const marker = /^(?:\s*(?:[-+*]|\d+[.)])\s+|\s*>\s?)/.exec(line);
  let cursor = 0;
  if (marker) {
    out.push({ kind: 'marker', text: marker[0] });
    cursor = marker[0].length;
  }
  const rest = line.slice(cursor);
  const pattern = /(`+)[^`]*?\1|\*\*[^*]+\*\*|__[^_]+__|!?\[[^\]\r\n]*\]\([^\)\r\n]*\)|<https?:\/\/[^>\r\n]+>/g;
  let inlineCursor = 0;
  for (const match of rest.matchAll(pattern)) {
    out.push(plain(rest.slice(inlineCursor, match.index)));
    const value = match[0];
    const kind = value.startsWith('`') ? 'code' : /^(?:\*\*|__)/.test(value) ? 'strong' : 'link';
    out.push({ kind, text: value });
    inlineCursor = match.index + value.length;
  }
  out.push(plain(rest.slice(inlineCursor)));
  return out;
}

export function tokenizeSource(source: string, path: string): SourceToken[] {
  const yaml = /\.ya?ml$/i.test(path);
  const markdown = /\.md$/i.test(path);
  const shell = /\.sh$/i.test(path);
  // Large and unsupported files remain cheap, selectable plain text.
  if ((!yaml && !markdown && !shell) || source.length > 200_000) return [plain(source)];
  const lines = source.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g)?.filter(Boolean) ?? [];
  const out: SourceToken[] = [];
  let frontmatter = false;
  let fence: { char: string; length: number; yaml: boolean } | undefined;
  let scalarIndent: number | undefined;
  const shellState: ShellState = { heredocs: [] };
  for (const [index, raw] of lines.entries()) {
    const line = raw.replace(/[\r\n]+$/, '');
    const ending = raw.slice(line.length);
    // Bound regex work on generated data and malformed delimiter-heavy lines.
    if (line.length > 2_000) {
      out.push(plain(raw));
      continue;
    }
    if (shell) {
      out.push(...shellLine(line, shellState), plain(ending));
      continue;
    }
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (markdown && !fence && ((index === 0 && line === '---') || (frontmatter && /^(---|\.\.\.)$/.test(line)))) {
      frontmatter = !frontmatter;
      scalarIndent = undefined;
      out.push({ kind: 'marker', text: line });
    } else if (markdown && delimiter && (!fence || delimiter[1][0] === fence.char && delimiter[1].length >= fence.length && !delimiter[2].trim())) {
      fence = fence ? undefined : { char: delimiter[1][0], length: delimiter[1].length, yaml: /^ya?ml$/i.test(delimiter[2].trim()) };
      scalarIndent = undefined;
      out.push({ kind: 'marker', text: line });
    } else if (yaml || frontmatter || fence?.yaml) {
      const indent = /^\s*/.exec(line)![0].length;
      if (scalarIndent !== undefined && (!line.trim() || indent > scalarIndent)) {
        out.push({ kind: 'string', text: line });
      } else {
        scalarIndent = undefined;
        out.push(...yamlLine(line));
        if (/[:\-]\s*[|>][-+]?\d?\s*(?:#.*)?$/.test(line)) scalarIndent = indent;
      }
    } else if (fence) out.push({ kind: 'code', text: line });
    else out.push(...markdownLine(line));
    out.push(plain(ending));
  }
  return out;
}

export function highlightSource(source: string, path: string): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  return tokenizeSource(source, path).map(({ kind, text }) => kind && text
    ? `<span class="syntax-${kind}">${escape(text)}</span>` : escape(text)).join('');
}
