import { Box3, Color, Group, Mesh, MeshBasicMaterial, CircleGeometry, PerspectiveCamera, Raycaster, Scene, Vector3, WebGLRenderer, SRGBColorSpace, NoToneMapping } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Coordenadas del modelo suministrado, expresadas como fracción de su caja.
// Se proyectan sobre la malla; los puntos permanecen unidos al cuerpo al girar.
export const BODY_ANCHORS = {
  cabello: [0.5, 0.97], ojo: [0.422, 0.817], oreja: [0.329, 0.802],
  nariz: [0.5, 0.791], cara: [0.611, 0.777], boca: [0.5, 0.766],
  cuello: [0.5, 0.726], pecho: [0.419, 0.647], corazon: [0.57, 0.621],
  barriga: [0.5, 0.55], ombligo: [0.5, 0.518], mano: [0.085, 0.425],
  dedo: [0.92, 0.38], rodilla: [0.358, 0.243], pie: [0.74, 0.021],
  cabeza: [0.5, 0.88, true], hombro: [0.695, 0.687, true],
  espalda: [0.5, 0.605, true], codo: [0.78, 0.542, true],
};

let modelSource;
const getModelSource = () => {
  if (!modelSource) {
    modelSource = fetch('/models/cuerpo-v1.glb').then((response) => {
      if (!response.ok) throw new Error('No se pudo descargar el modelo');
      return response.arrayBuffer();
    }).catch((error) => { modelSource = null; throw error; });
  }
  return modelSource;
};

const disposeModel = (root) => {
  const textures = new Set();
  root.traverse((object) => {
    object.geometry?.dispose();
    if (!object.material) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose();
    }
  });
  textures.forEach((texture) => { texture.source?.data?.close?.(); texture.dispose(); });
};

