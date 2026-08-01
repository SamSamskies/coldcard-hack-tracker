import { describe, expect, it } from 'vitest';
import {
  formatBtc,
  formatHeldPercent,
  formatPercent,
  formatRelativeTime,
  formatUsd,
  truncateAddress,
} from '../lib/format';

describe('formatBtc', () => {
  it('keeps at least two decimals for round totals', () => {
    expect(formatBtc(1)).toBe('1.00');
  });

  it('preserves satoshi-level precision', () => {
    expect(formatBtc(0.50980268)).toBe('0.50980268');
  });

  it('returns an em dash for non-finite values', () => {
    expect(formatBtc(Number.NaN)).toBe('—');
  });
});

describe('formatUsd', () => {
  it('formats whole dollars', () => {
    expect(formatUsd(70_000_000)).toBe('$70,000,000');
  });
});

describe('formatHeldPercent', () => {
  it('shows 100% only when fully held', () => {
    expect(formatHeldPercent(100, true)).toBe('100%');
  });

  it('never rounds a near-full balance up to 100%', () => {
    expect(formatHeldPercent(99.995, false)).toBe('99.99%');
    expect(formatHeldPercent(99.95, false)).toBe('99.95%');
  });

  it('uses normal percent formatting below the ceiling', () => {
    expect(formatHeldPercent(87.3, false)).toBe(formatPercent(87.3));
  });
});

describe('truncateAddress', () => {
  it('shortens long addresses with an ellipsis', () => {
    const addr = 'bc1qq85v2c926eg6pgxhwp6q7lf6cnsz80qs3fcu9r';
    expect(truncateAddress(addr)).toBe('bc1qq85v2c…3fcu9r');
  });

  it('leaves short strings alone', () => {
    expect(truncateAddress('short')).toBe('short');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-01T12:00:00Z');

  it('reports just now for very recent times', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 2_000), now)).toBe(
      'just now',
    );
  });

  it('reports seconds and minutes ago', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 30_000), now)).toBe(
      '30s ago',
    );
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000), now)).toBe(
      '5m ago',
    );
  });
});
