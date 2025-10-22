import * as THREE from 'three';
import { CONFIG, CALC } from './config.js';
import { Panel } from './Panel.js';
import { Viewer3D } from './Viewer3D.js';

// ========== ГЛАВНОЕ ПРИЛОЖЕНИЕ ==========
export class App {
  constructor() {
    // Динамические размеры шкафа (вместо жестких CONFIG)
    this.cabinet = {
      width: CONFIG.CABINET.WIDTH,
      height: CONFIG.CABINET.HEIGHT,
      depth: CONFIG.CABINET.DEPTH,
      base: CONFIG.CABINET.BASE
    };
    
    // Вычисляемые размеры (аналог CALC)
    this.updateCalc();
    
    // Состояние
    this.mode = 'shelf';
    this.panels = new Map();
    this.nextId = 0;
    
    // Взаимодействие
    this.interaction = {
      dragging: null,
      start: null,
      hasMoved: false
    };
    
    // История
    this.history = {
      states: [],
      index: -1
    };
    
    // Canvas
    this.canvas = {
      element: null,
      ctx: null,
      size: 0,
      scale: 1,
      offset: { x: 0, y: 0 }
    };
    
    // 3D
    this.viewer3D = null;
    this.mesh3D = new Map();
    
    // Таймеры
    this.saveTimer = null;
  }
  
  // Обновляем вычисляемые размеры
  updateCalc() {
    this.calc = {
      innerWidth: this.cabinet.width - CONFIG.DSP * 2,
      innerDepth: this.cabinet.depth - CONFIG.HDF,
      workHeight: this.cabinet.height - this.cabinet.base - CONFIG.DSP
    };
  }
  
  // ========== ИНИЦИАЛИЗАЦИЯ ==========
  init() {
    this.canvas.element = document.getElementById('editor-canvas');
    this.canvas.ctx = this.canvas.element.getContext('2d');
    
    this.setupEvents();
    this.updateCanvas();
    this.loadState();
    this.render2D();
    this.updateStats();
    
    if (window.innerWidth > 1024) {
      setTimeout(() => this.initViewer3D(), 100);
    }
  }
  
  setupEvents() {
    // UI элементы
    const addListener = (selector, event, handler) => {
      const el = selector instanceof Element ? selector : document.querySelector(selector);
      if (el) el.addEventListener(event, handler);
    };
    
    document.querySelectorAll('.tab').forEach(tab => 
      addListener(tab, 'click', () => this.switchTab(tab))
    );
    
    document.querySelectorAll('.mode-btn').forEach(btn => 
      addListener(btn, 'click', () => this.setMode(btn.dataset.mode))
    );
    
    addListener('.clear-btn', 'click', () => this.clearAll());
    addListener('#undo-btn', 'click', () => this.undo());
    addListener('#redo-btn', 'click', () => this.redo());
    
    // Canvas события
    const canvas = this.canvas.element;
    const pointerEvents = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
    pointerEvents.forEach(event => 
      addListener(canvas, event, (e) => this.handlePointer(e), { passive: false })
    );
    
    window.addEventListener('resize', () => this.updateCanvas());
  }
  
