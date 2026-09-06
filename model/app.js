import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const host = document.querySelector("#canvasHost");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);
camera.position.set(3.4, 2.1, 5.3);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
host.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 0.01;
controls.maxDistance = 1000;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;
controls.target.set(0, 0.75, 0);

scene.add(new THREE.HemisphereLight(0x9fa9ff, 0x11121c, 1.8));
const keyLight = new THREE.DirectionalLight(0xffe1c3, 4.2);
keyLight.position.set(4, 7, 5);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x7f75ff, 28, 12);
rimLight.position.set(-4, 3, -2);
scene.add(rimLight);
const frontLight = new THREE.PointLight(0xc9ef83, 18, 9);
frontLight.position.set(2, 1, 4);
scene.add(frontLight);

const grid = new THREE.GridHelper(12, 24, 0x4a506d, 0x272c43);
grid.position.y = -1.25;
grid.material.transparent = true;
grid.material.opacity = 0.34;
scene.add(grid);
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(5.5, 64),
  new THREE.MeshBasicMaterial({ color: 0x0d101a, transparent: true, opacity: 0.52 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.26;
scene.add(floor);

let activeModel;
let spin = true;
let animationEnabled = true;
let animationMixer;
let rotorNodes = [];
let flightMotion = false;
let flightBaseY = 0;
const keys = new Set();
const clock = new THREE.Clock();
const fpsValue = document.querySelector("#fpsValue");
const fpsRange = document.querySelector("#fpsRange");
const fpsGraph = document.querySelector("#fpsGraph");
const fpsContext = fpsGraph.getContext("2d");
const fpsSamples = [];
let fpsSampleTime = 0;
let fpsFrameCount = 0;
let modelCenter = new THREE.Vector3();
let modelRadius = 1;
const loader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const stlLoader = new STLLoader();
const objLoader = new OBJLoader();
const defaultUrl = "./assets/changsha-drone.glb";
const aircraftModels = {
  fighter0: ["./assets/aircraft/战斗机0.gltf", "战斗机 0", "GLTF / AIRCRAFT"],
  fighter1: ["./assets/aircraft/战斗机1.gltf", "战斗机 1", "GLTF / AIRCRAFT"],
  fighter2: ["./assets/aircraft/战斗机2.gltf", "战斗机 2", "GLTF / AIRCRAFT"],
  platformHeli: ["./assets/aircraft/直升机和平台.gltf", "直升机和平台", "GLTF / AIRCRAFT"],
  blueHeli: ["./assets/aircraft/蓝色直升机.gltf", "蓝色直升机", "GLTF / AIRCRAFT"],
  yellowHeli: ["./assets/aircraft/黄色直升机.gltf", "黄色直升机", "GLTF / AIRCRAFT"],
  cwZoom: ["./assets/new-model/cw-zoom/cw-zoom.gltf", "CW's Zoom", "GLTF / NEW MODEL"],
  mechanicalDragon: ["./assets/new-model/mechanical-dragon.fbx", "机械龙", "FBX / NEW MODEL"],
  boneDragon: ["./assets/new-model/bone-dragon.stl", "骨龙", "STL / NEW MODEL"],
  dragon123: ["./assets/new-model/mechanical-folder/dragon-123.stl", "骨龙 · 123", "STL / MECHANICAL DRAGON"],
  gulong: ["./assets/new-model/mechanical-folder/gulong.stl", "骨龙 · Gulong", "STL / MECHANICAL DRAGON"],
  boneDragon1: ["./assets/new-model/mechanical-folder/bone-dragon-1.obj", "骨龙 1", "OBJ / MECHANICAL DRAGON"],
  mechanicalDragonStl: ["./assets/new-model/mechanical-folder/mechanical-dragon.stl", "机械龙 STL", "STL / MECHANICAL DRAGON"],
};

function clearModel() {
  if (!activeModel) return;
  scene.remove(activeModel);
  animationMixer = null;
  rotorNodes = [];
  flightMotion = false;
  activeModel.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
  });
  activeModel = null;
}

