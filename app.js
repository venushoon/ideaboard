/* ─────────────────────────────────────────────
   🌟 1. 전역 안전장치 및 유틸리티 
───────────────────────────────────────────── */
window.getInitials = name => (name || '?').charAt(0).toUpperCase();
window.escapeHtml  = str => str ? String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
window.applyMasonry = () => {}; 
window.updateCanvasSize = () => {}; 
window.currentLayout = 'canvas';

/* ── 2. UI 공통 전역 함수 ── */
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
window.openSidebar = () => { document.getElementById('sbOverlay').classList.add('active'); document.getElementById('adminSidebar').classList.add('open'); };
window.closeSidebar = () => { document.getElementById('sbOverlay').classList.remove('active'); document.getElementById('adminSidebar').classList.remove('open'); };
window.openImageViewer = url => { document.getElementById('imageViewerImg').src = url; window.openModal('imageViewerModal'); };

window.copyLink = () => { navigator.clipboard.writeText(window.location.href).then(() => window.showToast("링크 복사 완료!")); window.closeModal('shareModal'); };
window.showQR = () => { document.getElementById('qrImg').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`; document.getElementById('qrContainer').style.display = 'block'; };

/* ── 3-1. 이미지 캡처 (최적화 적용) ── */
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
            scale: 1.5, // 용량 최적화 위해 2 -> 1.5 조정
            useCORS: true, 
            backgroundColor: document.body.style.backgroundColor || '#f9fafb'
        });
        
        if(window.currentLayout === 'canvas') {
            boardEl.style.minWidth = origWidth;
            boardEl.style.minHeight = origHeight;
        }

        const link = document.createElement('a');
        link.download = `아이디어보드_${Date.now()}.jpg`;
        // 용량 절감을 위해 PNG 대신 JPEG 사용 (품질 0.8)
        link.href = canvas.toDataURL('image/jpeg', 0.8);
        link.click();
        window.closeModal('shareModal');
    } catch(e) { window.showToast("이미지 저장 실패"); }
};

/* ── 🌟 3-2. 스마트 PDF 엔진 (세로형 + 핀터레스트 + 용량 최적화) ── */
window.downloadPDF = async () => {
    const tWrap = document.getElementById('pdfTextWrap'); const iWrap = document.getElementById('pdfIconWrap');
    const origText = tWrap.textContent; tWrap.textContent = '문서 최적화 중…'; iWrap.textContent = '⏳';
    
    try {
        const boardTitle = document.getElementById('boardTitleText').textContent;
        const posts = Array.from(document.querySelectorAll('.post-it'));
        if(posts.length === 0) { window.showToast("내보낼 내용이 없습니다."); return; }

        // 가상 컨테이너 생성 (A4 세로 기준 너비 설정)
        const pdfContainer = document.createElement('div');
        pdfContainer.style.cssText = 'position:absolute; top:-9999px; left:-9999px; width:800px; padding:40px; background:white;';
        document.body.appendChild(pdfContainer);

        const PAGE_MAX_HEIGHT = 1050; // A4 세로 비율에 맞춘 한계 높이
        let pageNum = 1;
        let currentPage = createPdfVerticalPage(boardTitle, pageNum);
        pdfContainer.appendChild(currentPage);
        
        // 핀터레스트 방식 배치를 위한 컬럼 2개 설정
        let leftCol = currentPage.querySelector('.col-left');
        let rightCol = currentPage.querySelector('.col-right');

        for (const post of posts) {
            const clone = post.cloneNode(true);
            // UI 정제
            const btns = clone.querySelector('.post-btns'); if(btns) btns.remove();
            const cInput = clone.querySelector('.comment-input'); if(cInput) cInput.remove();
            clone.style.cssText = 'position:relative; width:100%; margin-bottom:20px; break-inside:avoid; border:1px solid #eee;';

            // 더 짧은 컬럼을 찾아 배치 (Masonry 기본 원리)
            if (leftCol.offsetHeight <= rightCol.offsetHeight) {
                leftCol.appendChild(clone);
            } else {
                rightCol.appendChild(clone);
            }

            // 페이지 높이 초과 시 새 페이지 생성
            if (currentPage.offsetHeight > PAGE_MAX_HEIGHT) {
                const overItem = clone;
                overItem.remove(); // 방금 넣은 거 뺌
                
                pageNum++;
                currentPage = createPdfVerticalPage(boardTitle, pageNum);
                pdfContainer.appendChild(currentPage);
                leftCol = currentPage.querySelector('.col-left');
                rightCol = currentPage.querySelector('.col-right');
                
                leftCol.appendChild(overItem); // 새 페이지에 다시 배치
            }
        }

        // PDF 생성 (Orientation: 'p' for Portrait, Compress: true)
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        const pages = pdfContainer.querySelectorAll('.pdf-v-page');

        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], { scale: 1.5, useCORS: true });
            // 용량 최적화의 핵심: JPEG 압축 사용
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
        document.body.removeChild(pdfContainer);

    } catch(e) { console.error(e); window.showToast("PDF 생성 실패"); }
    finally { tWrap.textContent = origText; iWrap.textContent = '📄'; }
};

// A4 세로 핀터레스트 레이아웃 페이지 생성함수
function createPdfVerticalPage(title, num) {
    const page = document.createElement('div');
    page.className = 'pdf-v-page';
    page.style.cssText = 'width:720px; min-height:1000px; background:white; margin-bottom:50px; padding:20px;';
    page.innerHTML = `
        <div style="border-bottom:3px solid #333; padding-bottom:10px; margin-bottom:30px; display:flex; justify-content:space-between; align-items:center;">
            <h1 style="margin:0; font-size:24px;">${title}</h1>
            <span style="font-weight:bold; color:#666;">Page ${num}</span>
        </div>
        <div style="display:flex; gap:20px; align-items:flex-start;">
            <div class="col-left" style="flex:1; display:flex; flex-direction:column;"></div>
            <div class="col-right" style="flex:1; display:flex; flex-direction:column;"></div>
        </div>
    `;
    return page;
}

/* ── 4. 파일 업로드 ── */
window.currentFileData = null; 
window.handleFileUpload = (event) => {
    const file = event.target.files[0];
    if(!file) return;
    if(file.size > 2 * 1024 * 1024) { alert("2MB 이하 파일만 가능합니다."); return; }
    document.getElementById('fileNameDisplay').textContent = file.name;
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
                document.getElementById('filePreviewImg').src = window.currentFileData.url;
                document.getElementById('filePreviewImg').style.display = 'block';
                document.getElementById('filePreviewWrap').style.display = 'block';
            };
            img.src = e.target.result;
        } else {
            window.currentFileData = { url: e.target.result, name: file.name, isImage: false };
            document.getElementById('filePreviewFile').textContent = `📁 ${file.name}`;
            document.getElementById('filePreviewFile').style.display = 'block';
            document.getElementById('filePreviewWrap').style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
};
window.removeFile = () => {
    window.currentFileData = null; document.getElementById('fileInput').value = '';
    document.getElementById('fileNameDisplay').textContent = '선택된 파일 없음';
    document.getElementById('filePreviewWrap').style.display = 'none';
};
window.getYoutubeId = function(url) {
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
};

// ─────────────────────────────────────────────
// 5. Firebase 연동 및 하이브리드 로그인/마스터 관리 로직
// ─────────────────────────────────────────────
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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
    signInWithPopup(auth, provider).catch(error => { console.error(error); window.showToast("로그인 실패: " + error.message); });
};

window.logout = () => {
    signOut(auth).then(() => { window.location.hash = ''; window.location.reload(); });
};

window.withdrawAccount = async () => {
    if(!currentUserUid) return;
    if(!confirm("정말 탈퇴하시겠습니까?\n모든 데이터가 영구 파기됩니다.")) return;
    window.showToast("데이터 파기 중...");
    try {
        const snap = await get(ref(db, 'board_meta'));
        const allBoards = snap.val() || {};
        const myBoards = Object.keys(allBoards).filter(k => allBoards[k].ownerUid === currentUserUid);
        for (const boardId of myBoards) {
            const roomCode = allBoards[boardId].roomCode;
            await remove(ref(db, `boards/${boardId}`));
            await remove(ref(db, `board_meta/${boardId}`));
            if(roomCode) await remove(ref(db, `room_codes/${roomCode}`));
        }
        window.showToast("탈퇴 완료.");
        setTimeout(() => window.logout(), 1500);
    } catch(e) { window.showToast("오류 발생."); }
};

window.enterWithCode = async () => {
    const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if(code.length < 4) { window.showToast("코드를 정확히 입력하세요."); return; }
    try {
        const snap = await get(ref(db, `room_codes/${code}`));
        if(snap.exists()) { window.location.hash = `board=${snap.val()}`; window.location.reload(); } 
        else { window.showToast("존재하지 않는 코드입니다."); }
    } catch (e) { window.showToast("오류 발생."); }
};

window.openMasterAdmin = async () => {
    window.openModal('adminModal');
    const listEl = document.getElementById('adminBoardList');
    listEl.innerHTML = '<tr><td colspan="4" style="text-align:center;">데이터 로딩 중...</td></tr>';
    try {
        const snap = await get(ref(db, 'board_meta'));
        const data = snap.val() || {};
        const boards = Object.keys(data).map(k => ({ id: k, ...data[k] })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        if(boards.length === 0) { listEl.innerHTML = '<tr><td colspan="4">보드가 없습니다.</td></tr>'; return; }
        let html = '';
        boards.forEach(b => {
            const title = window.escapeHtml(b.title || '이름 없음');
            const code = b.roomCode || '없음';
            const owner = b.ownerUid ? (b.ownerUid.substring(0, 8) + '...') : '알 수 없음';
            html += `<tr>
                <td><a href="#board=${b.id}" class="admin-board-link" onclick="window.closeModal('adminModal'); setTimeout(()=>window.location.reload(), 50);"><strong>${title}</strong></a></td>
                <td><span>${code}</span></td>
                <td>${owner}</td>
                <td><button class="btn-admin-del" onclick="window.forceDeleteBoard('${b.id}', '${code}')">삭제</button></td>
            </tr>`;
        });
        listEl.innerHTML = html;
    } catch(e) { listEl.innerHTML = '<tr><td colspan="4">로딩 실패</td></tr>'; }
};

window.forceDeleteBoard = async (boardId, roomCode) => {
    if(confirm('이 보드를 영구 삭제하시겠습니까?')) {
        try {
            await remove(ref(db, `boards/${boardId}`));
            await remove(ref(db, `board_meta/${boardId}`));
            if(roomCode && roomCode !== '없음') await remove(ref(db, `room_codes/${roomCode}`));
            window.showToast('삭제 완료'); window.openMasterAdmin(); 
        } catch(e) { window.showToast('오류 발생'); }
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        myName = user.displayName || "선생님";
        try { localStorage.setItem('learner_name', myName); } catch(e) {}
        document.getElementById('userDisplayName').textContent = myName;
        document.getElementById('withdrawBtn').style.display = 'block'; 
        if(user.email === MASTER_ADMIN_EMAIL) document.getElementById('adminBtn').style.display = 'block';
        if(currentBoardId) initBoardApp(); else initLobbyApp(); 
    } else {
        document.getElementById('withdrawBtn').style.display = 'none';
        if(currentBoardId) initBoardApp(); 
        else {
            document.getElementById('loginView').style.display = 'flex';
            document.getElementById('lobbyView').style.display = 'none';
            document.getElementById('appView').style.display = 'none';
        }
    }
});

function initLobbyApp() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('appView').style.display  = 'none';
    document.getElementById('lobbyView').style.display = 'flex';

    window.openStorageManager = () => {
        document.getElementById('storageText').innerHTML = "용량을 계산해볼까요?";
        document.getElementById('calcBtn').style.display = 'inline-block';
        window.openModal('storageModal');
    };

    window.calculateStorage = async () => {
        const btn = document.getElementById('calcBtn');
        btn.textContent = "계산 중..."; btn.disabled = true;
        try {
            const snap = await get(ref(db, 'boards'));
            const boards = snap.val() || {};
            let bytes = 0; let count = 0;
            Object.values(boards).forEach(b => {
                if(b.posts) Object.values(b.posts).forEach(p => { if(p.fileData) { bytes += p.fileData.url.length; count++; }});
            });
            const mb = (bytes / (1024 * 1024)).toFixed(2);
            document.getElementById('storageText').innerHTML = `첨부파일: ${count}개 / 사용량: ${mb}MB`;
            btn.style.display = 'none';
            if(count > 0) document.getElementById('cleanBtn').style.display = 'block';
        } catch(e) { window.showToast("오류 발생"); }
        finally { btn.disabled = false; btn.textContent = "계산하기"; }
    };

    window.cleanUpFiles = async () => {
        if(!confirm("모든 사진을 삭제하시겠습니까?")) return;
        try {
            const snap = await get(ref(db, 'boards'));
            const boards = snap.val() || {};
            const updates = {};
            Object.keys(boards).forEach(bid => {
                if(boards[bid].posts) Object.keys(boards[bid].posts).forEach(pid => { if(boards[bid].posts[pid].fileData) updates[`boards/${bid}/posts/${pid}/fileData`] = null; });
            });
            await update(ref(db), updates); window.showToast("정리 완료!"); window.closeModal('storageModal');
        } catch(e) { window.showToast("오류 발생"); }
    };

    onValue(ref(db, 'board_meta'), snap => {
        const data  = snap.val() || {}; 
        const grid  = document.getElementById('boardGrid');
        const trashGrid = document.getElementById('trashGrid');
        grid.innerHTML = ''; trashGrid.innerHTML = '';
        let hasTrash = false;
        const myBoards = Object.keys(data).map(k => ({ id: k, ...data[k] })).filter(b => b.ownerUid === currentUserUid).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        myBoards.forEach(b => {
          if (b.deletedAt) {
              if (Date.now() - b.deletedAt > 15*86400000) { remove(ref(db, `boards/${b.id}`)); remove(ref(db, `board_meta/${b.id}`)); return; }
              hasTrash = true;
              const card = document.createElement('div'); card.className = 'board-card trash-card';
              card.innerHTML = `<div style="padding:16px;"><h3>🗑️ ${window.escapeHtml(b.title)}</h3></div><div class="trash-actions"><button class="btn-restore" onclick="window.restoreBoard('${b.id}', event)">복구</button></div>`;
              trashGrid.appendChild(card);
          } else {
              const card = document.createElement('div'); card.className = 'board-card';
              const thumb = b.thumb ? `<img src="${b.thumb}" class="board-thumb">` : `<div class="board-thumb-empty">📝</div>`;
              card.innerHTML = `${thumb}<button class="board-delete-btn" onclick="window.deleteBoard('${b.id}', event)">🗑️</button><div class="board-info"><h3>${window.escapeHtml(b.title)}</h3></div>`;
              card.onclick = () => { window.location.hash = `board=${b.id}`; window.location.reload(); };
              grid.appendChild(card);
          }
        });
        document.getElementById('trashSection').style.display = hasTrash ? 'block' : 'none';
    });

    window.createBoardFromLobby = () => {
        const name = prompt('새 보드 이름:');
        if (name?.trim()) { 
            const bid = push(ref(db, 'boards')).key; 
            const code = Math.random().toString(36).substring(2, 8).toUpperCase(); 
            set(ref(db, `board_meta/${bid}`), { title: name.trim(), ownerUid: currentUserUid, roomCode: code, updatedAt: Date.now() });
            set(ref(db, `room_codes/${code}`), bid);
            window.location.hash = `board=${bid}`; window.location.reload(); 
        }
    };
}

function initBoardApp() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('lobbyView').style.display = 'none';
  document.getElementById('appView').style.display   = 'flex';

  const boardRef    = ref(db, `boards/${currentBoardId}/posts`);
  const settingsRef = ref(db, `boards/${currentBoardId}/settings`);
  const metaRef     = ref(db, `board_meta/${currentBoardId}`);

  let reactionType   = 'like'; 
  let currentColId   = null;   
  let currentEditId  = null;
  let allPostsData   = {};
  let localPosts     = {};     

  window.updateCanvasSize = () => {
      if (window.currentLayout !== 'canvas') return;
      let maxX = window.innerWidth; let maxY = window.innerHeight;
      Object.values(allPostsData).forEach(p => { if (p.x+350 > maxX) maxX = p.x+350; if (p.y+350 > maxY) maxY = p.y+350; });
      const b = document.getElementById('board');
      let s = document.getElementById('canvas-spacer');
      if (!s) { s = document.createElement('div'); s.id = 'canvas-spacer'; s.style.cssText = 'position:absolute;width:1px;height:1px;visibility:hidden;'; b.appendChild(s); }
      s.style.left = maxX + 'px'; s.style.top = maxY + 'px';
  };

  onValue(settingsRef, snap => {
    const s = snap.val() || {};
    document.getElementById('boardTitleText').textContent = s.title || "아이디어 보드";
    onValue(metaRef, ms => { if(ms.val()?.roomCode) document.getElementById('displayRoomCode').textContent = ms.val().roomCode; }, {onlyOnce: true});
    window.currentLayout = s.layout || 'canvas';
    document.getElementById('board').setAttribute('data-layout', window.currentLayout);
    if(window.currentLayout === 'canvas') window.updateCanvasSize();
  });

  onValue(boardRef, snap => {
    allPostsData = snap.val() || {};
    Object.keys(localPosts).forEach(id => { if (!allPostsData[id]) { localPosts[id].remove(); delete localPosts[id]; } });
    Object.keys(allPostsData).forEach(id => {
      const p = allPostsData[id]; let el = localPosts[id];
      if (!el) { el = createPostEl(id, p); localPosts[id] = el; document.getElementById('board').appendChild(el); }
      el.style.backgroundColor = p.color || '#fff';
      el.style.left = (p.x || 80) + 'px'; el.style.top = (p.y || 80) + 'px';
      let html = '';
      if(p.fileData) html += `<img src="${p.fileData.url}" style="width:100%; border-radius:8px; margin-bottom:10px;">`;
      html += `<div style="word-break:break-all;">${window.escapeHtml(p.content)}</div><div style="font-size:0.8rem; margin-top:10px; color:#888;">by ${window.escapeHtml(p.author)}</div>`;
      el.querySelector('.post-body-content').innerHTML = html;
    });
    if(window.currentLayout === 'canvas') window.updateCanvasSize();
  });

  function createPostEl (id, p) {
    const el = document.createElement('div');
    el.className = 'post-it'; el.id = id;
    el.innerHTML = `<div class="post-top" style="display:flex; justify-content:flex-end; padding:5px;"><button class="del">✕</button></div><div class="post-body-content" style="padding:10px;"></div>`;
    el.querySelector('.del').onclick = () => remove(ref(db, `boards/${currentBoardId}/posts/${id}`));
    el.addEventListener('pointerdown', e => startFreeDrag(e, id, el));
    return el;
  }

  const dragState = { id: null, offsetX: 0, offsetY: 0, el: null, pointerId: null };
  const ptrPos = { x: 0, y: 0 };
  function startFreeDrag (e, id, el) {
    if (window.currentLayout !== 'canvas' || e.target.closest('button')) return;
    dragState.id = id; dragState.el = el; dragState.pointerId = e.pointerId;
    const r = el.getBoundingClientRect();
    dragState.offsetX = e.clientX - r.left; dragState.offsetY = e.clientY - r.top;
    el.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, {once:true});
  }
  function onMove (e) {
    if (!dragState.id) return;
    const x = e.clientX - dragState.offsetX + document.getElementById('board').scrollLeft;
    const y = e.clientY - dragState.offsetY + document.getElementById('board').scrollTop;
    dragState.el.style.left = x + 'px'; dragState.el.style.top = y + 'px';
    window.updateCanvasSize();
  }
  function onUp (e) {
    if (!dragState.id) return;
    update(ref(db, `boards/${currentBoardId}/posts/${dragState.id}`), { x: parseFloat(dragState.el.style.left), y: parseFloat(dragState.el.style.top) });
    document.removeEventListener('pointermove', onMove);
    dragState.id = null;
  }

  window.openWriteModal = () => {
      const txt = prompt("아이디어를 입력하세요:");
      if(txt?.trim()) {
          push(boardRef, { content: txt.trim(), author: myName, x: 100, y: 100, createdAt: Date.now() });
      }
  };
  
  window.exitToLobby = () => { window.location.hash = ''; window.location.reload(); };
}
