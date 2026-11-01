import assert from 'node:assert/strict';
import { test } from 'node:test';
import { highlightSource, tokenizeSource } from '../site/src/highlight.ts';

test('highlighting is lossless across Markdown, YAML, line endings and unknown formats', () => {
  const samples = [
    ['', 'empty.md'],
    ['---\r\nname: sample\r\ndescription: >\r\n  # literal heading\r\n---\r\n# Heading\r\n**bold** and `code` [link](https://example.com)', 'SKILL.md'],
    ['# comment\nlist:\n  - true\nquoted: "a # value"\nbody: |\n  literal: false\nnext: 42\n', 'entry.yaml'],
    ['# Heading\r\n\r\n~~~yaml\r\nkey: false\r\n~~~\r\n', 'notes.MD'],
    ['a:\r  - yes\r', 'data.yml'],
    ['<script>example()</script>\n', 'code.js'],
  ];
  for (const [text, path] of samples) assert.equal(tokenizeSource(text, path).map((t) => t.text).join(''), text);
});

test('Markdown frontmatter, headings, links and fenced code keep separate syntax contexts', () => {
  const tokens = tokenizeSource('---\nname: sample\n---\n# Hello\n**bold** and `code` [link](https://example.com)\n```text\n# not a heading\n```\n~~~yaml\nkey: true\n~~~\n', 'SKILL.md');
  assert.ok(tokens.some((t) => t.kind === 'key' && t.text === 'name'));
  assert.ok(tokens.some((t) => t.kind === 'heading' && t.text === '# Hello'));
  assert.ok(tokens.some((t) => t.kind === 'strong' && t.text === '**bold**'));
  assert.ok(tokens.some((t) => t.kind === 'link' && t.text === '[link](https://example.com)'));
  assert.ok(tokens.some((t) => t.kind === 'code' && t.text === '# not a heading'));
  assert.ok(tokens.some((t) => t.kind === 'key' && t.text === 'key'));
});

test('YAML quoted hashes and block scalar contents are not parsed as comments or keys', () => {
  const tokens = tokenizeSource('"quoted key": "a # value" # comment\nbody: |\n  # literal comment\n  key: false\nnext: true\n', 'entry.yaml');
  assert.ok(tokens.some((t) => t.kind === 'key' && t.text === '"quoted key"'));
  assert.ok(tokens.some((t) => t.kind === 'string' && t.text === '"a # value"'));
  assert.ok(tokens.some((t) => t.kind === 'comment' && t.text === '# comment'));
  assert.ok(tokens.some((t) => t.kind === 'string' && t.text === '  key: false'));
  assert.ok(tokens.some((t) => t.kind === 'literal' && t.text === 'true'));
});

test('untrusted source is always escaped, including Markdown links and unknown files', () => {
  for (const path of ['attack.md', 'attack.yaml', 'attack.html']) {
    const html = highlightSource('<img src=x onerror="alert(1)"> & [click](javascript:alert(1))', path);
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('<a'));
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&quot;'));
    assert.ok(html.includes('&amp;'));
  }
  assert.equal(highlightSource('<b>x</b>', 'unknown.txt'), '&lt;b&gt;x&lt;/b&gt;');
  assert.deepEqual(tokenizeSource('#'.repeat(200_001), 'large.md'), [{ text: '#'.repeat(200_001) }]);
  const longLine = '['.repeat(5_000) + '\n';
  assert.deepEqual(tokenizeSource(longLine, 'generated.md'), [{ text: longLine }]);
});

test('shell highlights comments, keywords, variables and operators without changing text', () => {
  const source = '#!/usr/bin/env bash\r\nset -euo pipefail\r\nname=value\r\nif [ "$name" = true ]; then\r\n  printf \'%s\\n\' "${name}" # comment\r\nfi\r\necho foo#bar \\#literal\r\n';
  const tokens = tokenizeSource(source, 'setup.sh');
  assert.equal(tokens.map((t) => t.text).join(''), source);
  assert.ok(tokens.some((t) => t.kind === 'comment' && t.text === '#!/usr/bin/env bash'));
  assert.ok(tokens.some((t) => t.kind === 'keyword' && t.text === 'then'));
  assert.ok(tokens.some((t) => t.kind === 'variable' && t.text === '$name'));
  assert.ok(tokens.some((t) => t.kind === 'variable' && t.text === '${name}'));
  assert.ok(tokens.some((t) => t.kind === 'builtin' && t.text === 'printf'));
  assert.ok(!tokens.some((t) => t.kind === 'comment' && /bar|literal/.test(t.text)));
});

test('shell multiline quotes and heredocs keep literal content out of command context', () => {
  const source = 'echo "first\n$name # quoted"\necho \'$literal\n# still quoted\'\ncat <<-\'EOF\'\n\tif <img onerror="boom">\n\tEOF\nexit 0\n';
  const tokens = tokenizeSource(source, 'template.SH');
  assert.equal(tokens.map((t) => t.text).join(''), source);
  assert.ok(tokens.some((t) => t.kind === 'string' && t.text.includes('# still quoted')));
  assert.ok(tokens.some((t) => t.kind === 'string' && t.text === '\tif <img onerror="boom">'));
  assert.ok(tokens.some((t) => t.kind === 'builtin' && t.text === 'exit'));
  const html = highlightSource(source, 'template.sh');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});
