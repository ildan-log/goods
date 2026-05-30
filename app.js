/**
 * 퍼피메모리 — app.js (v2 · 포토굿즈 확장판)
 *
 * 확장 이력:
 *  - 상품 카탈로그(포토자석/액자, 다양한 사이즈)
 *  - 스타일 선택(카테고리별 50종) — AI API 미연결, styleId만 저장
 *  - Canvas 비율 자동 변경(정사각/가로형/원형)
 *  - 문구 제한 상품별 자동 적용
 *  - 저작권 체크박스 6종
 *  - 관리자 주문 상세에 상품/스타일 정보 추가
 *
 * Architecture note:
 *  단일 appState 객체로 상태 관리 → React useState / Zustand로 이전 용이
 *  Storage 모듈 → Supabase client로 메서드 교체만 하면 됨
 *  향후 AI 연결: OrderService.createDIYOrder() 에 styleId/label 포함되어 있음
 */

'use strict';

/* =============================================================
   1. 상품 카탈로그
   → 나중에 DB/CMS로 이전 가능한 구조
============================================================= */
const PRODUCTS = [
  // ─ 포토자석
  { id:'magnet_45_sq',   category:'포토자석', label:'45×45mm 사각 포토자석',  widthMM:45,  heightMM:45,  shape:'square' },
  { id:'magnet_90_sq',   category:'포토자석', label:'90×90mm 사각 포토자석',  widthMM:90,  heightMM:90,  shape:'square' },
  { id:'magnet_126_87',  category:'포토자석', label:'126×87mm 가로 포토자석', widthMM:126, heightMM:87,  shape:'square' },
  { id:'magnet_86_54',   category:'포토자석', label:'86×54mm 가로 포토자석',  widthMM:86,  heightMM:54,  shape:'square' },
  { id:'magnet_55_circle',category:'포토자석',label:'지름 55mm 원형 포토자석', widthMM:55,  heightMM:55,  shape:'circle' },
  // ─ 액자
  { id:'frame_90_sq',    category:'액자',    label:'90×90mm 액자',           widthMM:90,  heightMM:90,  shape:'square' },
  { id:'frame_126_87',   category:'액자',    label:'126×87mm 액자',          widthMM:126, heightMM:87,  shape:'square' },
  { id:'frame_178_127',  category:'액자',    label:'178×127mm 액자',         widthMM:178, heightMM:127, shape:'square' },
  { id:'frame_203_sq',   category:'액자',    label:'203×203mm 액자',         widthMM:203, heightMM:203, shape:'square' },
  { id:'frame_270_190',  category:'액자',    label:'270×190mm 액자',         widthMM:270, heightMM:190, shape:'square' },
  { id:'frame_246_194',  category:'액자',    label:'246×194mm 액자',         widthMM:246, heightMM:194, shape:'square' },
];

