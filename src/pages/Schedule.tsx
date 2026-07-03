import { useTournamentStore } from '../store/useTournamentStore';
import { playerName } from '../lib/standings';
import { roundDisplayName } from '../lib/rounds';
import { Badge, Card, EmptyState, SectionTitle } from '../components/ui';
import { MatchScheduleEditor } from '../components/MatchScheduleEditor';

export function Schedule() {
  const isAdmin = useTournamentStore((s) => s.isAdmin);
  const matches = useTournamentStore((s) => s.matches);
  const players = useTournamentStore((s) => s.players);
  const groups = useTournamentStore((s) => s.groups);

  const playable = matches.filter((m) => m.playerAId && m.playerBId);
  const sorted = [...playable].sort((a, b) => {
    if (a.scheduledAt && b.scheduledAt) return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    if (a.scheduledAt) return -1;
    if (b.scheduledAt) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Orden de juego" title="Calendario" />

      {sorted.length === 0 ? (
        <EmptyState>Todavía no hay partidos con jugadores asignados.</EmptyState>
      ) : (
        <div className="space-y-3">
          {sorted.map((match) => {
            const groupName = match.groupId ? groups.find((g) => g.id === match.groupId)?.name : null;
            return (
              <Card key={match.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone={match.phase === 'group' ? 'neutral' : 'accent'}>
                      {groupName ?? roundDisplayName(match.phase)}
                    </Badge>
                    {match.status === 'completed' && <Badge tone="forest">Jugado</Badge>}
                  </div>
                  <p className="font-serif text-lg">
                    {playerName(players, match.playerAId)} <span className="text-ink/40">vs</span>{' '}
                    {playerName(players, match.playerBId)}
                  </p>
                </div>
                {isAdmin ? (
                  <MatchScheduleEditor match={match} />
                ) : match.scheduledAt ? (
                  <div className="text-right text-sm text-ink/60">
                    <p>{new Date(match.scheduledAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    {match.court && <p>{match.court}</p>}
                  </div>
                ) : (
                  <p className="text-sm italic text-ink/40">Sin horario</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
