import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, CALC } from './config.js';

// ========== 3D VIEWER CLASS ==========
export class Viewer3D {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('three-container');
    
    if (!this.container || this.container.clientWidth === 0) {
      setTimeout(() => this.init(), 100);
      return;
    }
    
    this.init();
  }
  
  init() {
    // Сцена
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8eaf6);
    this.scene.fog = new THREE.Fog(0xe8eaf6, 1000, 5000);
    
    // Камера
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      1,
      10000
    );
    this.camera.position.set(1500, 1000, 1500);
    
    // Рендерер
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);
    
    // Контролы
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, CONFIG.CABINET.HEIGHT / 2, 0);
    
    // Материалы
    this.materials = {
      dsp: new THREE.MeshStandardMaterial({ 
        color: CONFIG.COLORS.DSP,
        roughness: 0.8,
        metalness: 0.2
      }),
      hdf: new THREE.MeshStandardMaterial({ 
        color: CONFIG.COLORS.HDF,
        roughness: 0.9
      }),
      plinth: new THREE.MeshStandardMaterial({ 
        color: CONFIG.COLORS.PLINTH,
        roughness: 0.9
      }),
      rib: new THREE.MeshStandardMaterial({ 
        color: CONFIG.COLORS.RIB,
        roughness: 0.8,
        metalness: 0.2
      })
    };
    
    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(500, 1000, 500);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 100;
    directionalLight.shadow.camera.far = 5000;
    directionalLight.shadow.camera.left = -2000;
    directionalLight.shadow.camera.right = 2000;
    directionalLight.shadow.camera.top = 2000;
    directionalLight.shadow.camera.bottom = -2000;
    this.scene.add(directionalLight);
    
    // Сетка
    const grid = new THREE.GridHelper(3000, 30, 0x888888, 0xcccccc);
    grid.position.y = -1;
    this.scene.add(grid);
    
    // Статический кабинет
    this.createCabinet();
    
    // Группа для динамических элементов
    this.dynamicGroup = new THREE.Group();
    this.scene.add(this.dynamicGroup);
    
    // Анимация
    this.animate();
    
    // Resize
    window.addEventListener('resize', () => this.resize());
  }
  
  createCabinet() {
    const cabinet = new THREE.Group();
    
    // Боковины
    const sideGeom = new THREE.BoxGeometry(CONFIG.DSP, CONFIG.CABINET.HEIGHT, CALC.innerDepth);
    
    const leftSide = new THREE.Mesh(sideGeom, this.materials.dsp);
    leftSide.position.set(-CONFIG.CABINET.WIDTH/2 + CONFIG.DSP/2, CONFIG.CABINET.HEIGHT/2, CONFIG.HDF/2);
    leftSide.castShadow = true;
    leftSide.receiveShadow = true;
    cabinet.add(leftSide);
    
    const rightSide = new THREE.Mesh(sideGeom, this.materials.dsp);
    rightSide.position.set(CONFIG.CABINET.WIDTH/2 - CONFIG.DSP/2, CONFIG.CABINET.HEIGHT/2, CONFIG.HDF/2);
    rightSide.castShadow = true;
    rightSide.receiveShadow = true;
    cabinet.add(rightSide);
    
    // Дно
    const bottomGeom = new THREE.BoxGeometry(CALC.innerWidth, CONFIG.DSP, CALC.innerDepth);
    const bottom = new THREE.Mesh(bottomGeom, this.materials.dsp);
    bottom.position.set(0, CONFIG.CABINET.BASE - CONFIG.DSP/2, CONFIG.HDF/2);
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    cabinet.add(bottom);
    
    // Крыша
    const top = new THREE.Mesh(bottomGeom, this.materials.dsp);
    top.position.set(0, CONFIG.CABINET.HEIGHT - CONFIG.DSP/2, CONFIG.HDF/2);
    top.castShadow = true;
    top.receiveShadow = true;
    cabinet.add(top);
    
    // Цоколь
    const plinthGeom = new THREE.BoxGeometry(
      CALC.innerWidth,
      CONFIG.CABINET.BASE - CONFIG.DSP,
      CALC.innerDepth
    );
    const plinth = new THREE.Mesh(plinthGeom, this.materials.plinth);
    plinth.position.set(0, (CONFIG.CABINET.BASE - CONFIG.DSP)/2, CONFIG.HDF/2);
    plinth.castShadow = true;
    cabinet.add(plinth);
    
    // Задняя стенка
    const backGeom = new THREE.BoxGeometry(
      CONFIG.CABINET.WIDTH - 2,
      CONFIG.CABINET.HEIGHT - 2,
      CONFIG.HDF
    );
    const back = new THREE.Mesh(backGeom, this.materials.hdf);
    back.position.set(0, CONFIG.CABINET.HEIGHT/2, -CONFIG.CABINET.DEPTH/2 + CONFIG.HDF/2);
    cabinet.add(back);
    
    this.scene.add(cabinet);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  resize() {
    if (!this.container || this.container.clientWidth === 0) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
}
