import { SOURCES } from '../data/incident';
import { LinkedNote } from './LinkedNote';

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
            <LinkedNote className="sources-note" text={source.note} />
          </li>
        ))}
      </ul>
    </section>
  );
}
