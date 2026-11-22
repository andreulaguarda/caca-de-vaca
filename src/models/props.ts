import type { BufferGeometry } from 'three';
import type { PropId } from '../config/balance';
import {
  box,
  cone,
  cylinder,
  ico,
  mergeParts,
  part,
  torus
} from '../render/geometry';

const C = {
  white: 0xfffaf0,
  cream: 0xf4e4bd,
  black: 0x2e2822,
  dark: 0x3c3025,
  pink: 0xf1a49c,
  red: 0xdd5a48,
  darkRed: 0xb64032,
  green: 0x4f9b3b,
  lightGreen: 0x7bc653,
  darkGreen: 0x34732b,
  trunk: 0x80532f,
  trunkLight: 0x9a693d,
  wood: 0xa9794b,
  woodDark: 0x7d5734,
  grey: 0x8d9296,
  lightGrey: 0xb8b9b1,
  blue: 0x3f6fa8,
  denim: 0x355f8e,
  window: 0x8ed7e8,
  roof: 0xc4694c,
  roofDark: 0x9b4d37,
  straw: 0xe1b75b,
  skin: 0xf1c29a,
  skinDark: 0xcf9a70,
  asphalt: 0x555a5e,
  yellow: 0xffcc45,
  orange: 0xe78f3b,
  purple: 0x8a68b0,
  leaf: 0x4f9a3b,
  leafLight: 0x67b94a,
  leafDark: 0x37762c,
  brick: 0xb56f53,
  building: 0xd8c9a8,
  buildingBlue: 0x8ea1a8,
  buildingWarm: 0xd6a879
};

function blades(): BufferGeometry[] {
  const result: BufferGeometry[] = [];
  const greens = [C.green, C.lightGreen, C.darkGreen];
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + 0.35;
    const lean = 0.22 + (i % 3) * 0.08;
    result.push(
      part(cone(0.055, 0.28 + (i % 2) * 0.08, 4), {
        color: greens[i % greens.length],
        pos: [Math.cos(angle) * 0.05, 0.16 + (i % 2) * 0.03, Math.sin(angle) * 0.05],
        rot: [Math.cos(angle) * lean, angle, Math.sin(angle) * lean]
      })
    );
  }
  return result;
}

function createGrass(): BufferGeometry {
  return mergeParts(blades());
}

function createFlower(): BufferGeometry {
  const petals: BufferGeometry[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    petals.push(
      part(ico(0.065, 0), {
        color: i % 2 === 0 ? 0xfff5e8 : 0xffd45c,
        pos: [Math.cos(angle) * 0.09, 0.31, Math.sin(angle) * 0.09],
        scale: [1.5, 0.55, 0.8],
        rot: [0, -angle, 0]
      })
    );
  }
  return mergeParts([
    part(cylinder(0.015, 0.022, 0.3, 5), { color: C.green, pos: [0, 0.15, 0] }),
    part(ico(0.055, 1), { color: C.yellow, pos: [0, 0.33, 0] }),
    ...petals,
    part(ico(0.055, 0), { color: C.lightGreen, pos: [0.045, 0.1, 0], scale: [1.8, 0.4, 0.8] })
  ]);
}

function createMushroom(): BufferGeometry {
  const dots: BufferGeometry[] = [];
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    dots.push(
      part(ico(0.035, 0), {
        color: C.white,
        pos: [Math.cos(angle) * 0.13, 0.33 + Math.sin(i) * 0.02, Math.sin(angle) * 0.13]
      })
    );
  }
  return mergeParts([
    part(cylinder(0.075, 0.1, 0.24, 7), { color: C.cream, pos: [0, 0.12, 0] }),
    part(ico(0.23, 1), { color: C.red, pos: [0, 0.3, 0], scale: [1, 0.55, 1] }),
    part(ico(0.18, 1), { color: 0xf4d9bd, pos: [0, 0.24, 0], scale: [1, 0.35, 1] }),
    ...dots
  ]);
}

