import { Group, Mesh, Scene } from 'three';
import { clamp, damp, lerp } from '../core/math';
import { propMaterial } from '../render/materials';
import { cone, cylinder, ico, mergeParts, part } from '../render/geometry';

const WHITE = 0xfffaf0;
const BLACK = 0x2d2925;
const PINK = 0xf0a19a;
const HOOF = 0x3e332b;
const CREAM = 0xf0dfbd;

function bodyMesh(): Mesh {
  const spots = [
    [0.35, 1.12, 0.32, 0.24],
    [-0.34, 1.2, -0.12, 0.3],
    [0.06, 1.22, -0.52, 0.22],
    [-0.34, 1.06, 0.55, 0.2],
    [0.4, 1.0, -0.3, 0.18]
  ];
  return new Mesh(
    mergeParts([
      part(ico(0.72, 1), { color: WHITE, pos: [0, 1.13, 0], scale: [0.84, 0.95, 1.5] }),
      ...spots.map(([x, y, z, radius]) =>
        part(ico(radius, 1), {
          color: BLACK,
          pos: [x, y, z],
          scale: [1, 0.78, 1]
        })
      ),
      part(ico(0.24, 1), { color: PINK, pos: [0, 0.82, -0.5], scale: [1, 0.55, 1] }),
      part(ico(0.055, 0), { color: 0xe18984, pos: [-0.12, 0.78, -0.46] }),
      part(ico(0.055, 0), { color: 0xe18984, pos: [0.12, 0.78, -0.46] }),
      part(ico(0.1, 0), { color: WHITE, pos: [0, 1.56, 0.3], scale: [1, 0.8, 1.3] })
    ]),
    propMaterial
  );
}

function headMesh(): Mesh {
  return new Mesh(
    mergeParts([
      part(ico(0.43, 1), { color: WHITE, pos: [0, 0.02, 0], scale: [1, 1, 1.05] }),
      part(ico(0.31, 1), { color: PINK, pos: [0, -0.12, 0.33], scale: [1, 0.72, 0.88] }),
      part(ico(0.055, 1), { color: 0xd88480, pos: [-0.1, -0.05, 0.58] }),
      part(ico(0.055, 1), { color: 0xd88480, pos: [0.1, -0.05, 0.58] }),
      part(ico(0.062, 0), { color: BLACK, pos: [-0.17, 0.12, 0.36] }),
      part(ico(0.062, 0), { color: BLACK, pos: [0.17, 0.12, 0.36] }),
      part(ico(0.032, 0), { color: WHITE, pos: [-0.16, 0.15, 0.4] }),
      part(ico(0.032, 0), { color: WHITE, pos: [0.18, 0.15, 0.4] }),
      part(ico(0.075, 1), { color: PINK, pos: [-0.42, 0.15, 0], scale: [1.4, 0.55, 0.8] }),
      part(ico(0.075, 1), { color: PINK, pos: [0.42, 0.15, 0], scale: [1.4, 0.55, 0.8] }),
      part(cone(0.08, 0.24, 5), { color: CREAM, pos: [-0.22, 0.47, -0.02], rot: [0, 0, 0.4] }),
      part(cone(0.08, 0.24, 5), { color: CREAM, pos: [0.22, 0.47, -0.02], rot: [0, 0, -0.4] }),
      part(ico(0.11, 1), { color: WHITE, pos: [0, 0.45, 0.1], scale: [1, 0.7, 1] })
    ]),
    propMaterial
  );
}

function makeLeg(side: number, front: number): Group {
  const leg = new Group();
  const mesh = new Mesh(
    mergeParts([
      part(cylinder(0.1, 0.12, 0.76, 6), { color: WHITE, pos: [0, -0.38, 0] }),
      part(cylinder(0.11, 0.13, 0.16, 6), { color: HOOF, pos: [0, -0.82, 0.02] })
    ]),
    propMaterial
  );
  leg.add(mesh);
  leg.position.set(side * 0.43, 0.85, front * 0.53);
  return leg;
}

