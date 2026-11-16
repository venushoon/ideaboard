/* ─────────────────────────────────────────────
   🌟 1. 전역 안전장치 및 유틸리티 
───────────────────────────────────────────── */
window.getInitials = name => (name || '?').charAt(0).toUpperCase();
window.escapeHtml  = str => str ? String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : '';
window.applyMasonry = () => {}; 
window.updateCanvasSize = () => {}; 
window.renderPostsOrder = () => {}; 
window.currentLayout = 'canvas';

// 게스트 고유 식별자
let myDeviceId = localStorage.getItem('device_id');
if (!myDeviceId) {
    myDeviceId = 'guest_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    localStorage.setItem('device_id', myDeviceId);
}

// 🌟 디바운싱: 화면 스크롤, 크기 조절 시 버벅임 방지
window.debouncedLayout = (() => {
    let timer = null;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (window.currentLayout === 'wall' || window.currentLayout === 'column') {
                if (typeof window.renderPostsOrder === 'function') window.renderPostsOrder();
            }
            if (window.currentLayout === 'wall' && typeof window.applyMasonry === 'function') window.applyMasonry();
            if (window.currentLayout === 'canvas' && typeof window.updateCanvasSize === 'function') window.updateCanvasSize();
        }, 150); 
    };
})();

/* ── 🌟 2. 커스텀 다이얼로그 (Native Alert/Confirm 완벽 대체) ── */
window.customDialog = (type, title, message, icon = '💡', defaultValue = '') => {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customDialog');
        const titleEl = document.getElementById('cdTitle');
        const msgEl = document.getElementById('cdMessage');
        const iconEl = document.getElementById('cdIcon');
        const inputEl = document.getElementById('cdInput');
        const cancelBtn = document.getElementById('cdCancelBtn');
        const confirmBtn = document.getElementById('cdConfirmBtn');

        titleEl.innerHTML = title;
        msgEl.innerHTML = message;
        iconEl.innerHTML = icon;

        inputEl.value = defaultValue;
        inputEl.style.display = type === 'prompt' ? 'block' : 'none';
        cancelBtn.style.display = type === 'alert' ? 'none' : 'block';

        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('active'), 10);

        if (type === 'prompt') setTimeout(() => inputEl.focus(), 100);

        const cleanup = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.style.display = 'none', 200);
            cancelBtn.onclick = null;
            confirmBtn.onclick = null;
        };

        cancelBtn.onclick = () => { cleanup(); resolve(null); };
        confirmBtn.onclick = () => {
            cleanup();
            if (type === 'prompt') resolve(inputEl.value);
            else resolve(true); 
        };
    });
};

/* ── 3. UI 공통 전역 함수 ── */
window.showToast = msg => { 
    const t = document.getElementById('toast'); 
    if(!t) return;
    t.textContent = msg; 
    t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 2500); 
};

document.querySelectorAll('.color-opt').forEach(opt => {
  opt.addEventListener('click', (e) => {
      document.querySelectorAll('.color-opt').forEach(el => el.classList.remove('active'));
      e.target.classList.add('active');
  });
});

window.openModal = id => {
  if(id==='shareModal') document.getElementById('qrContainer').style.display = 'none';
  const el = document.getElementById(id); el.style.display = 'flex';
  requestAnimationFrame(() => el.classList.add('active'));
};

window.closeModal = id => {
  const el = document.getElementById(id); el.classList.remove('active');
  setTimeout(() => { el.style.display = 'none'; }, 220);
};

window.closeBgClick = (e, id) => { if (e.target.id === id) window.closeModal(id); };
window.openSidebar = () => {
    if (typeof window.isBoardOwner === 'function' && !window.isBoardOwner()) { window.showToast('보드 설정은 방장만 변경할 수 있어요.'); return; }
    document.getElementById('sbOverlay').classList.add('active'); document.getElementById('adminSidebar').classList.add('open');
};
window.closeSidebar = () => { document.getElementById('sbOverlay').classList.remove('active'); document.getElementById('adminSidebar').classList.remove('open'); };
window.openImageViewer = url => { document.getElementById('imageViewerImg').src = url; window.openModal('imageViewerModal'); };

window.copyLink = () => { navigator.clipboard.writeText(window.location.href).then(() => window.showToast("링크 복사 완료!")); window.closeModal('shareModal'); };
window.copyShareUrl = () => { navigator.clipboard.writeText(window.location.href).then(() => window.showToast("링크 복사 완료!")); };

/* QR은 외부 서비스 없이 페이지 안에서 직접 생성합니다 (qrcode-generator) */
window.makeQR = (targetEl, cellSize) => {
    if (typeof window.qrcode !== 'function') return false;
    try {
        const qr = window.qrcode(0, 'M');
        qr.addData(window.location.href);
        qr.make();
        targetEl.innerHTML = qr.createSvgTag({ cellSize: cellSize || 6, margin: 4, scalable: true });
        return true;
    } catch (e) { console.error(e); return false; }
};

window.showQR = () => {
    const box = document.getElementById('qrBox');
    const img = document.getElementById('qrImg');
    if (window.makeQR(box, 5)) {
        img.style.display = 'none';
    } else {
        // 라이브러리를 불러오지 못한 경우에만 외부 서비스로 대체합니다
        box.innerHTML = '';
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`;
        img.style.display = 'block';
    }
    document.getElementById('qrContainer').style.display = 'block';
};

window.currentRoomCode = '';
window.openShareModal = async () => {
    document.getElementById('shareUrlText').textContent = window.location.href;
    window.openModal('shareModal');
    if (!window.currentRoomCode && currentBoardId) {
        try {
            const snap = await get(ref(db, `board_meta/${currentBoardId}/roomCode`));
            if (snap.exists()) window.currentRoomCode = snap.val();
        } catch (e) { console.error(e); }
    }
    document.getElementById('shareRoomCode').textContent = window.currentRoomCode || '—';
};

window.showQRPresent = () => {
    document.getElementById('qrPresentTitle').textContent = document.querySelector('.board-title-text')?.textContent || '아이디어 보드';
    document.getElementById('qrPresentUrl').textContent = window.location.href;
    document.getElementById('qrPresentCode').textContent = window.currentRoomCode || '—';
    const box = document.getElementById('qrPresentBox');
    if (!window.makeQR(box, 10)) {
        box.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(window.location.href)}" alt="QR Code" style="width:min(46vh,78vw); display:block;">`;
    }
    window.closeModal('shareModal');
    const el = document.getElementById('qrPresent');
    el.style.display = 'flex';
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
};

window.closeQRPresent = () => {
    const el = document.getElementById('qrPresent');
    if (el) el.style.display = 'none';
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const el = document.getElementById('qrPresent');
        if (el && el.style.display !== 'none') window.closeQRPresent();
    }
});

