import { CONFIG } from './config.js';
import * as THREE from 'three';

// ========== БАЗОВЫЙ КЛАСС ПАНЕЛИ ==========
export class Panel {
  constructor(type, id, position, bounds, connections = {}) {
    this.type = type;
    this.id = id;
    this.position = position;
    this.bounds = bounds;
    this.connections = connections;
    this.ribs = [];  // Массив ребер жесткости для полок [{startX, endX}, ...]
    
    // Проверяем необходимость ребер при создании
    if (this.isHorizontal) {
      this.updateRibs();
    }
  }

  get isHorizontal() { return this.type === 'shelf'; }
  
  get mainAxis() { return this.isHorizontal ? 'y' : 'x'; }
  
  get mainPosition() { return this.isHorizontal ? this.position.y : this.position.x; }
  
  set mainPosition(val) {
    if (this.isHorizontal) {
      this.position.y = val;
    } else {
      this.position.x = val;
    }
  }

  get start() { return this.isHorizontal ? this.bounds.startX : this.bounds.startY; }
  get end() { return this.isHorizontal ? this.bounds.endX : this.bounds.endY; }
  
  get size() { return this.end - this.start; }
  
  updateRibs(panels) {
    if (!this.isHorizontal || !panels) return;
    
    this.ribs = [];
    
    // Находим все вертикали (боковины + разделители) в зоне полки
    const verticals = [];
    
    // Добавляем боковины
    verticals.push(CONFIG.DSP);
    verticals.push(CONFIG.CABINET.WIDTH - CONFIG.DSP);
    
    // Добавляем разделители, которые проходят через эту полку
    for (let panel of panels.values()) {
      if (!panel.isHorizontal && 
          panel.position.x >= this.bounds.startX && 
          panel.position.x <= this.bounds.endX &&
          panel.bounds.startY <= this.position.y && 
          panel.bounds.endY >= this.position.y) {
        verticals.push(panel.position.x);
      }
    }
    
    // Сортируем вертикали
    verticals.sort((a, b) => a - b);
    
    // Проверяем каждый пролет между соседними вертикалями
    for (let i = 0; i < verticals.length - 1; i++) {
      const startX = Math.max(verticals[i], this.bounds.startX);
      const endX = Math.min(verticals[i + 1], this.bounds.endX);
      const span = endX - startX;
      
      // Если пролет > 800мм, добавляем ребро
      if (span > CONFIG.RIB.MIN_SPAN) {
        this.ribs.push({ startX, endX });
      }
    }
  }

  intersects(position, axis) {
    if (axis === this.mainAxis) {
      return Math.abs(this.mainPosition - position) < CONFIG.UI.SNAP;
    }
    return position >= this.start && position <= this.end;
  }

  getGeometry() {
    const innerDepth = CONFIG.CABINET.DEPTH - CONFIG.HDF;
    
    if (this.isHorizontal) {
      return { 
        width: this.size, 
        height: CONFIG.DSP, 
        depth: innerDepth 
      };
    } else {
      return { 
        width: CONFIG.DSP, 
        height: this.size, 
        depth: innerDepth 
      };
    }
  }

  get3DPosition() {
    const innerDepth = CONFIG.CABINET.DEPTH - CONFIG.HDF;
    
    if (this.isHorizontal) {
      return new THREE.Vector3(
        this.start + this.size/2 - CONFIG.CABINET.WIDTH/2,
        this.position.y + CONFIG.DSP/2,  // Смещаем на половину толщины вверх
        CONFIG.HDF/2  // Панели смещены вперед на толщину ХДФ
      );
    } else {
      return new THREE.Vector3(
        this.position.x - CONFIG.CABINET.WIDTH/2 + CONFIG.DSP/2,
        this.start + this.size/2,
        CONFIG.HDF/2  // Панели смещены вперед на толщину ХДФ
      );
    }
  }
}
