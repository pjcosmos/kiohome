// ==============================
// 1. 설정: 키워드 & 단계 정의
// ==============================

const TARGET_WORDS = ['버거','음료','주문','결제','변경안함','버터번','세트','단품'];

const STEPS = {
    IDLE: 'IDLE',
    MENU_CATEGORY: 'MENU_CATEGORY',
    MENU_ITEM: 'MENU_ITEM',
    BUN: 'BUN',
    SET_OR_SINGLE: 'SET_OR_SINGLE',
    DESSERT: 'DESSERT',
    DRINK: 'DRINK',
    CONFIRM: 'CONFIRM',
};

let currentStep = STEPS.IDLE;
let isFrozen = false;
let lastSnapshotUrl = null;
let scanning = false;

async function safeScan(fn){
  if (scanning) return;
  scanning = true;
  try { await fn(); }
  finally { scanning = false; }
}

const order = {
    menu: null,
    menuKeyword: null,
    isSet: null,
    bun: null,
    bunKeyword: null,
    dessert: null,
    dessertKeyword: null,
    drink: null,
    drinkKeyword: null,
};


// ==============================
// 2. HTML 요소 참조
// ==============================

const video = document.getElementById('video');
const cameraButton = document.getElementById('cameraButton');
const scanButton = document.getElementById('scanButton');
const ocrOutput = document.getElementById('ocr-output');
const arOverlay = document.getElementById('ar-overlay');

let worker;
let stream;


// ==============================
// 3. 화면 고정 / 해제
// ==============================

function freezeSnapshot(canvas) {

    if (lastSnapshotUrl) {
      URL.revokeObjectURL(lastSnapshotUrl);
      lastSnapshotUrl = null;
    }

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        lastSnapshotUrl = url;

        arOverlay.classList.add('frozen');
        arOverlay.style.backgroundImage = `url(${url})`;
        arOverlay.style.backgroundRepeat = 'no-repeat';

        arOverlay.style.width  = `${video.clientWidth}px`;
        arOverlay.style.height = `${video.clientHeight}px`;

        video.classList.add('hidden');

        isFrozen = true;
        scanButton.textContent = '해제';
    }, 'image/png', 0.95);
}

function unfreezeSnapshot() {
    arOverlay.classList.remove('frozen');
    arOverlay.style.backgroundImage = '';
    arOverlay.innerHTML = '';

    video.classList.remove('hidden');

    if (lastSnapshotUrl) {
        URL.revokeObjectURL(lastSnapshotUrl);
        lastSnapshotUrl = null;
    }

    isFrozen = false;
    scanButton.textContent = '스캔';
    ocrOutput.textContent = '라이브로 돌아왔습니다. 화면을 맞추고 스캔을 눌러주세요.';
}



// ==============================
// 4. Tesseract 초기화
// ==============================

async function initializeTesseract() {
    ocrOutput.textContent = 'OCR 엔진을 로딩 중입니다...';

    try {
        worker = await Tesseract.createWorker('kor');

        await worker.setParameters({
            tessedit_char_whitelist:
              '롯데리아리아불고기버거데리새우핫크리스피치즈한우전주비빔라이스' +
              '변경안함버터번단품세트디저트치킨음료커피포테이토콜라사이다' +
              '주문확인결제장바구니다음이전+원0123456789',
            tessedit_pageseg_mode: '6',
            user_defined_dpi: '300',
            preserve_interword_spaces: '1',
          });

        ocrOutput.textContent = 'OCR 엔진 로딩 완료. 카메라를 켜고 스캔 버튼을 누르세요.';
    } catch (error) {
        console.error('Tesseract.js 초기화 실패:', error);
        ocrOutput.textContent = 'OCR 엔진 로딩에 실패했습니다. 인터넷 연결을 확인해주세요.';
    }
}
initializeTesseract();


// ==============================
// 5. 카메라 켜기 / 끄기
// ==============================

cameraButton.addEventListener('click', async () => {

    if (isFrozen) unfreezeSnapshot();

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
        cameraButton.textContent = '카메라 켜기';
        scanButton.style.display = 'none';
        arOverlay.innerHTML = '';
        ocrOutput.textContent = '카메라가 꺼졌습니다.';
        return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            video.srcObject = stream;
            video.play();
            cameraButton.textContent = '카메라 끄기';
            scanButton.style.display = 'inline-block';
            ocrOutput.textContent = '카메라가 켜졌습니다. 화면을 맞추고 스캔 버튼을 누르세요.';
        } catch (error) {
            alert('카메라 접근 실패. 권한을 확인해주세요.');
        }
    } else {
        alert('이 브라우저는 카메라를 지원하지 않습니다.');
    }
});