/* ── 4-1. 이미지 캡처 ── */
window.downloadImage = async () => {
    window.showToast("고화질 이미지 생성 중...");
    try {
        const boardEl = document.getElementById('board');
        const origWidth = boardEl.style.minWidth;
        const origHeight = boardEl.style.minHeight;
        
        if(window.currentLayout === 'canvas') {
            boardEl.style.minWidth = boardEl.scrollWidth + 'px';
            boardEl.style.minHeight = boardEl.scrollHeight + 'px';
        }

        const canvas = await html2canvas(boardEl, { 
            scale: 1.5, 
            useCORS: true, 
            backgroundColor: document.body.style.backgroundColor || '#f9fafb'
        });
        
        if(window.currentLayout === 'canvas') {
            boardEl.style.minWidth = origWidth;
            boardEl.style.minHeight = origHeight;
        }

        const link = document.createElement('a');
        link.download = `아이디어보드_${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.8); 
        link.click();
        window.closeModal('shareModal');
    } catch(e) { window.showToast("이미지 저장 실패"); }
};

/* ── 4-2. 스마트 PDF 엔진 ── */
window.downloadPDF = async () => {
    const tWrap = document.getElementById('pdfTextWrap'); const iWrap = document.getElementById('pdfIconWrap');
    const origText = tWrap.textContent; tWrap.textContent = '문서 최적화 중…'; iWrap.textContent = '⏳';
    let pdfContainer = null;

    try {
        window.showToast("보고서를 구성하고 있습니다...");
        const boardTitle = document.getElementById('boardTitleText').textContent;
        const posts = Array.from(document.querySelectorAll('.post-it'));
        if(posts.length === 0) { 
            await window.customDialog('alert', '알림', '내보낼 내용이 없습니다.', '⚠️'); 
            return; 
        }

        pdfContainer = document.createElement('div');
        pdfContainer.style.cssText = 'position:absolute; top:0; left:0; z-index:-100; opacity:0; pointer-events:none; width:800px; padding:40px; background:white;';
        document.body.appendChild(pdfContainer);

        const PAGE_MAX_HEIGHT = 1050; 
        let pageNum = 1;
        let currentPage = createPdfVerticalPage(boardTitle, pageNum);
        pdfContainer.appendChild(currentPage);
        
        let leftCol = currentPage.querySelector('.col-left');
        let rightCol = currentPage.querySelector('.col-right');

        for (const post of posts) {
            const clone = post.cloneNode(true);
            const btns = clone.querySelector('.post-btns'); if(btns) btns.remove();
            const cInput = clone.querySelector('.comment-input'); if(cInput) cInput.remove();
            clone.style.cssText = 'position:relative; width:100%; margin-bottom:20px; break-inside:avoid; border:1px solid #eee; box-shadow:0 1px 3px rgba(0,0,0,0.05);';

            if (leftCol.offsetHeight <= rightCol.offsetHeight) leftCol.appendChild(clone);
            else rightCol.appendChild(clone);

            if (currentPage.offsetHeight > PAGE_MAX_HEIGHT) {
                const overItem = clone;
                overItem.remove(); 
                
                pageNum++;
                currentPage = createPdfVerticalPage(boardTitle, pageNum);
                pdfContainer.appendChild(currentPage);
                leftCol = currentPage.querySelector('.col-left');
                rightCol = currentPage.querySelector('.col-right');
                
                leftCol.appendChild(overItem);
            }
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        const pages = pdfContainer.querySelectorAll('.pdf-v-page');

        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], { scale: 1.5, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.75); 
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            if (i > 0) doc.addPage();
            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }

        doc.save(`[보관용]_${boardTitle}_${Date.now()}.pdf`);
        window.showToast("보고서가 생성되었습니다.");
        window.closeModal('shareModal');

    } catch(e) { 
        console.error(e); window.showToast("PDF 생성 실패"); 
    } finally { 
        tWrap.textContent = origText; iWrap.textContent = '📄'; 
        if(pdfContainer && document.body.contains(pdfContainer)) {
            document.body.removeChild(pdfContainer);
        }
    }
};

function createPdfVerticalPage(title, num) {
    const page = document.createElement('div');
    page.className = 'pdf-v-page';
    page.style.cssText = 'width:720px; min-height:1000px; background:white; margin-bottom:50px; padding:20px; font-family: Pretendard, sans-serif;';
    page.innerHTML = `
        <div style="border-bottom:3px solid #333; padding-bottom:10px; margin-bottom:30px; display:flex; justify-content:space-between; align-items:center;">
            <h1 style="margin:0; font-size:24px; color:#111;">${window.escapeHtml(title)}</h1>
            <div style="text-align: right; color: #666;">
                <span style="font-weight:bold;">Page ${num}</span><br>
                <span style="font-size:12px;">${new Date().toLocaleString('ko-KR')}</span>
            </div>
        </div>
        <div style="display:flex; gap:24px; align-items:flex-start;">
            <div class="col-left" style="flex:1; display:flex; flex-direction:column;"></div>
            <div class="col-right" style="flex:1; display:flex; flex-direction:column;"></div>
        </div>
    `;
    return page;
}

/* ── 5. 파일 첨부 (base64로 변환해 Realtime Database에 함께 저장) ──
   Firebase Storage는 Blaze(유료) 요금제에서만 개설할 수 있어, 무료 Spark 요금제에서는
   첨부를 base64 data URL로 게시물 데이터에 직접 저장하는 방식을 사용합니다.
   이미지는 800px·JPEG 0.8로 압축되어 실제 저장 크기는 수백 KB 수준입니다. */
window.currentFileData = null;
window.writeMode = 'new'; // 'new' | 'edit' — 임시저장(드래프트) 동기화 여부 판단용
window.writeDraft = { content: '', linkUrl: '', color: '#ffffff', fileData: null };
window.MAX_POST_CHARS = 1000;

window.applyFilePreview = () => {
    const fd = window.currentFileData;
    const wrap = document.getElementById('filePreviewWrap');
    if (!fd) {
        wrap.style.display = 'none';
        document.getElementById('fileNameDisplay').textContent = '선택된 파일 없음';
        return;
    }
    document.getElementById('fileNameDisplay').textContent = fd.name;
    if (fd.isImage) {
        document.getElementById('filePreviewImg').src = fd.url;
        document.getElementById('filePreviewImg').style.display = 'block';
        document.getElementById('filePreviewFile').style.display = 'none';
    } else {
        document.getElementById('filePreviewImg').style.display = 'none';
        document.getElementById('filePreviewFile').textContent = `📁 ${fd.name}`;
        document.getElementById('filePreviewFile').style.display = 'block';
    }
    wrap.style.display = 'block';
};

window.processFile = async (file) => {
    if(!file) return;
    if(file.size > 2 * 1024 * 1024) {
        await window.customDialog('alert', '용량 초과', '용량 제한: 2MB 이하만 업로드 가능합니다.', '⚠️');
        return;
    }

    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    reader.onload = (e) => {
        if(isImage) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);

                window.currentFileData = { url: canvas.toDataURL('image/jpeg', 0.8), name: file.name, isImage: true };
                if (window.writeMode !== 'edit') window.writeDraft.fileData = window.currentFileData;
                window.applyFilePreview();
                window.refreshSubmitState && window.refreshSubmitState();
            };
            img.src = e.target.result;
        } else {
            window.currentFileData = { url: e.target.result, name: file.name, isImage: false };
            if (window.writeMode !== 'edit') window.writeDraft.fileData = window.currentFileData;
            window.applyFilePreview();
            window.refreshSubmitState && window.refreshSubmitState();
        }
    };
    reader.readAsDataURL(file);
};

window.handleFileUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) window.processFile(file);
    event.target.value = '';
};

window.removeFile = () => {
    window.currentFileData = null; document.getElementById('fileInput').value = '';
    if (window.writeMode !== 'edit') window.writeDraft.fileData = null;
    window.applyFilePreview();
    window.refreshSubmitState && window.refreshSubmitState();
};

/* ── 5-1. 글작성 편의: 글자수 카운터, 제출 버튼 상태, 붙여넣기·드래그 첨부, 임시저장 ── */
window.updateCharCount = () => {
    const input = document.getElementById('postInput');
    const counter = document.querySelector('.char-counter');
    const countEl = document.getElementById('charCount');
    if (!input || !countEl) return;
    countEl.textContent = input.value.length;
    if (counter) counter.classList.toggle('over', input.value.length > window.MAX_POST_CHARS);
};

window.refreshSubmitState = () => {
    const btn = document.getElementById('submitPostBtn');
    if (!btn || btn.dataset.busy === '1') return;
    const hasContent = document.getElementById('postInput').value.trim().length > 0;
    const hasLink = document.getElementById('linkUrlInput').value.trim().length > 0;
    btn.disabled = !(hasContent || hasLink || window.currentFileData);
};

(() => {
    const postInputEl = document.getElementById('postInput');
    const linkInputEl = document.getElementById('linkUrlInput');
    const writeModalEl = document.getElementById('writeModal');
    if (!postInputEl || !writeModalEl) return;

    postInputEl.addEventListener('input', () => {
        window.updateCharCount();
        window.refreshSubmitState();
        if (window.writeMode !== 'edit') window.writeDraft.content = postInputEl.value;
    });
    postInputEl.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); window.submitPost(); }
    });
    postInputEl.addEventListener('paste', (e) => {
        const item = [...((e.clipboardData && e.clipboardData.items) || [])].find(i => i.type.startsWith('image/'));
        if (item) { e.preventDefault(); window.processFile(item.getAsFile()); }
    });
    if (linkInputEl) linkInputEl.addEventListener('input', () => {
        window.refreshSubmitState();
        if (window.writeMode !== 'edit') window.writeDraft.linkUrl = linkInputEl.value;
    });
    document.querySelectorAll('.color-opt').forEach(opt => {
        opt.addEventListener('click', () => { if (window.writeMode !== 'edit') window.writeDraft.color = opt.dataset.color; });
    });

    const modalContent = writeModalEl.querySelector('.modal-content');
    writeModalEl.addEventListener('dragover', (e) => { e.preventDefault(); modalContent.classList.add('drag-over'); });
    writeModalEl.addEventListener('dragleave', (e) => { if (e.target === writeModalEl) modalContent.classList.remove('drag-over'); });
    writeModalEl.addEventListener('drop', (e) => {
        e.preventDefault(); modalContent.classList.remove('drag-over');
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) window.processFile(file);
    });
})();

window.getYoutubeId = function(url) {
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
};

// ─────────────────────────────────────────────
// 6. Firebase 연동 및 하이브리드 로그인/마스터 관리 로직
// ─────────────────────────────────────────────
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push, remove, get, onChildAdded, onChildChanged, onChildRemoved, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app); 

let currentUserUid = null;
const MASTER_ADMIN_EMAIL = "kimsh1126@gmail.com"; 

let myName = '';
let likedPosts = {};
try {
    myName = localStorage.getItem('learner_name') || '';
    likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}');
} catch(e) {}

const hashParams = new URLSearchParams(window.location.hash.substring(1));
let currentBoardId = hashParams.get('board') || new URLSearchParams(window.location.search).get('board');

window.signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signInWithPopup(auth, provider).catch(async error => { 
        console.error(error); 
        await window.customDialog('alert', '로그인 실패', error.message, '🚨'); 
    });
};

window.logout = () => {
    signOut(auth).then(() => { window.location.hash = ''; window.location.reload(); });
};

window.withdrawAccount = async () => {
    if(!currentUserUid) return;
    
    const isConfirm = await window.customDialog('confirm', '서비스 탈퇴', '정말 탈퇴하시겠습니까?<br>선생님이 생성하신 모든 보드와 데이터가 영구적으로 파기됩니다.', '🚨');
    if(!isConfirm) return;

    window.showToast("데이터를 파기하는 중...");
    try {
        const snap = await get(query(ref(db, 'board_meta'), orderByChild('ownerUid'), equalTo(currentUserUid)));
        const allBoards = snap.val() || {};
        const myBoards = Object.keys(allBoards);

        for (const boardId of myBoards) {
            const roomCode = allBoards[boardId].roomCode;
            if(roomCode) await remove(ref(db, `room_codes/${roomCode}`));
            await remove(ref(db, `boards/${boardId}`));
            await remove(ref(db, `board_meta/${boardId}`));
        }
        
        window.showToast("탈퇴 처리가 완료되었습니다.");
        setTimeout(() => window.logout(), 1500);
    } catch(e) {
        window.showToast("오류가 발생했습니다.");
    }
};

window.enterWithCode = async () => {
    const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if(code.length < 4) { await window.customDialog('alert', '알림', '참여 코드를 정확히 입력하세요.', '⚠️'); return; }
    try {
        const snap = await get(ref(db, `room_codes/${code}`));
        if(snap.exists()) { window.location.hash = `board=${snap.val()}`; window.location.reload(); } 
        else { await window.customDialog('alert', '알림', '존재하지 않는 코드입니다.', '❌'); }
    } catch (e) { window.showToast("오류가 발생했습니다. 다시 시도해주세요."); }
};

window.openMasterAdmin = async () => {
    window.openModal('adminModal');
    const listEl = document.getElementById('adminBoardList');
    listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">데이터를 불러오는 중...</td></tr>';

    try {
        const snap = await get(ref(db, 'board_meta'));
        const data = snap.val() || {};
        const boards = Object.keys(data).map(k => ({ id: k, ...data[k] })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        if(boards.length === 0) { listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">생성된 보드가 없습니다.</td></tr>'; return; }

        let html = '';
        boards.forEach(b => {
            const title = window.escapeHtml(b.title || '이름 없음');
            const code = b.roomCode || '없음';
            const owner = b.ownerUid ? (b.ownerUid.substring(0, 8) + '...') : '알 수 없음';
            const isDeleted = b.deletedAt ? '<span style="color:red; font-size:0.8rem;">(휴지통)</span>' : '';
            
            html += `
                <tr>
                    <td><a href="#board=${b.id}" class="admin-board-link" onclick="window.closeModal('adminModal'); setTimeout(()=>window.location.reload(), 50);"><strong>${title}</strong></a> ${isDeleted}</td>
                    <td><span style="background:var(--primary-soft); color:var(--primary); padding:4px 8px; border-radius:6px; font-weight:bold;">${code}</span></td>
                    <td style="color:var(--ink-3); font-family:monospace;">${owner}</td>
                    <td><button class="btn-admin-del" onclick="window.forceDeleteBoard('${b.id}', '${code}')">강제 삭제</button></td>
                </tr>
            `;
        });
        listEl.innerHTML = html;
    } catch(e) { listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: red;">데이터를 불러오는 데 실패했습니다.</td></tr>'; }
};

window.forceDeleteBoard = async (boardId, roomCode) => {
    const isConfirm = await window.customDialog('confirm', '영구 삭제', '이 보드를 서버에서 영구적으로 삭제하시겠습니까?<br>이 작업은 절대 복구할 수 없습니다.', '🚨');
    if(isConfirm) {
        try {
            if(roomCode && roomCode !== '없음') await remove(ref(db, `room_codes/${roomCode}`));
            await remove(ref(db, `boards/${boardId}`));
            await remove(ref(db, `board_meta/${boardId}`));
            window.showToast('강제 삭제 완료'); window.openMasterAdmin();
        } catch(e) { window.showToast('삭제 중 오류 발생'); }
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;

        if (!user.isAnonymous) {
            // 선생님 (구글 로그인)
            myName = user.displayName || "선생님";
            try { localStorage.setItem('learner_name', myName); } catch(e) {}
            document.getElementById('userDisplayName').textContent = myName;
            document.getElementById('withdrawBtn').style.display = 'block';

            if (user.email === MASTER_ADMIN_EMAIL) {
                const adminBtn = document.getElementById('adminBtn');
                if (adminBtn) adminBtn.style.display = 'block';
            }
        } else {
            // 게스트 (익명 인증)
            document.getElementById('withdrawBtn').style.display = 'none';
        }

        if (currentBoardId) {
            initBoardApp();
        } else if (!user.isAnonymous) {
            initLobbyApp();
        } else {
            document.getElementById('loginView').style.display = 'flex';
        }
    } else {
        document.getElementById('withdrawBtn').style.display = 'none';
        if (currentBoardId) {
            // 참여 코드로 들어온 게스트 → 최소한의 인증(uid) 확보
            signInAnonymously(auth).catch(() => window.showToast('접속 중 오류가 발생했습니다.'));
            // 성공하면 이 콜백이 user가 채워진 채로 다시 호출됨
        } else {
            document.getElementById('loginView').style.display = 'flex';
            document.getElementById('lobbyView').style.display = 'none';
            document.getElementById('appView').style.display = 'none';
        }
    }
});

// ── 로비 앱 ──
function initLobbyApp() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('appView').style.display  = 'none';
    document.getElementById('lobbyView').style.display = 'flex';

    let myBoardIds = [];

    window.openStorageManager = () => {
        document.getElementById('storageText').innerHTML = "용량을 계산해볼까요?";
        document.getElementById('calcBtn').style.display = 'inline-block';
        document.getElementById('cleanBtn').style.display = 'none';
        window.openModal('storageModal');
    };

    window.calculateStorage = async () => {
        const btn = document.getElementById('calcBtn'); const txt = document.getElementById('storageText');
        btn.textContent = "계산 중..."; btn.disabled = true;

        try {
            let totalBytes = 0; let fileCount = 0;

            for (const boardId of myBoardIds) {
                const snap = await get(ref(db, `boards/${boardId}`)); const board = snap.val() || {};
                if(board.posts) {
                    Object.values(board.posts).forEach(post => {
                        if(post.fileData && post.fileData.url) { totalBytes += post.fileData.url.length; fileCount++; }
                    });
                }
            }

            const mb = (totalBytes / (1024 * 1024)).toFixed(2);
            txt.innerHTML = `첨부파일 <b style="color:var(--accent)">${fileCount}</b>개<br>추정 사용량: <b style="color:var(--accent)">${mb} MB</b> / 1024 MB`;
            btn.style.display = 'none';
            if(fileCount > 0) document.getElementById('cleanBtn').style.display = 'block';
        } catch(e) { txt.textContent = "오류가 발생했습니다."; } 
        finally { btn.disabled = false; btn.textContent = "현재 첨부파일 사용량 계산하기"; }
    };

    window.cleanUpFiles = async () => {
        const isConfirm = await window.customDialog('confirm', '용량 정리', '모든 보드의 첨부파일을 삭제하시겠습니까?<br>(텍스트와 댓글은 안전하게 유지됩니다)', '🧹');
        if(!isConfirm) return;
        window.showToast("정리 중...");
        try {
            const updates = {};
            for (const boardId of myBoardIds) {
                const snap = await get(ref(db, `boards/${boardId}`)); const board = snap.val() || {};
                if(board.posts) {
                    Object.keys(board.posts).forEach(postId => {
                        if(board.posts[postId].fileData) updates[`boards/${boardId}/posts/${postId}/fileData`] = null;
                    });
                }
            }
            if(Object.keys(updates).length > 0) { await update(ref(db), updates); window.showToast("정리 완료!"); window.closeModal('storageModal'); } 
            else { await window.customDialog('alert', '알림', '삭제할 첨부파일이 없습니다.', '✅'); }
        } catch(e) { window.showToast("오류 발생"); }
    };

    window.deleteBoard = async (boardId, e) => {
        e.stopPropagation();
        const isConfirm = await window.customDialog('confirm', '휴지통 이동', '이 보드를 휴지통으로 이동할까요?<br><span style="font-size:0.85rem;color:#888;">(15일 후 완전히 삭제됩니다)</span>', '🗑️');
        if (isConfirm) {
            update(ref(db, `board_meta/${boardId}`), { deletedAt: Date.now() }); window.showToast('휴지통으로 이동됨');
        }
    };

    window.restoreBoard = async (boardId, e) => {
        e.stopPropagation();
        update(ref(db, `board_meta/${boardId}`), { deletedAt: null }); window.showToast('복구됨');
    };

    window.hardDeleteBoard = async (boardId, e) => {
        e.stopPropagation();
        const isConfirm = await window.customDialog('confirm', '영구 삭제', '영구 삭제하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.', '🚨');
        if (isConfirm) {
            try {
                const metaSnap = await get(ref(db, `board_meta/${boardId}`));
                const roomCode = metaSnap.val()?.roomCode;

                if(roomCode) await remove(ref(db, `room_codes/${roomCode}`));
                await remove(ref(db, `boards/${boardId}`));
                await remove(ref(db, `board_meta/${boardId}`));
                
                window.showToast('영구 삭제됨');
            } catch (err) {
                window.showToast('삭제 중 오류 발생');
            }
        }
    };

    onValue(query(ref(db, 'board_meta'), orderByChild('ownerUid'), equalTo(currentUserUid)), snap => {
        const data  = snap.val() || {}; 
        const grid  = document.getElementById('boardGrid');
        const trashGrid = document.getElementById('trashGrid');
        const trashSection = document.getElementById('trashSection');
        
        grid.innerHTML = ''; trashGrid.innerHTML = '';
        let hasTrash = false; const now = Date.now();
        
        const myBoards = Object.keys(data)
            .map(k => ({ id: k, ...data[k] }))
            .filter(b => b.ownerUid === currentUserUid)
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        myBoardIds = myBoards.map(b => b.id);

        myBoards.forEach(b => {
          if (b.deletedAt) {
              if (now - b.deletedAt > 15 * 24 * 60 * 60 * 1000) {
                  if (b.roomCode) remove(ref(db, `room_codes/${b.roomCode}`));
                  remove(ref(db, `boards/${b.id}`)); remove(ref(db, `board_meta/${b.id}`)); return;
              }
              hasTrash = true;
              const card = document.createElement('div'); card.className = 'board-card trash-card';
              card.innerHTML = `
                <div style="padding: 16px;"><h3 class="board-name">🗑️ ${window.escapeHtml(b.title || b.id)}</h3><p class="board-date">삭제일: ${new Date(b.deletedAt).toLocaleDateString()}</p></div>
                <div class="trash-actions"><button class="btn-restore" onclick="window.restoreBoard('${b.id}', event)">복구</button><button class="btn-hard-del" onclick="window.hardDeleteBoard('${b.id}', event)">영구삭제</button></div>
              `;
              trashGrid.appendChild(card);
          } else {
              const card = document.createElement('div'); card.className = 'board-card';
              const thumb = b.thumb ? `<img src="${b.thumb}" class="board-thumb" alt="">` : `<div class="board-thumb-empty">📝</div>`;
              const date = b.updatedAt ? new Date(b.updatedAt).toLocaleString('ko-KR', { dateStyle:'short', timeStyle:'short' }) : '–';
              card.innerHTML = `
                ${thumb}
                <button class="board-delete-btn" title="휴지통으로 이동" onclick="window.deleteBoard('${b.id}', event)">🗑️</button>
                <div class="board-info"><h3 class="board-name">${window.escapeHtml(b.title || b.id)}</h3><p class="board-date">최근 활동: ${date}</p></div>
              `;
              card.onclick = () => { window.location.hash = `board=${b.id}`; window.location.reload(); };
              grid.appendChild(card);
          }
        });
        trashSection.style.display = hasTrash ? 'block' : 'none';
    });

    window.createBoardFromLobby = async () => {
        const name = await window.customDialog('prompt', '새 보드 생성', '새 보드의 이름을 지정해 주세요.', '✨');
        if (name && name.trim()) { 
            const newBoardId = push(ref(db, 'boards')).key; 
            
            let roomCode;
            let isUnique = false;
            while(!isUnique) {
                roomCode = Math.random().toString(36).substring(2, 8).toUpperCase(); 
                const snap = await get(ref(db, `room_codes/${roomCode}`));
                if(!snap.exists()) isUnique = true;
            }
            
            await set(ref(db, `board_meta/${newBoardId}`), {
                title: name.trim(), ownerUid: currentUserUid, roomCode: roomCode, updatedAt: Date.now()
            });
            await set(ref(db, `boards/${newBoardId}/settings`), {
                title: name.trim()
            });
            await set(ref(db, `room_codes/${roomCode}`), newBoardId);
            
            window.location.hash = `board=${newBoardId}`; window.location.reload(); 
        }
    };
}

// ── 보드 앱 ──
function initBoardApp() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('lobbyView').style.display = 'none';
  document.getElementById('appView').style.display   = 'flex';

  const boardRef    = ref(db, `boards/${currentBoardId}/posts`);
  const settingsRef = ref(db, `boards/${currentBoardId}/settings`);
  const columnsRef  = ref(db, `boards/${currentBoardId}/columns`);
  const metaRef     = ref(db, `board_meta/${currentBoardId}`);

  let isAnonMode     = false;
  let reactionType   = 'like'; 
  let currentColId   = null;
  let currentEditId  = null;
  let isSubmitting   = false;
  let lastOwnPostId  = null;

  let allPostsData   = {};
  let localColumnsData = {};
  let localPosts     = {};     
  let localColEls    = {};     

  window.applyMasonry = () => {
      if (window.currentLayout !== 'wall') return;
      const board = document.getElementById('board');
      const posts = Array.from(board.querySelectorAll('.post-it'));
      if (posts.length === 0) return;

      const colWidth = 280; const gap = 24; const hPadding = 32;
      let cols = Math.floor((board.clientWidth - (hPadding * 2) + gap) / (colWidth + gap));
      if (cols < 1) cols = 1;
      const totalWidth = cols * colWidth + (cols - 1) * gap;
      const offsetX = (board.clientWidth - totalWidth) / 2;
      const colHeights = Array(cols).fill(130); 

      posts.forEach(post => {
          const minCol = colHeights.indexOf(Math.min(...colHeights));
          post.style.left = `${offsetX + minCol * (colWidth + gap)}px`;
          post.style.top = `${colHeights[minCol]}px`;
          colHeights[minCol] += post.offsetHeight + gap;
      });

      let spacer = document.getElementById('masonry-spacer');
      if (!spacer) {
          spacer = document.createElement('div'); spacer.id = 'masonry-spacer';
          spacer.style.position = 'absolute'; spacer.style.width = '1px'; spacer.style.visibility = 'hidden';
          board.appendChild(spacer);
      }
      spacer.style.top = `${Math.max(...colHeights) + 140}px`;
  };

  window.updateCanvasSize = () => {
      if (window.currentLayout !== 'canvas') {
          const spacer = document.getElementById('canvas-spacer'); if (spacer) spacer.style.display = 'none'; return;
      }
      let maxX = window.innerWidth; let maxY = window.innerHeight;
      Object.keys(allPostsData).forEach(id => {
          const p = allPostsData[id];
          if (p.x && p.x + 350 > maxX) maxX = p.x + 350;
          if (p.y && p.y + 350 > maxY) maxY = p.y + 350;
      });
      if (dragState.el) {
          const dragX = parseFloat(dragState.el.style.left) || 0; const dragY = parseFloat(dragState.el.style.top) || 0;
          if (dragX + 350 > maxX) maxX = dragX + 350; if (dragY + 350 > maxY) maxY = dragY + 350;
      }
      const board = document.getElementById('board');
      let spacer = document.getElementById('canvas-spacer');
      if (!spacer) {
          spacer = document.createElement('div'); spacer.id = 'canvas-spacer';
          spacer.style.position = 'absolute'; spacer.style.width = '1px'; spacer.style.height = '1px'; spacer.style.visibility = 'hidden';
          board.appendChild(spacer);
      }
      spacer.style.display = 'block'; spacer.style.left = maxX + 'px'; spacer.style.top = maxY + 'px';
  };

  window.addEventListener('resize', () => window.debouncedLayout());

  function ensureName () {
    if (myName) return; 
    window.openModal('nameModal'); 
    setTimeout(() => document.getElementById('nameInput').focus(), 100);
  }
  window.confirmName = () => {
    const v = document.getElementById('nameInput').value.trim();
    if (!v) return; myName = v.slice(0, 12);
    try { localStorage.setItem('learner_name', myName); } catch(e) {}
    window.closeModal('nameModal');
  };
  ensureName();

  update(metaRef, { updatedAt: Date.now() });

  let currentBoardMeta = {};

  function isBoardOwner() {
      return !!(currentUserUid && currentBoardMeta.ownerUid && currentUserUid === currentBoardMeta.ownerUid);
  }
  window.isBoardOwner = isBoardOwner;

  // 게시물 관리 권한: 작성자 본인 또는 방장. authorUid가 없는 예전 게시물은 방장만.
  function canManagePost(p) {
      if (!p) return false;
      return p.authorUid ? (p.authorUid === currentUserUid || isBoardOwner()) : isBoardOwner();
  }

  function refreshPostPermissions() {
      Object.keys(localPosts).forEach(pid => {
          const el = localPosts[pid]; const p = allPostsData[pid];
          if (!el || !p) return;
          const btns = el.querySelector('.post-btns');
          if (btns) btns.style.display = canManagePost(p) ? '' : 'none';
      });
  }

  get(metaRef).then(metaSnap => {
      currentBoardMeta = metaSnap.val() || {};
      if (currentBoardMeta.roomCode) {
          const el = document.getElementById('displayRoomCode');
          if(el) el.textContent = currentBoardMeta.roomCode;
      }
      // 방장이 아니면 설정(⚙️) 진입점 숨기기
      if (!isBoardOwner()) {
          document.querySelectorAll('.nav-icon-btn').forEach(btn => btn.style.display = 'none');
      }
      refreshPostPermissions();
  });

  onValue(settingsRef, snap => {
    const s = snap.val() || {};
    const bTitle = s.title || currentBoardMeta.title || `🤝 아이디어 보드`;
    document.getElementById('boardTitleText').textContent = bTitle;
    
    if(document.activeElement.id !== 'sbTitleInput') document.getElementById('sbTitleInput').value = bTitle;
    const bDesc = s.description || `설명이 없습니다.`;
    if(document.activeElement.id !== 'sbDescInput') document.getElementById('sbDescInput').value = bDesc;
    
    if (isBoardOwner()) update(metaRef, { title: bTitle });

    document.body.classList.toggle('hide-comments', s.commentsEnabled === false);
    document.body.classList.toggle('hide-reactions', s.reactionType === 'none');
    document.body.classList.toggle('post-order-top', s.postOrder === 'top');

    document.getElementById('anonToggle').checked = s.isAnonymous || false;
    document.getElementById('commentToggle').checked = s.commentsEnabled !== false;
    
    reactionType = s.reactionType || 'like';
    document.getElementById('reactionSelect').value = reactionType;
    document.getElementById('postOrderSelect').value = s.postOrder || 'bottom';
    
    const font = s.font || "'Pretendard', sans-serif";
    document.body.style.fontFamily = font;
    document.getElementById('fontSelect').value = font;

    isAnonMode = s.isAnonymous || false;
    refreshAllAuthors();

    const bg = s.bgColor || '#f9fafb';
    document.body.style.backgroundColor = bg;
    document.getElementById('bgSelect').value = bg;
    if(bg === '#111827') { document.body.style.color = 'white'; document.querySelector('.board-title-text').style.color='white'; document.querySelector('.board-desc-text').style.color='#9ca3af';} 
    else { document.body.style.color = ''; document.querySelector('.board-title-text').style.color=''; document.querySelector('.board-desc-text').style.color='';}

    const newLayout = s.layout || 'canvas';
    const layoutChanged = window.currentLayout !== newLayout;
    window.currentLayout = newLayout; 
    
    document.getElementById('board').setAttribute('data-layout', window.currentLayout);
    document.getElementById('layoutSelect').value = window.currentLayout;

    document.querySelectorAll('.post-it').forEach(el => { el.draggable = (window.currentLayout !== 'canvas'); });
    updateAllReactionsIcon();

    if(layoutChanged) { renderColumns(); window.debouncedLayout(); }
  });

  onValue(columnsRef, snap => {
    localColumnsData = snap.val() || {}; renderColumns(); window.debouncedLayout();
  });

  onChildAdded(boardRef, snap => {
      const id = snap.key;
      const p = snap.val();
      allPostsData[id] = p;
      let el = localPosts[id];
      if (!el) {
          el = createPostEl(id, p);
          localPosts[id] = el;
          placePost(el, p.columnId);
      }
      updatePostEl(el, id, p);
      if (id === lastOwnPostId) markOwnPost(el);
      window.debouncedLayout();
  });

  onChildChanged(boardRef, snap => {
      const id = snap.key;
      const p = snap.val();
      allPostsData[id] = p;
      const el = localPosts[id];
      if (el) {
          updatePostEl(el, id, p);
          if (window.currentLayout === 'column') {
              const targetBodyId = `colbody-${p.columnId || Object.keys(localColumnsData)[0]}`;
              if (el.parentElement && el.parentElement.id !== targetBodyId) {
                  placePost(el, p.columnId);
              }
          }
      }
      window.debouncedLayout();
  });

  onChildRemoved(boardRef, snap => {
      const id = snap.key;
      delete allPostsData[id];
      if (localPosts[id]) {
          localPosts[id].remove();
          delete localPosts[id];
      }
      window.debouncedLayout();
  });

  function getReactionIcon(type) { return type === 'thumb' ? '👍' : type === 'star' ? '⭐' : '❤️'; }

  function updateAllReactionsIcon() {
      Object.keys(localPosts).forEach(id => {
          const iconEl = localPosts[id].querySelector('.like-icon'); if(iconEl) iconEl.textContent = getReactionIcon(reactionType);
          const btn = localPosts[id].querySelector('.like-btn'); if(btn) btn.setAttribute('data-type', reactionType);
      });
  }

  function createPostEl (id, p) {
    const el = document.createElement('div'); el.className = 'post-it'; el.id = id;
    const isAnon = document.getElementById('anonToggle').checked;
    el.innerHTML = `
      <div class="post-top">
        <div class="post-author-row">
          <div class="author-avatar">${window.getInitials(p.author)}</div>
          <span class="post-author" data-real="${window.escapeHtml(p.author)}">${isAnon ? '익명' : window.escapeHtml(p.author)}</span>
        </div>
        <div class="post-btns">
          <button class="post-btn edit" title="수정">✏️</button>
          <button class="post-btn del"  title="삭제">✕</button>
        </div>
      </div>
      <div class="post-body-content"></div>
      <div class="post-foot">
        <button class="like-btn" data-id="${id}" data-type="${reactionType}">
            <span class="like-icon">${getReactionIcon(reactionType)}</span>
            <span class="like-count">0</span>
        </button>
      </div>
      <div class="comments-wrap">
        <div class="comment-list"></div>
        <input class="comment-input" type="text" placeholder="댓글 달기…" maxlength="200">
      </div>`;

    el.querySelector('.del').onclick = async e => {
        e.stopPropagation();
        if (!canManagePost(allPostsData[id])) { window.showToast('본인 글만 삭제할 수 있어요.'); return; }
        const isConfirm = await window.customDialog('confirm', '포스트잇 삭제', '이 포스트잇을 삭제할까요?', '🗑️');
        if(isConfirm) remove(ref(db, `boards/${currentBoardId}/posts/${id}`));
    };
    el.querySelector('.edit').onclick = e => {
        e.stopPropagation();
        if (!canManagePost(allPostsData[id])) { window.showToast('본인 글만 수정할 수 있어요.'); return; }
        window.editPost(id);
    };
    el.querySelector('.like-btn').onclick = e => { e.stopPropagation(); window.toggleLike(id); };
    
    el.querySelector('.comment-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (e.isComposing || e.keyCode === 229) return; 
          const text = e.target.value.trim();
          if (text) { e.target.value = ''; window.addComment(id, text, e.target); }
      }
    });
    
    if(typeof MobileDragDrop !== 'undefined') {
        el.addEventListener('touchstart', function(e) {}, {passive: true});
    }

    el.draggable = (window.currentLayout !== 'canvas');
    el.addEventListener('dragstart', (e) => handleDragStart(e, id));
    el.addEventListener('dragend', handleDragEnd);
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', (e) => handleDropOnWall(e, id)); 
    
    el.addEventListener('pointerdown', e => {
        if(window.currentLayout === 'canvas') startFreeDrag(e, id, el);
    });
    return el;
  }

  function updatePostEl (el, id, p) {
    el.style.backgroundColor = p.color || '#ffffff';
    const btns = el.querySelector('.post-btns');
    if (btns) btns.style.display = canManagePost(p) ? '' : 'none';
    let html = '';
    if(p.fileData) {
        if(p.fileData.isImage) html += `<img src="${p.fileData.url}" class="post-img" alt="첨부이미지" onload="window.debouncedLayout && window.debouncedLayout()" onclick="window.openImageViewer('${p.fileData.url}')">`;
        else html += `<a href="${p.fileData.url}" download="${window.escapeHtml(p.fileData.name)}" class="post-file">📁 ${window.escapeHtml(p.fileData.name)}</a>`;
    }
    
    if(p.linkUrl && /^https?:\/\//i.test(p.linkUrl)) {
        const ytId = window.getYoutubeId(p.linkUrl);
        const safeUrl = window.escapeHtml(p.linkUrl);
        if(ytId) {
            html += `<div class="yt-thumb-wrap" onclick="window.open('${safeUrl}', '_blank')"><img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" class="yt-thumb"><div class="yt-play-icon">▶</div></div>`;
        } else {
            html += `<a href="${safeUrl}" target="_blank" rel="noopener" class="post-link">🔗 참고 링크</a>`;
        }
    }

    html += `<div class="post-text">${window.escapeHtml(p.content || '')}</div>`;
    el.querySelector('.post-body-content').innerHTML = html;

    let likeCount = 0;
    let hasLiked = false;
    const uid = currentUserUid || myDeviceId;
    
    if (p.likes) {
        if (typeof p.likes === 'object') {
            likeCount = Object.keys(p.likes).length;
            hasLiked = !!p.likes[uid];
        } else {
            likeCount = Number(p.likes);
            hasLiked = !!likedPosts[id]; 
        }
    }

    const likeBtn = el.querySelector('.like-btn');
    likeBtn.classList.toggle('liked', hasLiked);
    el.querySelector('.like-count').textContent = likeCount;

    const list = el.querySelector('.comment-list');
    let cHtml = '';
    if (p.comments) {
      const isAnon = document.getElementById('anonToggle').checked;
      Object.entries(p.comments).sort((a,b) => (a[1].timestamp || 0) - (b[1].timestamp || 0)).forEach(([cid, c]) => {
        const name = isAnon ? '익명' : window.escapeHtml(c.author || '?');
        const canDelComment = c.authorUid ? (c.authorUid === currentUserUid || isBoardOwner()) : isBoardOwner();
        const delBtn = canDelComment ? `<button class="comment-del" title="댓글 삭제" onclick="window.deleteComment('${id}','${cid}')">✕</button>` : '';
        cHtml += `<div class="comment-item"><span class="c-author">${name}</span><span class="c-text">${window.escapeHtml(c.text)}</span>${delBtn}</div>`;
      });
    }
    list.innerHTML = cHtml; list.scrollTop = list.scrollHeight;

    if (window.currentLayout === 'canvas' && (!dragState.id || dragState.id !== id)) {
      el.style.left = (p.x || 80) + 'px'; el.style.top  = (p.y || 80) + 'px';
    }
  }

  function renderColumns () {
    const board  = document.getElementById('board');
    if (window.currentLayout !== 'column') {
      Object.values(localColEls).forEach(el => el.remove());
      localColEls = {}; document.getElementById('addColBtnWrap')?.remove(); return;
    }

    let addWrap = document.getElementById('addColBtnWrap');
    if (!addWrap) {
      addWrap = document.createElement('div'); addWrap.id = 'addColBtnWrap'; addWrap.className = 'add-column-btn-wrap';
      addWrap.innerHTML = `<button class="add-col-btn" onclick="window.addColumn()">＋ 섹션 추가</button>`;
      board.appendChild(addWrap);
    }

    Object.entries(localColumnsData).sort((a,b)=>a[1].order - b[1].order).forEach(([cid, data]) => {
      const canManageCol = isBoardOwner() || data.createdBy === currentUserUid;
      if (localColEls[cid]) {
        const inp = localColEls[cid].querySelector('.column-title-input');
        if (document.activeElement !== inp) inp.value = data.title || '';
        inp.disabled = !canManageCol;
        const delBtn = localColEls[cid].querySelector('.column-del-btn');
        if (delBtn) delBtn.style.display = canManageCol ? '' : 'none';
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = 'column-wrap'; wrap.id = `col-${cid}`;

      wrap.innerHTML = `
        <div class="column-head">
          <input class="column-title-input" value="${window.escapeHtml(data.title||'')}" placeholder="섹션 이름" onchange="window.renameColumn('${cid}', this.value)" ${canManageCol ? '' : 'disabled'}>
          <button class="column-del-btn" onclick="window.deleteColumn('${cid}')" title="섹션 삭제" ${canManageCol ? '' : 'style="display:none;"'}>✕</button>
        </div>
        <button class="column-add-post" onclick="window.openWriteModal('${cid}')">＋ 포스트잇 추가</button>
        <div class="column-body" id="colbody-${cid}"></div>`;
      
      wrap.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      wrap.addEventListener('drop', e => {
          e.preventDefault();
          const postId = e.dataTransfer.getData('text/plain');
          if(postId && allPostsData[postId] && allPostsData[postId].columnId !== cid) {
              update(ref(db, `boards/${currentBoardId}/posts/${postId}`), { columnId: cid });
          }
          document.querySelectorAll('.post-it').forEach(el => el.classList.remove('is-dragging-node'));
      });
      
      board.insertBefore(wrap, addWrap); localColEls[cid] = wrap;
    });

    Object.keys(localColEls).forEach(cid => { if (!localColumnsData[cid]) { localColEls[cid].remove(); delete localColEls[cid]; } });
  }

  window.renderPostsOrder = function() {
    if(window.currentLayout === 'canvas') {
        Object.keys(localPosts).forEach(id => {
            const p = allPostsData[id];
            const el = localPosts[id];
            if (el.parentElement !== document.getElementById('board')) document.getElementById('board').appendChild(el);
            el.style.position = 'absolute'; el.style.left = (p.x || 80) + 'px'; el.style.top = (p.y || 80) + 'px'; el.style.transform = '';
        });
        return;
    }

    const order = document.getElementById('postOrderSelect').value;
    const board = document.getElementById('board');
    
    if (window.currentLayout === 'wall') {
        const posts = Array.from(board.querySelectorAll('.post-it'));
        posts.sort((a,b) => {
            const ta = allPostsData[a.id]?.createdAt || 0; 
            const tb = allPostsData[b.id]?.createdAt || 0;
            return order === 'top' ? tb - ta : ta - tb;
        });
        posts.forEach(p => { if(!dragState.id || dragState.id !== p.id) board.appendChild(p); }); 
        return; 
    }

    const parentContainers = Object.values(localColEls).map(c => c.querySelector('.column-body'));
    
    Object.keys(localPosts).forEach(id => {
        const p = allPostsData[id]; if(!p) return;
        const el = localPosts[id];
        const firstCid = Object.keys(localColumnsData)[0];
        const bodyId   = `colbody-${p.columnId || firstCid}`;
        const target = document.getElementById(bodyId) || board;
        if (el.parentElement !== target && (!dragState.id || dragState.id !== id)) target.appendChild(el);
    });

    parentContainers.forEach(container => {
        if(!container) return;
        const posts = Array.from(container.querySelectorAll('.post-it'));
        posts.sort((a,b) => {
            const ta = allPostsData[a.id]?.createdAt || 0; 
            const tb = allPostsData[b.id]?.createdAt || 0;
            return order === 'top' ? tb - ta : ta - tb;
        });
        posts.forEach(p => { if(!dragState.id || dragState.id !== p.id) container.appendChild(p); }); 
    });
  };

  function placePost (el, colId) {
    let target = document.getElementById('board');
    if (window.currentLayout === 'column') {
      const firstCid = Object.keys(localColumnsData)[0];
      const bodyId   = `colbody-${colId || firstCid}`;
      target = document.getElementById(bodyId) || target;
    }
    if (el.parentElement !== target) target.appendChild(el);
  }

  function refreshAllAuthors () {
    Object.keys(localPosts).forEach(id => {
      const el = localPosts[id]; const sp = el.querySelector('.post-author'); const av = el.querySelector('.author-avatar');
      if (!sp) return; const real = sp.dataset.real || '?';
      sp.textContent = isAnonMode ? '익명' : real; av.textContent = isAnonMode ? '?' : window.getInitials(real);
    });
  }

  window.updateSettings = () => {
      update(settingsRef, {
          title: document.getElementById('sbTitleInput').value,
          description: document.getElementById('sbDescInput').value,
          isAnonymous: document.getElementById('anonToggle').checked,
          commentsEnabled: document.getElementById('commentToggle').checked,
          layout: document.getElementById('layoutSelect').value,
          postOrder: document.getElementById('postOrderSelect').value,
          reactionType: document.getElementById('reactionSelect').value,
          bgColor: document.getElementById('bgSelect').value,
          font: document.getElementById('fontSelect').value
      });
  }

  /* ── CRUD ── */
  window.openWriteModal = async (colId = null) => {
    if (!myName) {
        myName = await window.customDialog('prompt', '반가워요!', '보드에서 사용할 이름을 입력해 주세요.', '👋');
        if(myName && myName.trim()) {
            myName = myName.trim().slice(0, 12);
            try { localStorage.setItem('learner_name', myName); } catch(e) {}
        } else {
            myName = ''; return; // 취소시 중단
        }
    }
    currentColId  = colId; currentEditId = null; window.writeMode = 'new';
    document.getElementById('fileInput').value = '';
    // 임시저장(드래프트) 복원: 실수로 창을 닫아도 쓰던 글이 유지됩니다
    document.getElementById('postInput').value    = window.writeDraft.content || '';
    document.getElementById('linkUrlInput').value = window.writeDraft.linkUrl || '';
    window.currentFileData = window.writeDraft.fileData || null;
    window.applyFilePreview();
    document.getElementById('writeModalTitle').textContent = '어떤 아이디어를 나눌까요?';
    document.querySelectorAll('.color-opt').forEach(d => d.classList.toggle('active', d.dataset.color === (window.writeDraft.color || '#ffffff')));
    window.updateCharCount(); window.refreshSubmitState();
    window.openModal('writeModal');
    setTimeout(() => document.getElementById('postInput').focus(), 80);
  };

  window.editPost = id => {
    currentEditId = id; const p = allPostsData[id]; if (!p) return;
    window.writeMode = 'edit';
    document.getElementById('fileInput').value = '';
    document.getElementById('postInput').value    = p.content || '';
    window.currentFileData = p.fileData || null;
    window.applyFilePreview();
    document.getElementById('linkUrlInput').value = p.linkUrl  || '';
    document.getElementById('writeModalTitle').textContent = '게시물 수정';
    document.querySelectorAll('.color-opt').forEach(d => { d.classList.toggle('active', d.dataset.color === p.color); });
    window.updateCharCount(); window.refreshSubmitState();
    window.openModal('writeModal');
  };

  window.submitPost = async () => {
    if (isSubmitting) return; // 중복 제출 방지
    if (!myName) {
        myName = await window.customDialog('prompt', '반가워요!', '보드에서 사용할 이름을 입력해 주세요.', '👋');
        if(myName && myName.trim()) {
            myName = myName.trim().slice(0, 12);
            try { localStorage.setItem('learner_name', myName); } catch(e) {}
        } else {
            myName = ''; return;
        }
    }
    const content  = document.getElementById('postInput').value.trim();
    let   linkUrl  = document.getElementById('linkUrlInput').value.trim();
    const fileData = window.currentFileData;
    if (!content && !fileData && !linkUrl) { window.showToast('내용, 첨부파일 또는 링크를 입력해 주세요.'); return; }
    if (content.length > window.MAX_POST_CHARS) { window.showToast(`내용은 ${window.MAX_POST_CHARS}자까지 입력할 수 있어요.`); return; }
    if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
        if (/^[\w가-힣-]+(\.[\w가-힣-]+)+/.test(linkUrl)) linkUrl = 'https://' + linkUrl; // 도메인만 입력한 경우 자동 보정
        else { window.showToast('링크 형식을 확인해 주세요.'); return; }
    }

    const color = document.querySelector('.color-opt.active')?.dataset.color || '#ffffff';
    const submitBtn = document.getElementById('submitPostBtn');
    const origBtnText = submitBtn ? submitBtn.textContent : '';

    isSubmitting = true;
    if (submitBtn) { submitBtn.dataset.busy = '1'; submitBtn.disabled = true; submitBtn.textContent = '게시 중…'; }

    try {
      if (currentEditId) {
        await update(ref(db, `boards/${currentBoardId}/posts/${currentEditId}`), { content, fileData: fileData, linkUrl, color });
      } else {
        const rand = (v, r) => v + (Math.random() * r * 2 - r);
        // 캔버스: 글이 쌓일수록 계단식으로 조금씩 어긋나게 배치해 겹침을 줄입니다
        const cascade = (Object.keys(allPostsData).length % 8) * 28;
        const newRef = await push(boardRef, {
          content, fileData: fileData, linkUrl, color,
          author:    myName,
          authorUid: currentUserUid,
          x:         rand(window.innerWidth  / 2 - 137 + cascade - 112, 12),
          y:         rand(window.innerHeight / 2 - 80 + cascade - 112,  12),
          columnId:  currentColId || null,
          createdAt: Date.now()
        });
        lastOwnPostId = newRef.key;
        window.writeDraft = { content: '', linkUrl: '', color: '#ffffff', fileData: null }; // 게시 성공 시 임시저장 비우기
      }
      update(metaRef, { updatedAt: Date.now() });
      window.closeModal('writeModal');
      if (lastOwnPostId && localPosts[lastOwnPostId]) markOwnPost(localPosts[lastOwnPostId]);
    } catch (e) {
      console.error(e);
      window.showToast('게시에 실패했어요. 연결을 확인하고 다시 시도해 주세요.'); // 모달을 닫지 않아 작성 내용이 유지됩니다
    } finally {
      isSubmitting = false;
      if (submitBtn) { submitBtn.dataset.busy = ''; submitBtn.textContent = origBtnText; window.refreshSubmitState(); }
    }
  };

  function markOwnPost(el) {
      if (!el) return;
      el.classList.remove('just-posted');
      void el.offsetWidth; // 애니메이션 재시작용
      el.classList.add('just-posted');
      if (window.currentLayout !== 'canvas') {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      }
      setTimeout(() => el.classList.remove('just-posted'), 2600);
  }

  window.deletePost = async id => {
      if (!canManagePost(allPostsData[id])) { window.showToast('본인 글만 삭제할 수 있어요.'); return; }
      const isConfirm = await window.customDialog('confirm', '포스트잇 삭제', '이 포스트잇을 삭제할까요?', '🗑️');
      if(isConfirm) remove(ref(db, `boards/${currentBoardId}/posts/${id}`));
  };
  
  window.toggleLike = async id => {
    const p = allPostsData[id];
    if (!p) return;
    const uid = currentUserUid || myDeviceId;

    if (typeof p.likes === 'number') {
        // 구형 숫자 카운터 형식: 이 기기의 기록(localStorage)으로 토글합니다
        try {
            if (likedPosts[id]) {
                await update(ref(db, `boards/${currentBoardId}/posts/${id}`), { likes: Math.max(0, p.likes - 1) });
                delete likedPosts[id];
                window.showToast('반응을 취소했어요.');
            } else {
                await update(ref(db, `boards/${currentBoardId}/posts/${id}`), { likes: p.likes + 1 });
                likedPosts[id] = true;
                animateLikeBtn(id);
            }
            try { localStorage.setItem('liked_posts', JSON.stringify(likedPosts)); } catch(e){}
        } catch (e) { console.error(e); window.showToast('반응 처리에 실패했어요.'); }
    } else {
        const likeRef = ref(db, `boards/${currentBoardId}/posts/${id}/likes/${uid}`);
        try {
            const snap = await get(likeRef);
            if (snap.exists()) {
                await remove(likeRef); // 다시 누르면 반응 취소
                window.showToast('반응을 취소했어요.');
            } else {
                await set(likeRef, true);
                animateLikeBtn(id);
            }
        } catch (e) { console.error(e); window.showToast('반응 처리에 실패했어요.'); }
    }
  };
  
  function animateLikeBtn(id) {
    const el = localPosts[id];
    if(el) {
        const btn = el.querySelector('.like-btn');
        btn.classList.add('liked');
        const icon = btn.querySelector('.like-icon');
        icon.style.transform = 'scale(1.6)'; 
        setTimeout(() => icon.style.transform = '', 200);
    }
  }
  
  window.addComment = (id, text, inputEl) => { push(ref(db, `boards/${currentBoardId}/posts/${id}/comments`), { author: myName, authorUid: currentUserUid, text, timestamp: Date.now() }); };

  window.deleteComment = (postId, commentId) => { remove(ref(db, `boards/${currentBoardId}/posts/${postId}/comments/${commentId}`)); };

  window.addColumn = async () => {
      const t = await window.customDialog('prompt', '섹션 추가', '새 섹션의 이름을 입력하세요.', '🏛️');
      if (t && t.trim()) push(columnsRef, { title: t.trim(), order: Date.now(), createdBy: currentUserUid });
  };
  window.renameColumn = (cid, v) => update(ref(db, `boards/${currentBoardId}/columns/${cid}`), { title: v });
  window.deleteColumn = async cid => { 
      const isConfirm = await window.customDialog('confirm', '섹션 삭제', '이 섹션을 삭제할까요?<br><span style="font-size:0.85rem;color:#888;">(안에 있는 게시물은 지워지지 않습니다)</span>', '🗑️');
      if (isConfirm) remove(ref(db, `boards/${currentBoardId}/columns/${cid}`)); 
  };
  window.clearBoard = async () => { 
      const isConfirm = await window.customDialog('confirm', '전체 삭제', '모든 게시물을 삭제합니다. 계속할까요?', '🚨');
      if (isConfirm) { remove(boardRef); window.closeSidebar(); window.showToast('삭제 완료'); } 
  };
  
  window.exitToLobby = async () => {
    const btn = document.querySelector('.nav-back'); btn.textContent = '⏳';
    try {
      if (window.location.protocol !== 'file:') {
          const canvasPromise = html2canvas(document.getElementById('board'), { scale: 0.3, useCORS: true, backgroundColor: document.body.style.backgroundColor || '#f9fafb' });
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
          const canvas = await Promise.race([canvasPromise, timeoutPromise]);
          await update(metaRef, { thumb: canvas.toDataURL('image/jpeg', 0.5), updatedAt: Date.now() });
      } else {
          await update(metaRef, { updatedAt: Date.now() }); 
      }
    } catch(e) { console.warn("썸네일 캡처 우회:", e); }
    window.location.href = window.location.href.split('?')[0].split('#')[0];
  };

  const dragState = { id: null, offsetX: 0, offsetY: 0, el: null, pointerId: null };
  const ptrPos = { x: 0, y: 0 }; 

  function updateDragElementPosition() {
      if (!dragState.el) return;
      const boardEl = document.getElementById('board');
      
      const x = ptrPos.x - dragState.offsetX - boardEl.getBoundingClientRect().left + boardEl.scrollLeft;
      const y = ptrPos.y - dragState.offsetY - boardEl.getBoundingClientRect().top + boardEl.scrollTop;
      
      dragState.el.style.left = x + 'px';
      dragState.el.style.top  = y + 'px';
      window.debouncedLayout(); 
  }

  function autoScrollLoop() {
      if (!dragState.id) return;
      
      const EDGE = 100; 
      const SPEED = 15; 
      let isScrolling = false;

      const boardEl = document.getElementById('board');
      const boardRect = boardEl.getBoundingClientRect();

      if (ptrPos.x > boardRect.right - EDGE) { boardEl.scrollLeft += SPEED; isScrolling = true; }
      else if (ptrPos.x < boardRect.left + EDGE) { boardEl.scrollLeft -= SPEED; isScrolling = true; }

      if (ptrPos.y > boardRect.bottom - EDGE) { boardEl.scrollTop += SPEED; isScrolling = true; }
      else if (ptrPos.y < boardRect.top + EDGE) { boardEl.scrollTop -= SPEED; isScrolling = true; }

      if (isScrolling) {
          updateDragElementPosition();
      }
      
      requestAnimationFrame(autoScrollLoop);
  }

  function startFreeDrag (e, id, el) {
    if (window.currentLayout !== 'canvas') return; 
    if (e.target.closest('.del, .edit, .like-btn, .comment-input, .post-link, .post-img, .post-file, .yt-thumb-wrap, a, button')) return;

    dragState.id = id; 
    dragState.el = el;
    dragState.pointerId = e.pointerId; 

    const rect = el.getBoundingClientRect();
    dragState.offsetX = e.clientX - rect.left;
    dragState.offsetY = e.clientY - rect.top;

    ptrPos.x = e.clientX;
    ptrPos.y = e.clientY;

    el.style.zIndex = '9999';
    el.classList.add('dragging');
    document.body.classList.add('is-dragging');

    try { el.setPointerCapture(dragState.pointerId); } catch(e){}

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp, { once: true });
    document.addEventListener('pointercancel', onUp, { once: true });

    requestAnimationFrame(autoScrollLoop);
  }
  
  function onMove (e) {
    if (!dragState.id) return; e.preventDefault();
    ptrPos.x = e.clientX;
    ptrPos.y = e.clientY;
    updateDragElementPosition();
  }
  
  function onUp (e) {
    if (!dragState.id) return;
    const el = dragState.el;
    
    const finalX = parseFloat(el.style.left) || 80;
    const finalY = parseFloat(el.style.top) || 80;
    update(ref(db, `boards/${currentBoardId}/posts/${dragState.id}`), { x: finalX, y: finalY });

    try { el.releasePointerCapture(e.pointerId); } catch(e){}
    
    el.classList.remove('dragging');
    el.style.zIndex = '';
    document.body.classList.remove('is-dragging');
    
    dragState.id = null; dragState.el = null;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointercancel', onUp);
  }

  function handleDragStart(e, id) {
      if(window.currentLayout === 'canvas') { e.preventDefault(); return; }
      if (e.target.closest('.del, .edit, .like-btn, .comment-input, .post-link, .post-img, .post-file, .yt-thumb-wrap, a, button')) { e.preventDefault(); return; }
      
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => { if(localPosts[id]) localPosts[id].classList.add('is-dragging-node'); }, 0); 
  }
  
  function handleDragEnd(e) {
      document.querySelectorAll('.post-it').forEach(el => el.classList.remove('is-dragging-node'));
  }
  
  function handleDropOnWall(e, targetId) {
      e.preventDefault(); e.stopPropagation();
      
      const draggedId = e.dataTransfer.getData('text/plain');
      if(!draggedId || draggedId === targetId) return;

      const targetPost = allPostsData[targetId];
      if(!targetPost) return;

      const targetEl = e.currentTarget;
      const rect = targetEl.getBoundingClientRect();
      const isBottomHalf = (e.clientY - rect.top) > (rect.height / 2);

      const order = document.getElementById('postOrderSelect').value;
      let newTime = targetPost.createdAt;
      const offset = 0.001; 

      if (order === 'top') {
          newTime += isBottomHalf ? -offset : offset;
      } else {
          newTime += isBottomHalf ? offset : -offset;
      }

      let updates = { createdAt: newTime };

      if(window.currentLayout === 'column') {
         const colWrap = targetEl.closest('.column-wrap');
         if (colWrap) {
             updates.columnId = colWrap.id.replace('col-', '');
         }
      }

      update(ref(db, `boards/${currentBoardId}/posts/${draggedId}`), updates);
      document.querySelectorAll('.post-it').forEach(el => el.classList.remove('is-dragging-node'));
  }
}