function createMouse(): BufferGeometry {
  return mergeParts([
    part(ico(0.16, 1), { color: C.grey, pos: [0, 0.13, -0.02], scale: [1.28, 0.85, 1] }),
    part(ico(0.115, 1), { color: 0x9a9c9e, pos: [0, 0.16, 0.16] }),
    part(ico(0.075, 1), { color: 0xd8aeb0, pos: [-0.1, 0.27, 0.11], scale: [1, 1.1, 0.45] }),
    part(ico(0.075, 1), { color: 0xd8aeb0, pos: [0.1, 0.27, 0.11], scale: [1, 1.1, 0.45] }),
    part(ico(0.025, 0), { color: C.black, pos: [-0.055, 0.19, 0.255] }),
    part(ico(0.025, 0), { color: C.black, pos: [0.055, 0.19, 0.255] }),
    part(ico(0.03, 0), { color: C.pink, pos: [0, 0.14, 0.28] }),
    part(cylinder(0.011, 0.009, 0.24, 5), {
      color: C.pink,
      pos: [0.03, 0.12, -0.2],
      rot: [1.2, 0.2, 0.25]
    }),
    part(ico(0.045, 0), { color: 0x777b7d, pos: [-0.1, 0.04, 0.11], scale: [1, 0.5, 1.4] }),
    part(ico(0.045, 0), { color: 0x777b7d, pos: [0.1, 0.04, 0.11], scale: [1, 0.5, 1.4] })
  ]);
}

function createRabbit(): BufferGeometry {
  return mergeParts([
    part(ico(0.2, 1), { color: C.white, pos: [0, 0.26, 0], scale: [1, 1.15, 1.05] }),
    part(ico(0.145, 1), { color: C.white, pos: [0, 0.48, 0.08] }),
    part(ico(0.05, 1), {
      color: C.white,
      pos: [-0.08, 0.71, 0.07],
      scale: [0.65, 2.1, 0.55],
      rot: [-0.1, 0, -0.18]
    }),
    part(ico(0.05, 1), {
      color: C.white,
      pos: [0.08, 0.71, 0.07],
      scale: [0.65, 2.1, 0.55],
      rot: [-0.1, 0, 0.18]
    }),
    part(ico(0.026, 1), {
      color: C.pink,
      pos: [-0.08, 0.72, 0.13],
      scale: [0.55, 1.7, 0.3],
      rot: [-0.1, 0, -0.18]
    }),
    part(ico(0.026, 1), {
      color: C.pink,
      pos: [0.08, 0.72, 0.13],
      scale: [0.55, 1.7, 0.3],
      rot: [-0.1, 0, 0.18]
    }),
    part(ico(0.023, 0), { color: C.black, pos: [-0.055, 0.51, 0.207] }),
    part(ico(0.023, 0), { color: C.black, pos: [0.055, 0.51, 0.207] }),
    part(ico(0.028, 0), { color: C.pink, pos: [0, 0.45, 0.22] }),
    part(ico(0.065, 0), { color: C.white, pos: [0, 0.14, -0.17], scale: [1, 1, 1] }),
    part(ico(0.05, 0), { color: C.white, pos: [-0.12, 0.06, 0.06], scale: [1, 0.6, 1.4] }),
    part(ico(0.05, 0), { color: C.white, pos: [0.12, 0.06, 0.06], scale: [1, 0.6, 1.4] })
  ]);
}

function createSheep(): BufferGeometry {
  const wool: BufferGeometry[] = [];
  const positions: Array<[number, number, number]> = [
    [0, 0.58, 0],
    [-0.28, 0.58, 0.06],
    [0.28, 0.58, 0.04],
    [0, 0.72, -0.22],
    [-0.18, 0.68, -0.27],
    [0.18, 0.66, -0.27],
    [0.02, 0.78, 0.2]
  ];
  for (let i = 0; i < positions.length; i += 1) {
    const [x, y, z] = positions[i];
    wool.push(
      part(ico(0.3, 1), {
        color: C.white,
        pos: [x, y, z],
        scale: [1.1, 0.9, 1.1],
        rot: [0, i * 0.12, 0]
      })
    );
  }
  return mergeParts([
    ...wool,
    part(ico(0.22, 1), { color: 0x4f4a42, pos: [0, 0.65, 0.52] }),
    part(ico(0.065, 1), { color: 0x3d3932, pos: [-0.2, 0.72, 0.48], scale: [1.5, 0.55, 0.8] }),
    part(ico(0.065, 1), { color: 0x3d3932, pos: [0.2, 0.72, 0.48], scale: [1.5, 0.55, 0.8] }),
    part(ico(0.028, 0), { color: C.white, pos: [-0.075, 0.7, 0.71] }),
    part(ico(0.028, 0), { color: C.white, pos: [0.075, 0.7, 0.71] }),
    part(ico(0.085, 1), { color: 0x37332c, pos: [0.01, 0.6, 0.68], scale: [1, 0.55, 0.7] }),
    part(cylinder(0.045, 0.05, 0.45, 6), { color: 0x3d3932, pos: [-0.28, 0.22, 0.28] }),
    part(cylinder(0.045, 0.05, 0.45, 6), { color: 0x3d3932, pos: [0.28, 0.22, 0.28] }),
    part(cylinder(0.045, 0.05, 0.45, 6), { color: 0x3d3932, pos: [-0.28, 0.22, -0.28] }),
    part(cylinder(0.045, 0.05, 0.45, 6), { color: 0x3d3932, pos: [0.28, 0.22, -0.28] }),
    part(cylinder(0.05, 0.07, 0.18, 6), { color: C.white, pos: [0, 0.61, -0.58], rot: [0.4, 0, 0] })
  ]);
}

