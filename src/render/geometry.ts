import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Vec3Tuple = [number, number, number];

export interface PartOptions {
  color: number | string;
  pos?: Vec3Tuple;
  rot?: Vec3Tuple;
  scale?: Vec3Tuple;
}

function paint(geometry: BufferGeometry, color: number | string): void {
  const tint = new Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
}

export function part(geometry: BufferGeometry, options: PartOptions): BufferGeometry {
  let geometryOut = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  geometryOut.deleteAttribute('uv');
  geometryOut.deleteAttribute('uv1');
  const position = new Vector3(...(options.pos ?? [0, 0, 0]));
  const rotation = new Euler(...(options.rot ?? [0, 0, 0]));
  const scale = new Vector3(...(options.scale ?? [1, 1, 1]));
  const matrix = new Matrix4().compose(position, new Quaternion().setFromEuler(rotation), scale);
  geometryOut.applyMatrix4(matrix);
  geometryOut.computeVertexNormals();
  paint(geometryOut, options.color);
  return geometryOut;
}

export function mergeParts(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false);
  if (!merged) {
    throw new Error('No se pudieron fusionar las geometrías');
  }
  merged.computeBoundingSphere();
  return merged;
}

export function ico(radius: number, detail = 1): IcosahedronGeometry {
  return new IcosahedronGeometry(radius, detail);
}

export function sphere(radius: number, widthSegments = 8, heightSegments = 6): SphereGeometry {
  return new SphereGeometry(radius, widthSegments, heightSegments);
}

export function box(width: number, height: number, depth: number): BoxGeometry {
  return new BoxGeometry(width, height, depth);
}

export function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments = 8
): CylinderGeometry {
  return new CylinderGeometry(radiusTop, radiusBottom, height, segments);
}

export function cone(radius: number, height: number, segments = 8): ConeGeometry {
  return new ConeGeometry(radius, height, segments);
}

export function torus(
  radius: number,
  tube: number,
  radialSegments = 5,
  tubularSegments = 12,
  arc = Math.PI * 2
): TorusGeometry {
  return new TorusGeometry(radius, tube, radialSegments, tubularSegments, arc);
}
