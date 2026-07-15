import { useTournamentStore } from '../store/useTournamentStore';
import { inputClass } from './ui';

export function SeedsEditor() {
  const players = useTournamentStore((s) => s.players);
  const groups = useTournamentStore((s) => s.groups);
  const setSeedSlot = useTournamentStore((s) => s.setSeedSlot);

  const seedsNeeded = groups.length * 2;
  if (seedsNeeded === 0 || players.length === 0) return null;

  const playerByRank = new Map<number, string>();
  for (const p of players) {
    if (p.seedRank) playerByRank.set(p.seedRank, p.id);
  }
  const assignedCount = players.filter((p) => p.seedRank && p.seedRank <= seedsNeeded).length;

  function renderSlot(rank: number) {
    return (
      <div key={rank} className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-sm text-ink/50">#{rank}</span>
        <select
          className={inputClass}
          value={playerByRank.get(rank) ?? ''}
          onChange={(e) => setSeedSlot(rank, e.target.value || null)}
        >
          <option value="">Sin asignar</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-line bg-white/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg">Cabezas de serie</h2>
        <span className={`text-xs font-semibold uppercase tracking-widest-plus ${assignedCount === seedsNeeded ? 'text-forest' : 'text-ink/50'}`}>
          {assignedCount}/{seedsNeeded} asignadas
        </span>
      </div>
      <p className="text-sm text-ink/60">
        Del #1 al #{groups.length}: uno en cada grupo. Del #{groups.length + 1} al #{seedsNeeded}: también uno
        por grupo, repartidos al azar. El resto de jugadores se reparte al azar al pulsar "Repartir en grupos
        al azar". Si no se asignan las {seedsNeeded}, el sorteo será completamente aleatorio.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: groups.length }, (_, i) => renderSlot(i + 1))}
      </div>
      <div className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
        {Array.from({ length: groups.length }, (_, i) => renderSlot(groups.length + i + 1))}
      </div>
    </div>
  );
}