/* =============================================================
   2. 스타일 카탈로그
   → styleId만 저장; 향후 서버에서 숨겨진 프롬프트로 AI 변환 예정
   → 저작권 안전: 특정 IP/브랜드/작가명 없음
============================================================= */
const STYLES = [
  // ─ 포토/촬영
  { id:'photo_original',   category:'포토/촬영',   label:'원본 포토형',           description:'사진 원본을 그대로 사용합니다',           recommendedFor:['사람','반려동물','가족','커플'] },
  { id:'photo_wedding',    category:'포토/촬영',   label:'웨딩촬영 무드',          description:'화사하고 세련된 웨딩 분위기',              recommendedFor:['커플','가족'] },
  { id:'photo_family',     category:'포토/촬영',   label:'가족사진 무드',          description:'따뜻하고 자연스러운 가족 느낌',            recommendedFor:['가족'] },
  { id:'photo_profile',    category:'포토/촬영',   label:'프로필사진 무드',        description:'깔끔하고 단정한 프로필 느낌',              recommendedFor:['사람'] },
  { id:'photo_studio',     category:'포토/촬영',   label:'스튜디오 촬영 무드',     description:'조명감 있는 스튜디오 분위기',              recommendedFor:['사람','반려동물'] },
  { id:'photo_couple',     category:'포토/촬영',   label:'커플사진 무드',          description:'로맨틱하고 따뜻한 커플 느낌',              recommendedFor:['커플'] },
  { id:'photo_travel',     category:'포토/촬영',   label:'여행스냅 무드',          description:'청량하고 자유로운 여행 느낌',              recommendedFor:['사람','가족','커플'] },
  { id:'photo_parents',    category:'포토/촬영',   label:'부모님 선물사진 무드',   description:'정갈하고 따뜻한 부모님 선물 느낌',         recommendedFor:['가족'] },
  { id:'photo_pet_studio', category:'포토/촬영',   label:'반려동물 스튜디오 무드', description:'귀엽고 사랑스러운 반려동물 느낌',          recommendedFor:['반려동물'] },

  // ─ 감성 보정
  { id:'edit_bright',      category:'감성 보정',   label:'밝은 화사 보정',         description:'화사하고 밝게 보정된 느낌',                recommendedFor:['사람','반려동물','가족'] },
  { id:'edit_film_warm',   category:'감성 보정',   label:'따뜻한 필름톤',          description:'따뜻한 오렌지 필름 감성',                  recommendedFor:['사람','커플','가족'] },
  { id:'edit_bw',          category:'감성 보정',   label:'흑백 감성사진',          description:'시간을 초월하는 흑백 감성',                recommendedFor:['사람','반려동물','가족'] },
  { id:'edit_sepia',       category:'감성 보정',   label:'세피아 추억사진',        description:'빛바랜 추억 느낌의 세피아',                recommendedFor:['가족','반려동물'] },
  { id:'edit_vintage',     category:'감성 보정',   label:'빈티지 필름톤',          description:'오래된 필름 카메라 느낌',                  recommendedFor:['커플','사람'] },
  { id:'edit_calm',        category:'감성 보정',   label:'차분한 무드톤',          description:'채도를 낮춘 조용한 무드',                  recommendedFor:['사람','반려동물'] },
  { id:'edit_pastel',      category:'감성 보정',   label:'소프트 파스텔톤',        description:'부드럽고 연한 파스텔 색감',                recommendedFor:['반려동물','가족','커플'] },
  { id:'edit_retro',       category:'감성 보정',   label:'레트로 사진관 무드',     description:'추억의 사진관 느낌',                       recommendedFor:['가족','사람'] },
  { id:'edit_matte',       category:'감성 보정',   label:'무광 포스터톤',          description:'포스터처럼 매트한 고급 색감',              recommendedFor:['사람','커플'] },

  // ─ 일러스트
  { id:'illust_watercolor',category:'일러스트',    label:'수채 감성 일러스트',     description:'수채화 물감으로 그린 듯한 느낌',           recommendedFor:['반려동물','가족','커플'] },
  { id:'illust_pencil_color',category:'일러스트',  label:'색연필 드로잉',          description:'색연필로 따뜻하게 그린 느낌',              recommendedFor:['반려동물','가족'] },
  { id:'illust_line',      category:'일러스트',    label:'미니멀 라인드로잉',      description:'심플한 선으로 표현한 일러스트',            recommendedFor:['사람','반려동물'] },
  { id:'illust_fairytale', category:'일러스트',    label:'동화책 일러스트',        description:'따뜻한 동화책 속 한 장면',                 recommendedFor:['반려동물','가족'] },
  { id:'illust_poster',    category:'일러스트',    label:'감성 포스터 일러스트',   description:'아트 포스터 느낌의 일러스트',              recommendedFor:['사람','커플'] },
  { id:'illust_pastel',    category:'일러스트',    label:'파스텔 드로잉',          description:'파스텔로 그린 부드러운 일러스트',          recommendedFor:['반려동물','가족'] },
  { id:'illust_sketch',    category:'일러스트',    label:'연필 스케치',            description:'연필로 섬세하게 그린 스케치',              recommendedFor:['사람','반려동물'] },
  { id:'illust_handmade',  category:'일러스트',    label:'손그림 느낌',            description:'손으로 직접 그린 듯한 따뜻함',            recommendedFor:['반려동물','가족'] },
  { id:'illust_sticker',   category:'일러스트',    label:'스티커 일러스트',        description:'귀여운 스티커처럼 생동감 있는 느낌',       recommendedFor:['반려동물'] },

  // ─ 캐릭터/캐리커쳐
  { id:'char_soft',        category:'캐릭터/캐리커쳐', label:'말랑 굿즈 캐릭터',   description:'포근하고 말랑한 굿즈 캐릭터',             recommendedFor:['반려동물','가족'] },
  { id:'char_simple',      category:'캐릭터/캐리커쳐', label:'심플 캐리커쳐',       description:'특징을 잡은 깔끔한 캐리커쳐',             recommendedFor:['사람'] },
  { id:'char_cute',        category:'캐릭터/캐리커쳐', label:'귀여운 캐리커쳐',     description:'귀엽고 유쾌하게 표현한 캐리커쳐',         recommendedFor:['사람','반려동물'] },
  { id:'char_family',      category:'캐릭터/캐리커쳐', label:'가족 캐리커쳐',       description:'온 가족을 함께 담은 캐리커쳐',            recommendedFor:['가족'] },
  { id:'char_couple',      category:'캐릭터/캐리커쳐', label:'커플 캐리커쳐',       description:'커플을 함께 그린 캐리커쳐',               recommendedFor:['커플'] },
  { id:'char_pet',         category:'캐릭터/캐리커쳐', label:'반려동물 캐리커쳐',   description:'반려동물을 귀엽게 담은 캐리커쳐',         recommendedFor:['반려동물'] },
  { id:'char_pet_human',   category:'캐릭터/캐리커쳐', label:'사람+반려동물 캐리커쳐', description:'사람과 반려동물이 함께',               recommendedFor:['사람','반려동물'] },
  { id:'char_mini',        category:'캐릭터/캐리커쳐', label:'미니 캐릭터',         description:'Q-버전 느낌의 작고 귀여운 캐릭터',        recommendedFor:['사람','반려동물'] },
  { id:'char_webtoon',     category:'캐릭터/캐리커쳐', label:'웹툰 캐릭터',         description:'웹툰 스타일의 생동감 있는 캐릭터',        recommendedFor:['사람','커플'] },
  { id:'char_funny',       category:'캐릭터/캐리커쳐', label:'하찮은 그림 느낌',    description:'B급 감성의 재미있고 익살스러운 느낌',     recommendedFor:['반려동물','사람'] },

  // ─ 메모리얼
  { id:'memo_memorial',    category:'메모리얼',    label:'메모리얼 감성',          description:'소중한 기억을 차분하게 담은 느낌',         recommendedFor:['반려동물','가족','사람'] },
  { id:'memo_sky',         category:'메모리얼',    label:'하늘빛 추억',            description:'맑은 하늘빛으로 기억을 담은 느낌',         recommendedFor:['반려동물','사람'] },
  { id:'memo_light',       category:'메모리얼',    label:'따뜻한 빛 번짐',         description:'빛이 번지는 따뜻하고 몽환적인 느낌',       recommendedFor:['반려동물','사람','가족'] },
  { id:'memo_flower',      category:'메모리얼',    label:'꽃 배경 감성',           description:'꽃으로 둘러싼 아름다운 추억',             recommendedFor:['반려동물','가족'] },
  { id:'memo_night',       category:'메모리얼',    label:'조용한 밤하늘',          description:'별빛 밤하늘 아래 차분한 추억',            recommendedFor:['반려동물','사람'] },
  { id:'memo_long',        category:'메모리얼',    label:'오래 간직할 사진',       description:'세월이 지나도 변치 않는 소중한 기억',     recommendedFor:['가족','반려동물'] },
  { id:'memo_quiet',       category:'메모리얼',    label:'차분한 추억사진',        description:'잔잔하게 기억을 되새기는 느낌',           recommendedFor:['가족','반려동물','사람'] },

  // ─ 시즌/이벤트
  { id:'season_birthday',  category:'시즌/이벤트', label:'생일 축하 무드',         description:'축하와 기쁨이 가득한 생일 분위기',         recommendedFor:['사람','반려동물','가족'] },
  { id:'season_xmas',      category:'시즌/이벤트', label:'크리스마스 선물 무드',   description:'따뜻한 크리스마스 분위기',                 recommendedFor:['사람','반려동물','가족','커플'] },
  { id:'season_spring',    category:'시즌/이벤트', label:'봄꽃 감성',              description:'벚꽃·봄꽃으로 가득한 봄 분위기',          recommendedFor:['사람','커플','가족'] },
  { id:'season_summer',    category:'시즌/이벤트', label:'여름 청량 무드',         description:'시원하고 청량한 여름 분위기',              recommendedFor:['사람','커플'] },
  { id:'season_autumn',    category:'시즌/이벤트', label:'가을 브라운 무드',       description:'따뜻한 단풍과 브라운 가을 느낌',           recommendedFor:['사람','커플','가족'] },
  { id:'season_winter',    category:'시즌/이벤트', label:'겨울 포근 무드',         description:'포근하고 아늑한 겨울 분위기',              recommendedFor:['가족','커플','반려동물'] },
  { id:'season_grad',      category:'시즌/이벤트', label:'졸업/입학 기념 무드',    description:'새로운 시작을 축하하는 특별한 느낌',       recommendedFor:['사람','가족'] },
];

/* =============================================================
   3. 상품별 문구 제한 규칙
============================================================= */
/**
 * 상품 ID로 이름/문구 제한값 반환
 * → Validator.name / Validator.message 에서 사용
 * @param {string} productId
 * @returns {{ nameMax, msgLines, lineMax }}
 */
function getLimitsForProduct(productId) {
  const p = PRODUCTS.find(pr => pr.id === productId);
  if (!p) return { nameMax: 10, msgLines: 2, lineMax: 14 };

  // 작은 포토자석: 45×45, 원형 55
  if (p.id === 'magnet_45_sq' || p.id === 'magnet_55_circle') {
    return { nameMax: 8, msgLines: 1, lineMax: 10 };
  }
  // 정사각형 90mm 이상
  if (p.widthMM === p.heightMM) {
    return { nameMax: 10, msgLines: 2, lineMax: 14 };
  }
  // 가로형 (가로 > 세로)
  return { nameMax: 12, msgLines: 2, lineMax: 18 };
}

