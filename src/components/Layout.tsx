import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import { Button, inputClass } from './ui';

const NAV_LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/jugadores', label: 'Jugadores' },
  { to: '/grupos', label: 'Grupos' },
  { to: '/calendario', label: 'Calendario' },
  { to: '/cuadro', label: 'Cuadro final' },
  { to: '/configuracion', label: 'Configuración' },
];

function AdminPinModal({ onClose }: { onClose: () => void }) {
  const unlockAdmin = useTournamentStore((s) => s.unlockAdmin);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (unlockAdmin(pin)) {
      onClose();
    } else {
      setError('PIN incorrecto.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-xs rounded-md bg-paper p-6 shadow-xl"
      >
        <h2 className="mb-1 font-serif text-xl">Modo administrador</h2>
        <p className="mb-4 text-sm text-ink/60">Introduce el PIN para editar el torneo.</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={inputClass}
          placeholder="PIN"
        />
        {error && <p className="mt-2 text-xs text-accent">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Entrar</Button>
        </div>
      </form>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const isAdmin = useTournamentStore((s) => s.isAdmin);
  const lockAdmin = useTournamentStore((s) => s.lockAdmin);
  const tournamentName = useTournamentStore((s) => s.config.name);
  const [showPinModal, setShowPinModal] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-forest px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest-plus text-white">
        Patrocinado por DITO Collective
      </div>

      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <NavLink to="/" className="font-serif text-2xl leading-none text-ink">
            {tournamentName}
          </NavLink>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `text-xs font-semibold uppercase tracking-widest-plus transition-colors ${
                    isActive ? 'text-accent' : 'text-ink/70 hover:text-forest'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div>
            {isAdmin ? (
              <Button variant="secondary" onClick={lockAdmin}>
                Salir modo admin
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setShowPinModal(true)}>
                Modo admin
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-line bg-forest-dark px-4 py-8 text-center text-white sm:px-6">
        <p className="font-serif text-lg">DITO Collective</p>
        <p className="mt-1 text-xs uppercase tracking-widest-plus text-white/60">
          Orgullosos patrocinadores de este torneo
        </p>
      </footer>

      {showPinModal && <AdminPinModal onClose={() => setShowPinModal(false)} />}
    </div>
  );
}
