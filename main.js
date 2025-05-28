import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const scene = new THREE.Scene();
const activeCubes = [];
let lastCubeTime = 0;
const cubeSpawnInterval = 5000;
let duckModel = null;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 100);
camera.position.set(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

createCrosshair();
addLights();
setSkybox();
loadModels();

class MovingCube {
  constructor(scene) {
    this.scene = scene;
    this.speed = 0.1;
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
        metalness: 0.2,
        roughness: 0.7
      })
    );
    this.cube.position.set(this.direction > 0 ? -40 : 40, 5, -30);
    this.scene.add(this.cube);
  }

  update() {
    if (!this.cube) return false;
    this.cube.position.x += this.speed * this.direction;
    if (Math.abs(this.cube.position.x) > 50) {
      this.dispose();
      return false;
    }
    return true;
  }

  dispose() {
    this.scene.remove(this.cube);
    this.cube.geometry.dispose();
    this.cube.material.dispose();
    this.cube = null;
  }
}

function createCrosshair() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.01, 0.02, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.9, transparent: true, depthTest: false })
  );
  ring.position.z = -2;

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -2), new THREE.Vector3(0, 0, -2.2)]),
    new THREE.LineBasicMaterial({ color: 0xff0000 })
  );

  camera.add(ring);
  camera.add(line);
  scene.add(camera);
}

function addLights() {
  scene.add(new THREE.AmbientLight(0x040404));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(5, 10, 7);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-5, 5, 5);
  scene.add(fill);

  const back = new THREE.DirectionalLight(0xffffff, 0.8);
  back.position.set(0, 5, -10);
  scene.add(back);
}

function setSkybox() {
  const urls = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(side => `cubemap/${side}.png`);
  const texture = new THREE.CubeTextureLoader().load(urls);
  scene.background = texture;
}

function loadModels() {
  const loader = new GLTFLoader();
  ['arbol', 'arbustos', 'piso', 'cerca'].forEach(name => {
    loader.load(`source/${name}.glb`, gltf => scene.add(gltf.scene));
  });
  loader.load('source/arma.glb', gltf => {
    camera.add(gltf.scene);
    scene.add(camera);
  });
  loader.load('source/duck.glb', gltf => { duckModel = gltf.scene; });
}

const raycaster = new THREE.Raycaster();

function checkIntersections() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const intersects = raycaster.intersectObjects(activeCubes.map(c => c.cube));
  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const index = activeCubes.findIndex(c => c.cube === hit);
    if (index !== -1) {
      activeCubes[index].dispose();
      activeCubes.splice(index, 1);
    }
  }
}

function animate(time) {
  if (!lastCubeTime || time - lastCubeTime > cubeSpawnInterval) {
    activeCubes.push(new MovingCube(scene));
    lastCubeTime = time;
  }

  for (let i = activeCubes.length - 1; i >= 0; i--) {
    if (!activeCubes[i].update()) activeCubes.splice(i, 1);
  }

  checkIntersections();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
