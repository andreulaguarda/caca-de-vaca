import { describe, expect, it } from 'vitest';
import {
  PAR_SECONDS,
  PROPS,
  STAGES,
  START_RADIUS,
  isEdible,
  playerRadiusFor,
  scoreFor,
  speedBonusFor,
  speedForRadius
} from '../src/config/balance';

describe('reglas de crecimiento', () => {
  it('permite comer objetos claramente más pequeños', () => {
    expect(isEdible(PROPS.rabbit.radius, START_RADIUS)).toBe(true);
    expect(isEdible(PROPS.mouse.radius, START_RADIUS)).toBe(true);
    expect(isEdible(PROPS.grass.radius, START_RADIUS)).toBe(true);
  });

  it('impide comer objetos grandes o del mismo tamaño', () => {
    expect(isEdible(PROPS.sheep.radius, START_RADIUS)).toBe(false);
    expect(isEdible(PROPS.house.radius, 5)).toBe(false);
    expect(isEdible(0.89, 1)).toBe(false);
    expect(isEdible(0.87, 1)).toBe(true);
  });

  it('mantiene continuidad de radio entre fases', () => {
    const endOfFirst = playerRadiusFor(0, 1);
    const startOfSecond = playerRadiusFor(1, 0);
    expect(endOfFirst).toBeCloseTo(startOfSecond, 5);
    expect(playerRadiusFor(0, 0)).toBeCloseTo(START_RADIUS, 5);
  });

  it('aumenta la velocidad con el tamaño', () => {
    expect(speedForRadius(20)).toBeGreaterThan(speedForRadius(1));
    expect(speedForRadius(20)).toBeLessThan(60);
  });

  it('las fases ordenan los tamaños de los alimentos', () => {
    expect(STAGES.length).toBeGreaterThanOrEqual(8);
    const last = PROPS.building.radius;
    expect(playerRadiusFor(STAGES.length - 1, 1)).toBeGreaterThan(last);
  });

  it('el multiplicador de combo aumenta la puntuación', () => {
    expect(scoreFor(PROPS.cow, 3)).toBe(PROPS.cow.score * 3);
  });

  it('terminar antes aumenta la puntuación final', () => {
    const fast = speedBonusFor(10000, PAR_SECONDS * 0.5);
    const slow = speedBonusFor(10000, PAR_SECONDS);
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBe(0);
    expect(fast).toBeLessThanOrEqual(5000);
  });
});
