export default function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-fluent-textMuted uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-semibold text-fluent-text mt-2">{value}</p>
      {hint && <p className="text-xs text-fluent-textMuted mt-1">{hint}</p>}
    </div>
  );
}