  // ========== УПРАВЛЕНИЕ РЕЖИМАМИ ==========
  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    this.updateStatus();
  }
  
  updateStatus(temp = null) {
    const messages = {
      shelf: 'Режим: Добавление полки',
      divider: 'Режим: Добавление разделителя',
      move: 'Режим: Перемещение',
      delete: 'Режим: Удаление'
    };
    
    const text = temp || messages[this.mode];
    document.getElementById('status-text').textContent = text;
    
    if (temp) {
      setTimeout(() => this.updateStatus(), 3000);
    }
  }
  
  switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(tab.dataset.panel).classList.add('active');
    
    if (tab.dataset.panel === 'viewer-panel') {
      setTimeout(() => {
        if (!this.viewer3D) this.initViewer3D();
        if (this.viewer3D) this.viewer3D.resize();
      }, 50);
    } else {
      this.updateCanvas();
    }
  }
  
  // ========== CANVAS УТИЛИТЫ ==========
  updateCanvas() {
    const container = this.canvas.element.parentElement;
    const width = container.clientWidth - 30;
    const height = container.clientHeight - 30;
    
    this.canvas.size = Math.min(width, height, 800);
    this.canvas.element.width = this.canvas.size;
    this.canvas.element.height = this.canvas.size;
    this.canvas.element.style.width = this.canvas.size + 'px';
    this.canvas.element.style.height = this.canvas.size + 'px';
    
    const scaleX = this.canvas.size / this.cabinet.width;
    const scaleY = this.canvas.size / this.cabinet.height;
    this.canvas.scale = Math.min(scaleX, scaleY) * CONFIG.UI.SCALE_PADDING;
    
    this.canvas.offset.x = (this.canvas.size - this.cabinet.width * this.canvas.scale) / 2;
    this.canvas.offset.y = (this.canvas.size - this.cabinet.height * this.canvas.scale) / 2;
    
    this.render2D();
  }
  
  getCoords(e) {
    const rect = this.canvas.element.getBoundingClientRect();
    const point = e.touches?.[0] || e.changedTouches?.[0] || e;
    
    const canvasX = (point.clientX - rect.left) * (this.canvas.size / rect.width);
    const canvasY = (point.clientY - rect.top) * (this.canvas.size / rect.height);
    
    return {
      x: (canvasX - this.canvas.offset.x) / this.canvas.scale,
      y: (this.canvas.size - canvasY - this.canvas.offset.y) / this.canvas.scale
    };
  }
  
  // ========== ОБРАБОТКА СОБЫТИЙ ==========
  handlePointer(e) {
    e.preventDefault();
    const coords = this.getCoords(e);
    
    const handlers = {
      pointerdown: () => this.startInteraction(coords),
      pointermove: () => this.updateInteraction(coords),
      pointerup: () => this.endInteraction(coords),
      pointercancel: () => this.endInteraction(coords)
    };
    
    handlers[e.type]?.();
  }
  
  startInteraction(coords) {
    this.interaction.start = coords;
    this.interaction.hasMoved = false;
    
    if (this.mode === 'move') {
      this.interaction.dragging = this.findPanelAt(coords);
      if (this.interaction.dragging) {
        this.interaction.originalPos = this.interaction.dragging.mainPosition;
      }
    } else if (this.mode === 'delete') {
      const panel = this.findPanelAt(coords);
      if (panel) this.deletePanel(panel);
    }
  }
  
  updateInteraction(coords) {
    if (!this.interaction.start) return;
    
    const distance = Math.hypot(
      coords.x - this.interaction.start.x,
      coords.y - this.interaction.start.y
    );
    
    if (distance > CONFIG.UI.MIN_MOVE) {
      this.interaction.hasMoved = true;
    }
    
    if (this.interaction.dragging && this.interaction.hasMoved) {
      this.movePanel(this.interaction.dragging, coords);
    }
  }
  
  endInteraction(coords) {
    if (!this.interaction.hasMoved && this.mode !== 'move' && this.mode !== 'delete' && this.interaction.start) {
      if (this.mode === 'shelf') {
        this.addPanel('shelf', coords.y, coords.x);
      } else if (this.mode === 'divider') {
        this.addPanel('divider', coords.x, coords.y);
      }
    }
    
    if (this.interaction.dragging) {
      if (this.interaction.hasMoved) {
        this.saveHistory();
      } else {
        this.interaction.dragging.mainPosition = this.interaction.originalPos;
        this.render2D();
        this.updateMesh(this.interaction.dragging);
      }
    }
    
    this.interaction = { dragging: null, start: null, hasMoved: false };
  }
  
  findPanelAt(coords) {
    for (let panel of this.panels.values()) {
      const axis = panel.isHorizontal ? 'y' : 'x';
      const pos = coords[axis];
      const cross = coords[panel.isHorizontal ? 'x' : 'y'];
      
      if (panel.intersects(pos, axis) && panel.intersects(cross, panel.isHorizontal ? 'x' : 'y')) {
        return panel;
      }
    }
    return null;
  }
  
  // ========== ДОБАВЛЕНИЕ ПАНЕЛЕЙ ==========
  addPanel(type, mainPos, crossPos) {
    const isHorizontal = type === 'shelf';
    
    // Ограничения позиции
    if (isHorizontal) {
      mainPos = Math.max(this.cabinet.base, Math.min(this.cabinet.height - CONFIG.DSP, mainPos));
    } else {
      mainPos = Math.max(CONFIG.DSP + CONFIG.MIN_GAP, Math.min(this.cabinet.width - CONFIG.DSP - CONFIG.MIN_GAP, mainPos));
    }
    
    // Находим пересечения с перпендикулярными панелями
    const perpType = isHorizontal ? 'divider' : 'shelf';
    const intersecting = Array.from(this.panels.values())
      .filter(p => p.type === perpType && p.intersects(mainPos, isHorizontal ? 'y' : 'x'))
      .sort((a, b) => a.mainPosition - b.mainPosition);
    
    // Определяем границы новой панели
    let bounds, connections = {};
    if (isHorizontal) {
      let startX = CONFIG.DSP;
      let endX = this.cabinet.width - CONFIG.DSP;
      
      if (intersecting.length > 0) {
        const points = [
          { x: CONFIG.DSP, panel: null },
          ...intersecting.map(d => ({ x: d.position.x, panel: d })),
          { x: this.cabinet.width - CONFIG.DSP, panel: null }
        ];
        
        for (let i = 0; i < points.length - 1; i++) {
          if (crossPos >= points[i].x && crossPos <= points[i + 1].x) {
            startX = points[i].x + (points[i].panel ? CONFIG.DSP : 0);
            endX = points[i + 1].x;
            connections.left = points[i].panel;
            connections.right = points[i + 1].panel;
            break;
          }
        }
      }
      
      if (endX - startX < CONFIG.MIN_SIZE) {
        this.updateStatus(`Слишком узкая секция! Минимум ${CONFIG.MIN_SIZE} мм`);
        return;
      }
      
      bounds = { startX, endX };
    } else {
      let startY = this.cabinet.base;
      let endY = this.cabinet.height - CONFIG.DSP;
      
      if (intersecting.length > 0) {
        const points = [
          { y: this.cabinet.base, panel: null },
          ...intersecting.map(s => ({ y: s.position.y, panel: s })),
          { y: this.cabinet.height - CONFIG.DSP, panel: null }
        ];
        
        for (let i = 0; i < points.length - 1; i++) {
          if (crossPos >= points[i].y && crossPos <= points[i + 1].y) {
            startY = points[i].y + (points[i].panel ? CONFIG.DSP : 0);
            endY = points[i + 1].y;
            connections.bottom = points[i].panel;
            connections.top = points[i + 1].panel;
            break;
          }
        }
      }
      
      if (endY - startY < CONFIG.MIN_SIZE) {
        this.updateStatus(`Слишком низкая секция! Минимум ${CONFIG.MIN_SIZE} мм`);
        return;
      }
      
      bounds = { startY, endY };
    }
    
    const id = `${type}-${this.nextId++}`;
    const position = isHorizontal ? { y: mainPos } : { x: mainPos };
    const panel = new Panel(type, id, position, bounds, connections);
    
    this.panels.set(id, panel);
    
    // Обновляем ребра
    if (isHorizontal) {
      // Добавлена полка - обновляем её ребра
      panel.updateRibs(this.panels, this.cabinet.width);
    } else {
      // Добавлен разделитель - обновляем ребра всех полок, которые он пересекает
      for (let p of this.panels.values()) {
        if (p.isHorizontal && 
            p.bounds.startX <= panel.position.x && 
            p.bounds.endX >= panel.position.x &&
            panel.bounds.startY <= p.position.y &&
            panel.bounds.endY >= p.position.y) {
          p.updateRibs(this.panels, this.cabinet.width);
        }
      }
    }
    
    this.saveHistory();
    this.render2D();
    this.renderAll3D();  // Обновляем весь 3D вид
    this.updateStats();
  }
  
  // ========== ПЕРЕМЕЩЕНИЕ ПАНЕЛЕЙ ==========
  movePanel(panel, coords) {
    const newPos = panel.isHorizontal ? coords.y : coords.x;
    
    // Находим ограничения от других панелей того же типа
    let min = panel.isHorizontal ? this.cabinet.base + CONFIG.MIN_GAP : CONFIG.DSP + CONFIG.MIN_GAP;
    let max = panel.isHorizontal ? this.cabinet.height - CONFIG.DSP - CONFIG.MIN_GAP : this.cabinet.width - CONFIG.DSP - CONFIG.MIN_GAP;
    
    for (let other of this.panels.values()) {
      if (other === panel || other.type !== panel.type) continue;
      
      // Проверяем перекрытие по перпендикулярной оси
      const overlap1 = Math.max(panel.start, other.start);
      const overlap2 = Math.min(panel.end, other.end);
      
      if (overlap2 > overlap1) {
        if (other.mainPosition < panel.mainPosition && other.mainPosition + CONFIG.MIN_GAP > min) {
          min = other.mainPosition + CONFIG.MIN_GAP;
        }
        if (other.mainPosition > panel.mainPosition && other.mainPosition - CONFIG.MIN_GAP < max) {
          max = other.mainPosition - CONFIG.MIN_GAP;
        }
      }
    }
    
    // Обновляем позицию панели
    panel.mainPosition = Math.max(min, Math.min(max, newPos));
    
    // Обновляем bounds и connections только связанных панелей (включая ребра)
    this.updateConnectedPanels(panel);
    
    this.render2D();
    this.renderAll3D();
  }
  
  // ========== ОБНОВЛЕНИЕ СВЯЗАННЫХ ПАНЕЛЕЙ ==========
  updateConnectedPanels(movedPanel) {
    const affectedShelves = new Set();  // Полки, которые нужно обновить
    
    if (movedPanel.isHorizontal) {
      // Перемещена полка - обновляем разделители, которые на ней опираются
      for (let panel of this.panels.values()) {
        if (panel.isHorizontal) continue;
        
        // Проверяем, связан ли разделитель с этой полкой
        if (panel.connections.bottom === movedPanel) {
          panel.bounds.startY = movedPanel.position.y + CONFIG.DSP;
        }
        if (panel.connections.top === movedPanel) {
          panel.bounds.endY = movedPanel.position.y;
        }
      }
      
      // Обновляем ребра перемещенной полки
      movedPanel.updateRibs(this.panels, this.cabinet.width);
    } else {
      // Перемещен разделитель - обновляем полки, которые на нем заканчиваются
      for (let panel of this.panels.values()) {
        if (!panel.isHorizontal) continue;
        
        // Проверяем, связана ли полка с этим разделителем
        if (panel.connections.left === movedPanel) {
          panel.bounds.startX = movedPanel.position.x + CONFIG.DSP;
          affectedShelves.add(panel);  // Запоминаем для обновления ребер
        }
        if (panel.connections.right === movedPanel) {
          panel.bounds.endX = movedPanel.position.x;
          affectedShelves.add(panel);  // Запоминаем для обновления ребер
        }
        
        // Также проверяем полки, которые разделитель пересекает (для ребер)
        if (panel.bounds.startX <= movedPanel.position.x && 
            panel.bounds.endX >= movedPanel.position.x &&
            movedPanel.bounds.startY <= panel.position.y &&
            movedPanel.bounds.endY >= panel.position.y) {
          affectedShelves.add(panel);
        }
      }
      
      // Обновляем ребра только затронутых полок
      for (let shelf of affectedShelves) {
        shelf.updateRibs(this.panels, this.cabinet.width);
      }
    }
  }
  
  // ========== УДАЛЕНИЕ ==========
  deletePanel(panel) {
    const toDelete = new Set([panel]);
    
    const findDependent = (current) => {
      for (let other of this.panels.values()) {
        if (toDelete.has(other)) continue;
        
        // Проверяем зависимость через connections
        if (current.isHorizontal) {
          // Если удаляем полку, проверяем разделители которые на ней заканчиваются/начинаются
          if (!other.isHorizontal) {
            if (other.connections.bottom === current || other.connections.top === current) {
              toDelete.add(other);
              findDependent(other);
            }
          }
        } else {
          // Если удаляем разделитель, проверяем полки которые на нем заканчиваются/начинаются  
          if (other.isHorizontal) {
            if (other.connections.left === current || other.connections.right === current) {
              toDelete.add(other);
              findDependent(other);
            }
          }
        }
      }
    };
    
    findDependent(panel);
    
    // Сохраняем список панелей которые ссылались на удаляемые
    const affectedPanels = new Set();
    for (let remaining of this.panels.values()) {
      if (toDelete.has(remaining)) continue;
      
      for (let deleted of toDelete) {
        if (Object.values(remaining.connections).includes(deleted)) {
          affectedPanels.add(remaining);
        }
      }
    }
    
    // Удаляем панели и их 3D объекты
    for (let p of toDelete) {
      this.removeMesh(p);
      this.panels.delete(p.id);
    }
    
    // Восстанавливаем bounds для затронутых панелей
    for (let affected of affectedPanels) {
      this.recalculatePanelBounds(affected);
    }
    
    // Обновляем ребра для всех полок
    for (let panel of this.panels.values()) {
      if (panel.isHorizontal) {
        panel.updateRibs(this.panels, this.cabinet.width);
      }
    }
    
    this.saveHistory();
    this.render2D();
    this.renderAll3D();
    this.updateStats();
  }
  
  // ========== ПЕРЕСЧЕТ ГРАНИЦ ПАНЕЛИ ==========
  recalculatePanelBounds(panel) {
    if (panel.isHorizontal) {
      // Полка: находим разделители которые её ограничивают
      const dividers = Array.from(this.panels.values())
        .filter(p => !p.isHorizontal && 
                    p.bounds.startY <= panel.position.y && 
                    p.bounds.endY >= panel.position.y)
        .sort((a, b) => a.position.x - b.position.x);
      
      // Создаем массив точек (боковины + разделители)
      const points = [
        { x: CONFIG.DSP, panel: null },
        ...dividers.map(d => ({ x: d.position.x, panel: d })),
        { x: this.cabinet.width - CONFIG.DSP, panel: null }
      ];
      
      // Находим сегмент по центру полки
      const center = (panel.bounds.startX + panel.bounds.endX) / 2;
      
      for (let i = 0; i < points.length - 1; i++) {
        const segmentStart = points[i].x + (points[i].panel ? CONFIG.DSP : 0);
        const segmentEnd = points[i + 1].x;
        
        if (center >= points[i].x && center <= points[i + 1].x) {
          panel.bounds.startX = segmentStart;
          panel.bounds.endX = segmentEnd;
          panel.connections.left = points[i].panel;
          panel.connections.right = points[i + 1].panel;
          panel.updateRibs(this.panels, this.cabinet.width);
          break;
        }
      }
    } else {
      // Разделитель: находим полки которые его ограничивают
      const shelves = Array.from(this.panels.values())
        .filter(p => p.isHorizontal && 
                    p.bounds.startX <= panel.position.x && 
                    p.bounds.endX >= panel.position.x)
        .sort((a, b) => a.position.y - b.position.y);
      
      // Создаем массив точек (дно + полки + крыша)
      const points = [
        { y: this.cabinet.base, panel: null },
        ...shelves.map(s => ({ y: s.position.y, panel: s })),
        { y: this.cabinet.height - CONFIG.DSP, panel: null }
      ];
      
      // Находим сегмент по центру разделителя
      const center = (panel.bounds.startY + panel.bounds.endY) / 2;
      
      for (let i = 0; i < points.length - 1; i++) {
        const segmentStart = points[i].y + (points[i].panel ? CONFIG.DSP : 0);
        const segmentEnd = points[i + 1].y;
        
        if (center >= points[i].y && center <= points[i + 1].y) {
          panel.bounds.startY = segmentStart;
          panel.bounds.endY = segmentEnd;
          panel.connections.bottom = points[i].panel;
          panel.connections.top = points[i + 1].panel;
          break;
        }
      }
    }
  }
  
  clearAll() {
    if (this.panels.size === 0) return;
    
    for (let panel of this.panels.values()) {
      this.removeMesh(panel);
    }
    
    this.panels.clear();
    this.saveHistory();
    this.render2D();
    this.updateStats();
  }
  
  // ========== СЕРИАЛИЗАЦИЯ CONNECTIONS ==========
  serializeConnections(connections) {
    // Конвертируем Panel ссылки в ID для сохранения
    const serialized = {};
    for (let key in connections) {
      serialized[key] = connections[key] ? connections[key].id : null;
    }
    return serialized;
  }
  
  deserializeConnections(connectionsData) {
    // Конвертируем ID обратно в Panel ссылки
    const deserialized = {};
    for (let key in connectionsData) {
      const panelId = connectionsData[key];
      deserialized[key] = panelId ? this.panels.get(panelId) : null;
    }
    return deserialized;
  }
  
  // ========== ИСТОРИЯ ==========
  saveHistory() {
    const state = {
      panels: Array.from(this.panels.values()).map(p => ({
        type: p.type,
        id: p.id,
        position: { ...p.position },
        bounds: { ...p.bounds },
        connections: this.serializeConnections(p.connections)
      })),
      nextId: this.nextId
    };
    
    if (this.history.index < this.history.states.length - 1) {
      this.history.states = this.history.states.slice(0, this.history.index + 1);
    }
    
    this.history.states.push(state);
    if (this.history.states.length > CONFIG.UI.MAX_HISTORY) {
      this.history.states.shift();
    } else {
      this.history.index++;
    }
    
    this.updateHistoryButtons();
    this.scheduleSave();
  }
  
  undo() {
    if (this.history.index <= 0) return;
    this.history.index--;
    this.restoreState(this.history.states[this.history.index]);
  }
  
  redo() {
    if (this.history.index >= this.history.states.length - 1) return;
    this.history.index++;
    this.restoreState(this.history.states[this.history.index]);
  }
  
  restoreState(state) {
    // Очищаем текущие панели
    for (let panel of this.panels.values()) {
      this.removeMesh(panel);
    }
    this.panels.clear();
    
    // Сначала создаем все панели без connections
    state.panels.forEach(data => {
      const panel = new Panel(data.type, data.id, data.position, data.bounds, {});
      this.panels.set(data.id, panel);
    });
    
    // Теперь восстанавливаем connections с правильными ссылками
    state.panels.forEach(data => {
      const panel = this.panels.get(data.id);
      panel.connections = this.deserializeConnections(data.connections);
    });
    
    this.nextId = state.nextId;
    
    // Обновляем ребра для всех полок
    for (let panel of this.panels.values()) {
      if (panel.isHorizontal) {
        panel.updateRibs(this.panels, this.cabinet.width);
      }
    }
    
    this.render2D();
    this.renderAll3D();
    this.updateStats();
    this.updateHistoryButtons();
  }
  
  updateHistoryButtons() {
    document.getElementById('undo-btn').disabled = this.history.index <= 0;
    document.getElementById('redo-btn').disabled = this.history.index >= this.history.states.length - 1;
  }
  
  // ========== СОХРАНЕНИЕ ==========
  scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveToStorage(), CONFIG.UI.SAVE_DELAY);
  }
  
  saveToStorage() {
    try {
      localStorage.setItem('cabinetDesignV3', JSON.stringify({
        panels: Array.from(this.panels.values()).map(p => ({
          type: p.type,
          id: p.id,
          position: { ...p.position },
          bounds: { ...p.bounds },
          connections: this.serializeConnections(p.connections)
        })),
        nextId: this.nextId,
        history: this.history
      }));
      this.showSaved();
    } catch (e) {
      console.error('Save error:', e);
    }
  }
  
  loadState() {
    try {
      const data = JSON.parse(localStorage.getItem('cabinetDesignV3') || '{}');
      
      if (data.panels) {
        // Сначала создаем все панели без connections
        data.panels.forEach(panelData => {
          const panel = new Panel(
            panelData.type,
            panelData.id,
            panelData.position,
            panelData.bounds,
            {}
          );
          this.panels.set(panelData.id, panel);
        });
        
        // Теперь восстанавливаем connections с правильными ссылками
        data.panels.forEach(panelData => {
          const panel = this.panels.get(panelData.id);
          panel.connections = this.deserializeConnections(panelData.connections);
        });
        
        this.nextId = data.nextId || 0;
        this.history = data.history || { states: [], index: -1 };
        
        // Обновляем ребра для всех загруженных полок
        for (let panel of this.panels.values()) {
          if (panel.isHorizontal) {
            panel.updateRibs(this.panels, this.cabinet.width);
          }
        }
      }
      
      if (this.history.states.length === 0) {
        this.saveHistory();
      }
      
      this.updateHistoryButtons();
    } catch (e) {
      console.error('Load error:', e);
      this.saveHistory();
    }
  }
  
  showSaved() {
    const indicator = document.getElementById('saved-indicator');
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 2000);
  }
  
  updateStats() {
    const shelves = Array.from(this.panels.values()).filter(p => p.type === 'shelf');
    const dividers = Array.from(this.panels.values()).filter(p => p.type === 'divider');
    
    document.getElementById('stat-shelves').textContent = shelves.length;
    document.getElementById('stat-dividers').textContent = dividers.length;
  }
  
  // ========== 2D ОТРИСОВКА ==========
  render2D() {
    const ctx = this.canvas.ctx;
    const { size, scale, offset } = this.canvas;
    
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    
    const toY = (y) => size - offset.y * 2 - (y * scale);
    
    // Фон кабинета
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(
      CONFIG.DSP * scale,
      toY(this.cabinet.height - CONFIG.DSP),
      this.calc.innerWidth * scale,
      this.calc.workHeight * scale
    );
    
    // Корпус
    ctx.fillStyle = '#8B6633';
    
    // Боковины
    ctx.fillRect(0, toY(this.cabinet.height), CONFIG.DSP * scale, this.cabinet.height * scale);
    ctx.fillRect((this.cabinet.width - CONFIG.DSP) * scale, toY(this.cabinet.height), CONFIG.DSP * scale, this.cabinet.height * scale);
    
    // Дно
    ctx.fillRect(CONFIG.DSP * scale, toY(this.cabinet.base), this.calc.innerWidth * scale, CONFIG.DSP * scale);
    
    // Крыша
    ctx.fillRect(CONFIG.DSP * scale, toY(this.cabinet.height), this.calc.innerWidth * scale, CONFIG.DSP * scale);
    
    // Цоколь
    ctx.fillStyle = '#654321';
    ctx.fillRect(
      CONFIG.DSP * scale,
      toY(this.cabinet.base - CONFIG.DSP),
      this.calc.innerWidth * scale,
      (this.cabinet.base - CONFIG.DSP) * scale
    );
    
    // Панели
    for (let panel of this.panels.values()) {
      ctx.fillStyle = this.interaction.dragging === panel ? CONFIG.COLORS.ACTIVE : '#8B6633';
      
      if (panel.isHorizontal) {
        // Полка
        ctx.fillRect(
          panel.bounds.startX * scale,
          toY(panel.position.y + CONFIG.DSP),
          panel.size * scale,
          CONFIG.DSP * scale
        );
        
        // Ребра жесткости (если есть) - прижаты к низу полки
        if (panel.ribs.length > 0) {
          ctx.fillStyle = '#7A5A2F';  // Чуть темнее для ребра
          for (let rib of panel.ribs) {
            ctx.fillRect(
              rib.startX * scale,
              toY(panel.position.y),  // Верх ребра = низ полки
              (rib.endX - rib.startX) * scale,
              CONFIG.RIB.HEIGHT * scale
            );
          }
          // Восстанавливаем цвет для следующих элементов
          ctx.fillStyle = this.interaction.dragging === panel ? CONFIG.COLORS.ACTIVE : '#8B6633';
        }
      } else {
        // Разделитель
        ctx.fillRect(
          panel.position.x * scale,
          toY(panel.bounds.endY),
          CONFIG.DSP * scale,
          panel.size * scale
        );
      }
    }
    
    ctx.restore();
  }
  
  // ========== 3D ВИЗУАЛИЗАЦИЯ ==========
  initViewer3D() {
    this.viewer3D = new Viewer3D(this);
    this.renderAll3D();
  }
  
  renderAll3D() {
    if (!this.viewer3D) return;
    
    for (let panel of this.panels.values()) {
      this.updateMesh(panel);
    }
  }
  
  updateMesh(panel) {
    if (!this.viewer3D) return;
    
    let mesh = this.mesh3D.get(panel.id);
    const geometry = panel.getGeometry(this.cabinet.depth);
    
    if (!mesh) {
      const geom = new THREE.BoxGeometry(geometry.width, geometry.height, geometry.depth);
      mesh = new THREE.Mesh(geom, this.viewer3D.materials.dsp);
      this.viewer3D.dynamicGroup.add(mesh);
      this.mesh3D.set(panel.id, mesh);
    } else {
      const params = mesh.geometry.parameters;
      if (params.width !== geometry.width || params.height !== geometry.height) {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.BoxGeometry(geometry.width, geometry.height, geometry.depth);
      }
    }
    
    mesh.position.copy(panel.get3DPosition(this.cabinet.width, this.cabinet.depth));
    
    // Обрабатываем ребра жесткости для полок
    if (panel.isHorizontal) {
      // Удаляем все старые ребра
      for (let i = 0; i < 10; i++) {  // Максимум 10 ребер на полку
        const ribId = `${panel.id}-rib-${i}`;
        const oldRib = this.mesh3D.get(ribId);
        if (oldRib) {
          this.viewer3D.dynamicGroup.remove(oldRib);
          oldRib.geometry.dispose();
          this.mesh3D.delete(ribId);
        }
      }
      
      // Создаем новые ребра
      panel.ribs.forEach((rib, index) => {
        const ribId = `${panel.id}-rib-${index}`;
        const ribWidth = rib.endX - rib.startX;
        
        // Ребро с меньшей глубиной, прижатое к задней стенке
        const ribGeom = new THREE.BoxGeometry(
          ribWidth,
          CONFIG.RIB.HEIGHT,
          CONFIG.RIB.DEPTH
        );
        const ribMesh = new THREE.Mesh(ribGeom, this.viewer3D.materials.rib);
        
        // Позиционируем ребро под полкой в правильном пролете
        // Y: прижато к низу полки (без зазора)
        // Z: у задней стенки (cabDepth - hdfThick)
        ribMesh.position.set(
          (rib.startX + rib.endX) / 2 - this.cabinet.width / 2,
          panel.position.y - CONFIG.RIB.HEIGHT/2,
          -this.cabinet.depth/2 + CONFIG.HDF + CONFIG.RIB.DEPTH/2
        );
        
        this.viewer3D.dynamicGroup.add(ribMesh);
        this.mesh3D.set(ribId, ribMesh);
      });
    }
  }
  
  removeMesh(panel) {
    if (!this.viewer3D) return;
    
    // Удаляем основную панель
    const mesh = this.mesh3D.get(panel.id);
    if (mesh) {
      this.viewer3D.dynamicGroup.remove(mesh);
      mesh.geometry.dispose();
      this.mesh3D.delete(panel.id);
    }
    
    // Удаляем ребра, если есть
    if (panel.isHorizontal) {
      for (let i = 0; i < 10; i++) {  // Максимум 10 ребер на полку
        const ribId = `${panel.id}-rib-${i}`;
        const ribMesh = this.mesh3D.get(ribId);
        if (ribMesh) {
          this.viewer3D.dynamicGroup.remove(ribMesh);
          ribMesh.geometry.dispose();
          this.mesh3D.delete(ribId);
        }
      }
    }
  }
}