/* =============================================================
   4. STATE (단일 상태 객체 — React useState / Zustand로 이전 용이)
============================================================= */
const appState = {
  currentScreen: 'home',     // 'home'|'step1'|'step2'|'step3'|'step4'|'step5'|'delegate'|'complete'|'admin'
  orderMethod:   'diy',      // 'diy' | 'delegate'

  // ─ 상품 선택
  selectedProductId:    'frame_90_sq',   // 기본값
  productCatFilter:     '포토자석',

  // ─ 스타일 선택 (AI API 연결 시 사용)
  selectedStyle:        null,  // { id, label, category } | null
  styleCatFilter:       '포토/촬영',

  // ─ 사진
  photo:        null,    // base64 data URL

  // ─ 텍스트
  name:         '',
  date:         '',
  message:      '',
  bgColor:      '#FAF7F0',
  bgColorName:  '크림',
  request:      '',

  // ─ 미리보기
  showGuide:    false,

  // ─ 체크박스 (6종)
  checks:       { c1:false, c2:false, c3:false, c4:false, c5:false, c6:false },

  // ─ 주문
  currentOrderId: null,

  // ─ 관리자
  adminFilter:   'all',
  adminTab:      'orders',
  isAdminLoggedIn: false,

  // ─ 맡기기 전용
  delegatePhoto:   null,
  delegateName:    '',
  delegateDate:    '',
  delegateStyleId: null,
  delegateStyleLabel: null,
  delegateProductId: null,
  delegateRequest: '',
};

/* =============================================================
   5. STORAGE (localStorage → Supabase 이전 시 이 모듈만 교체)
============================================================= */
const Storage = {
  ORDERS_KEY: 'puppymemory_orders_v2',

  getOrders() {
    try { return JSON.parse(localStorage.getItem(this.ORDERS_KEY) || '[]'); }
    catch { return []; }
  },

  saveOrder(order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) orders[idx] = order;
    else orders.unshift(order);
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));
  },

  getOrder(id) { return this.getOrders().find(o => o.id === id) || null; },

  updateOrderStatus(id, status) {
    const order = this.getOrder(id);
    if (order) { order.status = status; order.updatedAt = new Date().toISOString(); this.saveOrder(order); }
  },

  updateOrderMemo(id, memo) {
    const order = this.getOrder(id);
    if (order) { order.adminMemo = memo; this.saveOrder(order); }
  },
};

