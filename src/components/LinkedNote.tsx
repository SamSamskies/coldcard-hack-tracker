import { createElement, type ReactNode } from 'react';
import { explorerAddressUrl } from '../lib/mempool';

/** Inline links: [label](address:bc1…) or [label](https://…). */
const LINK_RE = /\[([^\]]+)\]\((address:([^)]+)|https?:\/\/[^)]+)\)/g;

type Props = {
  text: string;
  className?: string;
  as?: 'p' | 'span';
};

export function LinkedNote({ text, className, as = 'p' }: Props) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  LINK_RE.lastIndex = 0;
  while ((match = LINK_RE.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const label = match[1];
    const isAddress = Boolean(match[3]);
    const href = isAddress ? explorerAddressUrl(match[3]) : match[2];
    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noreferrer"
        className={isAddress ? 'mono note-link' : 'note-link'}
      >
        {label}
      </a>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));

  return createElement(as, { className }, nodes.length > 0 ? nodes : text);
}
