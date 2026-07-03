# Torneo de Tenis · DITO Collective

App para gestionar un torneo de tenis amateur: fase de grupos (todos contra
todos, a super tie-break) seguida de un cuadro eliminatorio (a sets cortos
con tie-break). Patrocinado por DITO Collective.

## Desarrollo

```bash
npm install
npm run dev
```

## Cómo funciona

- **Jugadores**: alta/edición/baja y asignación a grupos (manual o al azar).
- **Grupos**: genera automáticamente los partidos de todos contra todos,
  permite introducir resultados (super tie-break, con validación del
  formato) y calcula la clasificación en vivo (1 punto por victoria).
- **Cuadro final**: genera el cuadro eliminatorio a partir de los
  clasificados de cada grupo (evitando cruces entre rivales del mismo grupo
  en la primera ronda) y avanza automáticamente a los ganadores de cada
  partido.
- **Calendario**: vista unificada de horarios y pistas de todos los
  partidos, de grupos y de la fase final.
- **Configuración**: número de grupos, clasificados por grupo, formato de
  puntuación en cada fase, nombre del torneo, PIN de administrador y
  exportar/importar los datos del torneo como JSON.

## Datos

La app no usa un backend: todo se guarda en el `localStorage` del
navegador que administra el torneo. Usa **Configuración → Exportar datos**
para generar una copia de seguridad o compartir el estado del torneo, e
**Importar datos** para cargarlo en otro dispositivo.

## Modo administrador

Las acciones de edición (añadir jugadores, introducir resultados, fijar
horarios, cambiar la configuración) están protegidas por un PIN, editable
desde Configuración (por defecto `1234`). Sin desbloquear el modo admin,
la app se comporta como una vista de solo lectura para los jugadores.