function createFence(): BufferGeometry {
  return mergeParts([
    part(cylinder(0.075, 0.09, 1.05, 6), { color: C.woodDark, pos: [-0.43, 0.52, 0] }),
    part(cylinder(0.075, 0.09, 1.05, 6), { color: C.woodDark, pos: [0.43, 0.52, 0] }),
    part(box(1.06, 0.14, 0.11), { color: C.wood, pos: [0, 0.76, 0.02], rot: [0, 0, 0.02] }),
    part(box(1.06, 0.14, 0.11), { color: C.wood, pos: [0, 0.42, 0.02], rot: [0, 0, -0.02] }),
    part(cone(0.09, 0.16, 4), { color: C.wood, pos: [-0.43, 1.1, 0], rot: [0, Math.PI / 4, 0] }),
    part(cone(0.09, 0.16, 4), { color: C.wood, pos: [0.43, 1.1, 0], rot: [0, Math.PI / 4, 0] })
  ]);
}

function humanParts(options: {
  shirt: number;
  pants: number;
  skin: number;
  hair: number;
  hat?: number;
  boots?: number;
  dress?: boolean;
}): BufferGeometry[] {
  const lower: BufferGeometry[] = [];
  if (options.dress) {
    lower.push(
      part(cone(0.3, 0.72, 8), {
        color: options.shirt,
        pos: [0, 0.58, 0]
      })
    );
    lower.push(
      part(cylinder(0.07, 0.08, 0.45, 6), { color: options.skin, pos: [-0.14, 0.22, 0] })
    );
    lower.push(
      part(cylinder(0.07, 0.08, 0.45, 6), { color: options.skin, pos: [0.14, 0.22, 0] })
    );
  } else {
    lower.push(
      part(cylinder(0.22, 0.26, 0.62, 7), {
        color: options.shirt,
        pos: [0, 0.95, 0],
        scale: [1, 1, 0.72]
      })
    );
    lower.push(
      part(cylinder(0.09, 0.11, 0.62, 6), { color: options.pants, pos: [-0.13, 0.43, 0] })
    );
    lower.push(
      part(cylinder(0.09, 0.11, 0.62, 6), { color: options.pants, pos: [0.13, 0.43, 0] })
    );
  }
  const bodyTop = options.dress ? 0.75 : 1.22;
  const headY = options.dress ? 1.47 : 1.62;
  const armY = options.dress ? 0.92 : 1.05;
  return [
    ...lower,
    part(cylinder(0.065, 0.07, 0.5, 5), {
      color: options.shirt,
      pos: [-0.3, armY, 0],
      rot: [0, 0, -0.25]
    }),
    part(cylinder(0.065, 0.07, 0.5, 5), {
      color: options.shirt,
      pos: [0.3, armY, 0],
      rot: [0, 0, 0.25]
    }),
    part(ico(0.07, 1), { color: options.skin, pos: [-0.37, armY - 0.28, 0] }),
    part(ico(0.07, 1), { color: options.skin, pos: [0.37, armY - 0.28, 0] }),
    part(ico(0.21, 1), { color: options.skin, pos: [0, headY, 0] }),
    part(ico(0.215, 1), {
      color: options.hair,
      pos: [0, headY + 0.08, -0.03],
      scale: [1.02, 0.75, 1.02]
    }),
    part(ico(0.028, 0), { color: C.black, pos: [-0.07, headY + 0.015, 0.19] }),
    part(ico(0.028, 0), { color: C.black, pos: [0.07, headY + 0.015, 0.19] }),
    part(torus(0.06, 0.012, 4, 8, Math.PI), {
      color: 0x8b4a3b,
      pos: [0, headY - 0.07, 0.2],
      rot: [0, 0, Math.PI]
    }),
    ...(options.hat !== undefined
      ? [
          part(cylinder(0.33, 0.35, 0.06, 10), {
            color: options.hat,
            pos: [0, headY + 0.15, 0]
          }),
          part(cylinder(0.17, 0.19, 0.18, 8), {
            color: options.hat,
            pos: [0, headY + 0.24, 0]
          })
        ]
      : []),
    ...(options.boots !== undefined
      ? [
          part(box(0.17, 0.16, 0.27), {
            color: options.boots,
            pos: [-0.14, 0.08, 0.06]
          }),
          part(box(0.17, 0.16, 0.27), {
            color: options.boots,
            pos: [0.14, 0.08, 0.06]
          })
        ]
      : []),
    part(box(0.14, 0.12, 0.04), {
      color: C.darkRed,
      pos: [0, bodyTop - 0.18, 0.19]
    })
  ];
}

