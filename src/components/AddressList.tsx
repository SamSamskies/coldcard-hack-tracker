import { CONSOLIDATED_BTC, ORIGINAL_STOLEN_BTC } from '../data/incident';
import { formatBtc, formatUsd, truncateAddress } from '../lib/format';
import { explorerAddressUrl } from '../lib/mempool';
import type { LiveAddress } from '../hooks/useTrackerData';

type Props = {
  addresses: LiveAddress[];
  usdPrice: number | null;
  loading: boolean;
};

const STATUS_LABEL: Record<LiveAddress['status'], string> = {
  held: 'Held',
  partial: 'Partial',
  emptied: 'Emptied',
};

export function AddressList({ addresses, usdPrice, loading }: Props) {
  return (
    <section className="panel" aria-labelledby="addresses-heading">
      <div className="panel-head">
        <h2 id="addresses-heading">Holding addresses</h2>
        <p>
          Victims lost {formatBtc(ORIGINAL_STOLEN_BTC)} BTC, of which{' '}
          {formatBtc(CONSOLIDATED_BTC)} BTC reached these four addresses. The
          difference went to miners as fees during the sweep, so tracking is
          measured against what actually arrived here.
        </p>
      </div>

      <div className="address-table-wrap">
        <table className="address-table">
          <thead>
            <tr>
              <th scope="col">Label</th>
              <th scope="col">Address</th>
              <th scope="col">Balance</th>
              <th scope="col">Report</th>
              <th scope="col">UTXOs</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && addresses.length === 0
              ? Array.from({ length: 4 }, (_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td colSpan={6}>Loading address…</td>
                  </tr>
                ))
              : addresses.map((a) => {
                  const usd =
                    usdPrice != null ? a.balanceBtc * usdPrice : null;
                  return (
                    <tr
                      key={a.address}
                      className={`status-${a.status}${a.flash ? ' flash' : ''}`}
                    >
                      <td>
                        <span className="addr-label">{a.label}</span>
                        {a.note ? (
                          <span className="addr-note">{a.note}</span>
                        ) : null}
                      </td>
                      <td className="mono">
                        <a
                          href={explorerAddressUrl(a.address)}
                          target="_blank"
                          rel="noreferrer"
                          title={a.address}
                        >
                          {truncateAddress(a.address)}
                        </a>
                      </td>
                      <td className="mono num">
                        {formatBtc(a.balanceBtc)} BTC
                        {usd != null ? (
                          <span className="meta-sub">{formatUsd(usd)}</span>
                        ) : null}
                      </td>
                      <td className="mono num muted">
                        {formatBtc(a.reportBtc)} BTC
                      </td>
                      <td className="mono num">{a.utxoCount}</td>
                      <td>
                        <span className={`status-pill status-${a.status}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
