import { useTournamentStore } from '../store/useTournamentStore';
import { playerName } from '../lib/standings';
import { roundDisplayName } from '../lib/rounds';
import { Badge, Button, Card, EmptyState, SectionTitle } from '../components/ui';
import { MatchScheduleEditor } from '../components/MatchScheduleEditor';

export function Schedule() {
  const isAdmin = useTournamentStore((s) => s.isAdmin);
  const matches = useTournamentStore((s) => s.matches);
  const players = useTournamentStore((s) => s.players);
  const groups = useTournamentStore((s) => s.groups);
  const generateGroupOrder = useTournamentStore((s) => s.generateGroupOrder);
  const moveGroupMatchOrder = useTournamentStore((s) => s.moveGroupMatchOrder);

  const groupMatches = matches
    .filter((m) => m.phase === 'group' && m.playerAId && m.playerBId)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

  const knockoutMatches = matches.filter((m) => m.phase !== 'group' && m.playerAId && m.playerBId);
  const sortedKnockout = [...knockoutMatches].sort((a, b) => {
    if (a.scheduledAt && b.scheduledAt) return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    if (a.scheduledAt) return -1;
    if (b.scheduledAt) return 1;
    return 0;
  });

  const hasOrder = groupMatches.some((m) => m.order);

  return (
    <div className="space-y-12">
      <SectionTitle eyebrow="Torneo de un día" title="Calendario" />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Fase de grupos — orden de juego</h2>
          {isAdmin && groupMatches.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                if (!hasOrder || confirm('Esto sustituirá el orden de juego actual. ¿Continuar?')) {
                  generateGroupOrder();
                }
              }}
            >
              {hasOrder ? 'Regenerar orden automático' : 'Generar orden automático'}
            </Button>
          )}
        </div>
        <p className="text-sm text-ink/60">
          Como el torneo se juega en un solo día, en vez de horarios fijos se establece un orden de juego. El
          generador automático alterna partidos de distintos grupos y evita que un jugador repita partido
          seguido.
        </p>

        {groupMatches.length === 0 ? (
          <EmptyState>Genera primero los partidos de grupo desde la pestaña Grupos.</EmptyState>
        ) : (
          <div className="space-y-2">
            {groupMatches.map((match, i) => {
              const groupName = groups.find((g) => g.id === match.groupId)?.name;
              return (
                <Card key={match.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center font-serif text-xl text-ink/40">{match.order ?? '—'}</span>
                    <Badge tone="neutral">{groupName}</Badge>
                    <p className="font-serif text-lg">
                      {playerName(players, match.playerAId)} <span className="text-ink/40">vs</span>{' '}
                      {playerName(players, match.playerBId)}
                    </p>
                    {match.status === 'completed' && <Badge tone="forest">Jugado</Badge>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => moveGroupMatchOrder(match.id, 'up')}
                        disabled={i === 0}
                      >
                        ▲
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => moveGroupMatchOrder(match.id, 'down')}
                        disabled={i === groupMatches.length - 1}
                      >
                        ▼
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Fase final — horarios</h2>
        {sortedKnockout.length === 0 ? (
          <EmptyState>El cuadro final todavía no se ha generado.</EmptyState>
        ) : (
          <div className="space-y-3">
            {sortedKnockout.map((match) => (
              <Card key={match.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="accent">{roundDisplayName(match.phase)}</Badge>
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