/* =============================================================
   6. CANVAS RENDERER
   → 비율/형태(원형/사각/가로형)에 따라 동적으로 렌더링
   → PNG 다운로드: 긴 변 기준 1200px 이상
============================================================= */
const Renderer = {
  /**
   * 메인 드로우 함수
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts
   */
  draw(canvas, opts = {}) {
    const {
      photo = null, name = '', date = '', message = '',
      bgColor = '#FAF7F0', showGuide = false,
      product = null,  // PRODUCTS 항목
    } = opts;

    // ── 캔버스 크기 설정 (긴 변 1200px 기준)
    const BASE = 1200;
    const p = product || PRODUCTS.find(pr => pr.id === 'frame_90_sq');
    const isCircle = p.shape === 'circle';
    const ratio = p.widthMM / p.heightMM;

    let cW, cH;
    if (ratio >= 1) { cW = BASE; cH = Math.round(BASE / ratio); }
    else            { cH = BASE; cW = Math.round(BASE * ratio); }

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cW, cH);

    // ── 배경
    if (isCircle) {
      // 원형: 배경을 원 안에만
      ctx.save();
      ctx.beginPath();
      ctx.arc(cW/2, cH/2, Math.min(cW,cH)/2 - 1, 0, Math.PI*2);
      ctx.fillStyle = bgColor;
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, cW, cH);
    }

    // ── 배경 텍스처 (미세 점)
    ctx.fillStyle = 'rgba(0,0,0,0.018)';
    for (let x = 0; x < cW; x += 20) {
      for (let y = 0; y < cH; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── 안전영역 계산 (6%)
    const safeX = Math.round(cW * 0.06);
    const safeY = Math.round(cH * 0.06);
    const safeW = cW - safeX * 2;
    const safeH = cH - safeY * 2;

    // ── 레이아웃: 사진 영역과 텍스트 영역 비율
    const hasText = name || date || message;
    // 사진 영역: 세로에서 텍스트를 위해 아래쪽 22% 확보 (사각형), 원형은 다름
    const textZoneH = isCircle ? 0 : Math.round(cH * 0.22);
    const photoAreaH = safeH - textZoneH;
    const photoAreaW = safeW;

    // ── 사진 그리기
    const photoX = safeX;
    const photoY = safeY;
    const photoW = photoAreaW;
    const photoH = isCircle ? safeH : photoAreaH;
    const photoR = isCircle ? 0 : Math.round(Math.min(photoW, photoH) * 0.02);

    if (photo) {
      const img = new Image();
      img.src = photo;
      ctx.save();
      if (isCircle) {
        // 원형 클립
        ctx.beginPath();
        ctx.arc(cW/2, cH/2, Math.min(cW,cH)/2 - safeX, 0, Math.PI*2);
        ctx.clip();
      } else {
        this._roundRect(ctx, photoX, photoY, photoW, photoH, photoR);
        ctx.clip();
      }
      // cover-fit
      const sc = Math.max(photoW / img.naturalWidth, photoH / img.naturalHeight);
      const sw = img.naturalWidth * sc;
      const sh = img.naturalHeight * sc;
      const sx = photoX + (photoW - sw) / 2;
      const sy = photoY + (photoH - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);
      ctx.restore();
      // 사진 테두리
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 2;
      if (isCircle) {
        ctx.beginPath();
        ctx.arc(cW/2, cH/2, Math.min(cW,cH)/2 - safeX, 0, Math.PI*2);
        ctx.stroke();
      } else {
        this._roundRect(ctx, photoX, photoY, photoW, photoH, photoR);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // 사진 없을 때 플레이스홀더
      ctx.save();
      if (isCircle) {
        ctx.beginPath();
        ctx.arc(cW/2, cH/2, Math.min(cW,cH)/2 - safeX, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fill();
      } else {
        this._roundRect(ctx, photoX, photoY, photoW, photoH, photoR);
        ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.font = `${Math.round(Math.min(photoW,photoH)*0.15)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📷', photoX + photoW/2, photoY + photoH/2);
    }

    // ── 텍스트 영역 (원형은 사진 위에 오버레이)
    if (isCircle) {
      // 원형: 하단 원호 안쪽에 텍스트 오버레이
      this._drawTextCircle(ctx, cW, cH, Math.min(cW,cH)/2 - safeX, name, date, message);
    } else {
      // 사각/가로형: 사진 아래 텍스트 영역
      const textY = safeY + photoAreaH + Math.round(cH * 0.015);
      this._drawTextRect(ctx, cW, cH, safeX, textY, safeW, textZoneH, name, date, message);
    }

    // ── 코너 장식 (원형 제외)
    if (!isCircle) {
      const ornLen = Math.round(Math.min(safeX, safeY) * 0.9);
      this._drawCornerOrn(ctx, safeX, safeY, ornLen, 'tl', 'rgba(0,0,0,0.08)');
      this._drawCornerOrn(ctx, cW-safeX, safeY, ornLen, 'tr', 'rgba(0,0,0,0.08)');
      this._drawCornerOrn(ctx, safeX, cH-safeY, ornLen, 'bl', 'rgba(0,0,0,0.08)');
      this._drawCornerOrn(ctx, cW-safeX, cH-safeY, ornLen, 'br', 'rgba(0,0,0,0.08)');
    }

    // ── 안전영역 가이드
    if (showGuide) {
      ctx.save();
      ctx.setLineDash([10, 7]);
      ctx.strokeStyle = 'rgba(255,80,80,0.55)';
      ctx.lineWidth = 2;
      if (isCircle) {
        // 원형: 바깥 재단선 + 안쪽 안전 원
        ctx.beginPath(); ctx.arc(cW/2, cH/2, Math.min(cW,cH)/2-1, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cW/2, cH/2, Math.min(cW,cH)/2-safeX, 0, Math.PI*2); ctx.stroke();
      } else {
        ctx.strokeRect(safeX, safeY, safeW, safeH);
      }
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,80,80,0.75)';
      ctx.font = `bold ${Math.round(cW*0.022)}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('안전영역', safeX + 4, safeY - 4);
      ctx.restore();
    }
  },

  /** 사각/가로형 텍스트 그리기 */
  _drawTextRect(ctx, cW, cH, tx, ty, tw, th, name, date, message) {
    const divY = ty + Math.round(th * 0.08);
    // 구분선
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx + Math.round(tw*0.1), divY);
    ctx.lineTo(tx + tw - Math.round(tw*0.1), divY);
    ctx.stroke();

    let yPos = divY + Math.round(th * 0.28);

    // 이름
    const nameFontSize = Math.round(Math.min(cW, cH) * 0.058);
    if (name) {
      ctx.fillStyle = '#2D2118';
      ctx.font = `700 ${nameFontSize}px "Gowun Batang", serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(name, cW/2, yPos);
      yPos += Math.round(nameFontSize * 1.1);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      ctx.font = `${Math.round(nameFontSize*0.75)}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('이름을 입력하세요', cW/2, yPos);
      yPos += Math.round(nameFontSize * 0.95);
    }
    // 날짜
    if (date) {
      const dateFontSize = Math.round(nameFontSize * 0.6);
      ctx.fillStyle = '#9A8A78';
      ctx.font = `${dateFontSize}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(date, cW/2, yPos);
      yPos += Math.round(dateFontSize * 1.5);
    }
    // 문구
    if (message) {
      const msgFontSize = Math.round(nameFontSize * 0.52);
      const lines = message.split('\n').slice(0, 2);
      ctx.fillStyle = '#7A6A5A';
      ctx.font = `${msgFontSize}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      lines.forEach(line => {
        ctx.fillText(line, cW/2, yPos);
        yPos += Math.round(msgFontSize * 1.55);
      });
    }
  },

  /** 원형 하단에 텍스트 오버레이 */
  _drawTextCircle(ctx, cW, cH, r, name, date, message) {
    if (!name && !date && !message) return;
    // 하단 반원 반투명 오버레이
    ctx.save();
    const gradStart = cH/2 + r * 0.35;
    const grad = ctx.createLinearGradient(0, gradStart, 0, cH/2 + r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.beginPath(); ctx.arc(cW/2, cH/2, r, 0, Math.PI*2); ctx.clip();
    ctx.fillStyle = grad; ctx.fillRect(cW/2-r, gradStart, r*2, r);
    ctx.restore();

    // 텍스트
    const nameFontSize = Math.round(r * 0.14);
    let yPos = cH/2 + r * 0.65;
    if (name) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${nameFontSize}px "Gowun Batang", serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(name, cW/2, yPos);
      yPos += Math.round(nameFontSize * 1.1);
    }
    if (date) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `${Math.round(nameFontSize*0.65)}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(date, cW/2, yPos);
    }
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  },

  _drawCornerOrn(ctx, x, y, len, pos, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const dx = pos.includes('r') ? -1 : 1;
    const dy = pos.includes('b') ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y + dy*len); ctx.lineTo(x, y); ctx.lineTo(x + dx*len, y);
    ctx.stroke();
  },
};

/* =============================================================
   7. VALIDATION (상품별 제한 적용)
============================================================= */
const Validator = {
  name(val, productId) {
    const { nameMax } = getLimitsForProduct(productId || appState.selectedProductId);
    if (!val.trim()) return '이름을 입력해주세요';
    if ([...val.trim()].length > nameMax) return `이름은 ${nameMax}자 이하로 입력해주세요`;
    return null;
  },

  date(val) {
    if (!val) return null;
    const re = /^\d{4}\.(0[1-9]|1[0-2])\.(0[1-9]|[12]\d|3[01])$/;
    if (!re.test(val)) return '날짜 형식이 올바르지 않습니다 (예: 2024.03.15)';
    return null;
  },

  message(val, productId) {
    if (!val) return null;
    const { msgLines, lineMax } = getLimitsForProduct(productId || appState.selectedProductId);
    const lines = val.split('\n');
    if (lines.length > msgLines) return `문구는 최대 ${msgLines}줄까지 입력할 수 있습니다`;
    for (const line of lines) {
      if ([...line].length > lineMax) return `줄당 ${lineMax}자를 초과했습니다`;
    }
    return null;
  },
};

/* =============================================================
   8. ORDER SERVICE
============================================================= */
const OrderService = {
  generateId() {
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    const rand = Math.random().toString(36).slice(2,6).toUpperCase();
    return `PM-${date}-${rand}`;
  },

  /** DIY 주문 생성 — 향후 AI 연결: styleId/label 포함 */
  createDIYOrder(canvasDataURL) {
    const id = this.generateId();
    const p  = PRODUCTS.find(pr => pr.id === appState.selectedProductId);
    const order = {
      id,
      type:             'diy',
      orderMethod:      'diy',
      status:           '접수완료',
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
      // 상품
      productId:        appState.selectedProductId,
      productCategory:  p ? p.category  : '',
      productLabel:     p ? p.label     : '',
      productShape:     p ? p.shape     : '',
      productWidthMM:   p ? p.widthMM   : 0,
      productHeightMM:  p ? p.heightMM  : 0,
      // 스타일 (향후 AI 연결용)
      styleId:          appState.selectedStyle ? appState.selectedStyle.id       : null,
      styleLabel:       appState.selectedStyle ? appState.selectedStyle.label    : null,
      styleCategory:    appState.selectedStyle ? appState.selectedStyle.category : null,
      // 입력값
      name:             appState.name,
      date:             appState.date,
      message:          appState.message,
      bgColor:          appState.bgColor,
      bgColorName:      appState.bgColorName,
      request:          appState.request,
      // 이미지
      photo:            appState.photo,
      canvasPreview:    canvasDataURL,
      adminMemo:        '',
    };
    Storage.saveOrder(order);
    return id;
  },

  /** 맡기기 주문 생성 */
  createDelegateOrder() {
    const id = this.generateId();
    const p  = PRODUCTS.find(pr => pr.id === appState.delegateProductId);
    const order = {
      id,
      type:             'delegate',
      orderMethod:      'delegate',
      status:           '접수완료',
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
      productId:        appState.delegateProductId,
      productCategory:  p ? p.category : '',
      productLabel:     p ? p.label    : '',
      productShape:     p ? p.shape    : '',
      productWidthMM:   p ? p.widthMM  : 0,
      productHeightMM:  p ? p.heightMM : 0,
      styleId:          appState.delegateStyleId,
      styleLabel:       appState.delegateStyleLabel,
      styleCategory:    null,
      name:             appState.delegateName,
      date:             appState.delegateDate,
      message:          '',
      bgColor:          '',
      bgColorName:      '',
      request:          appState.delegateRequest,
      photo:            appState.delegatePhoto,
      canvasPreview:    null,
      adminMemo:        '',
    };
    Storage.saveOrder(order);
    return id;
  },
};

/* =============================================================
   9. NAVIGATION
============================================================= */
const Nav = {
  // step1=상품선택, step2=사진업로드, step3=스타일선택, step4=정보입력, step5=미리보기
  STEP_CONFIG: {
    home:     { step:0, total:5, label:'' },
    step1:    { step:1, total:5, label:'1/5  상품 선택' },
    step2:    { step:2, total:5, label:'2/5  사진 업로드' },
    step3:    { step:3, total:5, label:'3/5  스타일 선택' },
    step4:    { step:4, total:5, label:'4/5  정보 입력' },
    step5:    { step:5, total:5, label:'5/5  미리보기 확인' },
    delegate: { step:1, total:1, label:'맡기기 신청' },
    complete: { step:0, total:0, label:'' },
    admin:    { step:0, total:0, label:'' },
  },

  SCREEN_MAP: {
    home: 'screenHome', step1: 'screenStep1', step2: 'screenStep2',
    step3: 'screenStep3', step4: 'screenStep4', step5: 'screenStep5',
    delegate: 'screenDelegate', complete: 'screenComplete', admin: 'screenAdmin',
  },

  BACK_MAP: {
    step1: 'home', step2: 'step1', step3: 'step2',
    step4: 'step3', step5: 'step4', delegate: 'home', admin: 'home',
  },

  go(screenName) {
    appState.currentScreen = screenName;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(this.SCREEN_MAP[screenName]);
    if (el) el.classList.add('active');
    window.scrollTo({ top:0, behavior:'instant' });
    this._updateHeader(screenName);
    this._onEnter(screenName);
  },

  _updateHeader(screenName) {
    const cfg = this.STEP_CONFIG[screenName] || { step:0, total:0, label:'' };
    const btnBack = document.getElementById('btnBack');
    if (screenName === 'home' || screenName === 'complete') {
      btnBack.classList.add('invisible');
    } else {
      btnBack.classList.remove('invisible');
    }
    const indicator = document.getElementById('stepIndicator');
    if (cfg.total > 0 && cfg.step > 0) {
      indicator.classList.add('visible');
      document.getElementById('stepFill').style.width = (cfg.step/cfg.total*100) + '%';
      document.getElementById('stepLabel').textContent = cfg.label;
    } else {
      indicator.classList.remove('visible');
    }
  },

  _onEnter(screenName) {
    if (screenName === 'step1') ProductUI.render();
    if (screenName === 'step3') StyleUI.render();
    if (screenName === 'step4') UI.updateFormLimits();
    if (screenName === 'step5') { UI.setCanvasSize(); UI.renderCanvas(); UI.renderSummary(); }
    if (screenName === 'admin') Admin.render();
  },

  back() {
    const prev = this.BACK_MAP[appState.currentScreen];
    if (prev) this.go(prev);
  },
};

/* =============================================================
   10. PRODUCT UI
============================================================= */
const ProductUI = {
  render() {
    // 탭 활성화
    document.querySelectorAll('.cat-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === appState.productCatFilter);
    });
    // 상품 목록
    const filtered = PRODUCTS.filter(p => p.category === appState.productCatFilter);
    const grid = document.getElementById('productGrid');
    grid.innerHTML = filtered.map(p => this._buildCard(p)).join('');
    // 클릭 이벤트
    grid.querySelectorAll('.product-item').forEach(el => {
      el.addEventListener('click', () => {
        appState.selectedProductId = el.dataset.id;
        this.render();
      });
    });
  },

  _buildCard(p) {
    const selected = appState.selectedProductId === p.id;
    // 미리보기 도형 크기 (비율 유지, 최대 48px)
    const ratio = p.widthMM / p.heightMM;
    let shapeW, shapeH;
    if (ratio >= 1) { shapeW = 44; shapeH = Math.round(44/ratio); }
    else            { shapeH = 44; shapeW = Math.round(44*ratio); }

    const shapeClass = p.shape === 'circle' ? 'shape-circle' : 'shape-sq';
    return `
      <button class="product-item${selected ? ' selected' : ''}" data-id="${p.id}">
        <div class="product-item-shape">
          <div class="${shapeClass}" style="width:${shapeW}px;height:${shapeH}px;"></div>
        </div>
        <div class="product-item-info">
          <div class="product-item-label">${escHtml(p.label)}</div>
          <div class="product-item-cat">${escHtml(p.category)}</div>
        </div>
        <div class="product-item-check"></div>
      </button>`;
  },
};

/* =============================================================
   11. STYLE UI
============================================================= */
const StyleUI = {
  // 카테고리 목록 (STYLES에서 추출)
  get categories() {
    return [...new Set(STYLES.map(s => s.category))];
  },

  render() {
    // ── 탭 렌더
    const tabsEl = document.getElementById('styleCatTabs');
    tabsEl.innerHTML = this.categories.map(cat => `
      <button class="style-cat-tab${cat === appState.styleCatFilter ? ' active' : ''}" data-cat="${escHtml(cat)}">${escHtml(cat)}</button>
    `).join('');
    tabsEl.querySelectorAll('.style-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        appState.styleCatFilter = tab.dataset.cat;
        this.render();
      });
    });

    // ── 스타일 카드 렌더
    const filtered = STYLES.filter(s => s.category === appState.styleCatFilter);
    const grid = document.getElementById('styleGrid');
    grid.innerHTML = filtered.map(s => this._buildCard(s)).join('');
    grid.querySelectorAll('.style-card').forEach(el => {
      el.addEventListener('click', () => {
        const s = STYLES.find(st => st.id === el.dataset.id);
        if (!s) return;
        // 동일 카드 클릭 시 선택 해제
        if (appState.selectedStyle && appState.selectedStyle.id === s.id) {
          appState.selectedStyle = null;
        } else {
          appState.selectedStyle = { id: s.id, label: s.label, category: s.category };
        }
        this.render();
      });
    });
  },

  _buildCard(s) {
    const selected = appState.selectedStyle && appState.selectedStyle.id === s.id;
    return `
      <div class="style-card${selected ? ' selected' : ''}" data-id="${s.id}">
        <div class="style-card-check"></div>
        <div class="style-card-label">${escHtml(s.label)}</div>
        <div class="style-card-desc">${escHtml(s.description)}</div>
      </div>`;
  },
};

/* =============================================================
   12. UI CONTROLLER
============================================================= */
const UI = {
  _canvas: null,

  init() {
    this._canvas = document.getElementById('previewCanvas');
  },

  /** 캔버스 컨테이너 비율 동적 설정 */
  setCanvasSize() {
    const p = PRODUCTS.find(pr => pr.id === appState.selectedProductId);
    if (!p) return;
    const outer = document.getElementById('canvasOuter');
    const ratio = p.widthMM / p.heightMM;
    // aspect-ratio CSS로 비율 지정
    outer.style.aspectRatio = `${p.widthMM} / ${p.heightMM}`;
    outer.classList.toggle('is-circle', p.shape === 'circle');
  },

  renderCanvas() {
    if (!this._canvas) return;
    const product = PRODUCTS.find(pr => pr.id === appState.selectedProductId);
    const opts = {
      name: appState.name, date: appState.date,
      message: appState.message, bgColor: appState.bgColor,
      showGuide: appState.showGuide, product,
      photo: appState.photo || null,
    };
    if (appState.photo) {
      const img = new Image();
      img.onload = () => Renderer.draw(this._canvas, opts);
      img.src = appState.photo;
    } else {
      Renderer.draw(this._canvas, opts);
    }
  },

  renderSummary() {
    const el = document.getElementById('summaryList');
    if (!el) return;
    const p = PRODUCTS.find(pr => pr.id === appState.selectedProductId);
    const rows = [
      { key:'상품',   val: p ? p.label : '—' },
      { key:'스타일', val: appState.selectedStyle ? appState.selectedStyle.label : '원본 포토형' },
      { key:'이름',   val: appState.name || '—' },
      { key:'날짜',   val: appState.date || '—' },
      { key:'문구',   val: appState.message ? appState.message.replace(/\n/g,' / ') : '—' },
      { key:'배경',   val: appState.bgColorName },
    ];
    el.innerHTML = rows.map(r => `
      <div class="summary-item">
        <span class="summary-key">${r.key}</span>
        <span class="summary-val">${escHtml(r.val)}</span>
      </div>`).join('');
  },

  /** step4 폼의 이름/문구 제한값을 선택 상품에 맞게 업데이트 */
  updateFormLimits() {
    const { nameMax, msgLines, lineMax } = getLimitsForProduct(appState.selectedProductId);
    const inputName = document.getElementById('inputName');
    const inputMsg  = document.getElementById('inputMessage');
    const msgHint   = document.getElementById('msgHint');
    const nameCount = document.getElementById('nameCount');
    const msgCount  = document.getElementById('msgCount');

    inputName.maxLength = nameMax;
    nameCount.textContent = `${[...inputName.value].length}/${nameMax}`;

    inputMsg.maxLength = msgLines * lineMax + (msgLines - 1); // 줄바꿈 포함
    inputMsg.rows = msgLines;
    msgHint.textContent = `최대 ${msgLines}줄, 줄당 ${lineMax}자 이하`;

    // 현재 step4 설명 업데이트
    const p = PRODUCTS.find(pr => pr.id === appState.selectedProductId);
    const desc = document.getElementById('step4Desc');
    if (desc && p) desc.textContent = `${p.label}에 들어갈 내용을 작성해주세요`;
  },

  showToast(msg, duration = 2200) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
  },

  /** 앱 전체 리셋 */
  resetAll() {
    Object.assign(appState, {
      selectedProductId: 'frame_90_sq', productCatFilter: '포토자석',
      selectedStyle: null, styleCatFilter: '포토/촬영',
      photo: null, name: '', date: '', message: '',
      bgColor: '#FAF7F0', bgColorName: '크림', request: '',
      showGuide: false,
      checks: { c1:false,c2:false,c3:false,c4:false,c5:false,c6:false },
      currentOrderId: null, orderMethod: 'diy',
      delegatePhoto: null, delegateName: '', delegateDate: '',
      delegateStyleId: null, delegateStyleLabel: null,
      delegateProductId: null, delegateRequest: '',
    });
    // 폼 초기화
    ['photoInput','inputName','inputDate','inputMessage','inputRequest'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('previewImg').src = '';
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
    document.getElementById('nameCount').textContent = '0/10';
    document.getElementById('msgCount').textContent  = '0/30';
    document.getElementById('reqCount').textContent  = '0/100';
    // 체크박스
    for (let i=1; i<=6; i++) {
      const el = document.getElementById(`check${i}`);
      if (el) el.checked = false;
    }
    document.getElementById('checkAll').checked = false;
    // 색상
    document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
    const cream = document.querySelector('.color-chip[data-name="크림"]');
    if (cream) cream.classList.add('active');
    // 제작방식
    document.getElementById('btnDIY').classList.add('active-card');
    document.getElementById('btnDelegate').classList.remove('active-card');
  },
};

/* =============================================================
   13. ADMIN MODULE
============================================================= */
const Admin = {
  STATUSES: ['접수완료','사진확인필요','문구확인필요','제작가능','제작중','발송완료'],
  ADMIN_PW: '1234',  // 실제 서비스: 서버 사이드 인증으로 교체

  login(pw) {
    if (pw === this.ADMIN_PW) { appState.isAdminLoggedIn = true; return true; }
    return false;
  },

  render() { this._renderStats(); this._renderOrders(); },

  _getOrders() {
    let orders = Storage.getOrders();
    if (appState.adminFilter !== 'all') orders = orders.filter(o => o.status === appState.adminFilter);
    return orders;
  },

  _renderStats() {
    const all = Storage.getOrders();
    const counts = {};
    this.STATUSES.forEach(s => counts[s] = 0);
    all.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });

    document.getElementById('adminStats').innerHTML = `
      <div class="stat-chip primary">전체 ${all.length}건</div>
      <div class="stat-chip">접수 ${counts['접수완료']}</div>
      <div class="stat-chip">제작중 ${counts['제작중']}</div>
      <div class="stat-chip">발송 ${counts['발송완료']}</div>`;

    // 통계 탭
    const magnet = all.filter(o => o.productCategory === '포토자석').length;
    const frame  = all.filter(o => o.productCategory === '액자').length;
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-num">${all.length}</div><div class="stat-label">전체 주문</div></div>
      <div class="stat-card"><div class="stat-num">${all.filter(o=>o.type==='diy').length}</div><div class="stat-label">직접 제작</div></div>
      <div class="stat-card"><div class="stat-num">${magnet}</div><div class="stat-label">포토자석</div></div>
      <div class="stat-card"><div class="stat-num">${frame}</div><div class="stat-label">액자</div></div>
      <div class="stat-card"><div class="stat-num">${all.filter(o=>o.type==='delegate').length}</div><div class="stat-label">맡기기</div></div>
      <div class="stat-card"><div class="stat-num">${counts['발송완료']}</div><div class="stat-label">발송 완료</div></div>`;
  },

  _renderOrders() {
    const el = document.getElementById('adminOrderList');
    const orders = this._getOrders();
    if (!orders.length) { el.innerHTML = '<p class="empty-msg">접수된 주문이 없습니다</p>'; return; }
    el.innerHTML = orders.map(o => `
      <div class="order-card" data-id="${escHtml(o.id)}">
        <div class="order-card-top">
          <span class="order-id">${escHtml(o.id)}</span>
          <span class="order-status status-${o.status}">${escHtml(o.status)}</span>
        </div>
        <div class="order-card-bottom">
          <span class="order-pet-name">${escHtml(o.name)}</span>
          <span class="order-product-label">${escHtml(o.productLabel || '')}</span>
          <span class="order-date-small">${formatDate(o.createdAt)}</span>
        </div>
      </div>`).join('');
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

    const sel = document.getElementById('detailStatus');
    if (sel) sel.addEventListener('change', () => {
      Storage.updateOrderStatus(id, sel.value); this.render();
    });
    const btnMemo = document.getElementById('btnSaveMemo');
    if (btnMemo) btnMemo.addEventListener('click', () => {
      Storage.updateOrderMemo(id, document.getElementById('detailMemo').value);
      UI.showToast('메모가 저장됐어요');
    });
  },

  _buildDetailHTML(o) {
    const preview = o.canvasPreview
      ? `<div class="detail-canvas-wrap"><img src="${o.canvasPreview}" alt="시안"/></div>`
      : (o.photo ? `<div class="detail-canvas-wrap"><img src="${o.photo}" alt="사진"/></div>` : '');
    const statusOpts = this.STATUSES.map(s =>
      `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('');

    return `
      ${preview}
      <div class="detail-section">
        <div class="detail-section-title">주문 기본 정보</div>
        <div class="detail-rows">
          <div class="detail-row"><span class="detail-key">주문번호</span><span class="detail-val">${escHtml(o.id)}</span></div>
          <div class="detail-row"><span class="detail-key">제작방식</span><span class="detail-val">${o.type==='diy'?'직접 만들기':'맡김 제작'}</span></div>
          <div class="detail-row"><span class="detail-key">접수일</span><span class="detail-val">${formatDate(o.createdAt)}</span></div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">상품 정보</div>
        <div class="detail-rows">
          <div class="detail-row"><span class="detail-key">카테고리</span><span class="detail-val">${escHtml(o.productCategory||'—')}</span></div>
          <div class="detail-row"><span class="detail-key">상품명</span><span class="detail-val">${escHtml(o.productLabel||'—')}</span></div>
          <div class="detail-row"><span class="detail-key">형태</span><span class="detail-val">${o.productShape==='circle'?'원형':'사각형'}</span></div>
          <div class="detail-row"><span class="detail-key">사이즈</span><span class="detail-val">${o.productWidthMM||''}×${o.productHeightMM||''}mm</span></div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">스타일 정보</div>
        <div class="detail-rows">
          <div class="detail-row"><span class="detail-key">카테고리</span><span class="detail-val">${escHtml(o.styleCategory||'—')}</span></div>
          <div class="detail-row"><span class="detail-key">스타일명</span><span class="detail-val">${escHtml(o.styleLabel||'원본 포토형')}</span></div>
          <div class="detail-row"><span class="detail-key">styleId</span><span class="detail-val" style="font-size:0.75rem;color:var(--color-text-3)">${escHtml(o.styleId||'—')}</span></div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">고객 입력 정보</div>
        <div class="detail-rows">
          <div class="detail-row"><span class="detail-key">이름</span><span class="detail-val">${escHtml(o.name)}</span></div>
          <div class="detail-row"><span class="detail-key">날짜</span><span class="detail-val">${escHtml(o.date||'—')}</span></div>
          <div class="detail-row"><span class="detail-key">문구</span><span class="detail-val">${escHtml(o.message||'—')}</span></div>
          <div class="detail-row"><span class="detail-key">배경색</span><span class="detail-val">${escHtml(o.bgColorName||'—')}</span></div>
        </div>
      </div>
      ${o.request ? `<div class="detail-section">
        <div class="detail-section-title">추가 요청사항</div>
        <p style="font-size:0.84rem;color:var(--color-text);line-height:1.7;">${escHtml(o.request)}</p>
      </div>` : ''}
      <div class="detail-section">
        <div class="detail-section-title">상태 변경</div>
        <select class="status-select" id="detailStatus">${statusOpts}</select>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">관리자 메모</div>
        <textarea class="admin-memo" id="detailMemo" rows="3" placeholder="내부 메모">${escHtml(o.adminMemo||'')}</textarea>
        <button class="btn-save-memo" id="btnSaveMemo">저장</button>
      </div>`;
  },
};

/* =============================================================
   14. HELPERS
============================================================= */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function updateCharCount(inputEl, countEl, max) {
  const len = [...inputEl.value].length;
  countEl.textContent = `${len}/${max}`;
  countEl.style.color = len > max * 0.85 ? 'var(--color-primary)' : 'var(--color-text-3)';
}

/* =============================================================
   15. EVENT BINDING
============================================================= */
function bindEvents() {

  // ── 로고 / 홈
  document.getElementById('logoBtn').addEventListener('click', () => {
    if (appState.currentScreen !== 'home') Nav.go('home');
  });

  // ── 뒤로가기
  document.getElementById('btnBack').addEventListener('click', () => Nav.back());

  // ── 제작 방식 선택
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

  // ── 시작
  document.getElementById('btnStartOrder').addEventListener('click', () => {
    if (appState.orderMethod === 'diy') Nav.go('step1');
    else Nav.go('delegate');
  });

  // ── Step1: 상품 카테고리 탭
  document.getElementById('productCatTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.cat-tab');
    if (!tab) return;
    appState.productCatFilter = tab.dataset.cat;
    ProductUI.render();
  });

  // ── Step1 → Step2
  document.getElementById('btnStep1Next').addEventListener('click', () => {
    if (!appState.selectedProductId) {
      UI.showToast('⚠ 상품을 선택해주세요'); return;
    }
    Nav.go('step2');
  });

  // ── Step2: 사진 업로드
  const photoInput = document.getElementById('photoInput');
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png'].includes(file.type)) {
      UI.showToast('JPG 또는 PNG 파일만 지원합니다'); return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      appState.photo = dataUrl;
      document.getElementById('previewImg').src = dataUrl;
      document.getElementById('uploadPlaceholder').classList.add('hidden');
      document.getElementById('uploadPreview').classList.remove('hidden');
    } catch { UI.showToast('사진을 불러오는 데 실패했습니다'); }
  });
  document.getElementById('btnChangePhoto').addEventListener('click', (e) => {
    e.stopPropagation(); photoInput.value = ''; photoInput.click();
  });

  // ── Step2 → Step3
  document.getElementById('btnStep2Next').addEventListener('click', () => {
    if (!appState.photo) {
      UI.showToast('📷 사진을 업로드해주세요');
      document.getElementById('uploadArea').style.borderColor = 'var(--color-error)';
      setTimeout(() => { document.getElementById('uploadArea').style.borderColor = ''; }, 1500);
      return;
    }
    Nav.go('step3');
  });

  // ── Step3 → Step4 (스타일 선택은 선택 사항)
  document.getElementById('btnStep3Next').addEventListener('click', () => Nav.go('step4'));

  // ── Step4: 폼 입력
  const inputName = document.getElementById('inputName');
  const inputDate = document.getElementById('inputDate');
  const inputMsg  = document.getElementById('inputMessage');
  const inputReq  = document.getElementById('inputRequest');
  const nameCount = document.getElementById('nameCount');
  const msgCount  = document.getElementById('msgCount');
  const reqCount  = document.getElementById('reqCount');

  inputName.addEventListener('input', () => {
    appState.name = inputName.value;
    const { nameMax } = getLimitsForProduct(appState.selectedProductId);
    updateCharCount(inputName, nameCount, nameMax);
    const err = Validator.name(inputName.value);
    const errEl = document.getElementById('nameError');
    if (err) { errEl.classList.remove('hidden'); errEl.textContent = err; inputName.classList.add('error'); }
    else     { errEl.classList.add('hidden'); inputName.classList.remove('error'); }
  });

  // 날짜 자동 포맷
  inputDate.addEventListener('input', () => {
    let v = inputDate.value.replace(/[^0-9]/g,'');
    if (v.length > 4) v = v.slice(0,4)+'.'+v.slice(4);
    if (v.length > 7) v = v.slice(0,7)+'.'+v.slice(7);
    if (v.length > 10) v = v.slice(0,10);
    inputDate.value = v; appState.date = v;
    const err = Validator.date(v);
    const errEl = document.getElementById('dateError');
    if (err && v.length > 0) { errEl.classList.remove('hidden'); inputDate.classList.add('error'); }
    else { errEl.classList.add('hidden'); inputDate.classList.remove('error'); }
  });

  inputMsg.addEventListener('input', () => {
    appState.message = inputMsg.value;
    const { msgLines, lineMax } = getLimitsForProduct(appState.selectedProductId);
    updateCharCount(inputMsg, msgCount, msgLines * lineMax + (msgLines-1));
    const err = Validator.message(inputMsg.value);
    const errEl = document.getElementById('msgError');
    if (err) { errEl.classList.remove('hidden'); errEl.textContent = err; inputMsg.classList.add('error'); }
    else     { errEl.classList.add('hidden'); inputMsg.classList.remove('error'); }
  });

  inputReq.addEventListener('input', () => {
    appState.request = inputReq.value;
    updateCharCount(inputReq, reqCount, 100);
  });

  // ── 배경 색상
  document.getElementById('colorPalette').addEventListener('click', (e) => {
    const chip = e.target.closest('.color-chip');
    if (!chip) return;
    document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    appState.bgColor = chip.dataset.color;
    appState.bgColorName = chip.dataset.name;
  });

  // ── Step4 → Step5
  document.getElementById('btnStep4Next').addEventListener('click', () => {
    const nameErr = Validator.name(appState.name);
    if (nameErr) { UI.showToast('⚠ ' + nameErr); document.getElementById('nameError').classList.remove('hidden'); document.getElementById('inputName').focus(); return; }
    const dateErr = Validator.date(appState.date);
    if (dateErr) { UI.showToast('⚠ ' + dateErr); document.getElementById('dateError').classList.remove('hidden'); return; }
    const msgErr = Validator.message(appState.message);
    if (msgErr)  { UI.showToast('⚠ ' + msgErr);  document.getElementById('msgError').classList.remove('hidden');  return; }
    Nav.go('step5');
  });

  // ── 수정하기 (step5 → step4)
  document.getElementById('btnEditInfo').addEventListener('click', () => Nav.go('step4'));

  // ── 안전영역 가이드 토글
  const btnGuide = document.getElementById('btnToggleGuide');
  btnGuide.addEventListener('click', () => {
    appState.showGuide = !appState.showGuide;
    btnGuide.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      안전영역 가이드 ${appState.showGuide ? 'OFF' : 'ON'}`;
    UI.renderCanvas();
  });

  // ── PNG 다운로드
  document.getElementById('btnDownload').addEventListener('click', () => {
    const canvas = document.getElementById('previewCanvas');
    const link = document.createElement('a');
    const p = PRODUCTS.find(pr => pr.id === appState.selectedProductId);
    link.download = `puppymemory_${appState.name || 'preview'}_${p ? p.label : ''}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    UI.showToast('📥 PNG 파일을 저장했어요');
  });

  // ── 체크박스 (6종)
  const checkIds = ['check1','check2','check3','check4','check5','check6'];
  const checkAll = document.getElementById('checkAll');
  checkIds.forEach((id, i) => {
    document.getElementById(id).addEventListener('change', (e) => {
      appState.checks[`c${i+1}`] = e.target.checked;
      checkAll.checked = checkIds.every(c => document.getElementById(c).checked);
    });
  });
  checkAll.addEventListener('change', (e) => {
    const val = e.target.checked;
    checkIds.forEach((id, i) => {
      document.getElementById(id).checked = val;
      appState.checks[`c${i+1}`] = val;
    });
  });

  // ── 제작 신청
  document.getElementById('btnSubmit').addEventListener('click', () => {
    const allChecked = Object.values(appState.checks).every(Boolean);
    if (!allChecked) {
      UI.showToast('⚠ 제작 전 확인사항을 모두 체크해주세요');
      document.querySelector('.checklist-section').scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }
    const canvas = document.getElementById('previewCanvas');
    const preview = canvas.toDataURL('image/png');
    const id = OrderService.createDIYOrder(preview);
    appState.currentOrderId = id;
    document.getElementById('orderIdDisplay').textContent = id;
    Nav.go('complete');
  });

  // ── 새 주문
  document.getElementById('btnNewOrder').addEventListener('click', () => {
    UI.resetAll();
    Nav.go('home');
  });

  // ── 맡기기: 상품 셀렉트 옵션 채우기
  const delegateProductSel = document.getElementById('delegateProduct');
  PRODUCTS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `[${p.category}] ${p.label}`;
    delegateProductSel.appendChild(opt);
  });
  delegateProductSel.addEventListener('change', (e) => {
    appState.delegateProductId = e.target.value;
  });

  // ── 맡기기: 스타일 셀렉트 옵션 채우기
  const delegateStyleSel = document.getElementById('delegateStyle');
  const styleCats = [...new Set(STYLES.map(s => s.category))];
  styleCats.forEach(cat => {
    const group = document.createElement('optgroup');
    group.label = cat;
    STYLES.filter(s => s.category === cat).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      group.appendChild(opt);
    });
    delegateStyleSel.appendChild(group);
  });
  delegateStyleSel.addEventListener('change', (e) => {
    const s = STYLES.find(st => st.id === e.target.value);
    appState.delegateStyleId    = s ? s.id    : null;
    appState.delegateStyleLabel = s ? s.label : null;
  });

  // ── 맡기기: 사진 업로드
  const photoInputDelegate = document.getElementById('photoInputDelegate');
  photoInputDelegate.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      appState.delegatePhoto = dataUrl;
      document.getElementById('previewImgDelegate').src = dataUrl;
      document.getElementById('uploadPlaceholderDelegate').classList.add('hidden');
      document.getElementById('uploadPreviewDelegate').classList.remove('hidden');
    } catch { UI.showToast('사진을 불러오는 데 실패했습니다'); }
  });
  document.getElementById('btnChangePhotoDelegate').addEventListener('click', (e) => {
    e.stopPropagation(); photoInputDelegate.value = ''; photoInputDelegate.click();
  });

  document.getElementById('delegateName').addEventListener('input', e => appState.delegateName = e.target.value);
  document.getElementById('delegateDate').addEventListener('input', e => appState.delegateDate = e.target.value);
  document.getElementById('delegateRequest').addEventListener('input', e => appState.delegateRequest = e.target.value);

  // ── 맡기기 제출
  document.getElementById('btnDelegateSubmit').addEventListener('click', () => {
    if (!appState.delegatePhoto) { UI.showToast('📷 사진을 업로드해주세요'); return; }
    if (!appState.delegateName.trim()) { UI.showToast('이름을 입력해주세요'); document.getElementById('delegateName').focus(); return; }
    if (!appState.delegateProductId) { UI.showToast('⚠ 상품을 선택해주세요'); return; }
    const id = OrderService.createDelegateOrder();
    appState.currentOrderId = id;
    document.getElementById('orderIdDisplay').textContent = id;
    Nav.go('complete');
  });

  // ── 관리자 버튼
  document.getElementById('btnAdminMode').addEventListener('click', () => {
    if (appState.isAdminLoggedIn) { Nav.go('admin'); return; }
    document.getElementById('adminLoginBackdrop').classList.remove('hidden');
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPasswordError').classList.add('hidden');
    setTimeout(() => document.getElementById('adminPassword').focus(), 300);
  });
  document.getElementById('adminLoginClose').addEventListener('click', () => {
    document.getElementById('adminLoginBackdrop').classList.add('hidden');
  });
  document.getElementById('btnAdminLogin').addEventListener('click', () => {
    if (Admin.login(document.getElementById('adminPassword').value)) {
      document.getElementById('adminLoginBackdrop').classList.add('hidden');
      Nav.go('admin');
    } else {
      document.getElementById('adminPasswordError').classList.remove('hidden');
      document.getElementById('adminPassword').value = '';
      document.getElementById('adminPassword').focus();
    }
  });
  document.getElementById('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btnAdminLogin').click();
  });

  // ── 관리자 필터
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.adminFilter = btn.dataset.status;
      Admin._renderOrders();
    });
  });

  // ── 관리자 탭
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      appState.adminTab = tab.dataset.tab;
      document.getElementById('adminTabOrders').classList.toggle('hidden', appState.adminTa