function frameModel(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  modelCenter = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  modelRadius = sphere.radius || Math.max(size.x, size.y, size.z) / 2 || 1;
  object.position.sub(modelCenter);
  object.position.y += 0.15;
  flightBaseY = object.position.y;
  controls.target.set(0, Math.max(size.y * 0.1, 0.2), 0);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const fittingFov = Math.min(verticalFov, horizontalFov);
  const distance = Math.max(modelRadius / Math.sin(fittingFov / 2) * 1.18, 3.4);
  camera.position.set(distance * 0.72, distance * 0.46, distance);
  camera.near = Math.max(modelRadius * 0.001, 0.01);
  camera.far = Math.max(modelRadius * 24, distance * 20, 1000);
  camera.updateProjectionMatrix();
  controls.minDistance = Math.max(modelRadius * 0.18, 0.25);
  controls.maxDistance = Math.max(modelRadius * 100, distance * 30, 100);
  controls.update();
}

function countPolygons(object) {
  let count = 0;
  object.traverse((child) => {
    if (child.isMesh && child.geometry.index) count += child.geometry.index.count / 3;
    else if (child.isMesh && child.geometry.attributes.position) count += child.geometry.attributes.position.count / 3;
  });
  return count > 1000000 ? `${(count / 1000000).toFixed(1)}M` : `${Math.round(count / 1000)}K`;
}

function applyBoneDragonColors(object) {
  const colors = {
    body: new THREE.Color(0xdba66b),
    light: new THREE.Color(0xf0c17e),
    shadow: new THREE.Color(0x8f5a3c),
    horn: new THREE.Color(0xa8323e),
    hornLight: new THREE.Color(0xf05278),
    claw: new THREE.Color(0x8c3d21),
  };

  object.traverse((child) => {
    if (!child.isMesh || !child.geometry.attributes.position) return;

    const position = child.geometry.attributes.position;
    const normal = child.geometry.attributes.normal;
    const bounds = new THREE.Box3().setFromBufferAttribute(position);
    const size = bounds.getSize(new THREE.Vector3());
    const colorAttribute = new THREE.Float32BufferAttribute(position.count * 3, 3);
    const color = new THREE.Color();

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const vertical = (z - bounds.min.z) / Math.max(size.z, 0.0001);
      const alongBody = (y - bounds.min.y) / Math.max(size.y, 0.0001);
      const upward = normal ? normal.getZ(index) : 0;

      if (
        vertical > 0.9 &&
        Math.abs(x) > size.x * 0.24 &&
        (alongBody < 0.28 || alongBody > 0.88)
      ) {
        color.copy(vertical > 0.88 ? colors.hornLight : colors.horn);
      } else if (vertical < 0.2 && Math.abs(x) > size.x * 0.16) {
        color.copy(colors.claw);
      } else if (vertical < 0.26) {
        color.copy(colors.shadow);
      } else if (upward > 0.45 || vertical > 0.68) {
        color.copy(colors.light);
      } else {
        color.copy(colors.body);
      }

      colorAttribute.setXYZ(index, color.r, color.g, color.b);
    }

    child.geometry.setAttribute("color", colorAttribute);
    const previousMaterial = child.material;
    child.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.05,
      roughness: 0.72,
    });
    for (const material of Array.isArray(previousMaterial) ? previousMaterial : [previousMaterial]) {
      material.dispose();
    }
  });
}

