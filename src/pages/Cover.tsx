import { useTournamentStore } from '../store/useTournamentStore';
import { EmptyState, SectionTitle } from '../components/ui';

export function Cover() {
  const coverImageUrl = useTournamentStore((s) => s.config.coverImageUrl);
  const isAdmin = useTournamentStore((s) => s.isAdmin);

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Cartel del torneo" title="Portada" />
      {coverImageUrl ? (
        <img src={coverImageUrl} alt="Portada del torneo" className="mx-auto w-full max-w-2xl rounded-md border border-line" />
      ) : (
        <EmptyState>
          Todavía no se ha subido una portada.
          {isAdmin && ' Ve a Configuración → Imágenes para subirla.'}
        </EmptyState>
      )}
    </div>
  );
}