function createFarmer(): BufferGeometry {
  return mergeParts(
    humanParts({
      shirt: 0xb34f3f,
      pants: C.denim,
      skin: C.skin,
      hair: 0x6b4a32,
      hat: C.straw,
      boots: 0x5a402b
    })
  );
}

function createPerson(): BufferGeometry {
  return mergeParts(
    humanParts({
      shirt: 0x4f94a5,
      pants: 0x525a65,
      skin: 0xd7a078,
      hair: 0x2f2a26,
      dress: false
    })
  );
}

function createCow(): BufferGeometry {
  const spots = [
    [0.4, 1.05, 0.3, 0.26],
    [-0.35, 1.1, -0.2, 0.3],
    [0.05, 1.18, -0.4, 0.23],
    [-0.42, 0.95, 0.4, 0.2],
    [0.38, 0.95, -0.25, 0.2]
  ];
  const spotsParts = spots.map(([x, y, z, radius]) =>
    part(ico(radius, 1), {
      color: C.black,
      pos: [x, y, z],
      scale: [1, 0.8, 1]
    })
  );
  return mergeParts([
    part(ico(0.72, 1), { color: C.white, pos: [0, 1.05, 0], scale: [0.82, 1, 1.42] }),
    ...spotsParts,
    part(ico(0.43, 1), { color: C.white, pos: [0, 1.5, 0.95] }),
    part(ico(0.32, 1), { color: C.pink, pos: [0, 1.38, 1.27], scale: [1, 0.72, 0.85] }),
    part(ico(0.055, 0), { color: C.black, pos: [-0.15, 1.59, 1.28] }),
    part(ico(0.055, 0), { color: C.black, pos: [0.15, 1.59, 1.28] }),
    part(ico(0.08, 1), { color: C.pink, pos: [-0.27, 1.78, 0.96], scale: [1.3, 0.55, 0.8] }),
    part(ico(0.08, 1), { color: C.pink, pos: [0.27, 1.78, 0.96], scale: [1.3, 0.55, 0.8] }),
    part(cone(0.08, 0.24, 5), {
      color: C.cream,
      pos: [-0.27, 1.92, 0.88],
      rot: [0, 0, 0.4]
    }),
    part(cone(0.08, 0.24, 5), {
      color: C.cream,
      pos: [0.27, 1.92, 0.88],
      rot: [0, 0, -0.4]
    }),
    part(cylinder(0.11, 0.13, 0.85, 6), { color: C.white, pos: [-0.42, 0.43, 0.62] }),
    part(cylinder(0.11, 0.13, 0.85, 6), { color: C.white, pos: [0.42, 0.43, 0.62] }),
    part(cylinder(0.11, 0.13, 0.85, 6), { color: C.white, pos: [-0.42, 0.43, -0.62] }),
    part(cylinder(0.11, 0.13, 0.85, 6), { color: C.white, pos: [0.42, 0.43, -0.62] }),
    part(interval(0.1, 0.13, 0.16, 6), { color: 0x3a312b, pos: [-0.42, 0.08, 0.64] }),
    part(interval(0.1, 0.13, 0.16, 6), { color: 0x3a312b, pos: [0.42, 0.08, 0.64] }),
    part(interval(0.1, 0.13, 0.16, 6), { color: 0x3a312b, pos: [-0.42, 0.08, -0.64] }),
    part(interval(0.1, 0.13, 0.16, 6), { color: 0x3a312b, pos: [0.42, 0.08, -0.64] }),
    part(ico(0.23, 1), { color: C.pink, pos: [0, 0.88, -0.52], scale: [1, 0.55, 1] }),
    part(ico(0.05, 0), { color: 0xe38a86, pos: [-0.12, 0.83, -0.5] }),
    part(ico(0.05, 0), { color: 0xe38a86, pos: [0.12, 0.83, -0.5] }),
    part(cylinder(0.035, 0.045, 0.9, 5), {
      color: C.white,
      pos: [0.05, 1.1, -1.05],
      rot: [0.6, 0, 0.2]
    }),
    part(ico(0.11, 1), { color: C.black, pos: [0.13, 0.82, -1.4] })
  ]);
}

