// --- 상태 정의 ---
const STEPS = {
  CATEGORY: "CATEGORY",
  MENU: "MENU",
  OPTIONS: "OPTIONS",
  CART: "CART",
  PAYMENT: "PAYMENT",
  DONE: "DONE",
};

let currentStep = STEPS.CATEGORY;

// 미션 조건 (이걸 기준으로 미션 성공 여부 판단)
const missionTarget = {
  category: "milktea",
  drink: "taro_milktea",
  temp: "ice",
};

// 메뉴 / 옵션 데이터
const categories = [
  { key: "milktea", label: "밀크티" },
  { key: "smoothie", label: "스무디" },
  { key: "coffee", label: "커피" },
];

const drinksByCategory = {
  milktea: [
    {
      key: "taro_milktea",
      name: "타로 밀크티",
      desc: "부드러운 타로와 밀크티의 조합",
      price: 4500,
    },
    {
      key: "black_milktea",
      name: "블랙 밀크티",
      desc: "공차 대표 오리지널 밀크티",
      price: 4300,
    },
    {
      key: "jasmine_milktea",
      name: "자스민 그린 밀크티",
      desc: "은은한 자스민향 밀크티",
      price: 4500,
    },
  ],
  smoothie: [
    {
      key: "strawberry_sm",
      name: "딸기 스무디",
      desc: "상큼한 딸기 얼음 블렌드",
      price: 4800,
    },
    {
      key: "mango_sm",
      name: "망고 스무디",
      desc: "달콤한 망고 스무디",
      price: 4800,
    },
  ],
  coffee: [
    {
      key: "americano",
      name: "아메리카노",
      desc: "깔끔한 블랙 커피",
      price: 4000,
    },
    {
      key: "latte",
      name: "카페라떼",
      desc: "부드러운 우유와 에스프레소",
      price: 4300,
    },
  ],
};

// 현재 주문 정보
const order = {
  category: null,
  drinkKey: null,
  drinkName: null,
  price: 0,
  temp: "ice", // ice / hot
  size: "regular", // regular / large
  quantity: 1,
};

const screenEl = document.getElementById("screen");
const cartTitleEl = document.getElementById("cart-title");
const cartSubEl = document.getElementById("cart-sub");
const payBtn = document.getElementById("pay-btn");

// 유틸: 포맷
const formatPrice = (p) => p.toLocaleString("ko-KR") + "원";