export class CowActor {
  readonly root = new Group();
  private readonly headPivot = new Group();
  private readonly tailPivot = new Group();
  private readonly legs: Group[] = [];
  private readonly scene: Scene;
  private elapsed = 0;
  private walkTime = 0;
  private walkSpeed = 0;
  private strain = 0;
  private tailLift = 0;
  private graze = 0;
  private mode: 'idle' | 'strain' | 'walk' = 'idle';

  constructor(scene: Scene) {
    this.scene = scene;
    this.root.name = 'IntroCow';
    this.root.add(bodyMesh());
    const head = headMesh();
    this.headPivot.add(head);
    this.headPivot.position.set(0, 1.52, 0.92);
    this.root.add(this.headPivot);

    const tailMesh = new Mesh(
      mergeParts([
        part(cylinder(0.025, 0.04, 0.7, 5), {
          color: WHITE,
          pos: [0, -0.31, 0]
        }),
        part(ico(0.11, 1), { color: BLACK, pos: [0, -0.7, 0.02], scale: [0.8, 1.2, 0.9] })
      ]),
      propMaterial
    );
    this.tailPivot.add(tailMesh);
    this.tailPivot.position.set(0, 1.36, -1.03);
    this.tailPivot.rotation.z = 0.2;
    this.root.add(this.tailPivot);

    this.legs.push(makeLeg(-1, 1), makeLeg(1, 1), makeLeg(-1, -1), makeLeg(1, -1));
    for (const leg of this.legs) this.root.add(leg);

    scene.add(this.root);
    this.root.visible = false;
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  place(x: number, z: number, rotation = Math.PI): void {
    this.root.position.set(x, 0, z);
    this.root.rotation.y = rotation;
  }

  setMode(mode: 'idle' | 'strain' | 'walk'): void {
    this.mode = mode;
    if (mode === 'walk') this.walkSpeed = 1;
    if (mode !== 'walk') this.walkSpeed = 0;
  }

  typeStrain(value: number): void {
    this.strain = clamp(value, 0, 1);
  }

  liftTail(value: number): void {
    this.tailLift = clamp(value, 0, 1);
  }

  setGraze(value: number): void {
    this.graze = clamp(value, 0, 1);
  }

  update(dt: number): void {
    this.elapsed += dt;
    const idleGraze = this.mode === 'idle' ? 0.32 + Math.sin(this.elapsed * 1.2) * 0.08 : 0;
    const headTarget = this.mode === 'strain' ? -0.25 : lerp(idleGraze, 0, this.mode === 'walk' ? 1 : 0);
    this.headPivot.rotation.x = damp(this.headPivot.rotation.x, headTarget + this.strain * -0.18, 5, dt);
    const chew = Math.sin(this.elapsed * (3.2 + this.strain * 3)) * (0.035 + this.graze * 0.07);
    this.headPivot.rotation.z = damp(this.headPivot.rotation.z, chew + this.strain * 0.06, 8, dt);
    const tailBase = 0.2 + Math.sin(this.elapsed * 2.3) * 0.17;
    this.tailPivot.rotation.z = damp(
      this.tailPivot.rotation.z,
      tailBase + this.strain * 0.3,
      7,
      dt
    );
    this.tailPivot.rotation.x = damp(this.tailPivot.rotation.x, -1.85 * this.tailLift, 6, dt);
    const bodySquash = 1 - this.strain * 0.06;
    this.root.scale.set(1 + this.strain * 0.03, bodySquash, 1 + this.strain * 0.03);
    if (this.mode === 'walk') {
      this.walkTime += dt * 7.5;
      const swing = Math.sin(this.walkTime) * 0.55;
      this.legs[0].rotation.x = swing;
      this.legs[3].rotation.x = swing;
      this.legs[1].rotation.x = -swing;
      this.legs[2].rotation.x = -swing;
      this.root.position.y = Math.abs(Math.sin(this.walkTime)) * 0.08;
    } else {
      for (const leg of this.legs) leg.rotation.x = damp(leg.rotation.x, 0, 7, dt);
      this.root.position.y = damp(this.root.position.y, 0, 7, dt);
    }
  }

  dispose(): void {
    this.scene.remove(this.root);
  }
}
