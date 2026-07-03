import { useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Button, inputClass } from './ui';
import type { Match } from '../types';

export function GroupResultForm({ match }: { match: Match }) {
  const config = useTournamentStore((s) => s.config);
  const recordGroupResult = useTournamentStore((s) => s.recordGroupResult);
  const clearGroupResult = useTournamentStore((s) => s.clearGroupResult);
  const [editing, setEditing] = useState(false);
  const [pointsA, setPointsA] = useState(String(match.groupResult?.pointsA ?? ''));
  const [pointsB, setPointsB] = useState(String(match.groupResult?.pointsB ?? ''));
  const [error, setError] = useState<string | null>(null);

  if (match.status === 'completed' && !editing) {
    return (
      <div className="flex items-center gap-3">
        <p className="font-serif text-xl">
          {match.groupResult!.pointsA} – {match.groupResult!.pointsB}
        </p>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button variant="danger" onClick={() => clearGroupResult(match.id)}>
          Borrar
        </Button>
      </div>
    );
  }

  function handleSubmit() {
    const a = Number(pointsA);
    const b = Number(pointsB);
    const err = recordGroupResult(match.id, { pointsA: a, pointsB: b });
    if (err) setError(err);
    else {
      setError(null);
      setEditing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          className={`${inputClass} w-16 text-center`}
          value={pointsA}
          onChange={(e) => setPointsA(e.target.value)}
        />
        <span className="text-ink/40">–</span>
        <input
          type="number"
          min={0}
          className={`${inputClass} w-16 text-center`}
          value={pointsB}
          onChange={(e) => setPointsB(e.target.value)}
        />
        <Button onClick={handleSubmit}>Guardar</Button>
        {editing && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-ink/40">
        Super tie-break a {config.groupFormat.points}, diferencia mínima de {config.groupFormat.winBy}.
      </p>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