function interval(radiusTop: number, radiusBottom: number, height: number, segments: number) {
  return cylinder(radiusTop, radiusBottom, height, segments);
}

function createCar(): BufferGeometry {
  const wheels: BufferGeometry[] = [];
  for (const x of [-1.15, 1.15]) {
    for (const z of [-0.66, 0.66]) {
      wheels.push(
        part(cylinder(0.32, 0.32, 0.24, 10), {
          color: 0x33363a,
          pos: [x, 0.31, z],
          rot: [0, 0, Math.PI / 2]
        })
      );
      wheels.push(
        part(cylinder(0.15, 0.15, 0.27, 8), {
          color: C.lightGrey,
          pos: [x, 0.31, z],
          rot: [0, 0, Math.PI / 2]
        })
      );
    }
  }
  return mergeParts([
    part(box(2.5, 0.56, 1.34), { color: C.red, pos: [0, 0.63, 0] }),
    part(box(1.35, 0.55, 1.18), { color: C.darkRed, pos: [-0.08, 1.08, 0] }),
    part(box(1.12, 0.35, 1.2), { color: C.window, pos: [-0.08, 1.12, 0] }),
    part(box(0.1, 0.38, 1.15), { color: C.red, pos: [0.62, 1.08, 0] }),
    part(box(0.58, 0.2, 1.22), { color: C.darkRed, pos: [0.75, 1.38, 0] }),
    part(box(0.07, 0.2, 0.24), { color: C.yellow, pos: [1.28, 0.68, -0.45] }),
    part(box(0.07, 0.2, 0.24), { color: C.yellow, pos: [1.28, 0.68, 0.45] }),
    part(box(0.08, 0.15, 0.22), { color: 0xff8171, pos: [-1.28, 0.7, -0.45] }),
    part(box(0.08, 0.15, 0.22), { color: 0xff8171, pos: [-1.28, 0.7, 0.45] }),
    part(box(2.2, 0.13, 1.27), { color: 0x9e3f34, pos: [0, 0.37, 0] }),
    ...wheels
  ]);
}

function createTree(): BufferGeometry {
  return mergeParts([
    part(cylinder(0.32, 0.48, 2.9, 7), { color: C.trunk, pos: [0, 1.45, 0] }),
    part(cylinder(0.18, 0.3, 1.5, 6), {
      color: C.trunkLight,
      pos: [0.55, 2.5, 0.1],
      rot: [0, 0, -0.55]
    }),
    part(ico(1.65, 1), {
      color: C.leaf,
      pos: [0, 3.35, 0],
      scale: [1.1, 1.05, 1]
    }),
    part(ico(1.28, 1), {
      color: C.leafLight,
      pos: [-1.2, 3.55, 0.25],
      scale: [1.05, 0.9, 1]
    }),
    part(ico(1.2, 1), {
      color: C.leafDark,
      pos: [1.12, 3.52, -0.18],
      scale: [1, 0.9, 1.05]
    }),
    part(ico(1.05, 1), {
      color: C.leafLight,
      pos: [0.22, 4.45, -0.12],
      scale: [1, 0.88, 1]
    }),
    part(ico(0.85, 1), { color: C.leaf, pos: [-0.5, 4.1, 0.8] }),
    part(ico(0.6, 1), { color: 0x8b5b32, pos: [0.25, 0.18, 0.48], scale: [1.2, 0.35, 0.8] })
  ]);
}

function windowRows(width: number, height: number, depth: number, color: number): BufferGeometry[] {
  const windows: BufferGeometry[] = [];
  const cols = Math.max(2, Math.round(width / 2.2));
  const rows = Math.max(2, Math.round(height / 2.5));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = -width / 2 + ((col + 0.5) / cols) * width;
      const y = 1.4 + ((row + 0.3) / rows) * (height - 2.2);
      windows.push(
        part(box(0.8, 0.85, 0.14), {
          color,
          pos: [x, y, depth / 2 + 0.055]
        })
      );
      windows.push(
        part(box(0.8, 0.85, 0.14), {
          color,
          pos: [x, y, -depth / 2 - 0.055]
        })
      );
    }
  }
  return windows;
}

