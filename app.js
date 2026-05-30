/**
 * 퍼피메모리 — app.js
 * Mobile-first pet goods design web app MVP
 *
 * Architecture note: Designed to be migrated to React/Next.js + Supabase.
 * State is kept in a single `appState` object; all UI updates are driven
 * from this state (unidirectional data flow pattern).
 * localStorage replaces Supabase for this MVP.
 */

'use strict';

/* =============================================================
   1. STATE
============================================================= */
const appState = {
  currentScreen: 'home',       // 'home' | 'step1' | 'step2' | 'step3' | 'delegate' | 'complete' | 'admin'
  orderMethod: 'diy',          // 'diy' | 'delegate'
  photo: null,                 // base64 data URL
  name: '',
  date: '',
  message: '',
  bgColor: '#FAF7F0',
  bgColorName: '크림',
  request: '',
  showGuide: false,
  checks: { c1: false, c2: false, c3: false, c4: false },
  currentOrderId: null,
  adminFilter: 'all',
  adminTab: 'orders',
  isAdminLoggedIn: false,

  // For delegate mode
  delegatePhoto: null,
  delegateName: '',
  delegateDate: '',
  delegateRequest: '',
};

/* =============================================================
   2. STORAGE (localStorage → migrate to Supabase)
============================================================= */
const Storage = {
  ORDERS_KEY: 'puppymemory_orders',

  getOrders() {
    try {
      return JSON.parse(localStorage.getItem(this.ORDERS_KEY) || '[]');
    } catch { return []; }
  },

  saveOrder(order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) orders[idx] = order;
    else orders.unshift(order);
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));
  },

  getOrder(id) {
    return this.getOrders().find(o => o.id === id) || null;
  },

  updateOrderStatus(id, status) {
    const order = this.getOrder(id);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      this.saveOrder(order);
    }
  },

  updateOrderMemo(id, memo) {
    const order = this.getOrder(id);
    if (order) {
      order.adminMemo = memo;
      this.saveOrder(order);
    }
  },
};

