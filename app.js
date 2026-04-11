/* ─────────────────────────────────────────────
   🌟 1. 전역 안전장치 및 유틸리티 
───────────────────────────────────────────── */
window.getInitials = name => (name || '?').charAt(0).toUpperCase();
window.escapeHtml  = str => str ? String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
window.applyMasonry = () => {}; 
window.updateCanvasSize = () => {}; 
window.currentLayout = 'canvas';

// (기존 UI 함수들, 공유기능, 파일 업로드 로직 그대로 유지)

// ─────────────────────────────────────────────
// 5. Firebase 연동 및 핵심 비즈니스 로직
// ─────────────────────────────────────────────
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
// 🌟 Firebase 인증 모듈 추가
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* 🔥 주의: 선생님의 Firebase 설정값으로 변경해주세요! */
const firebaseConfig = {
  apiKey: "AIzaSyASO0pcnIdlNIFnj_wh8OemymWW66jMH_I",
  authDomain: "learner-board.firebaseapp.com",
  databaseURL: "https://learner-board-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "learner-board",
  storageBucket: "learner-board.firebasestorage.app",
  messagingSenderId: "939037333266",
  appId: "1:939037333266:web:3974c5de34925c20cc05cb"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const auth = getAuth(app); // 인증 초기화

let currentUserUid = null;
const MASTER_ADMIN_EMAIL = "teacher@gmail.com"; // 🌟 마스터 권한을 가질 이메일 주소 입력!

// 🌟 로그인 및 라우팅 로직
const hashParams = new URLSearchParams(window.location.hash.substring(1));
let currentBoardId = hashParams.get('board') || new URLSearchParams(window.location.search).get('board');

// 구글 로그인 함수
window.signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => {
        window.showToast("로그인 실패: " + error.message);
    });
};

// 로그아웃 함수
window.logout = () => {
    signOut(auth).then(() => {
        window.location.hash = ''; window.location.reload();
    });
};

// 6자리 참여 코드 입장 함수
window.enterWithCode = async () => {
    const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if(code.length < 4) { window.showToast("코드를 정확히 입력하세요."); return; }
    
    // DB에서 코드에 해당하는 보드 ID 찾기
    const snap = await get(ref(db, `room_codes/${code}`));
    if(snap.exists()) {
        window.location.hash = `board=${snap.val()}`; window.location.reload();
    } else {
        window.showToast("존재하지 않는 코드입니다.");
    }
};

// 인증 상태 감지 (인증 구조의 핵심)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // 로그인 성공 시
        currentUserUid = user.uid;
        document.getElementById('userDisplayName').textContent = user.displayName || "선생님";
        
        // 마스터 관리자 체크
        if(user.email === MASTER_ADMIN_EMAIL) {
            document.getElementById('adminBtn').style.display = 'block';
        }

        if(currentBoardId) {
            initBoardApp(); // 기존 보드 렌더링 함수
        } else {
            initLobbyApp(); // 기존 로비 렌더링 함수
        }
    } else {
        // 로그인 안 된 상태 (게스트)
        if(currentBoardId) {
            // 주소(코드)를 알고 들어온 학생/게스트는 보드를 렌더링 해줌
            initBoardApp();
        } else {
            // 처음 접속한 사람은 무조건 로그인 창 표시
            document.getElementById('loginView').style.display = 'flex';
            document.getElementById('lobbyView').style.display = 'none';
            document.getElementById('appView').style.display = 'none';
        }
    }
});

// ── 로비 렌더링 (로그인 한 선생님 전용) ──
function initLobbyApp() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('appView').style.display  = 'none';
    document.getElementById('lobbyView').style.display = 'flex';

    // 🌟 선생님 본인이 만든 보드만 가져오도록 필터링!
    onValue(ref(db, 'board_meta'), snap => {
        // ... (기존 로비 렌더링 로직 동일하게 적용하되, b.ownerUid === currentUserUid 인 것만 필터링) ...
    });

    window.createBoardFromLobby = () => {
        const name = prompt('새 보드 이름:');
        if (name?.trim()) { 
            const newBoardId = push(ref(db, 'boards')).key; // 고유 ID 자동 생성
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6자리 랜덤 코드 생성
            
            // 보드 메타 정보 저장 (소유자 UID와 방 코드 포함)
            set(ref(db, `board_meta/${newBoardId}`), {
                title: name.trim(),
                ownerUid: currentUserUid,
                roomCode: roomCode,
                updatedAt: Date.now()
            });
            // 룸 코드 맵핑 저장
            set(ref(db, `room_codes/${roomCode}`), newBoardId);
            
            window.location.hash = `board=${newBoardId}`; window.location.reload(); 
        }
    };
}

// ── 보드 앱 렌더링 (게스트 및 선생님) ──
function initBoardApp() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('lobbyView').style.display = 'none';
    document.getElementById('appView').style.display   = 'flex';

    // ... (기존의 보드 렌더링, Masonry, 드래그 로직 그대로 복붙) ...
}
