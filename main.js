import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const escena = new THREE.Scene();
const cubosActivos = [];
let ultimaGeneracion = 0;
const intervaloCubos = 2500;
let modeloPato = null;

const camara = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.001, 100);
camara.position.set(0, 0, 0);

const renderizador = new THREE.WebGLRenderer({ antialias: true });
renderizador.setSize(window.innerWidth, window.innerHeight);
renderizador.xr.enabled = true;
document.body.appendChild(renderizador.domElement);
document.body.appendChild(VRButton.createButton(renderizador));

crearMira();
agregarLuces();
colocarCielo();
cargarModelos();

class CuboEnMovimiento {
  constructor(escena) {
    this.escena = escena;
    this.velocidad = 0.3;
    this.direccion = Math.random() < 0.5 ? 1 : -1;
    this.cubo = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
        metalness: 0.2,
        roughness: 0.7
      })
    );
    this.cubo.position.set(this.direccion > 0 ? -40 : 40, 5, -30);
    this.escena.add(this.cubo);
  }

  actualizar() {
    if (!this.cubo) return false;
    this.cubo.position.x += this.velocidad * this.direccion;
    if (Math.abs(this.cubo.position.x) > 50) {
      this.eliminar();
      return false;
    }
    return true;
  }

  eliminar() {
    this.escena.remove(this.cubo);
    this.cubo.geometry.dispose();
    this.cubo.material.dispose();
    this.cubo = null;
  }
}

function crearMira() {
  const anillo = new THREE.Mesh(
    new THREE.RingGeometry(0.01, 0.02, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.9, transparent: true, depthTest: false })
  );
  anillo.position.z = -2;

  const linea = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -2), new THREE.Vector3(0, 0, -2.2)]),
    new THREE.LineBasicMaterial({ color: 0xff0000 })
  );

  camara.add(anillo);
  camara.add(linea);
  escena.add(camara);
}

function agregarLuces() {
  escena.add(new THREE.AmbientLight(0x040404));
  const luzPrincipal = new THREE.DirectionalLight(0xffffff, 1.2);
  luzPrincipal.position.set(5, 10, 7);
  escena.add(luzPrincipal);

  const luzRelleno = new THREE.DirectionalLight(0xffffff, 0.5);
  luzRelleno.position.set(-5, 5, 5);
  escena.add(luzRelleno);

  const luzTrasera = new THREE.DirectionalLight(0xffffff, 0.8);
  luzTrasera.position.set(0, 5, -10);
  escena.add(luzTrasera);
}

function colocarCielo() {
  const lados = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(lado => `cubemap/${lado}.png`);
  const textura = new THREE.CubeTextureLoader().load(lados);
  escena.background = textura;
}

function cargarModelos() {
  const cargador = new GLTFLoader();
  ['arbol', 'arbustos', 'piso', 'cerca'].forEach(nombre => {
    cargador.load(`source/${nombre}.glb`, gltf => escena.add(gltf.scene));
  });
  cargador.load('source/arma.glb', gltf => {
    camara.add(gltf.scene);
    escena.add(camara);
  });
  cargador.load('source/duck.glb', gltf => { modeloPato = gltf.scene; });
}

const rayo = new THREE.Raycaster();

function revisarIntersecciones() {
  rayo.setFromCamera({ x: 0, y: 0 }, camara);
  const intersecciones = rayo.intersectObjects(cubosActivos.map(c => c.cubo));
  if (intersecciones.length > 0) {
    const cuboTocado = intersecciones[0].object;
    const indice = cubosActivos.findIndex(c => c.cubo === cuboTocado);
    if (indice !== -1) {
      cubosActivos[indice].eliminar();
      cubosActivos.splice(indice, 1);
    }
  }
}

function animate(tiempo) {
  if (!ultimaGeneracion || tiempo - ultimaGeneracion > intervaloCubos) {
    cubosActivos.push(new CuboEnMovimiento(escena));
    ultimaGeneracion = tiempo;
  }

  for (let i = cubosActivos.length - 1; i >= 0; i--) {
    if (!cubosActivos[i].actualizar()) cubosActivos.splice(i, 1);
  }

  revisarIntersecciones();
  renderizador.render(escena, camara);
}

renderizador.setAnimationLoop(animate);

