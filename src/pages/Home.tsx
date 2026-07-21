import { Link } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import { playerName } from '../lib/standings';
import { roundDisplayName } from '../lib/rounds';
import { Badge, Card, EmptyState, SectionTitle } from '../components/ui';
import type { Match } from '../types';

function MatchRow({ match }: { match: Match }) {
  const players = useTournamentStore((s) => s.players);
  const groups = useTournamentStore((s) => s.groups);
  const groupName = match.groupId ? groups.find((g) => g.id === match.groupId)?.name : null;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <div className="flex items-center gap-2">
          <Badge tone={match.phase === 'group' ? 'neutral' : 'accent'}>
            {groupName ?? roundDisplayName(match.phase)}
          </Badge>
          {match.status === 'completed' && <Badge tone="forest">Jugado</Badge>}
        </div>
        <p className="mt-2 font-serif text-lg">
          {playerName(players, match.playerAId)} <span className="text-ink/40">vs</span>{' '}
          {playerName(players, match.playerBId)}
        </p>
      </div>
      <div className="text-right text-sm text-ink/60">
        {match.phase === 'group' ? (
          match.order ? (
            <p>Orden {match.order}</p>
          ) : (
            <p className="italic">Sin orden asignado</p>
          )
        ) : match.scheduledAt ? (
          <>
            <p>{new Date(match.scheduledAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            {match.court && <p>{match.court}</p>}
          </>
        ) : (
          <p className="italic">Sin horario</p>
        )}
      </div>
    </Card>
  );
}

export function Home() {
  const players = useTournamentStore((s) => s.players);
  const matches = useTournamentStore((s) => s.matches);
  const config = useTournamentStore((s) => s.config);

  const completed = matches.filter((m) => m.status === 'completed').length;

  const nextGroupMatches = matches
    .filter((m) => m.phase === 'group' && m.status !== 'completed' && m.order && m.playerAId && m.playerBId)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .slice(0, 5);
  const nextKnockoutMatches = matches
    .filter((m) => m.phase !== 'group' && m.status !== 'completed' && m.scheduledAt && m.playerAId && m.playerBId)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 5);
  const upcoming = nextGroupMatches.length > 0 ? nextGroupMatches : nextKnockoutMatches;

  const recent = matches
    .filter((m) => m.status === 'completed')
    .slice(-5)
    .reverse();

  return (
    <div className="space-y-10">
      <section
        className="relative overflow-hidden rounded-md border border-line p-8 text-center sm:p-16"
        style={
          config.backgroundImageUrl
            ? {
                backgroundImage: `url(${config.backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {config.backgroundImageUrl && (
          <div className="absolute inset-0 bg-paper/70 backdrop-blur-[1px]" />
        )}
        <div className="relative">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest-plus text-forest">
            {config.numGroups} grupos · {config.qualifiersPerGroup} clasificados por grupo
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl">{config.name}</h1>
          <div className="mt-6 flex flex-wrap justify-center gap-8 text-sm text-ink/70">
            <div>
              <p className="font-serif text-3xl text-ink">{players.length}</p>
              <p className="uppercase tracking-widest-plus text-xs">Jugadores</p>
            </div>
            <div>
              <p className="font-serif text-3xl text-ink">{completed}</p>
              <p className="uppercase tracking-widest-plus text-xs">Partidos jugados</p>
            </div>
            <div>
              <p className="font-serif text-3xl text-ink">{matches.length - completed}</p>
              <p className="uppercase tracking-widest-plus text-xs">Pendientes</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Orden de juego" title="Próximos partidos" action={<Link className="text-xs font-semibold uppercase tracking-widest-plus text-forest" to="/calendario">Ver calendario →</Link>} />
        {upcoming.length === 0 ? (
          <EmptyState>Todavía no hay partidos programados.</EmptyState>
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle eyebrow="Últimos resultados" title="Resultados recientes" />
        {recent.length === 0 ? (
          <EmptyState>Todavía no se ha jugado ningún partido.</EmptyState>
        ) : (
          <div className="space-y-3">
            {recent.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
