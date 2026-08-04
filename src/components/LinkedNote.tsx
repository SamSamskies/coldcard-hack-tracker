import { createElement, type ReactNode } from 'react';
import { explorerAddressUrl, explorerTxUrl } from '../lib/mempool';

/**
 * Inline links resolved against the active explorer host when possible:
 * [label](address:bc1…), [label](txid:hex…), or [label](https://…).
 */
const LINK_RE =
  /\[([^\]]+)\]\((address:([^)]+)|txid:([0-9a-fA-F]{64})|https?:\/\/[^)]+)\)/g;

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
    const address = match[3];
    const txid = match[4];
    const href = address
      ? explorerAddressUrl(address)
      : txid
        ? explorerTxUrl(txid)
        : match[2];
    const mono = Boolean(address || txid);
    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noreferrer"
        className={mono ? 'mono note-link' : 'note-link'}
      >
        {label}
      </a>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));

  return createElement(as, { className }, nodes.length > 0 ? nodes : text);
}
