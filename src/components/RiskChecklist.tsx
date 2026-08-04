import { LinkedNote } from './LinkedNote';

const FIRMWARE_ROWS = [
  {
    device: 'Mk3',
    vulnerable: '4.0.1–4.1.9, 5.0.1–5.0.3 (~40-bit)',
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
    label: 'Firmware update is not enough',
    text: 'Patching does not repair an existing seed. Generate a new seed on fixed firmware and migrate funds carefully.',
  },
  {
    label: 'Migrate before you upgrade',
    text: 'If this Coldcard is your only signer for a weak seed, move funds first. Community reports (including [Jameson Lopp](https://x.com/lopp/status/2083958797354127631)) flag a non-zero chance the hotfix upgrade bricks the unit; an open [firmware PR](https://github.com/Coldcard/firmware/pull/692) argues a sticky TRNG fault after the hotfix can lock the keypad before login. Prefer sweeping to a new seed on a second fixed device when possible.',
  },
  {
    label: 'Multisig urgency & Slipstream',
    text: 'If Coldcard-generated keys alone could meet your signing threshold (e.g. 2-of-3 with two Coldcard keys), migrate now — those wallets can be swept. One Coldcard key below threshold is lower urgency but still migrate. Broadcasting a migration to the public mempool opens a brief RBF-sniping window while weak keys remain spendable; [Nunchuk](https://x.com/nunchuk_io/status/2084163891043688858) recommends submitting the signed hex via [MARA Slipstream](https://slipstream.mara.com) instead (now public, no code). That keeps the tx out of the public mempool but trusts MARA and can confirm slower (~5–6% hashrate). No multisig sweeps reported yet.',
  },
  {
    label: 'Origin of the seed',
    text: 'Exposure follows where the seed was generated, not the device holding it today. Seeds imported elsewhere, or whose origin you cannot establish, should be treated as affected.',
  },
  {
    label: 'Beyond the main seed',
    text: 'Weak RNG also hit paper-wallet keys, clone / Key Teleport material, and some Secure Notes passwords — even when the BIP-39 seed itself came from dice (WizardSardine / Block).',
  },
  {
    label: 'Lower risk',
    text: 'At least 50 private dice rolls at seed creation. A long truly random BIP-39 passphrase (not the device PIN) may buy time, but weak passphrases are not enough — [BTC Sessions](https://x.com/BTCsessions/status/2084024733511921691) reported a confirmed Mk3 drain with a two-word passphrase. [CK tripwire](https://cktripwire.com/) is mapping live how far added dice/passphrase entropy currently stops sweeps (zero-entropy control swept in ~1h; low-band honeypots still live as of Aug 4). Still migrate when practical.',
  },
  {
    label: 'Not this bug',
    text: 'TAPSIGNER, Opendime, and Satscard use different codebases and are not affected. Mk1 and pre-4.0.1 Mk2/Mk3 firmware used the real TRNG.',
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
          Short checklist from Coinkite’s Aug 1 advisory, Block’s root-cause
          writeup, WizardSardine’s analysis, and Nunchuk’s multisig migration
          guidance. This tracker does not check your wallet — follow the
          official steps before moving funds.
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
            <LinkedNote as="span" className="risk-point-text" text={point.text} />
          </li>
        ))}
      </ul>
    </section>
  );
}
