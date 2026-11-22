import {
  CanvasTexture,
  Color,
  DataTexture,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType
} from 'three';
import { mulberry32 } from '../core/math';

const gradientData = new Uint8Array([80, 145, 205, 245, 255]);
const gradientMap = new DataTexture(gradientData, gradientData.length, 1, RedFormat, UnsignedByteType);
gradientMap.minFilter = NearestFilter;
gradientMap.magFilter = NearestFilter;
gradientMap.generateMipmaps = false;
gradientMap.needsUpdate = true;

export const toonGradient = gradientMap;

export const propMaterial = new MeshToonMaterial({
  vertexColors: true,
  gradientMap,
  color: 0xffffff
});

export const outlineMaterial = new MeshBasicMaterial({
  color: 0x4a1f2f,
  side: 1
});

export const eyeWhiteMaterial = new MeshBasicMaterial({ color: 0xfffdf3 });
export const pupilMaterial = new MeshBasicMaterial({ color: 0x24170f });
export const eyeHighlightMaterial = new MeshBasicMaterial({ color: 0xffffff });
export const blushMaterial = new MeshBasicMaterial({ color: 0xdc6a83 });
export const mouthMaterial = new MeshBasicMaterial({ color: 0x471f2a });

export const shadowMaterial = new MeshBasicMaterial({
  color: 0x2f4a23,
  transparent: true,
  opacity: 0.24,
  depthWrite: false
});

function noiseTexture(base: string, shades: string[], seed: number, repeatX: number, repeatY: number): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D no disponible');
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  const rng = mulberry32(seed);
  for (let i = 0; i < 3400; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const length = 1 + rng() * 4;
    context.strokeStyle = shades[Math.floor(rng() * shades.length)];
    context.globalAlpha = 0.16 + rng() * 0.24;
    context.lineWidth = 0.7 + rng() * 1.4;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (rng() - 0.5) * 2, y - length);
    context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createGrassTexture(): CanvasTexture {
  return noiseTexture('#71b94d', ['#5b9f3d', '#85c95a', '#4d8c34', '#99d36b'], 9381, 210, 210);
}

export function createStoneTexture(): CanvasTexture {
  return noiseTexture('#a6a48d', ['#908e79', '#bcbaa2', '#85836e'], 5217, 14, 14);
}

export function createDirtTexture(): CanvasTexture {
  return noiseTexture('#9b7a4f', ['#85643f', '#b08b5d', '#775735'], 1187, 20, 20);
}

export const palette = {
  skyTop: new Color(0x59c7f2),
  skyBottom: new Color(0xdff5ff),
  fog: new Color(0xcce8c0),
  grass: 0x71b94d,
  darkGrass: 0x4f9239,
  cream: 0xfff5d9,
  brown: 0x7a4c2a,
  lightBrown: 0xa56c3b,
  darkBrown: 0x4c2f1b,
  yellow: 0xffc93c,
  pink: 0xf09b8c,
  white: 0xfffdf4,
  black: 0x2b211b
};
