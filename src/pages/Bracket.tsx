import { useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { playerName } from '../lib/standings';
import { roundDisplayName } from '../lib/rounds';
import { Badge, Button, Card, EmptyState, SectionTitle } from '../components/ui';
import { MatchScheduleEditor } from '../components/MatchScheduleEditor';
import { KnockoutResultForm } from '../components/KnockoutResultForm';

export function Bracket() {
  const isAdmin = useTournamentStore((s) => s.isAdmin);
  const matches = useTournamentStore((s) => s.matches);
  const players = useTournamentStore((s) => s.players);
  const generateBracket = useTournamentStore((s) => s.generateBracket);
  const [error, setError] = useState<string | null>(null);

  const knockoutMatches = matches.filter((m) => m.phase !== 'group');

  const phaseOrder = Array.from(new Set(knockoutMatches.map((m) => m.phase))).sort((a, b) => {
    const rank = (p: string) => (p === 'final' ? 0 : p === 'semifinal' ? 1 : p === 'quarterfinal' ? 2 : 3);
    return rank(a) - rank(b);
  });

  function handleGenerate() {
    if (knockoutMatches.length > 0 && !confirm('Esto regenerará el cuadro final. ¿Continuar?')) return;
    const err = generateBracket();
    setError(err);
  }

  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Fase final"
        title="Cuadro final"
        action={
          isAdmin && (
            <Button variant="secondary" onClick={handleGenerate}>
              {knockoutMatches.length > 0 ? 'Regenerar cuadro' : 'Generar cuadro'}
            </Button>
          )
        }
      />

      {error && <p className="text-sm text-accent">{error}</p>}

      {knockoutMatches.length === 0 ? (
        <EmptyState>
          El cuadro se generará automáticamente con los clasificados de cada grupo cuando termine la fase de grupos.
        </EmptyState>
      ) : (
        [...phaseOrder].reverse().map((phase) => (
          <div key={phase} className="space-y-4">
            <h2 className="font-serif text-2xl">{roundDisplayName(phase)}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {knockoutMatches
                .filter((m) => m.phase === phase)
                .sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0))
                .map((match) => (
                  <Card key={match.id} className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-serif text-lg">
                        {playerName(players, match.playerAId)} <span className="text-ink/40">vs</span>{' '}
                        {playerName(players, match.playerBId)}
                      </p>
                      {match.status === 'completed' && <Badge tone="forest">Jugado</Badge>}
                    </div>
                    {match.playerAId && match.playerBId && (
                      <>
                        {isAdmin ? (
                          <MatchScheduleEditor match={match} />
                        ) : (
                          match.scheduledAt && (
                            <p className="text-sm text-ink/60">
                              {new Date(match.scheduledAt).toLocaleString('es-ES', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                              {match.court && ` · ${match.court}`}
                            </p>
                          )
                        )}
                        {isAdmin ? (
                          <KnockoutResultForm match={match} />
                        ) : (
                          match.status === 'completed' &&
                          match.knockoutResult && (
                            <p className="font-serif text-xl">
                              {match.knockoutResult.sets
                                .map((s) => `${s.gamesA}-${s.gamesB}`)
                                .join('  ')}
                            </p>
                          )
                        )}
                      </>
                    )}
                  </Card>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
