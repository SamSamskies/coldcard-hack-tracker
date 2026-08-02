import { useId, useState } from 'react';
import { CLUSTERS, ORIGINAL_STOLEN_BTC } from '../data/incident';
import { formatBtc, formatUsd } from '../lib/format';

type Props = {
  usdPrice: number | null;
};

const VIEW_W = 720;
const VIEW_H = 200;
const PAD_L = 62;
const PAD_R = 18;
const PAD_T = 14;
const PAD_B = 34;

const PLOT_W = VIEW_W - PAD_L - PAD_R;
const PLOT_H = VIEW_H - PAD_T - PAD_B;

/** Cumulative total after each UTC day on which at least one wave landed. */
type DayStep = {
  date: string;
  dayBtc: number;
  cumulativeBtc: number;
};

function buildSteps(): DayStep[] {
  const byDate = new Map<string, number>();
  for (const c of CLUSTERS) {
    byDate.set(c.date, (byDate.get(c.date) ?? 0) + c.stolenBtc);
  }

  const dates = [...byDate.keys()].sort();
  let running = 0;
  return dates.map((date) => {
    const dayBtc = byDate.get(date) ?? 0;
    running += dayBtc;
    return { date, dayBtc, cumulativeBtc: running };
  });
}

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Next round number above the total, so the curve never touches the ceiling. */
function axisMax(total: number): number {
  const step = 300;
  return Math.ceil(total / step) * step;
}

export function StolenTimeline({ usdPrice }: Props) {
  const tipId = useId();
  const [active, setActive] = useState<number | null>(null);
  const steps = buildSteps();
  const yMax = axisMax(ORIGINAL_STOLEN_BTC);

  const x = (i: number) =>
    steps.length <= 1
      ? PAD_L + PLOT_W / 2
      : PAD_L + (i / (steps.length - 1)) * PLOT_W;
  const y = (btc: number) => PAD_T + PLOT_H - (btc / yMax) * PLOT_H;

  // Step path: each day rises vertically, then holds flat until the next wave.
  const commands: string[] = [`M ${x(0)} ${y(0)}`];
  steps.forEach((step, i) => {
    if (i > 0) commands.push(`L ${x(i)} ${y(steps[i - 1].cumulativeBtc)}`);
    commands.push(`L ${x(i)} ${y(step.cumulativeBtc)}`);
  });
  const linePath = commands.join(' ');
  const areaPath = `${linePath} L ${x(steps.length - 1)} ${y(0)} Z`;

  const gridValues: number[] = [];
  for (let v = 0; v <= yMax; v += 300) gridValues.push(v);

  const lastStep = steps[steps.length - 1];
  const activeStep = active != null ? steps[active] : null;
  const totalLabel = formatBtc(ORIGINAL_STOLEN_BTC);
  const [totalWhole, totalFrac = '00'] = totalLabel.split('.');

  return (
    <section className="timeline" aria-labelledby="timeline-heading">
      <div className="timeline-body">
        <div className="timeline-headline">
          <h2 id="timeline-heading" className="timeline-label">
            Total stolen
          </h2>
          <p className="timeline-total mono">
            <span className="timeline-total-whole">{totalWhole}</span>
            <span className="timeline-total-frac">.{totalFrac}</span>{' '}
            <span className="unit">BTC</span>
          </p>
          <p className="timeline-total-usd">
            {usdPrice != null
              ? formatUsd(ORIGINAL_STOLEN_BTC * usdPrice)
              : 'Across tracked clusters'}
          </p>
          <p className="timeline-total-note">
            {CLUSTERS.length} waves · {formatDay(steps[0].date)} –{' '}
            {formatDay(lastStep.date)} UTC
          </p>
        </div>

        <div className="timeline-chart-wrap">
          <svg
            className="timeline-chart"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            role="img"
            aria-label={`Cumulative BTC stolen, rising to ${totalLabel} BTC by ${formatDay(lastStep.date)}`}
          >
            <defs>
              <linearGradient id="timeline-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {gridValues.map((v) => (
              <g key={v}>
                <line
                  className="timeline-grid"
                  x1={PAD_L}
                  y1={y(v)}
                  x2={VIEW_W - PAD_R}
                  y2={y(v)}
                />
                <text
                  className="timeline-axis-label"
                  x={PAD_L - 10}
                  y={y(v) + 4}
                >
                  {v.toLocaleString('en-US')}
                </text>
              </g>
            ))}

            <path className="timeline-area" d={areaPath} />
            <path className="timeline-line" d={linePath} />

            {steps.map((step, i) => (
              <g key={step.date}>
                <circle
                  className={`timeline-dot${active === i ? ' is-active' : ''}`}
                  cx={x(i)}
                  cy={y(step.cumulativeBtc)}
                  r={active === i ? 5.5 : 4.5}
                />
                <text
                  className="timeline-axis-label"
                  x={x(i)}
                  y={VIEW_H - PAD_B + 22}
                  textAnchor="middle"
                >
                  {formatDay(step.date)}
                </text>
              </g>
            ))}
          </svg>

          {steps.map((step, i) => {
            const edge =
              i === 0 ? 'is-start' : i === steps.length - 1 ? 'is-end' : '';
            return (
              <button
                key={step.date}
                type="button"
                className={`timeline-hit ${edge}${active === i ? ' is-active' : ''}`}
                style={{
                  left: `${(x(i) / VIEW_W) * 100}%`,
                  top: `${(y(step.cumulativeBtc) / VIEW_H) * 100}%`,
                }}
                aria-label={`${formatDay(step.date)}: ${formatBtc(step.cumulativeBtc)} BTC cumulative`}
                aria-describedby={active === i ? tipId : undefined}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            );
          })}

          {activeStep != null && active != null ? (
            <div
              id={tipId}
              role="tooltip"
              className={`timeline-tip${
                active === 0
                  ? ' is-start'
                  : active === steps.length - 1
                    ? ' is-end'
                    : ''
              }`}
              style={{
                left: `${(x(active) / VIEW_W) * 100}%`,
                top: `${(y(activeStep.cumulativeBtc) / VIEW_H) * 100}%`,
              }}
            >
              <p className="timeline-tip-date">{formatDay(activeStep.date)}</p>
              <p className="timeline-tip-value mono">
                {formatBtc(activeStep.cumulativeBtc)}{' '}
                <span className="unit">BTC</span>
              </p>
              {usdPrice != null ? (
                <p className="timeline-tip-usd">
                  {formatUsd(activeStep.cumulativeBtc * usdPrice)} cumulative
                </p>
              ) : null}
              <p className="timeline-tip-delta mono">
                +{formatBtc(activeStep.dayBtc)} that day
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <ol className="timeline-waves">
        {CLUSTERS.map((c) => (
          <li key={c.id}>
            <span className="timeline-wave-date mono">{formatDay(c.date)}</span>
            <span className="timeline-wave-label">{c.label}</span>
            <span className="timeline-wave-amt mono">
              +{formatBtc(c.stolenBtc)} <span className="unit">BTC</span>
              {usdPrice != null ? (
                <span className="meta-sub">
                  {formatUsd(c.stolenBtc * usdPrice)}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
