import { useRef, useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Button, Card, EmptyState, Field, SectionTitle, inputClass } from '../components/ui';
import { CrossingsEditor } from '../components/CrossingsEditor';
import type { TournamentState } from '../types';

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={1}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function Settings() {
  const isAdmin = useTournamentStore((s) => s.isAdmin);
  const config = useTournamentStore((s) => s.config);
  const setConfig = useTournamentStore((s) => s.setConfig);
  const setNumGroups = useTournamentStore((s) => s.setNumGroups);
  const resetTournament = useTournamentStore((s) => s.resetTournament);
  const importState = useTournamentStore((s) => s.importState);
  const exportState = useTournamentStore((s) => s.exportState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [numGroupsInput, setNumGroupsInput] = useState(config.numGroups);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Configuración" title="Configuración" />
        <EmptyState>Entra en modo administrador para editar la configuración del torneo.</EmptyState>
      </div>
    );
  }

  function handleExport() {
    const data = exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as TournamentState;
        importState(data);
      } catch {
        alert('El archivo no es un JSON de torneo válido.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-10">
      <SectionTitle eyebrow="Configuración" title="Configuración del torneo" />

      <section className="space-y-4">
        <h2 className="font-serif text-xl">General</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del torneo">
            <input
              className={inputClass}
              value={config.name}
              onChange={(e) => setConfig({ name: e.target.value })}
            />
          </Field>
          <Field label="PIN de administrador">
            <input
              className={inputClass}
              value={config.adminPin}
              onChange={(e) => setConfig({ adminPin: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl">Fase de grupos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <NumberField label="Número de grupos" value={numGroupsInput} onChange={setNumGroupsInput} />
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm('Cambiar el número de grupos borrará los grupos y partidos de grupo actuales. ¿Continuar?')) {
                  setNumGroups(numGroupsInput);
                }
              }}
            >
              Aplicar
            </Button>
          </div>
          <NumberField
            label="Clasificados por grupo"
            value={config.qualifiersPerGroup}
            onChange={(v) => setConfig({ qualifiersPerGroup: v })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Puntos del super tie-break"
            value={config.groupFormat.points}
            onChange={(v) => setConfig({ groupFormat: { ...config.groupFormat, points: v } })}
          />
          <NumberField
            label="Diferencia mínima"
            value={config.groupFormat.winBy}
            onChange={(v) => setConfig({ groupFormat: { ...config.groupFormat, winBy: v } })}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl">Cruces del cuadro final</h2>
        <CrossingsEditor />
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl">Fase final</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Sets para ganar el partido"
            value={config.knockoutFormat.setsToWin}
            onChange={(v) => setConfig({ knockoutFormat: { ...config.knockoutFormat, setsToWin: v } })}
          />
          <NumberField
            label="Juegos para ganar un set"
            value={config.knockoutFormat.gamesToWinSet}
            onChange={(v) => setConfig({ knockoutFormat: { ...config.knockoutFormat, gamesToWinSet: v } })}
          />
          <NumberField
            label="Empate de juegos que activa tie-break"
            value={config.knockoutFormat.tiebreakAtGames}
            onChange={(v) => setConfig({ knockoutFormat: { ...config.knockoutFormat, tiebreakAtGames: v } })}
          />
          <NumberField
            label="Puntos del tie-break"
            value={config.knockoutFormat.tiebreakPoints}
            onChange={(v) => setConfig({ knockoutFormat: { ...config.knockoutFormat, tiebreakPoints: v } })}
          />
          <NumberField
            label="Diferencia mínima del tie-break"
            value={config.knockoutFormat.tiebreakWinBy}
            onChange={(v) => setConfig({ knockoutFormat: { ...config.knockoutFormat, tiebreakWinBy: v } })}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl">Datos</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleExport}>
            Exportar datos (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Importar datos (JSON)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
          />
        </div>
        <Card className="border-accent/40 bg-accent/5 p-4">
          <p className="mb-3 text-sm text-ink/70">
            Esto borra todos los jugadores, grupos y partidos. Úsalo solo para empezar un torneo nuevo.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('¿Seguro que quieres borrar todo el torneo? Esta acción no se puede deshacer.')) {
                resetTournament();
              }
            }}
          >
            Reiniciar torneo
          </Button>
        </Card>
      </section>
    </div>
  );
}
