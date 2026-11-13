import { todayUtc } from "../lib/format";

interface DateRangeProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateRange({ from, to, onChange }: DateRangeProps) {
  return (
    <div className="date-range">
      <label>
        From
        <input
          type="date"
          value={from}
          max={to || todayUtc()}
          onChange={(event) => onChange(event.target.value, to)}
        />
      </label>
      <span>→</span>
      <label>
        To
        <input
          type="date"
          value={to}
          min={from}
          max={todayUtc()}
          onChange={(event) => onChange(from, event.target.value)}
        />
      </label>
    </div>
  );
}
