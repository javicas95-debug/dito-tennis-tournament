import type {
  GroupFormat,
  GroupResult,
  KnockoutFormat,
  KnockoutResult,
  SetScore,
} from '../types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Super tie-break: first to `points`, must win by at least `winBy`.
 * Below the target score, any margin is fine; once at/above it, the
 * winning margin must be exactly `winBy` (players keep playing until
 * that gap opens up, they don't run past it).
 */
export function validateGroupResult(result: GroupResult, format: GroupFormat): ValidationResult {
  const { pointsA, pointsB } = result;
  if (!Number.isInteger(pointsA) || !Number.isInteger(pointsB) || pointsA < 0 || pointsB < 0) {
    return { valid: false, error: 'Los puntos deben ser números enteros positivos.' };
  }
  if (pointsA === pointsB) {
    return { valid: false, error: 'No puede haber empate en un super tie-break.' };
  }
  const winner = Math.max(pointsA, pointsB);
  const loser = Math.min(pointsA, pointsB);
  const margin = winner - loser;
  if (winner < format.points) {
    return { valid: false, error: `El ganador debe llegar al menos a ${format.points} puntos.` };
  }
  if (loser < format.points - format.winBy) {
    if (winner !== format.points) {
      return {
        valid: false,
        error: `Con ${loser} puntos del perdedor, el ganador debería haber cerrado en ${format.points}.`,
      };
    }
  } else if (margin !== format.winBy) {
    return {
      valid: false,
      error: `A partir de ${format.points - format.winBy} puntos hay que ganar por una diferencia exacta de ${format.winBy}.`,
    };
  }
  return { valid: true };
}

export function groupResultWinner(result: GroupResult, aId: string, bId: string): string {
  return result.pointsA > result.pointsB ? aId : bId;
}

export function validateTiebreak(
  pointsA: number,
  pointsB: number,
  format: KnockoutFormat,
): ValidationResult {
  if (!Number.isInteger(pointsA) || !Number.isInteger(pointsB) || pointsA < 0 || pointsB < 0) {
    return { valid: false, error: 'El resultado del tie-break debe ser un entero positivo.' };
  }
  if (pointsA === pointsB) {
    return { valid: false, error: 'El tie-break no puede acabar en empate.' };
  }
  const winner = Math.max(pointsA, pointsB);
  const loser = Math.min(pointsA, pointsB);
  const margin = winner - loser;
  if (winner < format.tiebreakPoints) {
    return { valid: false, error: `El tie-break se juega a ${format.tiebreakPoints} puntos.` };
  }
  if (loser >= format.tiebreakPoints - format.tiebreakWinBy && margin !== format.tiebreakWinBy) {
    return { valid: false, error: `Hay que ganar el tie-break por ${format.tiebreakWinBy} de diferencia.` };
  }
  if (loser < format.tiebreakPoints - format.tiebreakWinBy && winner !== format.tiebreakPoints) {
    return { valid: false, error: `El tie-break debería haberse cerrado en ${format.tiebreakPoints}.` };
  }
  return { valid: true };
}

export function validateSet(set: SetScore, format: KnockoutFormat): ValidationResult {
  const { gamesA, gamesB } = set;
  if (!Number.isInteger(gamesA) || !Number.isInteger(gamesB) || gamesA < 0 || gamesB < 0) {
    return { valid: false, error: 'Los juegos deben ser números enteros positivos.' };
  }
  const max = format.gamesToWinSet;
  const tiebreakAt = format.tiebreakAtGames;
  if (gamesA === gamesB) {
    return { valid: false, error: 'Un set no puede acabar en empate de juegos.' };
  }
  const winner = Math.max(gamesA, gamesB);
  const loser = Math.min(gamesA, gamesB);

  if (loser === tiebreakAt && winner === tiebreakAt + 1) {
    // decided by tiebreak
    if (!set.tiebreak) {
      return { valid: false, error: `A ${tiebreakAt}-${tiebreakAt} hace falta jugar un tie-break.` };
    }
    return validateTiebreak(set.tiebreak.pointsA, set.tiebreak.pointsB, format);
  }
  if (set.tiebreak) {
    return { valid: false, error: 'Solo se juega tie-break cuando se llega a ese empate de juegos.' };
  }
  if (winner !== max || loser > tiebreakAt) {
    return {
      valid: false,
      error: `Un set se gana ${max}-0 a ${max}-${tiebreakAt - 1}, o por tie-break a ${tiebreakAt}-${tiebreakAt}.`,
    };
  }
  return { valid: true };
}

export function setWinner(set: SetScore, aId: string, bId: string): string {
  if (set.gamesA === set.gamesB && set.tiebreak) {
    return set.tiebreak.pointsA > set.tiebreak.pointsB ? aId : bId;
  }
  return set.gamesA > set.gamesB ? aId : bId;
}

export function validateKnockoutResult(
  result: KnockoutResult,
  format: KnockoutFormat,
): ValidationResult {
  if (result.sets.length === 0) {
    return { valid: false, error: 'Añade al menos un set.' };
  }
  let winsA = 0;
  let winsB = 0;
  for (let i = 0; i < result.sets.length; i++) {
    const set = result.sets[i];
    const check = validateSet(set, format);
    if (!check.valid) return { valid: false, error: `Set ${i + 1}: ${check.error}` };
    const isTiebreakSet = set.gamesA === set.gamesB && !!set.tiebreak;
    const aWinsSet = isTiebreakSet ? set.tiebreak!.pointsA > set.tiebreak!.pointsB : set.gamesA > set.gamesB;
    if (aWinsSet) winsA++;
    else winsB++;

    const decided = winsA === format.setsToWin || winsB === format.setsToWin;
    const isLastSet = i === result.sets.length - 1;
    if (decided && !isLastSet) {
      return { valid: false, error: 'El partido ya estaba decidido antes del último set introducido.' };
    }
    if (!decided && isLastSet) {
      return { valid: false, error: `Faltan sets para decidir el partido (a ${format.setsToWin} sets).` };
    }
  }
  return { valid: true };
}

export function knockoutResultWinner(result: KnockoutResult, aId: string, bId: string): string {
  let winsA = 0;
  let winsB = 0;
  for (const set of result.sets) {
    if (setWinner(set, aId, bId) === aId) winsA++;
    else winsB++;
  }
  return winsA > winsB ? aId : bId;
}
