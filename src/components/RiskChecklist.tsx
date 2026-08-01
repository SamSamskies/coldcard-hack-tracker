const FIRMWARE_ROWS = [
  {
    device: 'Mk3',
    vulnerable: '4.0.1–4.1.9 (~40-bit)',
    fixed: '4.2.0+',
  },
  {
    device: 'Mk4 / Mk5',
    vulnerable: 'Before Aug 1 patch (~72-bit)',
    fixed: '5.6.0+',
  },
  {
    device: 'Q',
    vulnerable: 'Before Aug 1 patch (~72-bit)',
    fixed: '1.5.0Q+',
  },
  {
    device: 'Edge (Mk4 / Mk5)',
    vulnerable: 'Before Aug 1 patch',
    fixed: '6.6.0X+',
  },
  {
    device: 'Edge (Q)',
    vulnerable: 'Before Aug 1 patch',
    fixed: '6.6.0QX+',
  },
] as const;

const POINTS = [
  {
    label: 'Mk4 is in scope now',
    text: 'Early drains fit Mk3’s ~40-bit search space. Community reports now include Mk4 RNG seeds being swept — device model is not visible on-chain, so treat vulnerable Mk4 / Mk5 / Q seeds with the same urgency.',
  },
  {
    label: 'Firmware update is not enough',
    text: 'Patching does not repair an existing seed. Generate a new seed on fixed firmware and migrate funds carefully.',
  },
  {
    label: 'Beyond the main seed',
    text: 'The same weak RNG also covered paper-wallet keys, Seed XOR masks, and some Key Teleport / clone / Secure Notes material (Block).',
  },
  {
    label: 'Lower risk',
    text: 'At least 50 private dice rolls at seed creation, or a strong unique BIP-39 passphrase (not the device PIN). Still migrate when practical.',
  },
  {
    label: 'Not this bug',
    text: 'TAPSIGNER, Opendime, and Satscard use different codebases and are not affected.',
  },
] as const;

export function RiskChecklist() {
  return (
    <section className="risk-checklist" aria-labelledby="risk-heading">
      <div className="risk-intro">
        <h2 id="risk-heading" className="risk-heading">
          Am I at risk?
        </h2>
        <p className="risk-lede">
          Short checklist from Coinkite’s Aug 1 advisory and Block’s root-cause
          writeup. This tracker does not check your wallet — follow the official
          steps before moving funds.
        </p>
      </div>

      <div className="risk-firmware">
        <span className="risk-point-label">Likely exposed</span>
        <p className="risk-point-text">
          Your seed is likely exposed if it was generated on vulnerable firmware.
          Fixed releases and later are safe for new seeds.
        </p>
        <div className="risk-firmware-wrap">
          <table className="risk-firmware-table">
            <thead>
              <tr>
                <th scope="col">Device</th>
                <th scope="col">Vulnerable</th>
                <th scope="col">Fixed</th>
              </tr>
            </thead>
            <tbody>
              {FIRMWARE_ROWS.map((row) => (
                <tr key={row.device}>
                  <td>{row.device}</td>
                  <td className="mono risk-vuln">{row.vulnerable}</td>
                  <td className="mono risk-fixed">{row.fixed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="risk-points">
        {POINTS.map((point) => (
          <li key={point.label}>
            <span className="risk-point-label">{point.label}</span>
            <span className="risk-point-text">{point.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
