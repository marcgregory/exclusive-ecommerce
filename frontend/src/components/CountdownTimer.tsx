export function CountdownTimer() {
  return (
    <div className="countdown">
      {[["03", "Days"], ["23", "Hours"], ["19", "Minutes"], ["56", "Seconds"]].map(([value, label]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
