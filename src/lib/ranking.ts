interface ItemState {
  name: string;
  score: number;
  opponentScores: number[];
  hadBye: boolean;
}

type Phase = 'full' | 'bye-match' | 'elimination';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sosScore(item: ItemState): number {
  return item.opponentScores.reduce((a, b) => a + b, 0);
}

export class RankingEngine {
  private items: ItemState[];
  private phase: Phase = 'full';
  private fullRound = 1;
  private matchIndex = 0;
  private roundPairings: Array<[number, number]> = [];
  private completedCount = 0;
  private totalEstimate: number;
  private result: string[] | null = null;
  private currentPair: [string, string] | null = null;
  private done = false;

  private elimBracket: number[] = [];
  private elimRoundWinners: number[] = [];
  private elimFinishOrder: number[] = [];

  constructor(names: string[]) {
    if (names.length <= 1) {
      this.items = names.map((name) => ({ name, score: 0, opponentScores: [], hadBye: false }));
      this.totalEstimate = 0;
      this.result = [...names];
      this.done = true;
      return;
    }

    this.items = shuffle(names).map((name) => ({
      name,
      score: 0,
      opponentScores: [],
      hadBye: false,
    }));

    const matchesPerRound = Math.floor(this.items.length / 2);
    const hasByes = this.items.length % 2 === 1;
    this.totalEstimate = 2 * matchesPerRound + (hasByes ? 1 : 0) + 3;

    this.generateFullRoundPairings();
    this.currentPair = this.pairAtIndex(0);
  }

  private generateFullRoundPairings(): void {
    const sorted = this.items
      .map((item, idx) => ({ idx, score: item.score }))
      .sort((a, b) => b.score - a.score);

    this.roundPairings = [];
    const paired = new Set<number>();

    if (sorted.length % 2 === 1) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (!this.items[sorted[i].idx].hadBye) {
          this.items[sorted[i].idx].hadBye = true;
          paired.add(sorted[i].idx);
          break;
        }
      }
      if (paired.size === 0) {
        for (const item of this.items) item.hadBye = false;
        const lastIdx = sorted[sorted.length - 1].idx;
        this.items[lastIdx].hadBye = true;
        paired.add(lastIdx);
      }
    }

    const unpaired = sorted.filter((s) => !paired.has(s.idx));
    for (let i = 0; i + 1 < unpaired.length; i += 2) {
      this.roundPairings.push([unpaired[i].idx, unpaired[i + 1].idx]);
    }

    this.matchIndex = 0;
  }

  private pairAtIndex(idx: number): [string, string] {
    const [a, b] = this.roundPairings[idx];
    return [this.items[a].name, this.items[b].name];
  }

  getCurrentPair(): [string, string] | null {
    return this.currentPair;
  }

  recordChoice(winner: string): void {
    if (!this.currentPair || this.done) return;

    const [aIdx, bIdx] = this.roundPairings[this.matchIndex];
    const winnerIdx = this.items[aIdx].name === winner ? aIdx : bIdx;
    const loserIdx = winnerIdx === aIdx ? bIdx : aIdx;

    this.items[winnerIdx].score++;
    this.items[winnerIdx].opponentScores.push(this.items[loserIdx].score);
    this.items[loserIdx].opponentScores.push(this.items[winnerIdx].score);

    if (this.phase === 'elimination') {
      this.elimRoundWinners.push(winnerIdx);
      this.elimFinishOrder.push(loserIdx);
    }

    this.completedCount++;
    this.matchIndex++;

    if (this.matchIndex >= this.roundPairings.length) {
      this.transition();
    }

    if (!this.done) {
      this.currentPair = this.pairAtIndex(this.matchIndex);
    }
  }

  private transition(): void {
    if (this.phase === 'full') {
      if (this.fullRound < 2) {
        this.fullRound++;
        this.generateFullRoundPairings();
      } else if (this.items.length % 2 === 1) {
        this.startByeMatch();
      } else {
        this.startElimination();
      }
    } else if (this.phase === 'bye-match') {
      this.startElimination();
    } else if (this.phase === 'elimination') {
      this.advanceElimination();
    }
  }

  private startByeMatch(): void {
    this.phase = 'bye-match';
    const byeIndices = this.items
      .map((item, idx) => ({ idx, hadBye: item.hadBye }))
      .filter((x) => x.hadBye)
      .map((x) => x.idx);

    this.roundPairings = [[byeIndices[0], byeIndices[1]]];
    this.matchIndex = 0;
  }

  private startElimination(): void {
    const twoWinners = this.items
      .map((item, idx) => ({ idx, score: item.score, sos: sosScore(item) }))
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.sos - a.sos);

    if (twoWinners.length <= 1) {
      this.totalEstimate = this.completedCount;
      this.finish();
      return;
    }

    this.phase = 'elimination';
    this.elimBracket = twoWinners.map((x) => x.idx);
    this.elimRoundWinners = [];
    this.elimFinishOrder = [];

    this.totalEstimate = this.completedCount + (this.elimBracket.length - 1);
    this.generateElimPairings();
  }

  private generateElimPairings(): void {
    this.roundPairings = [];
    this.matchIndex = 0;
    this.elimRoundWinners = [];

    let startIdx = 0;
    if (this.elimBracket.length % 2 === 1) {
      this.elimRoundWinners.push(this.elimBracket[0]);
      startIdx = 1;
    }

    for (let i = startIdx; i + 1 < this.elimBracket.length; i += 2) {
      this.roundPairings.push([this.elimBracket[i], this.elimBracket[i + 1]]);
    }
  }

  private advanceElimination(): void {
    this.elimBracket = this.elimRoundWinners;

    if (this.elimBracket.length <= 1) {
      if (this.elimBracket.length === 1) {
        this.elimFinishOrder.push(this.elimBracket[0]);
      }
      this.finish();
    } else {
      this.generateElimPairings();
    }
  }

  private finish(): void {
    this.done = true;
    this.currentPair = null;

    const elimSet = new Set(this.elimFinishOrder);
    const elimRanked = [...this.elimFinishOrder].reverse();

    const rest = this.items
      .map((item, idx) => ({ idx, score: item.score, sos: sosScore(item) }))
      .filter((x) => !elimSet.has(x.idx))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.sos - a.sos;
      });

    this.result = [
      ...elimRanked.map((idx) => this.items[idx].name),
      ...rest.map((x) => this.items[x.idx].name),
    ];
  }

  isComplete(): boolean {
    return this.done;
  }

  getResult(): string[] | null {
    return this.result;
  }

  getCompletedCount(): number {
    return this.completedCount;
  }

  getTotalEstimate(): number {
    return this.totalEstimate;
  }
}
