import { SOURCES } from '../data/incident';

export function SourcesStrip() {
  return (
    <section className="sources-strip" aria-label="Primary sources">
      <h2 className="sources-label">Sources</h2>
      <ul className="sources-list">
        {SOURCES.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label}
            </a>
            <span className="sources-role">{source.role}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
