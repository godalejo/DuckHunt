import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const escena = new THREE.Scene();
const cubosActivos = [];
let ultimaGeneracion = 0;
const intervaloCubos = 3000;
let modeloPato = null;

const camara = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 100);
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

const rayo = new THREE.Raycaster();
const puntero = new THREE.Vector2(0, 0); // Punto central de la pantalla

window.addEventListener('click', disparar);

function disparar() {
  rayo.setFromCamera(puntero, camara);
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

class CuboEnMovimiento {
  constructor(escena) {
    this.escena = escena;
    this.cubo = null;
    this.velocidad = 0.2;
    this.iniciar();
  }

  iniciar() {
    const inicioX = Math.random() < 0.5 ? -40 : 40;
    const geometria = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      metalness: 0.2,
      roughness: 0.7
    });
    this.cubo = new THREE.Mesh(geometria, material);
    this.cubo.position.set(inicioX, 5, -30);
    this.escena.add(this.cubo);
    this.direccion = inicioX > 0 ? -1 : 1;
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
    if (this.cubo) {
      this.escena.remove(this.cubo);
      this.cubo.geometry.dispose();
      this.cubo.material.dispose();
      this.cubo = null;
    }
  }
}

function crearMira() {
  const geometriaAnillo = new THREE.RingGeometry(0.01, 0.02, 32);
  const materialAnillo = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0.9,
    transparent: true,
    depthTest: false
  });
  const anillo = new THREE.Mesh(geometriaAnillo, materialAnillo);
  anillo.position.z = -2;

  const materialLinea = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const puntos = [
    new THREE.Vector3(0, 0, -2),
    new THREE.Vector3(0, 0, -2.2)
  ];
  const geometriaLinea = new THREE.BufferGeometry().setFromPoints(puntos);
  const lineaGuia = new THREE.Line(geometriaLinea, materialLinea);

  camara.add(anillo);
  camara.add(lineaGuia);
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
  const ruta = 'cubemap/';
  const formato = '.png';
  const urls = [
    ruta + 'px' + formato, ruta + 'nx' + formato,
    ruta + 'py' + formato, ruta + 'ny' + formato,
    ruta + 'pz' + formato, ruta + 'nz' + formato
  ];
  const cielo = new THREE.CubeTextureLoader().load(urls);
  escena.background = cielo;
}

function cargarModelos() {
  const cargador = new GLTFLoader();
  cargador.load('source/arbol.glb', gltf => escena.add(gltf.scene));
  cargador.load('source/arbustos.glb', gltf => escena.add(gltf.scene));
  cargador.load('source/piso.glb', gltf => escena.add(gltf.scene));
  cargador.load('source/cerca.glb', gltf => escena.add(gltf.scene));
  cargador.load('source/arma.glb', gltf => {
    const arma = gltf.scene;
    camara.add(arma);
    escena.add(camara);
  });
  cargador.load('source/duck.glb', gltf => {
    modeloPato = gltf.scene;
  });
}

function animar(tiempo) {
  if (!ultimaGeneracion || tiempo - ultimaGeneracion > intervaloCubos) {
    cubosActivos.push(new CuboEnMovimiento(escena));
    ultimaGeneracion = tiempo;
  }

  for (let i = cubosActivos.length - 1; i >= 0; i--) {
    if (!cubosActivos[i].actualizar()) {
      cubosActivos.splice(i, 1);
    }
  }

  renderizador.render(escena, camara);
}

renderizador.setAnimationLoop(animar);
