import { useTournamentStore } from '../store/useTournamentStore';
import { computeStandardCrossings, isPowerOfTwo } from '../lib/seeding';
import type { Crossing, CrossingSlot, Group } from '../types';
import { Button, inputClass } from './ui';

function slotValue(slot: CrossingSlot): string {
  return `${slot.groupId}:${slot.rank}`;
}

function parseSlot(value: string): CrossingSlot {
  const [groupId, rank] = value.split(':');
  return { groupId, rank: Number(rank) };
}

function CrossingSelect({
  groups,
  qualifiersPerGroup,
  value,
  onChange,
}: {
  groups: Group[];
  qualifiersPerGroup: number;
  value: CrossingSlot;
  onChange: (slot: CrossingSlot) => void;
}) {
  return (
    <select
      className={`${inputClass} w-auto`}
      value={slotValue(value)}
      onChange={(e) => onChange(parseSlot(e.target.value))}
    >
      {groups.map((g) =>
        Array.from({ length: qualifiersPerGroup }, (_, rank) => (
          <option key={slotValue({ groupId: g.id, rank })} value={slotValue({ groupId: g.id, rank })}>
            {g.name} · {rank + 1}º
          </option>
        )),
      )}
    </select>
  );
}

export function CrossingsEditor() {
  const groups = useTournamentStore((s) => s.groups);
  const config = useTournamentStore((s) => s.config);
  const setConfig = useTournamentStore((s) => s.setConfig);

  const totalQualifiers = groups.length * config.qualifiersPerGroup;

  if (groups.length < 2 || !isPowerOfTwo(totalQualifiers)) {
    return (
      <p className="text-sm text-ink/60">
        Los cruces personalizados requieren que el número total de clasificados ({totalQualifiers}) sea una
        potencia de 2 (2, 4, 8, 16...).
      </p>
    );
  }

  const expectedPairs = totalQualifiers / 2;
  const standard = computeStandardCrossings(groups, config.qualifiersPerGroup);
  const current = config.customCrossings?.length === expectedPairs ? config.customCrossings : standard;
  const isCustom = config.customCrossings?.length === expectedPairs;

  function updateCrossing(index: number, side: 'a' | 'b', slot: CrossingSlot) {
    const next: Crossing[] = current.map((c, i) => (i === index ? { ...c, [side]: slot } : c));
    setConfig({ customCrossings: next });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60">
        Define manualmente los cruces de la primera ronda del cuadro final. Si no los tocas, se usa el
        emparejamiento automático (evitando que se crucen rivales del mismo grupo).
      </p>
      {current.map((crossing, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs uppercase tracking-widest-plus text-ink/40">Cruce {i + 1}</span>
          <CrossingSelect
            groups={groups}
            qualifiersPerGroup={config.qualifiersPerGroup}
            value={crossing.a}
            onChange={(slot) => updateCrossing(i, 'a', slot)}
          />
          <span className="text-ink/40">vs</span>
          <CrossingSelect
            groups={groups}
            qualifiersPerGroup={config.qualifiersPerGroup}
            value={crossing.b}
            onChange={(slot) => updateCrossing(i, 'b', slot)}
          />
        </div>
      ))}
      {isCustom && (
        <Button variant="ghost" onClick={() => setConfig({ customCrossings: undefined })}>
          Restaurar cruces automáticos
        </Button>
      )}
    </div>
  );
}
