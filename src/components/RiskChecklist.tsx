const POINTS = [
  {
    label: 'Likely exposed',
    text: 'Seed generated on Coldcard Mk3 firmware 4.0.1–4.1.9, or on Mk4 / Mk5 / Q before the July 2026 fixed releases.',
  },
  {
    label: 'Firmware update is not enough',
    text: 'Patching does not repair an existing seed. Generate a new seed on fixed firmware and migrate funds carefully.',
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
          Short checklist from Coinkite’s advisory. This tracker does not check
          your wallet — follow the official steps before moving funds.
        </p>
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
