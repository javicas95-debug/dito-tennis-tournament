import { useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Button, inputClass } from './ui';
import type { Match, SetScore } from '../types';

interface SetInput {
  gamesA: string;
  gamesB: string;
  tiebreakA: string;
  tiebreakB: string;
}

const emptySet: SetInput = { gamesA: '', gamesB: '', tiebreakA: '', tiebreakB: '' };

function setsFromMatch(match: Match): SetInput[] {
  if (!match.knockoutResult?.sets.length) return [{ ...emptySet }];
  return match.knockoutResult.sets.map((s) => ({
    gamesA: String(s.gamesA),
    gamesB: String(s.gamesB),
    tiebreakA: s.tiebreak ? String(s.tiebreak.pointsA) : '',
    tiebreakB: s.tiebreak ? String(s.tiebreak.pointsB) : '',
  }));
}

export function KnockoutResultForm({ match }: { match: Match }) {
  const config = useTournamentStore((s) => s.config);
  const recordKnockoutResult = useTournamentStore((s) => s.recordKnockoutResult);
  const clearKnockoutResult = useTournamentStore((s) => s.clearKnockoutResult);
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState<SetInput[]>(() => setsFromMatch(match));
  const [error, setError] = useState<string | null>(null);
  const { tiebreakAtGames } = config.knockoutFormat;

  if (match.status === 'completed' && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-serif text-xl">
          {match.knockoutResult!.sets
            .map((s) => `${s.gamesA}-${s.gamesB}${s.tiebreak ? `(${Math.min(s.tiebreak.pointsA, s.tiebreak.pointsB)})` : ''}`)
            .join('  ')}
        </p>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button variant="danger" onClick={() => clearKnockoutResult(match.id)}>
          Borrar
        </Button>
      </div>
    );
  }

  function updateSet(index: number, patch: Partial<SetInput>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function handleSubmit() {
    const finalSets: SetScore[] = sets
      .filter((s) => s.gamesA !== '' && s.gamesB !== '')
      .map((s) => {
        const gamesA = Number(s.gamesA);
        const gamesB = Number(s.gamesB);
        const isTie = gamesA === tiebreakAtGames && gamesB === tiebreakAtGames;
        if (!isTie) return { gamesA, gamesB };
        const tbA = Number(s.tiebreakA || 0);
        const tbB = Number(s.tiebreakB || 0);
        const aWinsTb = tbA > tbB;
        return {
          gamesA: aWinsTb ? tiebreakAtGames + 1 : tiebreakAtGames,
          gamesB: aWinsTb ? tiebreakAtGames : tiebreakAtGames + 1,
          tiebreak: { pointsA: tbA, pointsB: tbB },
        };
      });

    const err = recordKnockoutResult(match.id, { sets: finalSets });
    if (err) setError(err);
    else {
      setError(null);
      setEditing(false);
    }
  }

  return (
    <div className="space-y-2">
      {sets.map((s, i) => {
        const gamesA = Number(s.gamesA);
        const gamesB = Number(s.gamesB);
        const showTiebreak = gamesA === tiebreakAtGames && gamesB === tiebreakAtGames;
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs uppercase tracking-widest-plus text-ink/40">Set {i + 1}</span>
            <input
              type="number"
              min={0}
              className={`${inputClass} w-14 text-center`}
              value={s.gamesA}
              onChange={(e) => updateSet(i, { gamesA: e.target.value })}
            />
            <span className="text-ink/40">–</span>
            <input
              type="number"
              min={0}
              className={`${inputClass} w-14 text-center`}
              value={s.gamesB}
              onChange={(e) => updateSet(i, { gamesB: e.target.value })}
            />
            {showTiebreak && (
              <>
                <span className="text-xs text-ink/40">tie-break</span>
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} w-14 text-center`}
                  value={s.tiebreakA}
                  onChange={(e) => updateSet(i, { tiebreakA: e.target.value })}
                />
                <span className="text-ink/40">–</span>
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} w-14 text-center`}
                  value={s.tiebreakB}
                  onChange={(e) => updateSet(i, { tiebreakB: e.target.value })}
                />
              </>
            )}
            {sets.length > 1 && (
              <Button variant="ghost" onClick={() => setSets((prev) => prev.filter((_, idx) => idx !== i))}>
                Quitar
              </Button>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setSets((prev) => [...prev, { ...emptySet }])}>
          + Set
        </Button>
        <Button onClick={handleSubmit}>Guardar</Button>
        {editing && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
      </div>
      <p className="text-xs text-ink/40">
        A {config.knockoutFormat.gamesToWinSet} juegos, tie-break a {tiebreakAtGames}-{tiebreakAtGames}. Partido a{' '}
        {config.knockoutFormat.setsToWin} sets.
      </p>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}
