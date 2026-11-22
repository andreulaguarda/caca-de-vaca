import { APP_ID } from '../config/balance';

export interface GameRecord {
  score: number;
  stage: number;
  stageName: string;
  won: boolean;
  date: string;
  timeSeconds?: number;
  speedBonus?: number;
}

interface SaveData {
  muted: boolean;
  plays: number;
  records: GameRecord[];
}

const KEY = `${APP_ID}.save.v1`;
const EMPTY: SaveData = { muted: false, plays: 0, records: [] };

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, records: [] };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      muted: Boolean(parsed.muted),
      plays: Number.isFinite(parsed.plays) ? Number(parsed.plays) : 0,
      records: Array.isArray(parsed.records)
        ? parsed.records
            .filter(
              (record): record is GameRecord =>
                !!record &&
                Number.isFinite(record.score) &&
                Number.isFinite(record.stage) &&
                typeof record.stageName === 'string'
            )
            .slice(0, 8)
        : []
    };
  } catch {
    return { ...EMPTY, records: [] };
  }
}

function write(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    return;
  }
}

export const storage = {
  getMuted(): boolean {
    return read().muted;
  },
  setMuted(muted: boolean): void {
    const data = read();
    data.muted = muted;
    write(data);
  },
  getPlays(): number {
    return read().plays;
  },
  addPlay(): number {
    const data = read();
    data.plays += 1;
    write(data);
    return data.plays;
  },
  getRecords(): GameRecord[] {
    return read().records;
  },
  getBest(): GameRecord | null {
    return read().records[0] ?? null;
  },
  addRecord(record: GameRecord): { records: GameRecord[]; isBest: boolean } {
    const data = read();
    const previousBest = data.records[0]?.score ?? 0;
    data.records.push(record);
    data.records.sort((a, b) => b.score - a.score);
    data.records = data.records.slice(0, 5);
    write(data);
    return { records: data.records, isBest: record.score > previousBest };
  }
};