/* =============================================================
   3. CANVAS RENDERER
============================================================= */
const Renderer = {
  CANVAS_SIZE: 900,
  SAFE_MARGIN: 54,   // ~6mm in 900px canvas (90mm total → 1px ≈ 10mm)

  /**
   * Draw the 90mm square frame design onto a canvas
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts
   */
  draw(canvas, opts = {}) {
    const {
      photo = null,
      name = '',
      date = '',
      message = '',
      bgColor = '#FAF7F0',
      showGuide = false,
    } = opts;

    const ctx = canvas.getContext('2d');
    const S = this.CANVAS_SIZE;
    const M = this.SAFE_MARGIN;

    ctx.clearRect(0, 0, S, S);

    // ── Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, S, S);

    // ── Subtle texture (fine dots)
    ctx.fillStyle = 'rgba(0,0,0,0.025)';
    for (let x = 0; x < S; x += 18) {
      for (let y = 0; y < S; y += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Layout zones (portrait-style within square)
    const photoTop = M + 40;
    const photoSize = S - M * 2 - 130; // leave space for text below
    const photoLeft = (S - photoSize) / 2;
    const textTop = photoTop + photoSize + 28;

    // ── Photo area
    if (photo) {
      const img = new Image();
      img.src = photo;

      // Draw image clipped to rounded rect
      ctx.save();
      this._roundRect(ctx, photoLeft, photoTop, photoSize, photoSize, 18);
      ctx.clip();

      // Cover-fit
      const scale = Math.max(photoSize / img.naturalWidth, photoSize / img.naturalHeight);
      const sw = img.naturalWidth * scale;
      const sh = img.naturalHeight * scale;
      const sx = photoLeft + (photoSize - sw) / 2;
      const sy = photoTop + (photoSize - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);
      ctx.restore();

      // Photo border
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 2;
      this._roundRect(ctx, photoLeft, photoTop, photoSize, photoSize, 18);
      ctx.stroke();
      ctx.restore();

    } else {
      // Placeholder
      ctx.save();
      this._roundRect(ctx, photoLeft, photoTop, photoSize, photoSize, 18);
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.font = `${photoSize * 0.18}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐾', photoLeft + photoSize / 2, photoTop + photoSize / 2);
    }

    // ── Thin divider line
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(photoLeft + 20, textTop + 2);
    ctx.lineTo(photoLeft + photoSize - 20, textTop + 2);
    ctx.stroke();

    let yPos = textTop + 32;

    // ── Pet name
    if (name) {
      ctx.fillStyle = '#2D2118';
      ctx.font = `bold ${S * 0.054}px "Gowun Batang", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.letterSpacing = `${S * 0.01}px`;
      ctx.fillText(name, S / 2, yPos);
      ctx.letterSpacing = '0px';
      yPos += S * 0.052;
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.font = `${S * 0.04}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('반려동물 이름', S / 2, yPos);
      yPos += S * 0.045;
    }

    // ── Date
    if (date) {
      ctx.fillStyle = '#9A8A78';
      ctx.font = `${S * 0.033}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(date, S / 2, yPos);
      yPos += S * 0.04;
    }

    // ── Message (up to 2 lines)
    if (message) {
      const lines = message.split('\n').slice(0, 2);
      ctx.fillStyle = '#7A6A5A';
      ctx.font = `${S * 0.03}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      lines.forEach(line => {
        ctx.fillText(line, S / 2, yPos);
        yPos += S * 0.036;
      });
    }

    // ── Decorative corner ornaments
    this._drawCornerOrn(ctx, M, M, 30, 'tl', 'rgba(0,0,0,0.1)');
    this._drawCornerOrn(ctx, S - M, M, 30, 'tr', 'rgba(0,0,0,0.1)');
    this._drawCornerOrn(ctx, M, S - M, 30, 'bl', 'rgba(0,0,0,0.1)');
    this._drawCornerOrn(ctx, S - M, S - M, 30, 'br', 'rgba(0,0,0,0.1)');

    // ── Safe area guide
    if (showGuide) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(255,100,100,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(M, M, S - M * 2, S - M * 2);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,100,100,0.7)';
      ctx.font = `bold ${S * 0.022}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('안전영역', M + 6, M - 8);
      ctx.restore();
    }
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  },

  _drawCornerOrn(ctx, x, y, len, pos, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const dx = pos.includes('r') ? -1 : 1;
    const dy = pos.includes('b') ? -1 : 1;
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
    ctx.stroke();
  },

  /**
   * Export canvas as PNG blob URL
   */
  exportPNG(canvas) {
    return canvas.toDataURL('image/png', 1.0);
  },
};

/* =============================================================
   4. VALIDATION
============================================================= */
const Validator = {
  name(val) {
    if (!val.trim()) return '이름을 입력해주세요';
    if (val.trim().length > 10) return '이름은 10자 이하로 입력해주세요';
    return null;
  },

  date(val) {
    if (!val) return null; // optional
    const re = /^\d{4}\.(0[1-9]|1[0-2])\.(0[1-9]|[12]\d|3[01])$/;
    if (!re.test(val)) return '날짜 형식이 올바르지 않습니다 (예: 2024.03.15)';
    return null;
  },

  message(val) {
    if (!val) return null; // optional
    const lines = val.split('\n');
    if (lines.length > 2) return '문구는 최대 2줄까지 입력할 수 있습니다';
    for (const line of lines) {
      if ([...line].length > 14) return `줄당 14자를 초과했습니다`;
    }
    return null;
  },
};

/* =============================================================
   5. ORDER SERVICE
============================================================= */
const OrderService = {
  generateId() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PM-${date}-${rand}`;
  },

  createDIYOrder(canvasDataURL) {
    const id = this.generateId();
    const order = {
      id,
      type: 'diy',
      status: '접수완료',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: appState.name,
      date: appState.date,
      message: appState.message,
      bgColor: appState.bgColor,
      bgColorName: appState.bgColorName,
      request: appState.request,
      photo: appState.photo,
      canvasPreview: canvasDataURL,
      adminMemo: '',
    };
    Storage.saveOrder(order);
    return id;
  },

  createDelegateOrder() {
    const id = this.generateId();
    const order = {
      id,
      type: 'delegate',
      status: '접수완료',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: appState.delegateName,
      date: appState.delegateDate,
      message: '',
      bgColor: '',
      bgColorName: '',
      request: appState.delegateRequest,
      photo: appState.delegatePhoto,
      canvasPreview: null,
      adminMemo: '',
    };
    Storage.saveOrder(order);
    return id;
  },
};

/* =============================================================
   6. NAVIGATION & SCREEN MANAGER
============================================================= */
const Nav = {
  STEP_CONFIG: {
    home: { step: 0, total: 3, label: '' },
    step1: { step: 1, total: 3, label: '1 / 3  사진 업로드' },
    step2: { step: 2, total: 3, label: '2 / 3  정보 입력' },
    step3: { step: 3, total: 3, label: '3 / 3  미리보기 확인' },
    delegate: { step: 1, total: 1, label: '맡기기 신청' },
    complete: { step: 0, total: 0, label: '' },
    admin: { step: 0, total: 0, label: '' },
  },

  go(screenName, opts = {}) {
    const prev = appState.currentScreen;
    appState.currentScreen = screenName;

    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Show target
    const target = {
      home: 'screenHome',
      step1: 'screenStep1',
      step2: 'screenStep2',
      step3: 'screenStep3',
      delegate: 'screenDelegate',
      complete: 'screenComplete',
      admin: 'screenAdmin',
    }[screenName];

    const el = document.getElementById(target);
    if (el) el.classList.add('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Update header
    this._updateHeader(screenName);

    // Run screen lifecycle
    this._onEnter(screenName, opts);
  },

  _updateHeader(screenName) {
    const cfg = this.STEP_CONFIG[screenName] || { step: 0, total: 0, label: '' };
    const btnBack = document.getElementById('btnBack');
    const stepIndicator = document.getElementById('stepIndicator');
    const stepFill = document.getElementById('stepFill');
    const stepLabel = document.getElementById('stepLabel');

    // Back button
    if (screenName === 'home' || screenName === 'complete') {
      btnBack.classList.add('invisible');
    } else {
      btnBack.classList.remove('invisible');
    }

    // Step bar
    if (cfg.total > 0 && cfg.step > 0) {
      stepIndicator.classList.add('visible');
      const pct = (cfg.step / cfg.total) * 100;
      stepFill.style.width = pct + '%';
      stepLabel.textContent = cfg.label;
    } else {
      stepIndicator.classList.remove('visible');
    }
  },

  _onEnter(screenName, opts) {
    switch (screenName) {
      case 'step3':
        UI.renderCanvas();
        UI.renderSummary();
        break;
      case 'admin':
        Admin.render();
        break;
    }
  },

  back() {
    const prev = {
      step1: 'home',
      step2: 'step1',
      step3: 'step2',
      delegate: 'home',
      admin: 'home',
    }[appState.currentScreen];
    if (prev) this.go(prev);
  },
};

/* =============================================================
   7. UI CONTROLLER
============================================================= */
const UI = {
  _canvas: null,

  init() {
    this._canvas = document.getElementById('previewCanvas');
  },

  renderCanvas() {
    if (!this._canvas) return;

    // Load photo before drawing
    if (appState.photo) {
      const img = new Image();
      img.onload = () => Renderer.draw(this._canvas, {
        photo: appState.photo,
        name: appState.name,
        date: appState.date,
        message: appState.message,
        bgColor: appState.bgColor,
        showGuide: appState.showGuide,
      });
      img.src = appState.photo;
    } else {
      Renderer.draw(this._canvas, {
        photo: null,
        name: appState.name,
        date: appState.date,
        message: appState.message,
        bgColor: appState.bgColor,
        showGuide: appState.showGuide,
      });
    }
  },

  renderSummary() {
    const el = document.getElementById('summaryList');
    if (!el) return;
    const rows = [
      { key: '이름', val: appState.name || '—' },
      { key: '날짜', val: appState.date || '—' },
      { key: '문구', val: appState.message ? appState.message.replace(/\n/g, ' / ') : '—' },
      { key: '배경', val: appState.bgColorName },
      { key: '요청사항', val: appState.request || '—' },
    ];
    el.innerHTML = rows.map(r => `
      <div class="summary-item">
        <span class="summary-key">${r.key}</span>
        <span class="summary-val">${escHtml(r.val)}</span>
      </div>
    `).join('');
  },

  showToast(msg, duration = 2200) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
  },
};

/* =============================================================
   8. ADMIN MODULE
============================================================= */
const Admin = {
  STATUSES: ['접수완료', '사진확인필요', '문구확인필요', '제작가능', '제작중', '발송완료'],
  ADMIN_PW: '1234', // In production: server-side auth

  login(pw) {
    if (pw === this.ADMIN_PW) {
      appState.isAdminLoggedIn = true;
      return true;
    }
    return false;
  },

  render() {
    this._renderStats();
    this._renderOrders();
  },

  _getOrders() {
    let orders = Storage.getOrders();
    if (appState.adminFilter !== 'all') {
      orders = orders.filter(o => o.status === appState.adminFilter);
    }
    return orders;
  },

  _renderStats() {
    const all = Storage.getOrders();
    const el = document.getElementById('adminStats');
    const counts = {};
    this.STATUSES.forEach(s => counts[s] = 0);
    all.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });

    el.innerHTML = `
      <div class="stat-chip primary">전체 ${all.length}건</div>
      <div class="stat-chip">접수 ${counts['접수완료']}</div>
      <div class="stat-chip">제작중 ${counts['제작중']}</div>
      <div class="stat-chip">발송 ${counts['발송완료']}</div>
    `;

    // Stats tab
    const sg = document.getElementById('statsGrid');
    sg.innerHTML = `
      <div class="stat-card"><div class="stat-num">${all.length}</div><div class="stat-label">전체 주문</div></div>
      <div class="stat-card"><div class="stat-num">${all.filter(o=>o.type==='diy').length}</div><div class="stat-label">직접 제작</div></div>
      <div class="stat-card"><div class="stat-num">${all.filter(o=>o.type==='delegate').length}</div><div class="stat-label">맡기기</div></div>
      <div class="stat-card"><div class="stat-num">${counts['발송완료']}</div><div class="stat-label">발송 완료</div></div>
    `;
  },

  _renderOrders() {
    const el = document.getElementById('adminOrderList');
    const orders = this._getOrders();
    if (!orders.length) {
      el.innerHTML = '<p class="empty-msg">접수된 주문이 없습니다 🐾</p>';
      return;
    }
    el.innerHTML = orders.map(o => `
      <div class="order-card" data-id="${escHtml(o.id)}">
        <div class="order-card-top">
          <span class="order-id">${escHtml(o.id)}</span>
          <span class="order-status status-${o.status}">${escHtml(o.status)}</span>
        </div>
        <div class="order-card-bottom">
          <span class="order-pet-name">${escHtml(o.name)}</span>
          <span class="order-method">${o.type === 'diy' ? '직접 제작' : '맡기기'}</span>
          <span class="order-date-small">${formatDate(o.createdAt)}</span>
        </div>
      </div>
    `).join('');

    // Attach click
    el.querySelectorAll('.order-card').forEach(card => {
      card.addEventListener('click', () => this.openDetail(card.dataset.id));
    });
  },

  openDetail(id) {
    const order = Storage.getOrder(id);
    if (!order) return;

    document.getElementById('modalTitle').textContent = `주문 상세 — ${order.id}`;
    document.getElementById('modalBody').innerHTML = this._buildDetailHTML(order);
    document.getElementById('modalBackdrop').classList.remove('hidden');

    // Status change
    const sel = document.getElementById('detailStatus');
    if (sel) sel.addEventListener('change', () => {
      Storage.updateOrderStatus(id, sel.value);
      this.render();
    });

    // Memo save
    const btnMemo = document.getElementById('btnSaveMemo');
    if (btnMemo) btnMemo.addEventListener('click', () => {
      const memo = document.getElementById('detailMemo').value;
      Storage.updateOrderMemo(id, memo);
      UI.showToast('메모가 저장됐어요');
    });
  },

  _buildDetailHTML(o) {
    const preview = o.canvasPreview
      ? `<div class="detail-canvas-wrap"><img src="${o.canvasPreview}" alt="시안"/></div>`
      : (o.photo ? `<div class="detail-canvas-wrap"><img src="${o.photo}" alt="사진"/></div>` : '');

    const statusOpts = this.STATUSES.map(s =>
      `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    return `
      ${preview}
      <div class="detail-section">
        <div class="detail-section-title">고객 입력 정보</div>
        <div class="detail-rows">
          <div class="detail-row"><span class="detail-key">이름</span><span class="detail-val">${escHtml(o.name)}</span></div>
          <div class="detail-row"><span class="detail-key">날짜</span><span class="detail-val">${escHtml(o.date || '—')}</span></div>
          <div class="detail-row"><span class="detail-key">문구</span><span class="detail-val">${escHtml(o.message || '—')}</span></div>
          <div class="detail-row"><span class="detail-key">배경색</span><span class="detail-val">${escHtml(o.bgColorName || '—')}</span></div>
          <div class="detail-row"><span class="detail-key">제작방식</span><span class="detail-val">${o.type === 'diy' ? '직접 제작' : '맡기기'}</span></div>
          <div class="detail-row"><span class="detail-key">접수일</span><span class="detail-val">${formatDate(o.createdAt)}</span></div>
        </div>
      </div>
      ${o.request ? `
      <div class="detail-section">
        <div class="detail-section-title">추가 요청사항</div>
        <p style="font-size:0.85rem;color:var(--color-text);line-height:1.6;">${escHtml(o.request)}</p>
      </div>` : ''}
      <div class="detail-section">
        <div class="detail-section-title">상태 변경</div>
        <select class="status-select" id="detailStatus">${statusOpts}</select>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">관리자 메모</div>
        <textarea class="admin-memo" id="detailMemo" rows="3" placeholder="내부 메모를 입력하세요">${escHtml(o.adminMemo || '')}</textarea>
        <button class="btn-save-memo" id="btnSaveMemo">저장</button>
      </div>
    `;
  },
};

/* =============================================================
   9. HELPERS
============================================================= */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function updateCharCount(inputEl, countEl, max) {
  const len = [...inputEl.value].length;
  countEl.textContent = `${len}/${max}`;
  countEl.style.color = len > max * 0.85 ? 'var(--color-primary)' : 'var(--color-text-3)';
}

/* =============================================================
   10. EVENT BINDING
============================================================= */
function bindEvents() {

  // ── Logo / home
  document.getElementById('logoBtn').addEventListener('click', () => {
    if (appState.currentScreen !== 'home') Nav.go('home');
  });

  // ── Back button
  document.getElementById('btnBack').addEventListener('click', () => Nav.back());

  // ── Method selection (home)
  document.getElementById('btnDIY').addEventListener('click', () => {
    appState.orderMethod = 'diy';
    document.getElementById('btnDIY').classList.add('active-card');
    document.getElementById('btnDelegate').classList.remove('active-card');
  });

  document.getElementById('btnDelegate').addEventListener('click', () => {
    appState.orderMethod = 'delegate';
    document.getElementById('btnDelegate').classList.add('active-card');
    document.getElementById('btnDIY').classList.remove('active-card');
  });

  // ── Start order
  document.getElementById('btnStartOrder').addEventListener('click', () => {
    if (appState.orderMethod === 'diy') Nav.go('step1');
    else Nav.go('delegate');
  });

  // ── Photo upload (DIY)
  const photoInput = document.getElementById('photoInput');
  const uploadArea = document.getElementById('uploadArea');

  uploadArea.addEventListener('click', () => {
    if (!document.getElementById('uploadPreview').classList.contains('hidden')) return;
  });

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      UI.showToast('JPG 또는 PNG 파일만 지원합니다');
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      appState.photo = dataUrl;
      document.getElementById('previewImg').src = dataUrl;
      document.getElementById('uploadPlaceholder').classList.add('hidden');
      document.getElementById('uploadPreview').classList.remove('hidden');
    } catch {
      UI.showToast('사진을 불러오는 데 실패했습니다');
    }
  });

  document.getElementById('btnChangePhoto').addEventListener('click', (e) => {
    e.stopPropagation();
    photoInput.value = '';
    photoInput.click();
  });

  // ── Step 1 → 2
  document.getElementById('btnStep1Next').addEventListener('click', () => {
    if (!appState.photo) {
      UI.showToast('🐾 사진을 업로드해주세요');
      document.getElementById('uploadArea').style.borderColor = 'var(--color-error)';
      setTimeout(() => {
        document.getElementById('uploadArea').style.borderColor = '';
      }, 1500);
      return;
    }
    Nav.go('step2');
  });

  // ── Form inputs (step2)
  const inputName = document.getElementById('inputName');
  const inputDate = document.getElementById('inputDate');
  const inputMessage = document.getElementById('inputMessage');
  const inputRequest = document.getElementById('inputRequest');
  const nameCount = document.getElementById('nameCount');
  const msgCount = document.getElementById('msgCount');
  const reqCount = document.getElementById('reqCount');

  inputName.addEventListener('input', () => {
    appState.name = inputName.value;
    updateCharCount(inputName, nameCount, 10);
    const err = Validator.name(inputName.value);
    const errEl = document.getElementById('nameError');
    if (err) { errEl.classList.remove('hidden'); errEl.textContent = err; inputName.classList.add('error'); }
    else { errEl.classList.add('hidden'); inputName.classList.remove('error'); }
  });

  // Date auto-format
  inputDate.addEventListener('input', () => {
    let v = inputDate.value.replace(/[^0-9]/g, '');
    if (v.length > 4) v = v.slice(0,4) + '.' + v.slice(4);
    if (v.length > 7) v = v.slice(0,7) + '.' + v.slice(7);
    if (v.length > 10) v = v.slice(0,10);
    inputDate.value = v;
    appState.date = v;

    const err = Validator.date(v);
    const errEl = document.getElementById('dateError');
    if (err && v.length > 0) { errEl.classList.remove('hidden'); inputDate.classList.add('error'); }
    else { errEl.classList.add('hidden'); inputDate.classList.remove('error'); }
  });

  inputMessage.addEventListener('input', () => {
    appState.message = inputMessage.value;
    updateCharCount(inputMessage, msgCount, 30);
    const err = Validator.message(inputMessage.value);
    const errEl = document.getElementById('msgError');
    if (err) { errEl.classList.remove('hidden'); errEl.textContent = err; inputMessage.classList.add('error'); }
    else { errEl.classList.add('hidden'); inputMessage.classList.remove('error'); }
  });

  inputRequest.addEventListener('input', () => {
    appState.request = inputRequest.value;
    updateCharCount(inputRequest, reqCount, 100);
  });

  // ── Color palette
  document.getElementById('colorPalette').addEventListener('click', (e) => {
    const chip = e.target.closest('.color-chip');
    if (!chip) return;
    document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    appState.bgColor = chip.dataset.color;
    appState.bgColorName = chip.dataset.name;
  });

  // ── Step 2 → 3
  document.getElementById('btnStep2Next').addEventListener('click', () => {
    // Validate
    const nameErr = Validator.name(appState.name);
    if (nameErr) {
      UI.showToast('⚠ ' + nameErr);
      document.getElementById('nameError').classList.remove('hidden');
      document.getElementById('inputName').focus();
      return;
    }
    const dateErr = Validator.date(appState.date);
    if (dateErr) {
      UI.showToast('⚠ ' + dateErr);
      document.getElementById('dateError').classList.remove('hidden');
      return;
    }
    const msgErr = Validator.message(appState.message);
    if (msgErr) {
      UI.showToast('⚠ ' + msgErr);
      document.getElementById('msgError').classList.remove('hidden');
      return;
    }
    Nav.go('step3');
  });

  // ── Edit info (back from step3 to step2)
  document.getElementById('btnEditInfo').addEventListener('click', () => Nav.go('step2'));

  // ── Toggle guide
  const btnGuide = document.getElementById('btnToggleGuide');
  btnGuide.addEventListener('click', () => {
    appState.showGuide = !appState.showGuide;
    btnGuide.textContent = '';
    btnGuide.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      안전영역 가이드 ${appState.showGuide ? 'OFF' : 'ON'}
    `;
    UI.renderCanvas();
  });

  // ── Download PNG
  document.getElementById('btnDownload').addEventListener('click', () => {
    const canvas = document.getElementById('previewCanvas');
    const link = document.createElement('a');
    link.download = `puppymemory_${appState.name || 'preview'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    UI.showToast('📥 PNG 파일을 저장했어요');
  });

  // ── Checklist
  const checks = ['check1','check2','check3','check4'];
  const allCheck = document.getElementById('checkAll');

  checks.forEach((id, i) => {
    document.getElementById(id).addEventListener('change', (e) => {
      appState.checks[`c${i+1}`] = e.target.checked;
      allCheck.checked = checks.every(c => document.getElementById(c).checked);
    });
  });

  allCheck.addEventListener('change', (e) => {
    const val = e.target.checked;
    checks.forEach((id, i) => {
      document.getElementById(id).checked = val;
      appState.checks[`c${i+1}`] = val;
    });
  });

  // ── Submit order
  document.getElementById('btnSubmit').addEventListener('click', () => {
    // Check all checkboxes
    const allChecked = Object.values(appState.checks).every(Boolean);
    if (!allChecked) {
      UI.showToast('⚠ 제작 전 확인사항을 모두 체크해주세요');
      document.querySelector('.checklist-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const canvas = document.getElementById('previewCanvas');
    const preview = canvas.toDataURL('image/png');
    const id = OrderService.createDIYOrder(preview);
    appState.currentOrderId = id;
    document.getElementById('orderIdDisplay').textContent = id;
    Nav.go('complete');
  });

  // ── New order
  document.getElementById('btnNewOrder').addEventListener('click', () => {
    // Reset state
    Object.assign(appState, {
      photo: null,
      name: '',
      date: '',
      message: '',
      bgColor: '#FAF7F0',
      bgColorName: '크림',
      request: '',
      showGuide: false,
      checks: { c1: false, c2: false, c3: false, c4: false },
      currentOrderId: null,
      orderMethod: 'diy',
      delegatePhoto: null,
      delegateName: '',
      delegateDate: '',
      delegateRequest: '',
    });

    // Reset form UI
    document.getElementById('photoInput').value = '';
    document.getElementById('previewImg').src = '';
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
    document.getElementById('inputName').value = '';
    document.getElementById('inputDate').value = '';
    document.getElementById('inputMessage').value = '';
    document.getElementById('inputRequest').value = '';
    document.getElementById('nameCount').textContent = '0/10';
    document.getElementById('msgCount').textContent = '0/30';
    document.getElementById('reqCount').textContent = '0/100';
    ['check1','check2','check3','check4'].forEach(id => {
      document.getElementById(id).checked = false;
    });
    document.getElementById('checkAll').checked = false;

    document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.color-chip[data-name="크림"]').classList.add('active');
    document.getElementById('btnDIY').classList.add('active-card');
    document.getElementById('btnDelegate').classList.remove('active-card');

    Nav.go('home');
  });

  // ── Delegate photo upload
  const photoInputDelegate = document.getElementById('photoInputDelegate');
  photoInputDelegate.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      appState.delegatePhoto = dataUrl;
      document.getElementById('previewImgDelegate').src = dataUrl;
      document.getElementById('uploadPlaceholderDelegate').classList.add('hidden');
      document.getElementById('uploadPreviewDelegate').classList.remove('hidden');
    } catch {
      UI.showToast('사진을 불러오는 데 실패했습니다');
    }
  });

  document.getElementById('btnChangePhotoDelegate').addEventListener('click', (e) => {
    e.stopPropagation();
    photoInputDelegate.value = '';
    photoInputDelegate.click();
  });

  document.getElementById('delegateName').addEventListener('input', (e) => {
    appState.delegateName = e.target.value;
  });
  document.getElementById('delegateDate').addEventListener('input', (e) => {
    appState.delegateDate = e.target.value;
  });
  document.getElementById('delegateRequest').addEventListener('input', (e) => {
    appState.delegateRequest = e.target.value;
  });

  // ── Delegate submit
  document.getElementById('btnDelegateSubmit').addEventListener('click', () => {
    if (!appState.delegatePhoto) {
      UI.showToast('🐾 사진을 업로드해주세요');
      return;
    }
    if (!appState.delegateName.trim()) {
      UI.showToast('반려동물 이름을 입력해주세요');
      document.getElementById('delegateName').focus();
      return;
    }
    const id = OrderService.createDelegateOrder();
    appState.currentOrderId = id;
    document.getElementById('orderIdDisplay').textContent = id;
    Nav.go('complete');
  });

  // ── Admin button
  document.getElementById('btnAdminMode').addEventListener('click', () => {
    if (appState.isAdminLoggedIn) {
      Nav.go('admin');
    } else {
      document.getElementById('adminLoginBackdrop').classList.remove('hidden');
      document.getElementById('adminPassword').value = '';
      document.getElementById('adminPasswordError').classList.add('hidden');
      setTimeout(() => document.getElementById('adminPassword').focus(), 300);
    }
  });

  document.getElementById('adminLoginClose').addEventListener('click', () => {
    document.getElementById('adminLoginBackdrop').classList.add('hidden');
  });

  document.getElementById('btnAdminLogin').addEventListener('click', () => {
    const pw = document.getElementById('adminPassword').value;
    if (Admin.login(pw)) {
      document.getElementById('adminLoginBackdrop').classList.add('hidden');
      Nav.go('admin');
    } else {
      document.getElementById('adminPasswordError').classList.remove('hidden');
      document.getElementById('adminPassword').value = '';
      document.getElementById('adminPassword').focus();
    }
  });

  document.getElementById('adminPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnAdminLogin').click();
  });

  // ── Admin filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.adminFilter = btn.dataset.status;
      Admin._renderOrders();
    });
  });

  // ── Admin tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      appState.adminTab = tab.dataset.tab;
      document.getElementById('adminTabOrders').classList.toggle('hidden', appState.adminTab !== 'orders');
      document.getElementById('adminTabStats').classList.toggle('hidden', appState.adminTab !== 'stats');
    });
  });

  // ── Modal close
  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalBackdrop').classList.add('hidden');
  });
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalBackdrop')) {
      document.getElementById('modalBackdrop').classList.add('hidden');
    }
  });
  document.getElementById('adminLoginBackdrop').addEventListener('click', (e) => {
    if (e.target === document.getElementById('adminLoginBackdrop')) {
      document.getElementById('adminLoginBackdrop').classList.add('hidden');
    }
  });

  // ── Header scroll effect
  window.addEventListener('scroll', () => {
    const header = document.getElementById('appHeader');
    header.classList.toggle('scrolled', window.scrollY > 2);
  }, { passive: true });
}

/* =============================================================
   11. BOOTSTRAP
============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  bindEvents();
  Nav.go('home');

  // Preload fonts by drawing invisible canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 10;
  tempCanvas.height = 10;
  const tctx = tempCanvas.getContext('2d');
  tctx.font = '1px "Gowun Batang"';
  tctx.fillText('.', 0, 0);
});
