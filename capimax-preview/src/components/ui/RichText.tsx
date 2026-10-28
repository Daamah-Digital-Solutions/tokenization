import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Plain text written by owners/admins, laid out for reading (client round 4, #15).
 *
 * Understands the way descriptions are typed in the textarea — no markup needed:
 *   - a blank line starts a new paragraph
 *   - "# Title" / "## Title", or a short line ending in ":" on its own → heading
 *   - lines starting with "*", "-", "•" or "1." → bullet / numbered list
 *   - "Label: value" inside a list → the label in bold
 *   - **bold** anywhere
 * Text is rendered as React text (never HTML), so it is safe to show as-is.
 */

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: string[] };

const BULLET = /^\s*(?:[*•\-–]|\d+[.)])\s+/;
const ORDERED = /^\s*\d+[.)]\s+/;

const isHeading = (line: string) =>
  /^#{1,3}\s+\S/.test(line) || (line.length <= 80 && /[:：]$/.test(line) && !BULLET.test(line));

export function parseRichText(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', lines: paragraph });
    if (list) blocks.push({ kind: 'list', ...list });
    paragraph = [];
    list = null;
  };

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (BULLET.test(line)) {
      const ordered = ORDERED.test(line);
      if (paragraph.length || (list && list.ordered !== ordered)) flush();
      if (!list) list = { ordered, items: [] };
      list.items.push(line.replace(BULLET, ''));
      continue;
    }
    if (isHeading(line)) {
      flush();
      blocks.push({ kind: 'heading', text: line.replace(/^#{1,3}\s+/, '').replace(/[:：]$/, '') });
      continue;
    }
    if (list) flush();
    paragraph.push(line);
  }
  flush();
  return blocks;
}

function inline(text: string, key: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${key}-${i}`} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>
      : <React.Fragment key={`${key}-${i}`}>{part}</React.Fragment>,
  );
}

function listItem(text: string, key: string): React.ReactNode {
  const m = text.match(/^([^:：]{1,40})[:：]\s+(.+)$/);
  if (!m || m[1].includes('**')) return inline(text, key);
  return (
    <>
      <span className="font-semibold text-slate-900 dark:text-white">{m[1]}:</span> {inline(m[2], key)}
    </>
  );
}

export const RichText: React.FC<{ text?: string | null; className?: string }> = ({ text, className }) => {
  if (!text?.trim()) return null;
  const blocks = parseRichText(text);
  return (
    <div className={cn('space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed', className)} dir="auto">
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <h3 key={i} className="pt-2 text-lg font-semibold text-slate-900 dark:text-white">
              {inline(block.text, `h${i}`)}
            </h3>
          );
        }
        if (block.kind === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag
              key={i}
              className={cn('space-y-2 ps-5', block.ordered ? 'list-decimal' : 'list-disc marker:text-emerald-500')}
            >
              {block.items.map((item, j) => (
                <li key={j}>{listItem(item, `l${i}-${j}`)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {inline(line, `p${i}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

export default RichText;
