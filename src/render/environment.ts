import {
  BackSide,
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3
} from 'three';
import { clamp, mulberry32, randomRange } from '../core/math';
import { WORLD_RADIUS } from '../config/balance';
import {
  createDirtTexture,
  createGrassTexture,
  createStoneTexture,
  palette,
  propMaterial
} from './materials';
import { createDecorativeGrassGeometry } from '../models/props';
import { ico, mergeParts, part } from './geometry';

function createSky(): Mesh {
  const material = new ShaderMaterial({
    uniforms: {
      topColor: { value: new Color(0x55c7ee) },
      midColor: { value: new Color(0xa9e8fa) },
      bottomColor: { value: new Color(0xe9f6d4) }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = clamp(normalize(vWorld).y * 1.35 + 0.04, 0.0, 1.0);
        vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.35, h));
        col = mix(col, topColor, smoothstep(0.32, 0.9, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: BackSide,
    depthWrite: false,
    fog: false
  });
  const sky = new Mesh(new SphereGeometry(1400, 24, 16), material);
  sky.renderOrder = -10;
  return sky;
}

function createHills(): InstancedMesh {
  const rng = mulberry32(77812);
  const geometry = ico(1, 1);
  const material = new MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const count = 30;
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  const matrix = new Matrix4();
  const color = new Color();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + randomRange(rng, -0.1, 0.1);
    const radius = randomRange(rng, 520, 850);
    const width = randomRange(rng, 55, 140);
    const height = randomRange(rng, 28, 90);
    matrix.compose(
      new Vector3(Math.cos(angle) * radius, -height * 0.38, Math.sin(angle) * radius),
      new Quaternion(),
      new Vector3(width, height, width)
    );
    mesh.setMatrixAt(i, matrix);
    color.setHSL(randomRange(rng, 0.23, 0.32), randomRange(rng, 0.3, 0.48), randomRange(rng, 0.36, 0.5));
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function createPatches(): Group {
  const group = new Group();
  const stoneTexture = createStoneTexture();
  const dirtTexture = createDirtTexture();
  const stoneMaterial = new MeshLambertMaterial({ map: stoneTexture, color: 0xffffff });
  const dirtMaterial = new MeshLambertMaterial({ map: dirtTexture, color: 0xefd6a3 });
  for (let i = 0; i < 4; i += 1) {
    const angle = i * (Math.PI / 2) + 0.55;
    const patch = new Mesh(new CircleGeometry(randomRange(mulberry32(i + 50), 26, 44), 28), stoneMaterial);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = angle;
    patch.position.set(Math.cos(angle) * 176, 0.006, Math.sin(angle) * 176);
    group.add(patch);
  }
  for (let i = 0; i < 5; i += 1) {
    const angle = i * 1.31 + 0.2;
    const patch = new Mesh(new CircleGeometry(7 + (i % 3) * 4, 18), dirtMaterial);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = angle;
    patch.position.set(Math.cos(angle) * 55, 0.008, Math.sin(angle) * 55);
    group.add(patch);
  }
  return group;
}

export class Environment {
  private readonly fog: Fog;
  private elapsed = 0;

  constructor(scene: Scene) {
    this.fog = new Fog(palette.fog, 50, 170);
    scene.fog = this.fog;
    scene.add(createSky());

    const hemi = new HemisphereLight(0xd9f4ff, 0x5d8f40, 1.7);
    scene.add(hemi);
    const sun = new DirectionalLight(0xfff4d6, 2.4);
    sun.position.set(70, 130, 55);
    scene.add(sun);
    const fill = new DirectionalLight(0xa8d8ff, 0.5);
    fill.position.set(-80, 40, -50);
    scene.add(fill);

    const ground = new Mesh(
      new PlaneGeometry(1800, 1800),
      new MeshLambertMaterial({ map: createGrassTexture(), color: 0xffffff })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);
    scene.add(createPatches());

    const grassGeometry = createDecorativeGrassGeometry();
    const count = 4200;
    const grass = new InstancedMesh(grassGeometry, propMaterial, count);
    grass.frustumCulled = false;
    const rng = mulberry32(20261121);
    const matrix = new Matrix4();
    const color = new Color();
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * (WORLD_RADIUS - 3);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = randomRange(rng, 0.6, 1.7);
      matrix.makeScale(scale, scale * randomRange(rng, 0.8, 1.4), scale);
      matrix.setPosition(x, 0, z);
      grass.setMatrixAt(i, matrix);
      color.setHSL(randomRange(rng, 0.23, 0.32), randomRange(rng, 0.38, 0.6), randomRange(rng, 0.4, 0.56));
      grass.setColorAt(i, color);
    }
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) {
      grass.instanceColor.needsUpdate = true;
    }
    scene.add(grass);

    scene.add(createHills());
  }

  setFogForCamera(distance: number): void {
    this.fog.near = clamp(distance * 1.6, 50, 1600);
    this.fog.far = clamp(distance * 6.5, 180, 2300);
  }

  update(dt: number): void {
    this.elapsed += dt;
  }
}
