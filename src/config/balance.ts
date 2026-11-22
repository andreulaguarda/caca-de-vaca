export const APP_ID = 'com.mesdemil.cacadevaca';
export const WORLD_RADIUS = 300;
export const START_RADIUS = 0.35;
export const FINAL_RADIUS = 34;
export const EAT_RATIO = 1;
export const PLAYER_SPEED_BASE = 3.8;
export const PLAYER_SPEED_SIZE = 1.8;
export const MAX_COMBO = 6;
export const COMBO_SECONDS = 2.2;
export const PAR_SECONDS = 600;
export const MAX_SPEED_BONUS = 0.5;

export type PropId =
  | 'grass'
  | 'flower'
  | 'mushroom'
  | 'mouse'
  | 'rabbit'
  | 'sheep'
  | 'fence'
  | 'farmer'
  | 'person'
  | 'cow'
  | 'car'
  | 'tree'
  | 'house'
  | 'building';

export interface PropSpec {
  id: PropId;
  label: string;
  radius: number;
  score: number;
  growth: number;
}

export const PROPS: Record<PropId, PropSpec> = {
  grass: { id: 'grass', label: 'hierba', radius: 0.1, score: 5, growth: 0.5 },
  flower: { id: 'flower', label: 'flor', radius: 0.12, score: 7, growth: 0.6 },
  mushroom: { id: 'mushroom', label: 'seta', radius: 0.17, score: 12, growth: 0.9 },
  mouse: { id: 'mouse', label: 'ratón', radius: 0.21, score: 20, growth: 1.4 },
  rabbit: { id: 'rabbit', label: 'conejo', radius: 0.28, score: 35, growth: 2.2 },
  sheep: { id: 'sheep', label: 'oveja', radius: 0.6, score: 80, growth: 6 },
  fence: { id: 'fence', label: 'valla', radius: 0.5, score: 60, growth: 4.5 },
  farmer: { id: 'farmer', label: 'granjero', radius: 1.0, score: 650, growth: 5 },
  person: { id: 'person', label: 'persona', radius: 1.1, score: 800, growth: 6 },
  cow: { id: 'cow', label: 'vaca', radius: 1.8, score: 320, growth: 20 },
  car: { id: 'car', label: 'coche', radius: 2.1, score: 500, growth: 12 },
  tree: { id: 'tree', label: 'árbol', radius: 3.4, score: 750, growth: 35 },
  house: { id: 'house', label: 'casa', radius: 5, score: 3000, growth: 50 },
  building: { id: 'building', label: 'edificio', radius: 9.5, score: 12000, growth: 70 }
};

export interface StageSpec {
  name: string;
  zone: string;
  radius: number;
  goal: number;
  unlock: PropId[];
}

export const STAGES: StageSpec[] = [
  {
    name: 'Cagarruta',
    zone: 'Prado',
    radius: START_RADIUS,
    goal: 12,
    unlock: ['grass', 'flower', 'mushroom', 'mouse', 'rabbit']
  },
  {
    name: 'Cacota',
    zone: 'Granja',
    radius: 0.8,
    goal: 30,
    unlock: ['sheep', 'fence']
  },
  {
    name: 'Granjera',
    zone: 'Camino',
    radius: 1.6,
    goal: 60,
    unlock: ['farmer', 'person']
  },
  {
    name: 'Ganadera',
    zone: 'Dehesa',
    radius: 2.8,
    goal: 120,
    unlock: ['cow', 'car']
  },
  {
    name: 'Maderera',
    zone: 'Arboleda',
    radius: 5.5,
    goal: 250,
    unlock: ['tree']
  },
  {
    name: 'Casera',
    zone: 'Pueblo',
    radius: 10,
    goal: 550,
    unlock: ['house']
  },
  {
    name: 'Caca Máxima',
    zone: 'Ciudad',
    radius: 20,
    goal: 2800,
    unlock: ['building']
  },
  {
    name: 'La caca más grande de todos los tiempos',
    zone: 'Leyenda',
    radius: FINAL_RADIUS,
    goal: 0,
    unlock: []
  }
];

export function isEdible(objectRadius: number, playerRadius: number): boolean {
  return objectRadius <= playerRadius * EAT_RATIO;
}

export function playerRadiusFor(stageIndex: number, progress: number): number {
  const index = Math.max(0, Math.min(STAGES.length - 1, Math.floor(stageIndex)));
  const start = STAGES[index].radius;
  const end = index + 1 < STAGES.length ? STAGES[index + 1].radius : FINAL_RADIUS;
  return start + (end - start) * Math.max(0, Math.min(1, progress));
}

export function speedForRadius(radius: number): number {
  return PLAYER_SPEED_BASE + radius * PLAYER_SPEED_SIZE;
}

export function scoreFor(prop: PropSpec, multiplier: number): number {
  return Math.round(prop.score * multiplier);
}

export function speedBonusFor(baseScore: number, elapsedSeconds: number): number {
  const elapsed = Math.max(1, elapsedSeconds);
  const rate = Math.max(0, Math.min(MAX_SPEED_BONUS, (PAR_SECONDS - elapsed) / elapsed));
  return Math.round(baseScore * rate);
}
