import { useState, type FormEvent } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Badge, Button, Card, EmptyState, Field, SectionTitle, inputClass } from '../components/ui';

export function Players() {
  const isAdmin = useTournamentStore((s) => s.isAdmin);
  const players = useTournamentStore((s) => s.players);
  const groups = useTournamentStore((s) => s.groups);
  const addPlayer = useTournamentStore((s) => s.addPlayer);
  const updatePlayer = useTournamentStore((s) => s.updatePlayer);
  const removePlayer = useTournamentStore((s) => s.removePlayer);
  const assignPlayerToGroup = useTournamentStore((s) => s.assignPlayerToGroup);
  const autoAssignGroups = useTournamentStore((s) => s.autoAssignGroups);

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addPlayer(name);
    setName('');
  }

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setEditingName(current);
  }

  function saveEdit(id: string) {
    if (editingName.trim()) updatePlayer(id, editingName);
    setEditingId(null);
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow={`${players.length} jugadores`}
        title="Jugadores"
        action={
          isAdmin && (
            <Button variant="secondary" onClick={autoAssignGroups} disabled={players.length === 0}>
              Repartir en grupos al azar
            </Button>
          )
        }
      />

      {isAdmin && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label="Nuevo jugador">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre y apellido"
              />
            </Field>
          </div>
          <Button type="submit">Añadir</Button>
        </form>
      )}

      {players.length === 0 ? (
        <EmptyState>Todavía no has añadido jugadores.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {players.map((player) => {
            const group = groups.find((g) => g.id === player.groupId);
            return (
              <Card key={player.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  {editingId === player.id ? (
                    <input
                      autoFocus
                      className={inputClass}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveEdit(player.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(player.id)}
                    />
                  ) : (
                    <button
                      className="truncate text-left font-serif text-lg disabled:cursor-default"
                      disabled={!isAdmin}
                      onClick={() => startEdit(player.id, player.name)}
                    >
                      {player.name}
                    </button>
                  )}
                  <div className="mt-1">
                    <Badge tone={group ? 'forest' : 'neutral'}>{group ? group.name : 'Sin grupo'}</Badge>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      className={`${inputClass} w-auto`}
                      value={player.groupId ?? ''}
                      onChange={(e) => assignPlayerToGroup(player.id, e.target.value || null)}
                    >
                      <option value="">Sin grupo</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <Button variant="danger" onClick={() => removePlayer(player.id)}>
                      Eliminar
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
