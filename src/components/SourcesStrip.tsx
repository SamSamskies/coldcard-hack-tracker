import { SOURCES } from '../data/incident';

export function SourcesStrip() {
  return (
    <section className="sources-strip" aria-labelledby="sources-heading">
      <h2 id="sources-heading" className="sources-label">
        Sources
      </h2>
      <ul className="sources-list">
        {SOURCES.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label}
            </a>
            <p className="sources-note">{source.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
