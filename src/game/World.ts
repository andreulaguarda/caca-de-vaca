import {
  CircleGeometry,
  Color,
  DynamicDrawUsage,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Scene,
  Vector3
} from 'three';
import { PROPS, WORLD_RADIUS, isEdible, type PropId, type PropSpec } from '../config/balance';
import { dampAngle, easeInCubic, mulberry32, randomRange } from '../core/math';
import { createPropGeometry } from '../models/props';
import { propMaterial, shadowMaterial } from '../render/materials';
import type { Player } from '../entities/Player';

interface ZoneConfig {
  min: number;
  max: number;
  counts: Partial<Record<PropId, number>>;
}

interface Placement {
  typeId: PropId;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  radius: number;
}

export interface WorldItem {
  id: number;
  typeId: PropId;
  spec: PropSpec;
  x: number;
  z: number;
  yaw: number;
  baseScale: number;
  radius: number;
  index: number;
  shadowIndex: number;
  alive: boolean;
  eatT: number;
  startX: number;
  startZ: number;
  homeX: number;
  homeZ: number;
  homeYaw: number;
  homeHeading: number;
  motion: MotionConfig | null;
  heading: number;
  turnTimer: number;
  movePhase: number;
  speedFactor: number;
  bob: number;
}

interface TypeGroup {
  spec: PropSpec;
  mesh: InstancedMesh;
  items: WorldItem[];
}

export interface InteractionResult {
  eaten: WorldItem[];
  blocker: WorldItem | null;
}

type MotionKind = 'hopper' | 'walker' | 'grazer' | 'car';

interface MotionConfig {
  kind: MotionKind;
  speed: number;
  leash: number;
  hop: number;
  yawOffset: number;
  turnMin: number;
  turnMax: number;
  turnStep: number;
}

const MOTION: Partial<Record<PropId, MotionConfig>> = {
  mouse: { kind: 'hopper', speed: 1.6, leash: 11, hop: 0.055, yawOffset: 0, turnMin: 0.55, turnMax: 1.7, turnStep: 1.8 },
  rabbit: { kind: 'hopper', speed: 1.35, leash: 15, hop: 0.11, yawOffset: 0, turnMin: 0.7, turnMax: 2.1, turnStep: 1.5 },
  sheep: { kind: 'grazer', speed: 0.34, leash: 17, hop: 0, yawOffset: 0, turnMin: 1.6, turnMax: 4.2, turnStep: 0.75 },
  cow: { kind: 'grazer', speed: 0.24, leash: 22, hop: 0, yawOffset: 0, turnMin: 2.2, turnMax: 5.2, turnStep: 0.55 },
  farmer: { kind: 'walker', speed: 0.72, leash: 24, hop: 0, yawOffset: 0, turnMin: 1.1, turnMax: 3, turnStep: 1.2 },
  person: { kind: 'walker', speed: 0.86, leash: 26, hop: 0, yawOffset: 0, turnMin: 1, turnMax: 2.7, turnStep: 1.35 },
  car: { kind: 'car', speed: 5.2, leash: 92, hop: 0, yawOffset: -Math.PI / 2, turnMin: 2.4, turnMax: 5.5, turnStep: 0.45 }
};

const ZONES: ZoneConfig[] = [
  {
    min: 2.8,
    max: 28,
    counts: {
      grass: 180,
      flower: 75,
      mushroom: 58,
      mouse: 30,
      rabbit: 18,
      fence: 2
    }
  },
  {
    min: 0,
    max: 44,
    counts: {
      grass: 150,
      flower: 65,
      mushroom: 45,
      mouse: 32,
      rabbit: 24,
      fence: 10,
      sheep: 8
    }
  },
  {
    min: 36,
    max: 112,
    counts: {
      grass: 170,
      flower: 45,
      mushroom: 28,
      mouse: 18,
      rabbit: 12,
      sheep: 30,
      fence: 55,
      farmer: 30,
      person: 20,
      cow: 20,
      car: 10,
      tree: 22,
      house: 3
    }
  },
  {
    min: 104,
    max: 205,
    counts: {
      grass: 110,
      flower: 30,
      mushroom: 15,
      mouse: 10,
      rabbit: 8,
      sheep: 6,
      fence: 20,
      farmer: 18,
      person: 70,
      cow: 8,
      car: 25,
      tree: 30,
      house: 35,
      building: 8
    }
  },
  {
    min: 195,
    max: 298,
    counts: {
      grass: 25,
      flower: 8,
      mushroom: 4,
      mouse: 3,
      rabbit: 2,
      farmer: 12,
      person: 130,
      cow: 2,
      car: 40,
      tree: 25,
      house: 55,
      building: 70
    }
  }
];

