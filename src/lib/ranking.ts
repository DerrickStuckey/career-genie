type CompareResult = -1 | 1;

// A yielded comparison request from the generator
interface CompareRequest {
  a: string;
  b: string;
}

// Generator-based merge sort that yields comparison requests
function* mergeSortGen(arr: string[], left: number, right: number): Generator<CompareRequest, void, CompareResult> {
  if (left >= right) return;
  const mid = Math.floor((left + right) / 2);
  yield* mergeSortGen(arr, left, mid);
  yield* mergeSortGen(arr, mid + 1, right);
  yield* mergeGen(arr, left, mid, right);
}

function* mergeGen(arr: string[], left: number, mid: number, right: number): Generator<CompareRequest, void, CompareResult> {
  const leftArr = arr.slice(left, mid + 1);
  const rightArr = arr.slice(mid + 1, right + 1);

  let i = 0, j = 0, k = left;

  while (i < leftArr.length && j < rightArr.length) {
    const result: CompareResult = yield { a: leftArr[i], b: rightArr[j] };
    if (result === -1) {
      arr[k++] = leftArr[i++];
    } else {
      arr[k++] = rightArr[j++];
    }
  }

  while (i < leftArr.length) arr[k++] = leftArr[i++];
  while (j < rightArr.length) arr[k++] = rightArr[j++];
}

export class RankingEngine {
  private arr: string[];
  private completedCount = 0;
  private totalEstimate: number;
  private result: string[] | null = null;
  private currentPair: [string, string] | null = null;
  private done = false;
  private gen: Generator<CompareRequest, void, CompareResult> | null = null;

  constructor(items: string[]) {
    this.arr = [...items];
    this.totalEstimate = items.length <= 1 ? 0 : Math.ceil(items.length * Math.log2(items.length));

    if (items.length <= 1) {
      this.result = [...items];
      this.done = true;
    } else {
      this.gen = mergeSortGen(this.arr, 0, this.arr.length - 1);
      // Advance to the first comparison
      this.advance(undefined);
    }
  }

  private advance(result: CompareResult | undefined): void {
    if (!this.gen) return;

    const next = result === undefined
      ? this.gen.next()
      : this.gen.next(result);

    if (next.done) {
      this.done = true;
      this.result = [...this.arr];
      this.currentPair = null;
      this.gen = null;
    } else {
      this.currentPair = [next.value.a, next.value.b];
    }
  }

  getCurrentPair(): [string, string] | null {
    return this.currentPair;
  }

  recordChoice(winner: string): void {
    if (!this.currentPair) return;

    const result: CompareResult = winner === this.currentPair[0] ? -1 : 1;
    this.completedCount++;
    this.advance(result);
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
