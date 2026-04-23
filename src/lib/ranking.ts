interface ItemState {
  name: string;
  score: number;
  opponentScores: number[];
  hadBye: boolean;
}

const TOTAL_ROUNDS = 3;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class RankingEngine {
  private items: ItemState[];
  private round = 1;
  private matchIndex = 0;
  private roundPairings: Array<[number, number]> = [];
  private completedCount = 0;
  private totalEstimate: number;
  private result: string[] | null = null;
  private currentPair: [string, string] | null = null;
  private done = false;

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

    this.totalEstimate = TOTAL_ROUNDS * Math.floor(this.items.length / 2);
    this.generateRoundPairings();
    this.currentPair = this.pairAtIndex(0);
  }

  private generateRoundPairings(): void {
    const sorted = this.items
      .map((item, idx) => ({ idx, score: item.score }))
      .sort((a, b) => b.score - a.score);

    this.roundPairings = [];
    const paired = new Set<number>();

    // Handle bye for odd-count lists
    if (sorted.length % 2 === 1) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (!this.items[sorted[i].idx].hadBye) {
          this.items[sorted[i].idx].hadBye = true;
          paired.add(sorted[i].idx);
          break;
        }
      }
      // If everyone has had a bye, reset and pick lowest again
      if (paired.size === 0) {
        for (const item of this.items) item.hadBye = false;
        const lastIdx = sorted[sorted.length - 1].idx;
        this.items[lastIdx].hadBye = true;
        paired.add(lastIdx);
      }
    }

    // Pair adjacent items by score
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

    this.completedCount++;
    this.matchIndex++;

    if (this.matchIndex >= this.roundPairings.length) {
      this.round++;
      if (this.round > TOTAL_ROUNDS) {
        this.finish();
        return;
      }
      this.generateRoundPairings();
    }

    if (!this.done) {
      this.currentPair = this.pairAtIndex(this.matchIndex);
    }
  }

  private finish(): void {
    this.done = true;
    this.currentPair = null;
    this.result = [...this.items]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aStrength = a.opponentScores.reduce((s, v) => s + v, 0);
        const bStrength = b.opponentScores.reduce((s, v) => s + v, 0);
        return bStrength - aStrength;
      })
      .map((item) => item.name);
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