const BIG_PROPS: PropId[] = ['tree', 'house', 'building'];
const PROP_LIFT = 0.028;
const SHADOW_LIFT = 0.12;

export class World {
  private readonly scene: Scene;
  private readonly groups = new Map<PropId, TypeGroup>();
  private readonly allItems: WorldItem[] = [];
  private readonly eating: WorldItem[] = [];
  private readonly movers: WorldItem[] = [];
  private readonly shadows: InstancedMesh;
  private readonly tmpPos = new Vector3();
  private readonly tmpQuat = new Quaternion();
  private readonly tmpScale = new Vector3();
  private readonly tmpMat = new Matrix4();
  private readonly tmpEuler = new Euler();
  private totalItems = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    const placements = this.scatter();
    this.totalItems = placements.length;
    const shadowGeometry = new CircleGeometry(1, 12);
    this.shadows = new InstancedMesh(shadowGeometry, shadowMaterial, this.totalItems);
    this.shadows.instanceMatrix.setUsage(DynamicDrawUsage);
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    scene.add(this.shadows);
    this.buildGroups(placements);
    this.writeAllMatrices();
  }

  private scatter(): Placement[] {
    const rng = mulberry32(20261121);
    const result: Placement[] = [];
    const bigPlacements: Array<{ x: number; z: number; radius: number }> = [];
    for (const zone of ZONES) {
      for (const [typeKey, rawCount] of Object.entries(zone.counts)) {
        const typeId = typeKey as PropId;
        const spec = PROPS[typeId];
        const count = rawCount ?? 0;
        for (let i = 0; i < count; i += 1) {
          let placed = false;
          for (let attempt = 0; attempt < 45 && !placed; attempt += 1) {
            const angle = rng() * Math.PI * 2;
            const radius = Math.sqrt(
              zone.min * zone.min + rng() * (zone.max * zone.max - zone.min * zone.min)
            );
            const limit = WORLD_RADIUS - spec.radius * 0.85 - 3;
            const x = Math.cos(angle) * Math.min(radius, limit);
            const z = Math.sin(angle) * Math.min(radius, limit);
            if (Math.hypot(x, z) < 2.35) continue;
            if (BIG_PROPS.includes(typeId)) {
              let overlaps = false;
              for (const other of bigPlacements) {
                if (Math.hypot(x - other.x, z - other.z) < (spec.radius + other.radius) * 0.72) {
                  overlaps = true;
                  break;
                }
              }
              if (overlaps) continue;
            }
            const scale = randomRange(rng, 0.9, 1.1);
            result.push({
              typeId,
              x,
              z,
              yaw: rng() * Math.PI * 2,
              scale,
              radius: spec.radius * scale
            });
            if (BIG_PROPS.includes(typeId)) {
              bigPlacements.push({ x, z, radius: spec.radius });
            }
            placed = true;
          }
        }
      }
    }
    for (let group = 0; group < 16; group += 1) {
      const city = group >= 8;
      const groupAngle = rng() * Math.PI * 2;
      const min = city ? 205 : 118;
      const max = city ? 285 : 192;
      const groupRadius = Math.sqrt(min * min + rng() * (max * max - min * min));
      const centerX = Math.cos(groupAngle) * groupRadius;
      const centerZ = Math.sin(groupAngle) * groupRadius;
      const crowdSize = 8 + Math.floor(rng() * 7);
      for (let person = 0; person < crowdSize; person += 1) {
        const angle = rng() * Math.PI * 2;
        const spread = Math.sqrt(rng()) * 12;
        const x = centerX + Math.cos(angle) * spread;
        const z = centerZ + Math.sin(angle) * spread;
        if (Math.hypot(x, z) > WORLD_RADIUS - 4) continue;
        const scale = randomRange(rng, 0.9, 1.1);
        result.push({
          typeId: 'person',
          x,
          z,
          yaw: rng() * Math.PI * 2,
          scale,
          radius: PROPS.person.radius * scale
        });
      }
    }
    return result;
  }

  private buildGroups(placements: Placement[]): void {
    const byType = new Map<PropId, Placement[]>();
    for (const placement of placements) {
      const list = byType.get(placement.typeId) ?? [];
      list.push(placement);
      byType.set(placement.typeId, list);
    }
    let shadowIndex = 0;
    for (const [typeId, list] of byType) {
      const spec = PROPS[typeId];
      const geometry = createPropGeometry(typeId);
      const mesh = new InstancedMesh(geometry, propMaterial, list.length);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.name = `Props_${typeId}`;
      const items: WorldItem[] = [];
      for (let i = 0; i < list.length; i += 1) {
        const placement = list[i];
        const motion = MOTION[typeId] ?? null;
        const homeYaw = placement.yaw + (motion?.yawOffset ?? 0);
        const item: WorldItem = {
          id: this.allItems.length,
          typeId,
          spec,
          x: placement.x,
          z: placement.z,
          yaw: homeYaw,
          baseScale: placement.scale,
          radius: placement.radius,
          index: i,
          shadowIndex: shadowIndex,
          alive: true,
          eatT: -1,
          startX: placement.x,
          startZ: placement.z,
          homeX: placement.x,
          homeZ: placement.z,
          homeYaw,
          homeHeading: placement.yaw,
          motion,
          heading: placement.yaw,
          turnTimer: randomRange(Math.random, 0.5, 3.5),
          movePhase: Math.random() * Math.PI * 2,
          speedFactor: randomRange(Math.random, 0.85, 1.16),
          bob: 0
        };
        items.push(item);
        this.allItems.push(item);
        if (motion) this.movers.push(item);
        const tint = new Color().setHSL(
          0.08,
          0.12,
          0.92 + ((i * 37) % 15) * 0.004
        );
        mesh.setColorAt(i, tint);
        shadowIndex += 1;
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.scene.add(mesh);
      this.groups.set(typeId, { spec, mesh, items });
    }
    this.shadows.count = shadowIndex;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  private composeItem(item: WorldItem, x: number, z: number, y: number, scale: number): void {
    this.tmpEuler.set(0, item.yaw, 0);
    this.tmpQuat.setFromEuler(this.tmpEuler);
    this.tmpPos.set(x, y, z);
    this.tmpScale.setScalar(scale);
    this.tmpMat.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
    const group = this.groups.get(item.typeId);
    if (!group) return;
    group.mesh.setMatrixAt(item.index, this.tmpMat);
    group.mesh.instanceMatrix.needsUpdate = true;
  }

  private composeShadow(item: WorldItem, x: number, z: number, scale: number): void {
    this.tmpMat.makeScale(scale, scale, 1);
    this.tmpMat.setPosition(x, SHADOW_LIFT, z);
    this.shadows.setMatrixAt(item.shadowIndex, this.tmpMat);
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  private writeAllMatrices(): void {
    for (const item of this.allItems) {
      this.composeItem(item, item.x, item.z, PROP_LIFT, item.baseScale);
      this.composeShadow(item, item.x, item.z, item.radius * 1.04);
    }
  }

  reset(): void {
    this.eating.length = 0;
    for (const item of this.allItems) {
      item.alive = true;
      item.eatT = -1;
      item.x = item.homeX;
      item.z = item.homeZ;
      item.yaw = item.homeYaw;
      item.heading = item.homeHeading;
      item.startX = item.homeX;
      item.startZ = item.homeZ;
      item.turnTimer = randomRange(Math.random, 0.5, 3.5);
      item.movePhase = Math.random() * Math.PI * 2;
      item.bob = 0;
      this.composeItem(item, item.x, item.z, PROP_LIFT, item.baseScale);
      this.composeShadow(item, item.x, item.z, item.radius * 1.04);
    }
  }

  interact(playerX: number, playerZ: number, playerRadius: number): InteractionResult {
    const eaten: WorldItem[] = [];
    let blocker: WorldItem | null = null;
    let blockerDist = Infinity;
    const edibleReach = playerRadius * 0.94;
    const bodyReach = playerRadius * 0.92;
    for (const item of this.allItems) {
      if (!item.alive) continue;
      const dx = playerX - item.x;
      const dz = playerZ - item.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > 2500) continue;
      const dist = Math.sqrt(distSq);
      if (isEdible(item.radius, playerRadius)) {
        if (dist < edibleReach + item.radius * 0.35) {
          eaten.push(item);
        }
      } else if (dist < bodyReach + item.radius * 0.66 && dist < blockerDist) {
        blocker = item;
        blockerDist = dist;
      }
    }
    return { eaten, blocker };
  }

  consume(item: WorldItem): void {
    if (!item.alive) return;
    item.alive = false;
    item.eatT = 0;
    item.startX = item.x;
    item.startZ = item.z;
    this.eating.push(item);
    this.composeShadow(item, item.x, item.z, 0);
  }

  ambient(dt: number): void {
    this.updateMovers(dt);
  }

  private updateMovers(dt: number): void {
    for (const item of this.movers) {
      if (!item.alive || item.eatT >= 0 || !item.motion) continue;
      const motion = item.motion;
      item.turnTimer -= dt;
      const homeDx = item.homeX - item.x;
      const homeDz = item.homeZ - item.z;
      const homeDistance = Math.hypot(homeDx, homeDz);
      const worldDistance = Math.hypot(item.x, item.z);
      if (homeDistance > motion.leash || worldDistance > WORLD_RADIUS - 4) {
        item.heading = Math.atan2(homeDx, homeDz);
        item.turnTimer = 1.2;
      } else if (item.turnTimer <= 0) {
        item.heading += randomRange(Math.random, -motion.turnStep, motion.turnStep);
        item.turnTimer = randomRange(Math.random, motion.turnMin, motion.turnMax);
      }
      const speed = motion.speed * item.speedFactor;
      const vx = Math.sin(item.heading) * speed;
      const vz = Math.cos(item.heading) * speed;
      const limit = WORLD_RADIUS - 4;
      const nextX = item.x + vx * dt;
      const nextZ = item.z + vz * dt;
      const nextDistance = Math.hypot(nextX, nextZ);
      if (nextDistance > limit) {
        const scale = limit / nextDistance;
        item.x = nextX * scale;
        item.z = nextZ * scale;
        item.heading = Math.atan2(-item.x, -item.z);
      } else {
        item.x = nextX;
        item.z = nextZ;
      }
      item.yaw = dampAngle(item.yaw, item.heading + motion.yawOffset, motion.kind === 'car' ? 3 : 9, dt);
      if (motion.kind === 'hopper') {
        item.movePhase += dt * (5 + speed);
        item.bob = Math.abs(Math.sin(item.movePhase)) * motion.hop;
      } else if (motion.kind === 'walker') {
        item.movePhase += dt * 6.2;
        item.bob = Math.abs(Math.sin(item.movePhase)) * 0.026;
      } else {
        item.bob = 0;
      }
      this.composeItem(item, item.x, item.z, PROP_LIFT + item.bob, item.baseScale);
      this.composeShadow(item, item.x, item.z, item.radius * 1.04);
    }
  }

  update(dt: number, player: Player): void {
    this.updateMovers(dt);
    for (let i = this.eating.length - 1; i >= 0; i -= 1) {
      const item = this.eating[i];
      item.eatT += dt;
      const t = Math.min(1, item.eatT / 0.24);
      const ease = easeInCubic(t);
      const x = item.startX + (player.position.x - item.startX) * ease;
      const z = item.startZ + (player.position.z - item.startZ) * ease;
      const y = PROP_LIFT + ease * (player.currentRadius * 1.5 + player.position.y);
      const scale = item.baseScale * (1 - t) * (1 - t);
      this.composeItem(item, x, z, y, scale);
      if (t >= 1) {
        this.composeItem(item, player.position.x, player.position.z, PROP_LIFT, 0);
        this.eating.splice(i, 1);
      }
    }
  }

  get total(): number {
    return this.totalItems;
  }

  get items(): readonly WorldItem[] {
    return this.allItems;
  }

  findNearestLabel(x: number, z: number, playerRadius: number): string | null {
    let best = Infinity;
    let label: string | null = null;
    for (const item of this.allItems) {
      if (!item.alive || !isEdible(item.radius, playerRadius)) continue;
      const dist = Math.hypot(item.x - x, item.z - z);
      if (dist < best) {
        best = dist;
        label = item.spec.label;
      }
    }
    return label;
  }
}
