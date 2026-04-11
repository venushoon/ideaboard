/* ─────────────────────────────────────────────
   🌟 1. 전역 안전장치 및 유틸리티 
───────────────────────────────────────────── */
window.getInitials = name => (name || '?').charAt(0).toUpperCase();
window.escapeHtml  = str => str ? String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
window.applyMasonry = () => {}; 
window.updateCanvasSize = () => {}; 
window.currentLayout = 'canvas';

/* ── 2. UI 공통 전역 함수 ── */
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
window.showToast = msg => { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); };
window.openImageViewer = url => { document.getElementById('imageViewerImg').src = url; window.openModal('imageViewerModal'); };

/* ── 3. 공유 기능 및 이미지 캡처 ── */
window.copyLink = () => { navigator.clipboard.writeText(window.location.href).then(() => window.showToast("링크 복사 완료!")); window.closeModal('shareModal'); };
window.showQR = () => { document.getElementById('qrImg').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`; document.getElementById('qrContainer').style.display = 'block'; };

window.downloadImage = async () => {
    window.showToast("이미지 저장 중...");
    try {
        if (window.location.protocol === 'file:') window.showToast("로컬 환경에서는 일부 외부 이미지가 캡처되지 않을 수 있습니다.");
        const canvas = await html2canvas(document.getElementById('board'), { scale: 2, useCORS: true, backgroundColor: document.body.style.backgroundColor || '#f9fafb' });
        const link = document.createElement('a'); link.download = `아이디어보드_${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click(); window.closeModal('shareModal');
    } catch(e) { window.showToast("캡처 실패 (서버 환경 필요)"); }
};

window.downloadPDF = async () => {
  const tWrap = document.getElementById('pdfTextWrap'); const iWrap = document.getElementById('pdfIconWrap');
  const origText = tWrap.textContent; tWrap.textContent = '생성 중…'; iWrap.textContent = '⏳';
  try {
    if (window.location.protocol === 'file:') window.showToast("로컬 환경에서는 일부 외부 이미지가 PDF에 안 나올 수 있습니다.");
    const canvas = await html2canvas(document.getElementById('board'), { scale: 2, useCORS: true, backgroundColor: document.body.style.backgroundColor || '#f9fafb' });
    const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth(); const h = (canvas.height * w) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
    pdf.save(`아이디어보드_${Date.now()}.pdf`); window.showToast('PDF 저장 완료!'); window.closeModal('shareModal');
  } catch(e) { window.showToast('PDF 생성 실패'); } finally { tWrap.textContent = origText; iWrap.textContent = '📄'; }
};

/* ── 4. 파일 업로드 ── */
window.currentFileData = null; 
window.handleFileUpload = (event) => {
    const file = event.target.files[0];
    if(!file) return;
    if(file.size > 2 * 1024 * 1024) { alert("용량 제한: 2MB 이하만 업로드 가능합니다."); return; }
    
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
                document.getElementById('filePreviewFile').style.display = 'none';
                document.getElementById('filePreviewWrap').style.display = 'block';
            };
            img.src = e.target.result;
        } else {
            window.currentFileData = { url: e.target.result, name: file.name, isImage: false };
            document.getElementById('filePreviewImg').style.display = 'none';
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
// 5. Firebase 연동 및 핵심 비즈니스 로직
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
const MASTER_ADMIN_EMAIL = "kimsh1126@gmail.com"; // 마스터 관리자 이메일

let myName = '';
let likedPosts = {};
try {
    myName = localStorage.getItem('learner_name') || '';
    likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}');
} catch(e) { console.warn("태블릿 시크릿 모드: 로컬 저장소가 제한됨."); }

const hashParams = new URLSearchParams(window.location.hash.substring(1));
let currentBoardId = hashParams.get('board') || new URLSearchParams(window.location.search).get('board');

// 🌟 로그인 및 권한 관리 함수 (계정 선택 강제 옵션 추가!)
window.signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    // 👇 구글 로그인 시 무조건 계정 선택 창이 뜨도록 강제하는 옵션입니다!
    provider.setCustomParameters({ prompt: 'select_account' });
    
    signInWithPopup(auth, provider).catch(error => {
        console.error(error);
        window.showToast("로그인 실패: " + error.message);
    });
};

