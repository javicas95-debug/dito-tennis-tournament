import { useTournamentStore } from '../store/useTournamentStore';
import { playerName } from '../lib/standings';
import { Badge, Button, Card, EmptyState, SectionTitle } from '../components/ui';
import { GroupResultForm } from '../components/GroupResultForm';
import { StandingsTable } from '../components/StandingsTable';

export function Groups() {
  const isAdmin = useTournamentStore((s) => s.isAdmin);
  const groups = useTournamentStore((s) => s.groups);
  const players = useTournamentStore((s) => s.players);
  const matches = useTournamentStore((s) => s.matches);
  const config = useTournamentStore((s) => s.config);
  const generateGroupMatches = useTournamentStore((s) => s.generateGroupMatches);

  const groupMatchesExist = matches.some((m) => m.phase === 'group');

  return (
    <div className="space-y-12">
      <SectionTitle
        eyebrow="Fase de grupos"
        title="Grupos"
        action={
          isAdmin && (
            <Button
              variant="secondary"
              onClick={() => {
                if (!groupMatchesExist || confirm('Esto regenerará todos los partidos de grupo. ¿Continuar?')) {
                  generateGroupMatches();
                }
              }}
            >
              {groupMatchesExist ? 'Regenerar partidos de grupo' : 'Generar partidos de grupo'}
            </Button>
          )
        }
      />

      {isAdmin && groupMatchesExist && !matches.some((m) => m.phase === 'group' && m.order) && (
        <p className="text-sm text-ink/60">
          Ve a <span className="font-semibold">Calendario</span> para generar el orden de juego del día.
        </p>
      )}

      {groups.map((group) => {
        const groupMatches = matches
          .filter((m) => m.groupId === group.id)
          .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

        return (
          <div key={group.id} className="space-y-4">
            <h2 className="font-serif text-2xl">{group.name}</h2>

            {group.playerIds.length === 0 ? (
              <EmptyState>Sin jugadores asignados todavía.</EmptyState>
            ) : (
              <>
                <Card className="overflow-x-auto p-4">
                  <StandingsTable group={group} qualifiersCount={config.qualifiersPerGroup} />
                </Card>

                <div className="space-y-3">
                  {groupMatches.length === 0 ? (
                    <EmptyState>Genera los partidos del grupo para empezar a introducir resultados.</EmptyState>
                  ) : (
                    groupMatches.map((match) => (
                      <Card key={match.id} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {match.order && <Badge>Orden {match.order}</Badge>}
                            <p className="font-serif text-lg">
                              {playerName(players, match.playerAId)} <span className="text-ink/40">vs</span>{' '}
                              {playerName(players, match.playerBId)}
                            </p>
                          </div>
                          {match.status === 'completed' && <Badge tone="forest">Jugado</Badge>}
                        </div>
                        {isAdmin ? (
                          <GroupResultForm match={match} />
                        ) : (
                          match.status === 'completed' && (
                            <p className="font-serif text-xl">
                              {match.groupResult!.pointsA} – {match.groupResult!.pointsB}
                            </p>
                          )
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

