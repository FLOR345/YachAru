import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Box3, Group, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PARTES } from '../data/cuerpoNumeros';
import { BODY_ANCHORS } from './bodyScene';

// Comprueba los puntos contra la geometría real: detecta partes flotando fuera
// del personaje cuando se cambia el GLB o se recalibra su anatomía.
describe('puntos interactivos del modelo suministrado', () => {
  let model;
  let bounds;
  let size;
  beforeAll(async () => {
    const buffer = readFileSync(new URL('../../public/models/cuerpo-v1.glb', import.meta.url));
    const jsonLength = buffer.readUInt32LE(12);
    const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
    // La prueba valida la malla sin depender de un decodificador de imágenes.
    gltf.images = [];
    gltf.textures = [];
    gltf.materials = [{ doubleSided: true, pbrMetallicRoughness: { metallicFactor: 0 } }];
    gltf.buffers[0].uri = `data:application/octet-stream;base64,${buffer.subarray(28 + jsonLength).toString('base64')}`;
    const originalProgressEvent = globalThis.ProgressEvent;
    globalThis.ProgressEvent ??= class ProgressEvent {};
    try {
      const { scene } = await new GLTFLoader().parseAsync(JSON.stringify(gltf), '');
      bounds = new Box3().setFromObject(scene);
      scene.position.copy(bounds.getCenter(new Vector3())).multiplyScalar(-1);
      model = new Group();
      model.add(scene);
      model.scale.setScalar(2 / bounds.getSize(new Vector3()).y);
      model.updateMatrixWorld(true);
      bounds = new Box3().setFromObject(model);
      size = bounds.getSize(new Vector3());
    } finally {
      if (originalProgressEvent) globalThis.ProgressEvent = originalProgressEvent;
      else delete globalThis.ProgressEvent;
    }
  });

  it('incluye todas las partes de ambos idiomas y respeta su lado', () => {
    for (const part of PARTES) {
      expect(BODY_ANCHORS[part.id], part.id).toBeDefined();
      expect(!!BODY_ANCHORS[part.id][2], part.id).toBe(part.vista === 'espalda');
    }
  });

  it.each(PARTES)('$es tiene su punto sobre la superficie del cuerpo', ({ id }) => {
    const [x, y, back] = BODY_ANCHORS[id];
    const ray = new Raycaster(
      new Vector3(bounds.min.x + x * size.x, bounds.min.y + y * size.y, back ? -3 : 3),
      new Vector3(0, 0, back ? 1 : -1),
    );
    expect(ray.intersectObject(model, true).length, `Punto ${id} fuera de la malla`).toBeGreaterThan(0);
  });
});
