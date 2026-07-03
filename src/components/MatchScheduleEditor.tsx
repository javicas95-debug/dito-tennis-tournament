import { useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Button, inputClass } from './ui';
import type { Match } from '../types';

function toLocalInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MatchScheduleEditor({ match }: { match: Match }) {
  const setSchedule = useTournamentStore((s) => s.setSchedule);
  const [dateValue, setDateValue] = useState(toLocalInputValue(match.scheduledAt));
  const [court, setCourt] = useState(match.court ?? '');

  function apply(nextDate: string, nextCourt: string) {
    const iso = nextDate ? new Date(nextDate).toISOString() : undefined;
    setSchedule(match.id, iso, nextCourt.trim() || undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="datetime-local"
        className={`${inputClass} w-auto`}
        value={dateValue}
        onChange={(e) => {
          setDateValue(e.target.value);
          apply(e.target.value, court);
        }}
      />
      <input
        type="text"
        placeholder="Pista"
        className={`${inputClass} w-24`}
        value={court}
        onChange={(e) => {
          setCourt(e.target.value);
          apply(dateValue, e.target.value);
        }}
      />
      {(dateValue || court) && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setDateValue('');
            setCourt('');
            setSchedule(match.id, undefined, undefined);
          }}
        >
          Limpiar
        </Button>
      )}
    </div>
  );
}