function createHouse(): BufferGeometry {
  return mergeParts([
    part(box(8.3, 4.1, 6.6), { color: C.cream, pos: [0, 2.05, 0] }),
    part(box(8.6, 0.3, 6.9), { color: 0xe6d4ad, pos: [0, 0.15, 0] }),
    part(cone(6.5, 3.1, 4), { color: C.roof, pos: [0, 5.55, 0], rot: [0, Math.PI / 4, 0] }),
    part(box(0.75, 1.95, 0.12), { color: 0x71472b, pos: [0, 1.03, 3.31] }),
    part(ico(0.06, 0), { color: C.yellow, pos: [0.35, 1.05, 3.39] }),
    part(box(1.15, 0.85, 0.1), { color: C.window, pos: [-2.15, 2.55, 3.32] }),
    part(box(1.15, 0.85, 0.1), { color: C.window, pos: [2.15, 2.55, 3.32] }),
    part(box(1.15, 0.85, 0.1), { color: C.window, pos: [-2.15, 2.55, -3.32] }),
    part(box(1.15, 0.85, 0.1), { color: C.window, pos: [2.15, 2.55, -3.32] }),
    part(box(0.12, 0.85, 1.15), { color: C.window, pos: [4.17, 2.55, 1.3] }),
    part(box(0.12, 0.85, 1.15), { color: C.window, pos: [-4.17, 2.55, -1.2] }),
    part(cylinder(0.38, 0.43, 1.8, 6), { color: C.brick, pos: [2.4, 5.0, -1.6] })
  ]);
}

function createBuilding(): BufferGeometry {
  const width = 15.5;
  const depth = 12.5;
  const height = 19.5;
  return mergeParts([
    part(box(width, height, depth), { color: C.building, pos: [0, height / 2, 0] }),
    part(box(width + 0.6, 0.7, depth + 0.6), { color: 0xb6a789, pos: [0, 0.35, 0] }),
    part(box(width + 0.4, 0.5, depth + 0.4), { color: C.roofDark, pos: [0, height + 0.1, 0] }),
    part(box(4.2, 1.5, 4.2), { color: C.buildingBlue, pos: [2.8, height + 0.7, 0.5] }),
    part(box(2.8, 1.0, 2.8), { color: C.buildingWarm, pos: [-3.8, height + 0.4, -1.2] }),
    ...windowRows(width, height, depth, C.window),
    part(box(2.2, 2.7, 0.2), { color: 0x5f5140, pos: [0, 1.45, depth / 2 + 0.07] }),
    part(box(3.0, 0.35, 1.2), { color: 0x9a6a43, pos: [0, 3.2, depth / 2 + 0.7] }),
    part(box(0.5, 2.1, 0.5), { color: 0x555b5e, pos: [0, height - 2.2, depth / 2 + 0.4] }),
    part(box(1.1, 2.6, 1.1), { color: 0x707576, pos: [-5.8, height - 1.3, -4.2] })
  ]);
}

const factories: Record<PropId, () => BufferGeometry> = {
  grass: createGrass,
  flower: createFlower,
  mushroom: createMushroom,
  mouse: createMouse,
  rabbit: createRabbit,
  sheep: createSheep,
  fence: createFence,
  farmer: createFarmer,
  person: createPerson,
  cow: createCow,
  car: createCar,
  tree: createTree,
  house: createHouse,
  building: createBuilding
};

export function createPropGeometry(id: PropId): BufferGeometry {
  return factories[id]();
}

export function createDecorativeGrassGeometry(): BufferGeometry {
  return mergeParts([
    part(cone(0.07, 0.42, 3), {
      color: C.green,
      pos: [0, 0.21, 0],
      rot: [0.08, 0, 0.16]
    }),
    part(cone(0.055, 0.32, 3), {
      color: C.lightGreen,
      pos: [0.06, 0.16, 0.03],
      rot: [0.2, 0, -0.5]
    }),
    part(cone(0.05, 0.28, 3), {
      color: C.darkGreen,
      pos: [-0.06, 0.14, -0.03],
      rot: [-0.1, 0, 0.6]
    })
  ]);
}
