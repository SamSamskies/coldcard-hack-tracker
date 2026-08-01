import { describe, expect, it } from 'vitest';
import {
  addressBalanceSats,
  outboundFromAddress,
  satsToBtc,
  type AddressResponse,
  type Tx,
} from '../lib/mempool';

const emptyStats = {
  funded_txo_count: 0,
  funded_txo_sum: 0,
  spent_txo_count: 0,
  spent_txo_sum: 0,
  tx_count: 0,
};

function makeTx(partial: {
  txid?: string;
  vin: Tx['vin'];
  vout: Tx['vout'];
  confirmed?: boolean;
  blockHeight?: number;
  blockTime?: number;
}): Tx {
  return {
    txid: partial.txid ?? 'txid',
    fee: 0,
    vin: partial.vin,
    vout: partial.vout,
    status: {
      confirmed: partial.confirmed ?? true,
      block_height: partial.blockHeight,
      block_time: partial.blockTime,
    },
  };
}

describe('addressBalanceSats', () => {
  it('sums confirmed and mempool funded minus spent', () => {
    const addr: AddressResponse = {
      address: 'vault',
      chain_stats: {
        ...emptyStats,
        funded_txo_sum: 50_980_268,
        spent_txo_sum: 0,
      },
      mempool_stats: {
        ...emptyStats,
        funded_txo_sum: 41_000_000,
        spent_txo_sum: 41_000_000,
      },
    };
    expect(addressBalanceSats(addr)).toBe(50_980_268);
  });
});

describe('satsToBtc', () => {
  it('converts sats to BTC', () => {
    expect(satsToBtc(100_000_000)).toBe(1);
    expect(satsToBtc(50_980_268)).toBe(0.50980268);
  });
});

describe('outboundFromAddress', () => {
  const vault = 'bc1q7rmsw0ra7zrphe66wwa9960ffm69cp8dlrrcgf';
  const hop = 'bc1qayw8nrec0vsa5vj4xee4dqhfgztx2gqq7w2u0s';
  const other = 'bc1qotherxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  it('returns zero when the address is not an input', () => {
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: other, value: 1_000_000 } }],
      vout: [{ scriptpubkey_address: hop, value: 990_000 }],
    });
    expect(outboundFromAddress(tx, vault)).toEqual({
      amountSats: 0,
      destinations: [],
      recipients: [],
    });
  });

  it('nets change back to the spending address', () => {
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: vault, value: 100_000_000 } }],
      vout: [
        { scriptpubkey_address: hop, value: 41_000_000 },
        { scriptpubkey_address: vault, value: 58_900_000 },
      ],
    });
    const out = outboundFromAddress(tx, vault);
    expect(out.amountSats).toBe(41_100_000);
    expect(out.destinations).toEqual([hop]);
    expect(out.recipients).toEqual([{ address: hop, valueSats: 41_000_000 }]);
  });

  it('aggregates multiple outputs to the same destination', () => {
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: vault, value: 50_000_000 } }],
      vout: [
        { scriptpubkey_address: hop, value: 20_000_000 },
        { scriptpubkey_address: hop, value: 29_000_000 },
      ],
    });
    const out = outboundFromAddress(tx, vault);
    expect(out.recipients).toEqual([{ address: hop, valueSats: 49_000_000 }]);
    expect(out.amountSats).toBe(50_000_000);
  });

  it('sorts recipients by value descending', () => {
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: vault, value: 60_000_000 } }],
      vout: [
        { scriptpubkey_address: other, value: 10_000_000 },
        { scriptpubkey_address: hop, value: 49_000_000 },
      ],
    });
    expect(outboundFromAddress(tx, vault).destinations).toEqual([hop, other]);
  });
});