window.logout = () => {
    signOut(auth).then(() => {
        window.location.hash = ''; window.location.reload();
    });
};

window.enterWithCode = async () => {
    const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if(code.length < 4) { window.showToast("코드를 정확히 입력하세요."); return; }
    
    try {
        const snap = await get(ref(db, `room_codes/${code}`));
        if(snap.exists()) {
            window.location.hash = `board=${snap.val()}`; window.location.reload();
        } else {
            window.showToast("존재하지 않는 코드입니다.");
        }
    } catch (e) {
        window.showToast("오류가 발생했습니다. 다시 시도해주세요.");
    }
};

// 🌟 마스터 대시보드 로직
window.openMasterAdmin = async () => {
    window.openModal('adminModal');
    const listEl = document.getElementById('adminBoardList');
    listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">데이터를 불러오는 중...</td></tr>';

    try {
        const snap = await get(ref(db, 'board_meta'));
        const data = snap.val() || {};
        const boards = Object.keys(data).map(k => ({ id: k, ...data[k] })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        if(boards.length === 0) {
            listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">생성된 보드가 없습니다.</td></tr>';
            return;
        }

        let html = '';
        boards.forEach(b => {
            const title = window.escapeHtml(b.title || '이름 없음');
            const code = b.roomCode || '없음';
            const owner = b.ownerUid ? (b.ownerUid.substring(0, 8) + '...') : '알 수 없음';
            const isDeleted = b.deletedAt ? '<span style="color:red; font-size:0.8rem;">(휴지통)</span>' : '';
            
            html += `
                <tr>
                    <td><strong>${title}</strong> ${isDeleted}</td>
                    <td><span style="background:var(--primary-soft); color:var(--primary); padding:4px 8px; border-radius:6px; font-weight:bold;">${code}</span></td>
                    <td style="color:var(--ink-3); font-family:monospace;">${owner}</td>
                    <td><button class="btn-admin-del" onclick="window.forceDeleteBoard('${b.id}', '${code}')">강제 삭제</button></td>
                </tr>
            `;
        });
        listEl.innerHTML = html;
    } catch(e) {
        listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: red;">데이터를 불러오는 데 실패했습니다.</td></tr>';
    }
};

window.forceDeleteBoard = async (boardId, roomCode) => {
    if(confirm('이 보드를 서버에서 영구적으로 삭제하시겠습니까?\n이 작업은 절대 복구할 수 없습니다.')) {
        try {
            await remove(ref(db, `boards/${boardId}`));
            await remove(ref(db, `board_meta/${boardId}`));
            if(roomCode && roomCode !== '없음') {
                await remove(ref(db, `room_codes/${roomCode}`));
            }
            window.showToast('강제 삭제 완료');
            window.openMasterAdmin(); 
        } catch(e) {
            window.showToast('삭제 중 오류 발생');
        }
    }
};

// 인증 상태 감지
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        document.getElementById('userDisplayName').textContent = user.displayName || "선생님";
        
        if(user.email === MASTER_ADMIN_EMAIL) {
            const adminBtn = document.getElementById('adminBtn');
            if(adminBtn) adminBtn.style.display = 'block';
        }

        if(currentBoardId) initBoardApp(); 
        else initLobbyApp(); 
    } else {
        if(currentBoardId) {
            initBoardApp(); 
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

    window.openStorageManager = () => {
        document.getElementById('storageText').innerHTML = "용량을 계산해볼까요?";
        document.getElementById('calcBtn').style.display = 'inline-block';
        document.getElementById('cleanBtn').style.display = 'none';
        window.openModal('storageModal');
    };

    window.calculateStorage = async () => {
        const btn = document.getElementById('calcBtn');
        const txt = document.getElementById('storageText');
        btn.textContent = "계산 중...";
        btn.disabled = true;

        try {
            const snap = await get(ref(db, 'boards'));
            const boards = snap.val() || {};
            let totalBytes = 0; let fileCount = 0;

            Object.values(boards).forEach(board => {
                if(board.posts) {
                    Object.values(board.posts).forEach(post => {
                        if(post.fileData && post.fileData.url) {
                            totalBytes += post.fileData.url.length; fileCount++;
                        }
                    });
                }
            });

            const mb = (totalBytes / (1024 * 1024)).toFixed(2);
            txt.innerHTML = `첨부파일 <b style="color:var(--accent)">${fileCount}</b>개<br>추정 사용량: <b style="color:var(--accent)">${mb} MB</b> / 1024 MB`;
            btn.style.display = 'none';
            if(fileCount > 0) document.getElementById('cleanBtn').style.display = 'block';
        } catch(e) {
            txt.textContent = "오류가 발생했습니다.";
        } finally {
            btn.disabled = false; btn.textContent = "현재 첨부파일 사용량 계산하기";
        }
    };

    window.cleanUpFiles = async () => {
        if(!confirm("모든 보드의 첨부파일을 삭제하시겠습니까?\n(텍스트와 댓글은 유지됩니다)")) return;
        window.showToast("정리 중...");
        try {
            const snap = await get(ref(db, 'boards'));
            const boards = snap.val() || {};
            const updates = {};
            
            Object.keys(boards).forEach(boardId => {
                if(boards[boardId].posts) {
                    Object.keys(boards[boardId].posts).forEach(postId => {
                        if(boards[boardId].posts[postId].fileData) {
                            updates[`boards/${boardId}/posts/${postId}/fileData`] = null; 
                        }
                    });
                }
            });

            if(Object.keys(updates).length > 0) {
                await update(ref(db), updates);
                window.showToast("정리 완료!"); window.closeModal('storageModal');
            } else { window.showToast("삭제할 첨부파일이 없습니다."); }
        } catch(e) { window.showToast("오류 발생"); }
    };

    window.deleteBoard = (boardId, e) => {
        e.stopPropagation();
        if (confirm('이 보드를 휴지통으로 이동할까요? (15일 후 영구 삭제)')) {
            update(ref(db, `board_meta/${boardId}`), { deletedAt: Date.now() }); window.showToast('휴지통으로 이동됨');
        }
    };

    window.restoreBoard = (boardId, e) => {
        e.stopPropagation();
        update(ref(db, `board_meta/${boardId}`), { deletedAt: null }); window.showToast('복구됨');
    };

    window.hardDeleteBoard = (boardId, e) => {
        e.stopPropagation();
        if (confirm('영구 삭제하시겠습니까?')) {
            remove(ref(db, `boards/${boardId}`)); remove(ref(db, `board_meta/${boardId}`)); window.showToast('영구 삭제됨');
        }
    };

    onValue(ref(db, 'board_meta'), snap => {
        const data  = snap.val() || {}; 
        const grid  = document.getElementById('boardGrid');
        const trashGrid = document.getElementById('trashGrid');
        const trashSection = document.getElementById('trashSection');
        
        grid.innerHTML = ''; trashGrid.innerHTML = '';
        let hasTrash = false; const now = Date.now();
        
        // 내 보드 + 마스터 권한 필터링
        const myBoards = Object.keys(data)
            .map(k => ({ id: k, ...data[k] }))
            .filter(b => b.ownerUid === currentUserUid || (auth.currentUser && auth.currentUser.email === MASTER_ADMIN_EMAIL))
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        myBoards.forEach(b => {
          if (b.deletedAt) {
              if (now - b.deletedAt > 15 * 24 * 60 * 60 * 1000) {
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

    window.createBoardFromLobby = () => {
        const name = prompt('새 보드 이름:');
        if (name?.trim()) { 
            const newBoardId = push(ref(db, 'boards')).key; 
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase(); 
            
            set(ref(db, `board_meta/${newBoardId}`), {
                title: name.trim(), ownerUid: currentUserUid, roomCode: roomCode, updatedAt: Date.now()
            });
            set(ref(db, `room_codes/${roomCode}`), newBoardId);
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
      spacer.style.top = `${Math.max(...colHeights) + 80}px`; 
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

  window.addEventListener('resize', () => {
      if (window.currentLayout === 'wall') window.applyMasonry();
      else if (window.currentLayout === 'canvas') window.updateCanvasSize();
  });

  function ensureName () {
    if (myName) return; window.openModal('nameModal'); setTimeout(() => document.getElementById('nameInput').focus(), 100);
  }
  window.confirmName = () => {
    const v = document.getElementById('nameInput').value.trim();
    if (!v) return; myName = v; 
    try { localStorage.setItem('learner_name', myName); } catch(e) {}
    window.closeModal('nameModal');
  };
  ensureName();

  update(metaRef, { updatedAt: Date.now(), deletedAt: null });

  onValue(settingsRef, snap => {
    const s = snap.val() || {};
    const bTitle = s.title || `🤝 ${currentBoardId} 보드`;
    const bDesc = s.description || `설명이 없습니다.`;
    document.getElementById('boardTitleText').textContent = bTitle;
    
    onValue(metaRef, metaSnap => {
        const meta = metaSnap.val() || {};
        if (meta.roomCode) {
            const el = document.getElementById('displayRoomCode');
            if(el) el.textContent = meta.roomCode;
        }
    }, {onlyOnce: true});

    if(document.activeElement.id !== 'sbTitleInput') document.getElementById('sbTitleInput').value = bTitle;
    if(document.activeElement.id !== 'sbDescInput') document.getElementById('sbDescInput').value = bDesc;
    
    update(metaRef, { title: bTitle });

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

    if(layoutChanged) { renderColumns(); renderPostsOrder(); window.updateCanvasSize(); }
  });

  onValue(columnsRef, snap => {
    localColumnsData = snap.val() || {}; renderColumns(); renderPostsOrder();
  });

  onValue(boardRef, snap => {
    allPostsData = snap.val() || {};
    Object.keys(localPosts).forEach(id => { if (!allPostsData[id]) { localPosts[id].remove(); delete localPosts[id]; } });

    Object.keys(allPostsData).forEach(id => {
      const p = allPostsData[id]; let el = localPosts[id];
      if (!el) { el = createPostEl(id, p); localPosts[id] = el; placePost(el, p.columnId); }
      updatePostEl(el, id, p);
    });
    
    renderPostsOrder();
    if(window.currentLayout === 'canvas') window.updateCanvasSize();
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
          <span class="post-author" data-real="${p.author}">${isAnon ? '익명' : p.author}</span>
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
        <input class="comment-input" type="text" placeholder="댓글 달기…">
      </div>`;

    el.querySelector('.del').onclick  = e => { e.stopPropagation(); window.deletePost(id); };
    el.querySelector('.edit').onclick = e => { e.stopPropagation(); window.editPost(id); };
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
    let html = '';
    if(p.fileData) {
        if(p.fileData.isImage) html += `<img src="${p.fileData.url}" class="post-img" alt="첨부이미지" onload="if(window.applyMasonry) window.applyMasonry(); window.updateCanvasSize();" onclick="window.openImageViewer('${p.fileData.url}')">`;
        else html += `<a href="${p.fileData.url}" download="${p.fileData.name}" class="post-file">📁 ${p.fileData.name}</a>`;
    }
    
    if(p.linkUrl) {
        const ytId = window.getYoutubeId(p.linkUrl);
        if(ytId) {
            html += `<div class="yt-thumb-wrap" onclick="window.open('${p.linkUrl}', '_blank')"><img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" class="yt-thumb"><div class="yt-play-icon">▶</div></div>`;
        } else {
            html += `<a href="${p.linkUrl}" target="_blank" rel="noopener" class="post-link">🔗 참고 링크</a>`;
        }
    }

    html += `<div class="post-text">${window.escapeHtml(p.content || '')}</div>`;
    el.querySelector('.post-body-content').innerHTML = html;

    const liked = !!(likedPosts[id]);
    const likeBtn = el.querySelector('.like-btn');
    likeBtn.classList.toggle('liked', liked);
    el.querySelector('.like-count').textContent = p.likes || 0;

    const list = el.querySelector('.comment-list');
    let cHtml = '';
    if (p.comments) {
      const isAnon = document.getElementById('anonToggle').checked;
      Object.values(p.comments).sort((a,b) => a.timestamp - b.timestamp).forEach(c => {
        const name = isAnon ? '익명' : window.escapeHtml(c.author || '?');
        cHtml += `<div class="comment-item"><span class="c-author">${name}</span><span class="c-text">${window.escapeHtml(c.text)}</span></div>`;
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
      if (localColEls[cid]) {
        const inp = localColEls[cid].querySelector('.column-title-input');
        if (document.activeElement !== inp) inp.value = data.title || '';
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = 'column-wrap'; wrap.id = `col-${cid}`;
      
      wrap.innerHTML = `
        <div class="column-head">
          <input class="column-title-input" value="${window.escapeHtml(data.title||'')}" placeholder="섹션 이름" onchange="window.renameColumn('${cid}', this.value)">
          <button class="column-del-btn" onclick="window.deleteColumn('${cid}')" title="섹션 삭제">✕</button>
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

  function renderPostsOrder () {
    if(window.currentLayout === 'canvas') {
        Object.keys(localPosts).forEach(id => {
            const p = allPostsData[id];
            const el = localPosts[id];
            if (el.parentElement !== document.getElementById('board')) document.getElementById('board').appendChild(el);
            el.style.position = 'absolute';
            el.style.left = (p.x || 80) + 'px'; 
            el.style.top = (p.y || 80) + 'px';
            el.style.transform = '';
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
        setTimeout(window.applyMasonry, 50); 
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
  }

  function placePost (el, colId) {
    let target = document.getElementById('board');
    if (window.currentLayout === 'column') {
      const firstCid = Object.keys(localColumnsData)[0];
      const bodyId   = `colbody-${colId || firstCid}`;
      target = document.getElementById(bodyId) || target;
    }
    if (el.parentElement !== target) target.appendChild(el);
  }

  function reassignAllPosts () { Object.keys(localPosts).forEach(id => { if (allPostsData[id]) placePost(localPosts[id], allPostsData[id].columnId); }); }

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
  window.openWriteModal = (colId = null) => {
    if (!myName) { window.openModal('nameModal'); return; }
    currentColId  = colId; currentEditId = null; window.removeFile();
    document.getElementById('postInput').value    = '';
    document.getElementById('linkUrlInput').value = '';
    document.getElementById('writeModalTitle').textContent = '어떤 아이디어를 나눌까요?';
    document.querySelectorAll('.color-opt').forEach((d,i) => d.classList.toggle('active', i===0)); 
    window.openModal('writeModal');
    setTimeout(() => document.getElementById('postInput').focus(), 80);
  };

  window.editPost = id => {
    currentEditId = id; const p = allPostsData[id]; if (!p) return; window.removeFile();
    document.getElementById('postInput').value    = p.content || '';
    if(p.fileData) {
        window.currentFileData = p.fileData;
        if(p.fileData.isImage) {
            document.getElementById('filePreviewImg').src = p.fileData.url;
            document.getElementById('filePreviewImg').style.display = 'block';
            document.getElementById('filePreviewFile').style.display = 'none';
        } else {
            document.getElementById('filePreviewImg').style.display = 'none';
            document.getElementById('filePreviewFile').textContent = `📁 ${p.fileData.name}`;
            document.getElementById('filePreviewFile').style.display = 'block';
        }
        document.getElementById('filePreviewWrap').style.display = 'block';
    }
    document.getElementById('linkUrlInput').value = p.linkUrl  || '';
    document.getElementById('writeModalTitle').textContent = '게시물 수정';
    document.querySelectorAll('.color-opt').forEach(d => { d.classList.toggle('active', d.dataset.color === p.color); });
    window.openModal('writeModal');
  };

  window.submitPost = () => {
    if (!myName) { window.closeModal('writeModal'); window.openModal('nameModal'); return; }
    const content  = document.getElementById('postInput').value.trim();
    const linkUrl  = document.getElementById('linkUrlInput').value.trim();
    const fileData = window.currentFileData;
    if (!content && !fileData && !linkUrl) { window.showToast('내용, 첨부파일 또는 링크를 입력해 주세요.'); return; }

    const color = document.querySelector('.color-opt.active')?.dataset.color || '#ffffff';

    if (currentEditId) {
      update(ref(db, `boards/${currentBoardId}/posts/${currentEditId}`), { content, fileData: fileData, linkUrl, color });
    } else {
      const rand = (v, r) => v + (Math.random() * r * 2 - r);
      push(boardRef, {
        content, fileData: fileData, linkUrl, color,
        author:    myName,
        x:         rand(window.innerWidth  / 2 - 137, 40),
        y:         rand(window.innerHeight / 2 - 80,  40),
        likes:     0,
        columnId:  currentColId || null,
        createdAt: Date.now()
      });
    }
    update(metaRef, { updatedAt: Date.now() });
    window.closeModal('writeModal');
  };

  window.deletePost = id => { if (confirm('이 포스트잇을 삭제할까요?')) remove(ref(db, `boards/${currentBoardId}/posts/${id}`)); };
  
  window.toggleLike = id => {
    if (likedPosts[id]) { window.showToast('이미 반응을 남겼어요!'); return; }
    const el = localPosts[id];
    if(el) {
        const btn = el.querySelector('.like-btn');
        const countSpan = el.querySelector('.like-count');
        const currentCount = parseInt(countSpan.textContent) || 0;
        btn.classList.add('liked');
        countSpan.textContent = currentCount + 1;
        const icon = btn.querySelector('.like-icon');
        icon.style.transform = 'scale(1.6)'; 
        setTimeout(() => icon.style.transform = '', 200);
    }
    const cur = allPostsData[id]?.likes || 0;
    update(ref(db, `boards/${currentBoardId}/posts/${id}`), { likes: cur + 1 });
    likedPosts[id] = true; 
    try { localStorage.setItem('liked_posts', JSON.stringify(likedPosts)); } catch(e){}
  };
  
  window.addComment = (id, text, inputEl) => { push(ref(db, `boards/${currentBoardId}/posts/${id}/comments`), { author: myName, text, timestamp: Date.now() }); };

  window.addColumn = () => { const t = prompt('새 섹션 이름:'); if (t?.trim()) push(columnsRef, { title: t.trim(), order: Date.now() }); };
  window.renameColumn = (cid, v) => update(ref(db, `boards/${currentBoardId}/columns/${cid}`), { title: v });
  window.deleteColumn = cid => { if (confirm('이 섹션을 삭제할까요? (안에 있는 게시물은 지워지지 않습니다)')) remove(ref(db, `boards/${currentBoardId}/columns/${cid}`)); };
  window.clearBoard = () => { if (confirm('모든 게시물을 삭제합니다. 계속할까요?')) { remove(boardRef); window.closeSidebar(); window.showToast('삭제 완료'); } };
  
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
  let autoScrollRAF = null;
  const ptrPos = { x: 0, y: 0 }; 

  function updateDragElementPosition() {
      if (!dragState.el) return;
      const boardEl = document.getElementById('board');
      const boardRect = boardEl.getBoundingClientRect(); 
      
      const x = ptrPos.x - dragState.offsetX - boardRect.left + boardEl.scrollLeft;
      const y = ptrPos.y - dragState.offsetY - boardRect.top + boardEl.scrollTop;
      
      dragState.el.style.left = x + 'px';
      dragState.el.style.top  = y + 'px';
      window.updateCanvasSize(); 
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
      
      autoScrollRAF = requestAnimationFrame(autoScrollLoop);
  }

  function startFreeDrag (e, id, el) {
    if (window.currentLayout !== 'canvas') return; 
    if (e.target.closest('.delete-btn,.edit-btn,.like-btn,.comment-input,.post-link,.post-img,.post-file,.yt-thumb-wrap')) return;

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

    autoScrollRAF = requestAnimationFrame(autoScrollLoop);
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
    
    cancelAnimationFrame(autoScrollRAF);

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
      if (e.target.closest('.post-btn,.like-btn,.comment-input,.post-link,.post-img,.post-file,.yt-thumb-wrap')) { e.preventDefault(); return; }
      
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