export function createBodyScene(host, { markers, vista, onLoad, onError, onSideChange }) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.05, 40);
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(new Color('#f8faf9'), 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.enableZoom = true;
  controls.minPolarAngle = Math.PI * 0.3;
  controls.maxPolarAngle = Math.PI * 0.65;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.7;
  // El scroll sigue bajando la página. El zoom usa pellizco o los botones.
  const stopWheelZoom = (event) => event.stopImmediatePropagation();
  renderer.domElement.addEventListener('wheel', stopWheelZoom, { capture: true, passive: true });
  const anchors = new Map();
  const projected = new Vector3();
  let disposed = false;
  let loaded = false;
  let width = 1;
  let height = 1;
  let distance = 4;
  let side = vista;
  let frame = 0;
  let inView = true;
  let model;
  let focusedPart;

  function getPoint(id) {
    const anchor = anchors.get(id);
    if (!anchor || !loaded) return null;
    projected.copy(anchor.point).project(camera);
    const direction = camera.position.clone().sub(controls.target).normalize();
    const visible = (anchor.back ? -direction.z : direction.z) > 0.22 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && projected.z < 1;
    return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2, visible };
  }
  function render() {
    if (disposed || !inView) return;
    camera.updateMatrixWorld();
    for (const [id, element] of markers) {
      const point = getPoint(id);
      element.style.visibility = point?.visible ? 'visible' : 'hidden';
      element.tabIndex = point?.visible ? 0 : -1;
      if (point) {
        element.style.left = `${point.x}px`;
        element.style.top = `${point.y}px`;
      }
    }
    renderer.render(scene, camera);
  }
  const reportSide = () => {
    const next = camera.position.z >= 0 ? 'frente' : 'espalda';
    if (next !== side) { side = next; onSideChange(next); }
  };
  controls.addEventListener('change', render);
  controls.addEventListener('end', reportSide);
  controls.addEventListener('start', () => cancelAnimationFrame(frame));

  function setView(next) {
    if (disposed) return;
    cancelAnimationFrame(frame);
    side = next;
    focusedPart = null;
    const start = camera.position.clone();
    const target = new Vector3(0, 0, next === 'frente' ? distance : -distance);
    controls.target.set(0, 0, 0);
    // Interpolación esférica: la cámara rodea el cuerpo sin atravesarlo.
    const startAngle = Math.atan2(start.x, start.z);
    let delta = (next === 'frente' ? 0 : Math.PI) - startAngle;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    const startRadius = start.length();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const began = performance.now();
    function step(now) {
      if (disposed) return;
      const t = reduced ? 1 : Math.min((now - began) / 420, 1);
      const ease = 1 - (1 - t) ** 3;
      const angle = startAngle + delta * ease;
      const radius = startRadius + (distance - startRadius) * ease;
      camera.position.set(Math.sin(angle) * radius, start.y * (1 - ease), Math.cos(angle) * radius);
      camera.lookAt(controls.target);
      controls.update();
      render();
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
  }
  function resize() {
    width = Math.max(host.clientWidth, 1);
    height = Math.max(host.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const previousDistance = distance;
    distance = Math.max(1.12 / Math.tan(Math.PI * 16 / 180), 0.62 / (Math.tan(Math.PI * 16 / 180) * camera.aspect));
    controls.minDistance = distance * 0.42;
    controls.maxDistance = distance * 1.6;
    if (!loaded) camera.position.set(0, 0, vista === 'frente' ? distance : -distance);
    else camera.position.multiplyScalar(distance / previousDistance);
    controls.update();
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) render();
  });
  intersectionObserver.observe(host);
  const contextLost = (event) => { event.preventDefault(); if (!disposed) onError(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  resize();

  getModelSource().then((buffer) => new GLTFLoader().parseAsync(buffer, '/models/')).then((gltf) => {
    if (disposed) { disposeModel(gltf.scene); return; }
    model = new Group();
    const bounds = new Box3().setFromObject(gltf.scene);
    const center = bounds.getCenter(new Vector3());
    const scale = 2 / bounds.getSize(new Vector3()).y;
    gltf.scene.position.copy(center).multiplyScalar(-1);
    model.add(gltf.scene);
    model.scale.setScalar(scale);
    scene.add(model);
    model.updateMatrixWorld(true);
    const normalized = new Box3().setFromObject(model);
    const size = normalized.getSize(new Vector3());
    const raycaster = new Raycaster();
    for (const [id, [x, y, back = false]] of Object.entries(BODY_ANCHORS)) {
      const point = new Vector3(normalized.min.x + x * size.x, normalized.min.y + y * size.y, back ? -0.1 : 0.1);
      raycaster.set(new Vector3(point.x, point.y, back ? -3 : 3), new Vector3(0, 0, back ? 1 : -1));
      const hit = raycaster.intersectObject(model, true)[0];
      if (hit) point.copy(hit.point);
      point.z += back ? -0.012 : 0.012;
      anchors.set(id, { point, back });
    }
    const shadow = new Mesh(new CircleGeometry(0.4, 48), new MeshBasicMaterial({ color: '#233d33', transparent: true, opacity: 0.09, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.01;
    shadow.scale.y = 0.6;
    scene.add(shadow);
    loaded = true;
    render();
    onLoad();
  }).catch(() => { if (!disposed) onError(); });

  return {
    get ready() { return loaded; },
    get side() { return side; },
    render,
    setView,
    rotate(angle) {
      cancelAnimationFrame(frame);
      camera.position.sub(controls.target).applyAxisAngle(new Vector3(0, 1, 0), angle).add(controls.target);
      controls.update(); render(); reportSide();
    },
    zoom(factor) {
      cancelAnimationFrame(frame);
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor)));
      camera.position.copy(controls.target).add(offset);
      controls.update(); render();
    },
    focusPart(id) {
      const anchor = anchors.get(id);
      if (!anchor || !loaded) return;
      focusedPart = id;
      cancelAnimationFrame(frame);
      const offset = new Vector3(0, 0, anchor.back ? -controls.minDistance : controls.minDistance);
      controls.target.copy(anchor.point);
      camera.position.copy(anchor.point).add(offset);
      controls.update(); render(); reportSide();
    },
    trackActive(id) {
      if (focusedPart && id && focusedPart !== id) this.focusPart(id);
    },
    getPartScreenPosition(id) {
      const point = getPoint(id);
      if (!point?.visible) return null;
      const rect = host.getBoundingClientRect();
      return { x: rect.left + point.x, y: rect.top + point.y, tolerance: Math.max(30, width * 0.1) };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('wheel', stopWheelZoom, true);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      disposeModel(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
