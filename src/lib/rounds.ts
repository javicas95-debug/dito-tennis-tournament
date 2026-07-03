/**
 * Given the number of knockout rounds needed (log2 of qualifier count),
 * returns the round labels in play order, e.g. 3 -> ['quarterfinal',
 * 'semifinal', 'final']. Extra early rounds beyond round-of-16 are
 * labelled generically ('round-of-32', etc).
 */
export function roundLabels(numRounds: number): string[] {
  const named = ['final', 'semifinal', 'quarterfinal', 'round-of-16', 'round-of-32', 'round-of-64'];
  const labels: string[] = [];
  for (let i = numRounds - 1; i >= 0; i--) {
    labels.push(named[i] ?? `round-of-${2 ** (i + 1)}`);
  }
  return labels;
}

export function roundDisplayName(label: string): string {
  switch (label) {
    case 'final':
      return 'Final';
    case 'semifinal':
      return 'Semifinal';
    case 'quarterfinal':
      return 'Cuartos de final';
    case 'round-of-16':
      return 'Octavos de final';
    default: {
      const match = /round-of-(\d+)/.exec(label);
      return match ? `Ronda de ${match[1]}` : label;
    }
  }
}