// --- 렌더 함수 ---
function render() {
  screenEl.innerHTML = "";
  let html = "";

  if (currentStep === STEPS.CATEGORY) {
    html += `
      <div class="screen-title">1단계 · 카테고리 선택</div>
      <div class="screen-subtitle">밀크티, 스무디, 커피 중에서 원하는 카테고리를 선택하세요.</div>
      <div class="chip-row">
        ${categories
          .map(
            (c) => `
          <button class="chip" data-role="category" data-key="${c.key}">
            ${c.label}
          </button>
        `
          )
          .join("")}
      </div>
      <div class="toast info show">
        💡 미션: [밀크티] 카테고리를 먼저 선택해 보세요.
      </div>
    `;
  } else if (currentStep === STEPS.MENU) {
    const list = drinksByCategory[order.category] || [];
    const categoryLabel =
      categories.find((c) => c.key === order.category)?.label || "";
    html += `
      <div class="screen-title">2단계 · 메뉴 선택</div>
      <div class="screen-subtitle">'${categoryLabel}' 카테고리에서 원하는 음료를 선택하세요.</div>
      <div class="grid">
        ${list
          .map(
            (d) => `
          <div class="card" data-role="drink" data-key="${d.key}">
            <div class="card-title">${d.name}</div>
            <div class="card-desc">${d.desc}</div>
            <div class="card-price">${formatPrice(d.price)}</div>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="toast info show">
        💡 미션: '타로 밀크티'를 찾아 선택해 보세요.
      </div>
      <button class="secondary-btn" data-role="back-category">← 카테고리 다시 선택</button>
    `;
  } else if (currentStep === STEPS.OPTIONS) {
    html += `
      <div class="screen-title">3단계 · 옵션 선택</div>
      <div class="screen-subtitle">온도와 사이즈를 선택한 후 장바구니에 담아 주세요.</div>

      <div class="section-title">선택한 메뉴</div>
      <div class="card">
        <div class="card-title">${order.drinkName}</div>
        <div class="card-price">${formatPrice(order.price)}</div>
      </div>

      <div class="section-title">온도</div>
      <div class="option-row">
        <button class="option-btn ${
          order.temp === "ice" ? "active" : ""
        }" data-role="temp" data-key="ice">아이스 ICE</button>
        <button class="option-btn ${
          order.temp === "hot" ? "active" : ""
        }" data-role="temp" data-key="hot">핫 HOT</button>
      </div>

      <div class="section-title">사이즈</div>
      <div class="option-row">
        <button class="option-btn ${
          order.size === "regular" ? "active" : ""
        }" data-role="size" data-key="regular">레귤러</button>
        <button class="option-btn ${
          order.size === "large" ? "active" : ""
        }" data-role="size" data-key="large">점보(+500원)</button>
      </div>

      <button class="primary-btn" data-role="add-cart">장바구니에 담기</button>
      <button class="secondary-btn" data-role="back-menu">← 메뉴 다시 선택</button>

      <div class="toast info show">
        💡 미션: '아이스 ICE'로 선택하면 미션 조건에 맞게 됩니다.
      </div>
    `;
  } else if (currentStep === STEPS.CART) {
    const totalPrice =
      order.price + (order.size === "large" ? 500 : 0) * order.quantity;
    html += `
      <div class="screen-title">4단계 · 장바구니 확인</div>
      <div class="screen-subtitle">선택한 메뉴와 옵션을 확인한 뒤 결제를 진행해 주세요.</div>

      <div class="card">
        <div class="card-title">${order.drinkName}</div>
        <div class="card-desc">
          ${
            order.temp === "ice" ? "아이스" : "핫"
          } · ${order.size === "regular" ? "레귤러" : "점보"} · x${
      order.quantity
    }
        </div>
        <div class="card-price">합계: ${formatPrice(totalPrice)}</div>
      </div>

      <button class="primary-btn" data-role="go-payment">결제 화면으로 이동</button>
      <button class="secondary-btn" data-role="back-options">← 옵션 다시 선택</button>

      <div class="toast info show">
        💡 '결제 화면으로 이동'을 누르면 실제 결제 단계까지 경험해 볼 수 있습니다.
      </div>
    `;
  } else if (currentStep === STEPS.PAYMENT) {
    const totalPrice =
      order.price + (order.size === "large" ? 500 : 0) * order.quantity;
    html += `
      <div class="screen-title">5단계 · 결제</div>
      <div class="screen-subtitle">공차 키오스크의 결제 화면과 유사한 형태로 구성했습니다.</div>

      <div class="card">
        <div class="card-title">주문 내역</div>
        <div class="card-desc">
          ${order.drinkName}<br/>
          ${
            order.temp === "ice" ? "아이스" : "핫"
          } · ${order.size === "regular" ? "레귤러" : "점보"} · x${
      order.quantity
    }
        </div>
        <div class="card-price">총 결제금액: ${formatPrice(
          totalPrice
        )}</div>
      </div>

      <div class="section-title">결제 수단 (예시)</div>
      <div class="option-row">
        <button class="option-btn active" disabled>카드 결제</button>
        <button class="option-btn" disabled>모바일 결제</button>
      </div>

      <button class="primary-btn" data-role="pay-complete">결제 진행하기 (모의)</button>
      <button class="secondary-btn" data-role="back-cart">← 장바구니로 돌아가기</button>

      <div class="toast info show">
        💡 실제 결제는 일어나지 않고, '결제 진행하기'를 누르면 미션 성공 여부를 확인합니다.
      </div>
    `;
  } else if (currentStep === STEPS.DONE) {
    const isMissionSuccess =
      order.category === missionTarget.category &&
      order.drinkKey === missionTarget.drink &&
      order.temp === missionTarget.temp;

    html += `
      <div class="center-message">
        ${
          isMissionSuccess
            ? `<div style="font-size:1.2rem; margin-bottom:8px;">🎉 미션 성공!</div>
               <div>타로 밀크티 아이스를 정확하게 주문했습니다.</div>`
            : `<div style="font-size:1.2rem; margin-bottom:8px;">주문 완료</div>
               <div>주문은 완료되었지만, 미션과는 조금 다른 메뉴일 수 있습니다.</div>`
        }
        <div style="margin-top:16px; font-size:0.85rem; color:#777;">
          다시 연습하고 싶다면 아래 버튼을 눌러 처음부터 시작해 보세요.
        </div>
      </div>

      <button class="primary-btn" data-role="restart">처음부터 다시 연습하기</button>
    `;
  }

  screenEl.innerHTML = html;
  updateBottomBar();
  attachHandlers();
}

// 하단 장바구니 표시 업데이트
function updateBottomBar() {
  if (!order.drinkName || currentStep === STEPS.DONE) {
    cartTitleEl.textContent = "선택된 메뉴 없음";
    cartSubEl.textContent = "메뉴를 선택하면 여기에서 확인할 수 있어요.";
    payBtn.disabled = true;
    return;
  }
  const basePrice = order.price;
  const sizeExtra = order.size === "large" ? 500 : 0;
  const totalPrice = (basePrice + sizeExtra) * order.quantity;

  cartTitleEl.textContent = order.drinkName;
  cartSubEl.textContent = `${
    order.temp === "ice" ? "아이스" : "핫"
  } · ${order.size === "regular" ? "레귤러" : "점보"} · x${order.quantity}`;
  payBtn.disabled = !(
    currentStep === STEPS.CART || currentStep === STEPS.PAYMENT
  );
  payBtn.textContent =
    currentStep === STEPS.PAYMENT ? "결제 완료" : "결제하기";
}

// 클릭 핸들러 부착
function attachHandlers() {
  screenEl
    .querySelectorAll("[data-role]")
    .forEach((el) =>
      el.addEventListener("click", (e) => handleAction(e.target))
    );
  payBtn.onclick = () => {
    if (currentStep === STEPS.CART) {
      currentStep = STEPS.PAYMENT;
      render();
    } else if (currentStep === STEPS.PAYMENT) {
      currentStep = STEPS.DONE;
      render();
    }
  };
}

// 액션 처리
function handleAction(el) {
  const role = el.dataset.role;
  const key = el.dataset.key;

  if (role === "category" && currentStep === STEPS.CATEGORY) {
    order.category = key;
    currentStep = STEPS.MENU;
    render();
  } else if (role === "drink" && currentStep === STEPS.MENU) {
    const drink = (drinksByCategory[order.category] || []).find(
      (d) => d.key === key
    );
    if (!drink) return;
    order.drinkKey = drink.key;
    order.drinkName = drink.name;
    order.price = drink.price;
    // 미션을 위해 기본값을 ice/regular로 설정해 둠
    order.temp = "ice";
    order.size = "regular";
    currentStep = STEPS.OPTIONS;
    render();
  } else if (role === "temp" && currentStep === STEPS.OPTIONS) {
    order.temp = key; // ice/hot
    currentStep = STEPS.OPTIONS;
    render();
  } else if (role === "size" && currentStep === STEPS.OPTIONS) {
    order.size = key; // regular/large
    currentStep = STEPS.OPTIONS;
    render();
  } else if (role === "add-cart" && currentStep === STEPS.OPTIONS) {
    currentStep = STEPS.CART;
    render();
  } else if (role === "go-payment" && currentStep === STEPS.CART) {
    currentStep = STEPS.PAYMENT;
    render();
  } else if (role === "back-category") {
    currentStep = STEPS.CATEGORY;
    render();
  } else if (role === "back-menu") {
    currentStep = STEPS.MENU;
    render();
  } else if (role === "back-options") {
    currentStep = STEPS.OPTIONS;
    render();
  } else if (role === "back-cart") {
    currentStep = STEPS.CART;
    render();
  } else if (role === "pay-complete" && currentStep === STEPS.PAYMENT) {
    currentStep = STEPS.DONE;
    render();
  } else if (role === "restart") {
    // 초기화
    order.category = null;
    order.drinkKey = null;
    order.drinkName = null;
    order.price = 0;
    order.temp = "ice";
    order.size = "regular";
    order.quantity = 1;
    currentStep = STEPS.CATEGORY;
    render();
  }
}

// 초기 렌더링
render();