// ==============================
// 6. OCR (흑백 처리 없이 컬러 그대로)
// ==============================

async function recognizeText() {

    if (!worker) return alert('OCR 엔진이 아직 준비되지 않았습니다.');
    if (!stream) return alert('카메라가 켜져 있지 않습니다.');

    ocrOutput.textContent = '텍스트를 인식 중입니다...';

    const canvas = document.createElement('canvas');
    const scale = 1;

    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 🔵 컬러 그대로 저장 (흑백/대비 제거)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const { data: { words } } = await worker.recognize(canvas);

    arOverlay.innerHTML = '';

    let activeTargets = TARGET_WORDS;

    if (currentStep === STEPS.MENU_CATEGORY) activeTargets = ['버거'];
    else if (currentStep === STEPS.MENU_ITEM && order.menuKeyword)
        activeTargets = [order.menuKeyword];
    else if (currentStep === STEPS.BUN)
        activeTargets = order.bunKeyword ? [order.bunKeyword] : ['변경안함','버터번'];
    else if (currentStep === STEPS.SET_OR_SINGLE)
        activeTargets = order.isSet === null ? ['세트','단품'] : (order.isSet ? ['세트'] : ['단품']);

    let matchedCount = 0;

    const scaleX = video.clientWidth / canvas.width;
    const scaleY = video.clientHeight / canvas.height;

    words.forEach(word => {
        const raw = (word.text || '').trim();
        const compact = raw.replace(/\s+/g, '');

        if (activeTargets.some(t => compact.includes(t))) {
            matchedCount++;

            const div = document.createElement('div');
            div.className = 'ar-arrow';

            div.style.left = `${word.bbox.x0 * scaleX}px`;
            div.style.top = `${word.bbox.y0 * scaleY}px`;
            div.style.width = `${(word.bbox.x1 - word.bbox.x0) * scaleX}px`;
            div.style.height = `${(word.bbox.y1 - word.bbox.y0) * scaleY}px`;

            arOverlay.appendChild(div);
        }
    });

    ocrOutput.textContent = `인식 완료: 강조된 영역 ${matchedCount}개`;
}


// ==============================
// 7. OCR + Freeze (흑백 제거 버전)
// ==============================

async function recognizeTextAndFreeze() {

    if (!worker) return alert('OCR 엔진 준비 안됨');
    if (!stream) return alert('카메라가 꺼져 있습니다.');

    ocrOutput.textContent = '텍스트를 인식 중입니다...';

    const canvas = document.createElement('canvas');
    const scale = 1;

    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 🔵 역시 컬러 그대로
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const { data: { words } } = await worker.recognize(canvas);

    arOverlay.innerHTML = '';

    const scaleX = video.clientWidth / canvas.width;
    const scaleY = video.clientHeight / canvas.height;

    let matchedCount = 0;

    words.forEach(word => {
        const raw = (word.text || '').trim();
        const compact = raw.replace(/\s+/g, '');

        if (TARGET_WORDS.some(t => compact.includes(t))) {
            matchedCount++;

            const div = document.createElement('div');
            div.className = 'ar-arrow';

            div.style.left = `${word.bbox.x0 * scaleX}px`;
            div.style.top = `${word.bbox.y0 * scaleY}px`;
            div.style.width = `${(word.bbox.x1 - word.bbox.x0) * scaleX}px`;
            div.style.height = `${(word.bbox.y1 - word.bbox.y0) * scaleY}px`;

            arOverlay.appendChild(div);
        }
    });

    freezeSnapshot(canvas);

    ocrOutput.textContent = `인식 완료(고정됨): 강조된 영역 ${matchedCount}개`;
}


// ==============================
// 8. 스캔 버튼 이벤트
// ==============================

scanButton.addEventListener('click', () => {
    if (!isFrozen) safeScan(recognizeTextAndFreeze);
    else unfreezeSnapshot();
});


// ==============================
// 9. 음성인식 (동일)
// ==============================

const voiceButton = document.getElementById('voiceButton');
const voiceOutput = document.getElementById('voice-output');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    voiceButton.addEventListener('click', () => {
        if (voiceButton.textContent === '음성인식 시작') {
            try { recognition.start(); }
            catch(e) { voiceOutput.textContent = '이미 음성 인식 중입니다.'; }
        } else {
            recognition.stop();
        }
    });

    recognition.onstart = () => {
        voiceButton.textContent = '음성인식 중...';
        voiceOutput.textContent = '말씀하세요...';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        voiceOutput.textContent = transcript;
    };

    recognition.onend = () => {
        voiceButton.textContent = '음성인식 시작';
    };

} else {
    voiceButton.style.display = 'none';
    voiceOutput.textContent = '이 브라우저는 음성인식을 지원하지 않습니다.';
}
