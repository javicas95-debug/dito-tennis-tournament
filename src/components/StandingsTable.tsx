import { computeGroupStandings, findUnresolvedTies, playerName } from '../lib/standings';
import { useTournamentStore } from '../store/useTournamentStore';
import type { Group } from '../types';
import { Badge, Button } from './ui';

export function StandingsTable({ group, qualifiersCount }: { group: Group; qualifiersCount: number }) {
  const players = useTournamentStore((s) => s.players);
  const matches = useTournamentStore((s) => s.matches);
  const isAdmin = useTournamentStore((s) => s.isAdmin);
  const moveGroupStandingRow = useTournamentStore((s) => s.moveGroupStandingRow);
  const clearGroupManualOrder = useTournamentStore((s) => s.clearGroupManualOrder);

  const rows = computeGroupStandings(group, matches);
  const tiedClusters = findUnresolvedTies(group, matches);
  const tiedPlayerIds = new Set(tiedClusters.flat());

  return (
    <div>
      {tiedClusters.length > 0 && !group.manualOrder && (
        <p className="mb-3 rounded-sm bg-accent/10 p-3 text-xs text-accent">
          Empate entre {tiedClusters.map((c) => c.map((id) => playerName(players, id)).join(' / ')).join(', ')}{' '}
          sin resolver por puntos y diferencia. Jugad un mini-partido y ajustad el orden con las flechas.
        </p>
      )}
      {group.manualOrder && (
        <div className="mb-3 flex items-center justify-between rounded-sm bg-forest-light/50 p-3 text-xs text-forest">
          <span>Clasificación ajustada manualmente.</span>
          {isAdmin && (
            <Button variant="ghost" onClick={() => clearGroupManualOrder(group.id)}>
              Restaurar automática
            </Button>
          )}
        </div>
      )}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-widest-plus text-ink/50">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Jugador</th>
            <th className="py-2 pr-2 text-center">PJ</th>
            <th className="py-2 pr-2 text-center">G</th>
            <th className="py-2 pr-2 text-center">P</th>
            <th className="py-2 pr-2 text-center">Pts</th>
            <th className="py-2 pr-2 text-center">Dif.</th>
            {isAdmin && <th className="py-2 pr-2"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.playerId}
              className={`border-b border-line/60 ${i < qualifiersCount ? 'bg-forest-light/50' : ''} ${
                tiedPlayerIds.has(row.playerId) ? 'outline outline-1 outline-accent/40' : ''
              }`}
            >
              <td className="py-2 pr-2 text-ink/50">{i + 1}</td>
              <td className="py-2 pr-2 font-medium">
                {playerName(players, row.playerId)}
                {i < qualifiersCount && (
                  <span className="ml-2 inline-block">
                    <Badge tone="forest">Clasificado</Badge>
                  </span>
                )}
              </td>
              <td className="py-2 pr-2 text-center">{row.played}</td>
              <td className="py-2 pr-2 text-center">{row.wins}</td>
              <td className="py-2 pr-2 text-center">{row.losses}</td>
              <td className="py-2 pr-2 text-center font-semibold">{row.points}</td>
              <td className="py-2 pr-2 text-center">{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
              {isAdmin && (
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => moveGroupStandingRow(group.id, row.playerId, 'up')}
                      disabled={i === 0}
                    >
                      ▲
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => moveGroupStandingRow(group.id, row.playerId, 'down')}
                      disabled={i === rows.length - 1}
                    >
                      ▼
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