function applyStudioMaterials(object, title) {
  const name = title.toLowerCase();
  let palette = [0x9ca8ba, 0x5b687c, 0x263243, 0xd8e0e8];
  if (name.includes("黄色")) palette = [0xf0b928, 0xffd866, 0x4c3b1c, 0xeee5c9];
  else if (name.includes("蓝色")) palette = [0x3c83d8, 0x79c8ff, 0x172e58, 0xd4e9ff];
  else if (name.includes("战斗机")) palette = [0x697586, 0x9ca7b5, 0x303947, 0xb8c1ca];
  else if (name.includes("直升机")) palette = [0x6f8799, 0xb1c4d0, 0x34414d, 0xe3e8e9];
  let materialIndex = 0;

  object.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      const hasTexture = Boolean(material.map || material.normalMap || material.roughnessMap || material.metalnessMap);
      if (!hasTexture && material.color) {
        const color = palette[materialIndex % palette.length];
        material.color.setHex(color);
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        materialIndex += 1;
      }
      if ("roughness" in material) material.roughness = hasTexture ? material.roughness : 0.3;
      if ("metalness" in material) material.metalness = hasTexture ? material.metalness : 0.5;
    });
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function loadModel(source, label = "GLB / REALTIME", title = "") {
  const onLoaded = (gltf, animations = []) => {
    clearModel();
    activeModel = gltf.scene;
    const modelTitle = title || "Skylark";
    if (modelTitle === "骨龙") applyBoneDragonColors(activeModel);
    else applyStudioMaterials(activeModel, modelTitle);
    if (modelTitle === "骨龙") activeModel.rotation.x = -Math.PI / 2;
    animationMixer = animations.length ? new THREE.AnimationMixer(activeModel) : null;
    if (animationMixer) {
      animations.forEach((clip) => animationMixer.clipAction(clip).play());
    }
    rotorNodes = [];
    const rotorPattern = /rotor|propeller|prop|blade|fan|螺旋桨|旋翼|桨叶/i;
    activeModel.traverse((child) => {
      if (child !== activeModel && rotorPattern.test(child.name || "")) rotorNodes.push(child);
    });
    flightMotion = /无人机|直升机|Skylark/i.test(modelTitle);
    scene.add(activeModel);
    frameModel(activeModel);
    if (title) document.querySelector("#modelName").textContent = title;
    document.querySelector("#polyCount").textContent = countPolygons(activeModel);
    document.querySelector("#formatValue").textContent = label;
    const animationMessage = animationMixer
      ? `已播放模型动画 · ${animations.length} 个片段`
      : rotorNodes.length
        ? `已绑定 ${rotorNodes.length} 个旋翼节点`
        : "模型已加载，未发现旋翼节点";
    showToast(animationMessage);
  };
  if (typeof source === "string" && source.toLowerCase().endsWith(".fbx")) {
    fbxLoader.load(source, (object) => onLoaded({ scene: object }, object.animations || []), undefined, () => showToast("FBX 模型加载失败"));
  } else if (typeof source === "string" && source.toLowerCase().endsWith(".stl")) {
    stlLoader.load(source, (geometry) => {
      geometry.computeVertexNormals();
      onLoaded({ scene: new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x7c8798, metalness: 0.25, roughness: 0.48 }) ) }, []);
    }, undefined, () => showToast("STL 模型加载失败"));
  } else if (typeof source === "string" && source.toLowerCase().endsWith(".obj")) {
    objLoader.load(source, (object) => onLoaded({ scene: object }, object.animations || []), undefined, () => showToast("OBJ 模型加载失败"));
  } else if (typeof source === "string") {
    loader.load(source, (gltf) => onLoaded(gltf, gltf.animations), undefined, () => showToast("模型加载失败，请检查文件路径"));
  } else {
    loader.parse(source, "", onLoaded, () => showToast("无法解析这个模型文件"));
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2500);
}

function resize() {
  const rect = host.getBoundingClientRect();
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(rect.width, rect.height, false);
}

function updateFpsHud(timestamp) {
  if (!fpsSampleTime) fpsSampleTime = timestamp;
  fpsFrameCount += 1;
  if (timestamp - fpsSampleTime < 500) return;

  const fps = Math.round((fpsFrameCount * 1000) / Math.max(timestamp - fpsSampleTime, 1));
  fpsSamples.push(fps);
  if (fpsSamples.length > 40) fpsSamples.shift();
  fpsValue.textContent = fps;
  fpsRange.textContent = `(${Math.min(...fpsSamples)}-${Math.max(...fpsSamples)})`;
  fpsFrameCount = 0;
  fpsSampleTime = timestamp;

  const width = fpsGraph.width;
  const height = fpsGraph.height;
  fpsContext.clearRect(0, 0, width, height);
  fpsContext.fillStyle = "#03152f";
  fpsContext.fillRect(0, 0, width, height);
  fpsContext.fillStyle = "#16dbe5";
  const barWidth = width / 40;
  fpsSamples.forEach((sample, index) => {
    const barHeight = Math.min(height - 3, Math.max(2, (sample / 60) * height));
    fpsContext.fillRect(index * barWidth, height - barHeight, Math.max(1, barWidth - 1), barHeight);
  });
}

function moveCamera(direction) {
  const move = new THREE.Vector3();
  const distance = Math.max(modelRadius * 0.12, 0.12);
  if (direction === "forward") move.z -= distance;
  if (direction === "back") move.z += distance;
  if (direction === "left") move.x -= distance;
  if (direction === "right") move.x += distance;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward).normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const horizontalMove = new THREE.Vector3();
  horizontalMove.addScaledVector(forward, -move.z);
  horizontalMove.addScaledVector(right, move.x);
  move.copy(horizontalMove);
  camera.position.add(move);
  controls.target.add(move);
  controls.update();
}

