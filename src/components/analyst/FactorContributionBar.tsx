interface Factor {
  factor: string;
  contribution: number;
}

interface Props {
  factors: Factor[];
}

export function FactorContributionBar({ factors }: Props) {
  const total = factors.reduce((s, f) => s + Math.abs(f.contribution), 0) || 1;

  return (
    <div className="factor-bar" role="img" aria-label="Factor contribution breakdown">
      <div className="factor-bar__stack">
        {factors.map((f) => {
          const width = (Math.abs(f.contribution) / total) * 100;
          return (
            <div
              key={f.factor}
              className={`factor-bar__segment factor-bar__segment--${
                f.contribution >= 0 ? "pos" : "neg"
              }`}
              style={{ width: `${width}%` }}
              title={`${f.factor}: ${(f.contribution * 100).toFixed(0)}%`}
            />
          );
        })}
      </div>
      <ul className="factor-bar__legend">
        {factors.map((f) => (
          <li key={f.factor}>
            <span className="factor-bar__name">{f.factor}</span>
            <span className="factor-bar__weight">{(f.contribution * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
