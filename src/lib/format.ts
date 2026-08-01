/** Full satoshi precision (up to 8 dp); keeps at least 2 dp for round totals. */
export function formatBtc(btc: number, digits?: number): string {
  if (!Number.isFinite(btc)) return '—';
  if (digits != null) {
    return btc.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
  // Round to nearest sat first so float dust does not print as junk digits.
  const rounded = Math.round(btc * 1e8) / 1e8;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd)) return '—';
  return usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatPercent(pct: number, digits = 1): string {
  return `${pct.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/**
 * Never rounds a partial balance up to 100%, so "100%" always means nothing
 * measurable has left the holding addresses.
 */
export function formatHeldPercent(pct: number, fullyHeld: boolean): string {
  if (fullyHeld) return '100%';
  if (pct > 99.9) return `${Math.min(99.99, pct).toFixed(2)}%`;
  return formatPercent(pct);
}

export function truncateAddress(address: string, head = 10, tail = 6): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function truncateTxid(txid: string, head = 8, tail = 6): string {
  return `${txid.slice(0, head)}…${txid.slice(-tail)}`;
}

export function formatRelativeTime(date: Date, now = new Date()): string {
  const sec = Math.round((now.getTime() - date.getTime()) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatBlockTime(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}
