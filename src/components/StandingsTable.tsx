import type { StandingRow } from '../lib/standings';
import { playerName } from '../lib/standings';
import { useTournamentStore } from '../store/useTournamentStore';
import { Badge } from './ui';

export function StandingsTable({ rows, qualifiersCount }: { rows: StandingRow[]; qualifiersCount: number }) {
  const players = useTournamentStore((s) => s.players);

  return (
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
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.playerId} className={`border-b border-line/60 ${i < qualifiersCount ? 'bg-forest-light/50' : ''}`}>
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}