function moveCameraFromKeys() {
  if (!activeModel) return;
  const direction = new THREE.Vector3();
  if (keys.has("arrowup") || keys.has("w")) direction.z += 1;
  if (keys.has("arrowdown") || keys.has("s")) direction.z -= 1;
  if (keys.has("arrowleft") || keys.has("a")) direction.x -= 1;
  if (keys.has("arrowright") || keys.has("d")) direction.x += 1;
  if (!direction.lengthSq()) return;
  direction.normalize();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward).normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const distance = Math.max(modelRadius * 0.018, 0.018);
  const move = new THREE.Vector3()
    .addScaledVector(forward, direction.z * distance)
    .addScaledVector(right, direction.x * distance);
  camera.position.add(move);
  controls.target.add(move);
}

document.querySelector("#resetCamera").addEventListener("click", () => {
  if (activeModel) frameModel(activeModel);
});
document.querySelectorAll("[data-camera]").forEach((button) => {
  button.addEventListener("click", () => moveCamera(button.dataset.camera));
});
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    keys.add(key);
    event.preventDefault();
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
document.querySelector("#toggleGrid").addEventListener("click", (event) => {
  grid.visible = !grid.visible;
  event.currentTarget.classList.toggle("control-active", grid.visible);
});
document.querySelector("#toggleSpin").addEventListener("click", (event) => {
  spin = !spin;
  event.currentTarget.classList.toggle("control-active", spin);
});
document.querySelector("#toggleAnimation").addEventListener("click", (event) => {
  animationEnabled = !animationEnabled;
  event.currentTarget.classList.toggle("control-active", animationEnabled);
  event.currentTarget.textContent = animationEnabled ? "Ⅱ" : "▶";
  event.currentTarget.setAttribute("aria-label", animationEnabled ? "暂停动画" : "播放动画");
  showToast(animationEnabled ? "动画已开启" : "动画已暂停");
});
document.querySelector("#soundButton").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const state = button.querySelector("b");
  state.textContent = state.textContent === "OFF" ? "ON" : "OFF";
  showToast(state.textContent === "ON" ? "环境音已开启" : "环境音已关闭");
});
document.querySelector("#uploadButton").addEventListener("click", () => document.querySelector("#fileInput").click());
document.querySelector("#fileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadModel(reader.result, file.name.toUpperCase().endsWith(".GLTF") ? "GLTF / LOCAL" : "GLB / LOCAL");
  reader.readAsArrayBuffer(file);
});
document.querySelectorAll(".collection-card").forEach((card) => card.addEventListener("click", () => {
  document.querySelectorAll(".collection-card").forEach((item) => item.classList.remove("selected"));
  card.classList.add("selected");
  if (card.dataset.model === "custom") document.querySelector("#fileInput").click();
  else if (card.dataset.model === "default") {
    document.querySelector("#modelName").innerHTML = "Skylark<br /><i>无人机</i>";
    loadModel(defaultUrl);
  } else if (aircraftModels[card.dataset.model]) {
    const [url, name, format] = aircraftModels[card.dataset.model];
    loadModel(url, format, name);
  }
}));
renderer.domElement.addEventListener("dblclick", () => { if (activeModel) frameModel(activeModel); });
window.addEventListener("resize", resize);
if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(host);

function animate() {
  requestAnimationFrame(animate);
  updateFpsHud(performance.now());
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  if (animationEnabled && animationMixer) animationMixer.update(delta);
  if (spin && activeModel) activeModel.rotation.y += 0.0028;
  if (animationEnabled && spin && rotorNodes.length) {
    rotorNodes.forEach((node, index) => {
      node.rotation.y += delta * 18 * (index % 2 ? -1 : 1);
    });
  }
  if (animationEnabled && spin && flightMotion && activeModel) {
    activeModel.position.y = flightBaseY + Math.sin(elapsed * 2.2) * modelRadius * 0.025;
  }
  moveCameraFromKeys();
  controls.update();
  renderer.render(scene, camera);
}

resize();
loadModel(defaultUrl);
animate();
