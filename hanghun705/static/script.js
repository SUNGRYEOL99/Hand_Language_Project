const state = {
    uploadedFile: { fileId: null, filename: null },
    currentTaskId: null,
    inputType: 'file',
    webcamStream: null,
    mediaRecorder: null,
    recordedChunks: [],
    recordedBlob: null,
    eventSource: null,
    showKeypoints: false,
};

const elements = {
    // 화면 요소
    introScreen: document.getElementById('intro-screen'),
    translationApp: document.getElementById('translation-app'),
    dictionaryApp: document.getElementById('dictionary-app'),
    gameApp: document.getElementById('game-app'),

    // 카드 메뉴
    cardTranslate: document.getElementById('card-translate'),
    cardDictionary: document.getElementById('card-dictionary'),
    cardGame: document.getElementById('card-game'),

    // 번역 앱
    btnModeFile: document.getElementById('btn-mode-file'),
    btnModeCam: document.getElementById('btn-mode-cam'),
    modeFileArea: document.getElementById('mode-file-area'),
    modeCamArea: document.getElementById('mode-cam-area'),
    dropArea: document.getElementById('drop-area'),
    fileInput: document.getElementById('video-file-input'),
    statusText: document.querySelector('.status-text span'),
    videoPreview: document.getElementById('cam-preview'),
    btnStartRecord: document.getElementById('btn-start-record'),
    btnStopRecord: document.getElementById('btn-stop-record'),
    recIndicator: document.getElementById('recording-indicator'),
    camStatusText: document.getElementById('cam-status-text'),
    uploadButton: document.getElementById('upload-select-btn'),
    uploadStartButton: document.getElementById('upload-start-btn'),
    fileStatusBox: document.getElementById('file-status-box'),
    
    // 번역 진행
    stepContents: {
        1: document.getElementById('step-1-content'),
        2: document.getElementById('step-2-content'),
        3: document.getElementById('step-3-content'),
    },
    stepperNavItems: {
        1: document.getElementById('step-1'),
        2: document.getElementById('step-2'),
        3: document.getElementById('step-3'),
    },
    progressBar: document.getElementById('progress-bar'),
    progressMessage: document.getElementById('progress-message'),

    // 번역 결과
    resultWord: document.getElementById('result-word'),
    resultVideoPlayer: document.getElementById('result-video-player'), // <video> 태그
    resultVideoPlaceholder: document.getElementById('result-video-placeholder'), // Placeholder
    keypointToggle: document.getElementById('keypoint-toggle'),

    // 사전 앱
    dictSearchInput: document.getElementById('dict-search-input'),
    dictSearchBtn: document.getElementById('dict-search-btn'),
    dictResultList: document.getElementById('dict-result-list'),
    dictVideoArea: document.getElementById('dict-video-area'),
    dictVideoPlayer: document.getElementById('dict-video-player'), // <video> 태그
    dictVideoPlaceholder: document.getElementById('dict-video-placeholder'), // Placeholder
    dictPlayingWord: document.getElementById('dict-playing-word'),
};

// --- 유틸리티 함수 ---

/**
 * 사용자에게 알림 메시지를 표시합니다. (alert 대신)
 * @param {string} message 표시할 메시지
 * @param {'success'|'error'} type 메시지 유형
 */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="icon">${type === 'success' ? '✔' : '❌'}</span>
        ${message}
    `;
    toastContainer.appendChild(toast);

    // 3초 후 토스트 제거
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showError(message) {
    showToast(message, 'error');
}

// --- 화면 전환 및 초기화 로직 ---

/**
 * 화면 전환 함수
 * @param {'intro'|'translation'|'dictionary'|'game'} appName 
 */
function navigateTo(appName) {
    elements.introScreen.classList.add('hidden');
    elements.translationApp.classList.add('hidden');
    elements.dictionaryApp.classList.add('hidden');
    elements.gameApp.classList.add('hidden');

    switch (appName) {
        case 'intro':
            elements.introScreen.classList.remove('hidden');
            break;
        case 'translation':
            elements.translationApp.classList.remove('hidden');
            // 번역 앱 진입 시 1단계로 강제 이동
            setStep(1);
            break;
        case 'dictionary':
            elements.dictionaryApp.classList.remove('hidden');
            break;
        case 'game':
            elements.gameApp.classList.remove('hidden');
            break;
    }
}

/**
 * 메인 화면으로 돌아가기 (초기 상태로 리셋)
 */
function goHome() {
    navigateTo('intro');
    // 상태 초기화
    state.uploadedFile = { fileId: null, filename: null };
    state.currentTaskId = null;
    state.recordedBlob = null;
    if (state.eventSource) {
        state.eventSource.close();
        state.eventSource = null;
    }
    
    // UI 초기화
    elements.fileInput.value = '';
    elements.fileStatusBox.classList.add('hidden');
    elements.uploadStartButton.disabled = false;
    elements.keypointToggle.checked = false;
    
    // 동영상 플레이어 숨기기
    elements.resultVideoPlayer.classList.add('hidden');
    elements.resultVideoPlaceholder.classList.remove('hidden');
    elements.dictVideoPlayer.classList.add('hidden');
    elements.dictVideoPlaceholder.classList.remove('hidden');
    elements.dictVideoArea.classList.add('hidden');
}
window.goHome = goHome; // HTML에서 호출 가능하도록 전역 노출

// --- 번역 앱 스텝 로직 ---

/**
 * 번역 프로세스 단계를 설정합니다.
 * @param {1|2|3} stepNumber 
 */
function setStep(stepNumber) {
    Object.keys(elements.stepContents).forEach(key => {
        const step = parseInt(key);
        elements.stepContents[step].classList.add('hidden');
        elements.stepperNavItems[step].classList.remove('active');
    });

    elements.stepContents[stepNumber].classList.remove('hidden');
    elements.stepperNavItems[stepNumber].classList.add('active');
    
    // 2단계 (진행) 진입 시 프로그레스 바 초기화
    if (stepNumber === 2) {
        elements.progressBar.style.width = '0%';
        elements.progressMessage.textContent = '작업 대기 중...';
    }
    // 3단계 (결과) 진입 시 동영상 플레이어 준비
    if (stepNumber === 3) {
        // 결과 확인 시 토글 상태에 따라 영상 URL 설정 (현재는 항상 annotated)
        const player = elements.resultVideoPlayer;
        const initialUrl = elements.keypointToggle.checked ? player.dataset.annotatedUrl : player.dataset.originalUrl;
        
        loadAndPlayVideo(player, elements.resultVideoPlaceholder, initialUrl);
    }
}

// --- 파일/녹화 로직 ---

function toggleInputMode(mode) {
    state.inputType = mode;
    elements.btnModeFile.classList.remove('active');
    elements.btnModeCam.classList.remove('active');
    elements.modeFileArea.classList.add('hidden');
    elements.modeCamArea.classList.add('hidden');

    if (mode === 'file') {
        elements.btnModeFile.classList.add('active');
        elements.modeFileArea.classList.remove('hidden');
        stopWebcamStream(); // 웹캠 모드에서 파일 모드로 전환 시 스트림 중지
    } else if (mode === 'cam') {
        elements.btnModeCam.classList.add('active');
        elements.modeCamArea.classList.remove('hidden');
        startWebcamStream(); // 파일 모드에서 웹캠 모드로 전환 시 스트림 시작
    }
}

// 드래그 앤 드롭 및 파일 선택 처리
function handleFileSelect(file) {
    if (file && file.type.startsWith('video/')) {
        // 임시로 파일 정보를 저장
        // 실제 업로드는 "번역 시작" 버튼 클릭 시 일어남 (로직 변경)
        state.uploadedFile = { file: file, filename: file.name };
        elements.statusText.textContent = file.name;
        elements.fileStatusBox.classList.remove('hidden');
        showToast(`파일 준비 완료: ${file.name}`);
    } else {
        showError('유효한 동영상 파일이 아닙니다.');
        elements.fileStatusBox.classList.add('hidden');
    }
}


// --- 웹캠 로직 (생략 - 핵심은 아님) ---

function startWebcamStream() {
    elements.camStatusText.textContent = '웹캠 로드 중...';
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            state.webcamStream = stream;
            elements.videoPreview.srcObject = stream;
            elements.videoPreview.classList.remove('hidden');
            elements.camPlaceholder.classList.add('hidden');
            elements.camStatusText.textContent = '녹화 준비 완료';
            elements.btnStartRecord.disabled = false;
        })
        .catch(err => {
            console.error("Webcam access error:", err);
            elements.camStatusText.textContent = '웹캠 접근 실패. 권한을 확인해주세요.';
            showError('웹캠 접근 권한이 필요합니다.');
        });
}

function stopWebcamStream() {
    if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(track => track.stop());
        state.webcamStream = null;
    }
    elements.videoPreview.classList.add('hidden');
    elements.camPlaceholder.classList.remove('hidden');
    elements.camPlaceholder.textContent = '웹캠을 로드 중입니다...';
    elements.btnStartRecord.disabled = true;
    elements.btnStartRecord.classList.remove('hidden');
    elements.btnStopRecord.classList.add('hidden');
    elements.recIndicator.classList.add('hidden');
}

function startRecording() {
    if (!state.webcamStream) return;
    state.recordedChunks = [];
    state.mediaRecorder = new MediaRecorder(state.webcamStream);
    
    state.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            state.recordedChunks.push(event.data);
        }
    };
    
    state.mediaRecorder.onstop = () => {
        state.recordedBlob = new Blob(state.recordedChunks, { type: 'video/mp4' });
        // 녹화된 Blob을 state.uploadedFile에 설정하여 파일 업로드와 동일하게 처리
        state.uploadedFile = { file: state.recordedBlob, filename: `recorded-${Date.now()}.mp4` };
        
        // Step 1 UI를 파일 업로드 모드로 전환하고, 파일 상태 박스를 표시
        toggleInputMode('file');
        elements.statusText.textContent = state.uploadedFile.filename;
        elements.fileStatusBox.classList.remove('hidden');
        showToast('녹화 완료. 번역 시작 버튼을 눌러주세요.');
    };
    
    state.mediaRecorder.start();
    elements.btnStartRecord.classList.add('hidden');
    elements.btnStopRecord.classList.remove('hidden');
    elements.recIndicator.classList.remove('hidden');
    elements.camStatusText.textContent = '🔴 녹화 중... (최대 10초)';
    
    // 10초 후 자동 중지
    setTimeout(() => {
        if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
            stopRecording();
        }
    }, 10000);
}

function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.stop();
    }
    elements.btnStartRecord.classList.remove('hidden');
    elements.btnStopRecord.classList.add('hidden');
    elements.recIndicator.classList.add('hidden');
    elements.camStatusText.textContent = '녹화 완료. 파일 업로드 준비됨.';
}


// --- 번역 API 로직 ---

/**
 * 1단계: 파일 서버에 업로드
 */
async function uploadVideoToServer() {
    if (!state.uploadedFile || !state.uploadedFile.file) {
        showError('업로드할 동영상 파일을 선택해주세요.');
        return;
    }
    
    setStep(2); // 2단계(진행)로 전환
    elements.uploadStartButton.disabled = true;

    const formData = new FormData();
    formData.append('file', state.uploadedFile.file, state.uploadedFile.filename);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();

        if (data.success) {
            state.uploadedFile.fileId = data.file_id;
            showToast('파일 업로드 성공. 번역을 시작합니다.');
            startTranslationProcess(data.file_id);
        } else {
            showError(`업로드 실패: ${data.error}`);
            setStep(1); // 실패 시 1단계로 복귀
        }
    } catch (e) {
        console.error('Upload Error:', e);
        showError('서버에 파일 업로드 중 오류가 발생했습니다.');
        setStep(1); // 실패 시 1단계로 복귀
    }
}


/**
 * 2단계: 번역 작업 시작 API 호출 및 task_id 받기
 * @param {string} fileId 
 */
async function startTranslationProcess(fileId) {
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ file_id: fileId }),
        });
        const data = await response.json();

        if (data.success) {
            state.currentTaskId = data.task_id;
            monitorTranslationProgress(data.task_id);
        } else {
            showError(`번역 시작 실패: ${data.error}`);
            setStep(1);
        }
    } catch (e) {
        console.error('Translation Start Error:', e);
        showError('번역 작업을 시작하는 데 오류가 발생했습니다.');
        setStep(1);
    }
}


/**
 * 3단계: SSE로 번역 진행 상황 모니터링
 * @param {string} taskId 
 */
function monitorTranslationProgress(taskId) {
    if (state.eventSource) {
        state.eventSource.close();
    }
    
    // SSE 연결
    state.eventSource = new EventSource(`/api/translate/progress/${taskId}`);
    
    state.eventSource.onopen = (e) => {
        console.log("SSE Connection opened.");
        elements.progressMessage.textContent = '서버 연결 완료. 작업 대기 중...';
    };
    
    state.eventSource.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        elements.progressBar.style.width = `${data.progress}%`;
        elements.progressMessage.textContent = data.message;
        console.log(`Progress: ${data.progress}% - ${data.message}`);
    });
    
    state.eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data);
        elements.progressBar.style.width = '100%';
        elements.progressMessage.textContent = `✅ 번역 완료: ${data.word}`;
        
        // API 명세에 따라 annotated_video_url을 task_id로 대체 (서버에서 URL을 직접 생성하지 않음)
        // task_id를 사용해 클라이언트에서 /api/video/.../{task_id} URL을 생성
        showTranslationResult(data.word, data.task_id);
        
        // 연결 종료
        state.eventSource.close();
        state.eventSource = null;
    });
    
    state.eventSource.addEventListener('error', (event) => {
        console.error("SSE Error:", event);
        showError('번역 중 오류가 발생했습니다.');
        elements.progressMessage.textContent = '❌ 오류 발생. 작업을 중단합니다.';
        if (state.eventSource) {
            state.eventSource.close();
            state.eventSource = null;
        }
        setTimeout(() => setStep(1), 3000); // 3초 후 1단계로 복귀
    });
}

/**
 * 4단계: 번역 결과 표시 및 동영상 재생 준비
 * @param {string} word 인식된 수어 단어
 * @param {string} taskId 번역 작업 ID (동영상 URL 생성을 위해 사용)
 */
function showTranslationResult(word, taskId) {
    elements.resultWord.textContent = word;
    
    // 결과 동영상 URL을 비디오 플레이어의 data-속성에 설정 (원본 및 주석 영상)
    const annotatedUrl = `/api/video/annotated/${taskId}`;
    const originalUrl = `/api/video/original/${taskId}`;
    
    elements.resultVideoPlayer.dataset.annotatedUrl = annotatedUrl;
    elements.resultVideoPlayer.dataset.originalUrl = originalUrl;
    
    // 3단계(결과 확인)로 전환. (setStep에서 동영상 로드/재생 처리)
    setStep(3);
}

/**
 * 동영상 플레이어에 URL을 로드하고 재생합니다.
 * @param {HTMLVideoElement} videoPlayer 
 * @param {HTMLElement} placeholder 
 * @param {string} videoUrl 
 */
function loadAndPlayVideo(videoPlayer, placeholder, videoUrl) {
    if (videoUrl) {
        console.log("Loading video URL:", videoUrl);
        videoPlayer.src = videoUrl;
        videoPlayer.classList.remove('hidden');
        placeholder.classList.add('hidden');
        videoPlayer.load(); // 새로운 소스를 로드
        
        // play() 호출은 promise를 반환하므로 catch를 사용하여 자동 재생 실패 처리
        videoPlayer.play().catch(e => {
            // 자동 재생 실패 시 (브라우저 정책)
            console.warn("Autoplay failed:", e);
            showToast("영상 재생이 시작되지 않았습니다. 재생 버튼을 눌러주세요.", 'error');
        });
    } else {
        console.log("Video URL is null or empty. Hiding player.");
        videoPlayer.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

// --- 사전 검색 로직 ---

async function searchDictionary() {
    const query = elements.dictSearchInput.value.trim();
    if (query.length < 1) {
        showError("검색어를 입력해주세요.");
        return;
    }

    elements.dictSearchBtn.disabled = true;
    elements.dictResultList.innerHTML = '<div class="empty-state">검색 중...</div>';
    // 사전 영상 초기화
    elements.dictVideoArea.classList.add('hidden');
    elements.dictVideoPlayer.classList.add('hidden');
    elements.dictVideoPlaceholder.classList.remove('hidden');

    try {
        const res = await fetch('/api/search', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        renderSearchResults(data.results);
    } catch (e) {
        showError("검색 중 오류가 발생했습니다.");
    } finally {
        elements.dictSearchBtn.disabled = false;
    }
}

function renderSearchResults(results) {
    elements.dictResultList.innerHTML = '';
    if (results.length === 0) {
        elements.dictResultList.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }

    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <span class="result-word">${item.word}</span>
            <span class="play-icon-btn">▶</span>
        `;
        // 클라이언트에서 동영상 URL을 요청하도록 API 주소를 직접 전달
        // item.video_url은 /api/video/dictionary/{word_id} 형태로 가정
        div.addEventListener('click', (event) => {
            // 모든 결과 항목에서 playing 클래스 제거
            document.querySelectorAll('.result-item').forEach(el => el.classList.remove('playing'));
            // 클릭된 항목에 playing 클래스 추가
            event.currentTarget.classList.add('playing');
            
            playDictionaryVideo(item);
        });
        elements.dictResultList.appendChild(div);
    });
}

/**
 * 사전 동영상 재생을 시작합니다.
 * @param {{word: string, video_url: string}} item 
 */
function playDictionaryVideo(item) {
    elements.dictVideoArea.classList.remove('hidden');
    elements.dictPlayingWord.textContent = item.word;

    // 동영상 로드 및 재생 함수 호출
    // item.video_url에는 이미 Flask의 API 엔드포인트가 포함되어 있습니다.
    loadAndPlayVideo(elements.dictVideoPlayer, elements.dictVideoPlaceholder, item.video_url);
}


// --- 이벤트 리스너 ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. 초기 화면 설정
    navigateTo('intro');

    // 2. 카드 메뉴 클릭 이벤트
    elements.cardTranslate.addEventListener('click', () => navigateTo('translation'));
    elements.cardDictionary.addEventListener('click', () => navigateTo('dictionary'));
    elements.cardGame.addEventListener('click', () => navigateTo('game'));

    // 3. 번역 앱 이벤트
    elements.btnModeFile.addEventListener('click', () => toggleInputMode('file'));
    elements.btnModeCam.addEventListener('click', () => toggleInputMode('cam'));

    elements.uploadButton.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    elements.uploadStartButton.addEventListener('click', uploadVideoToServer);
    
    // 녹화 관련
    elements.btnStartRecord.addEventListener('click', startRecording);
    elements.btnStopRecord.addEventListener('click', stopRecording);


    // 드롭 영역 이벤트
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        elements.dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        elements.dropArea.addEventListener(eventName, () => {
            elements.dropArea.classList.add('highlight');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        elements.dropArea.addEventListener(eventName, () => {
            elements.dropArea.classList.remove('highlight');
        }, false);
    });

    elements.dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFileSelect(file);
    }, false);
    
    // 키포인트 토글 이벤트
    elements.keypointToggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const player = elements.resultVideoPlayer;
        const originalUrl = player.dataset.originalUrl;
        const annotatedUrl = player.dataset.annotatedUrl;

        // 토글 상태에 따라 동영상 소스를 변경하여 원본 또는 주석 영상 재생
        const newUrl = isChecked ? annotatedUrl : originalUrl;
        
        // 동영상 소스 변경 및 재생
        loadAndPlayVideo(player, elements.resultVideoPlaceholder, newUrl);
        
        showToast(`영상 변경: ${isChecked ? '키포인트 포함 영상' : '원본 영상'}`);
    });


    // 4. 사전 앱 이벤트
    elements.dictSearchBtn.addEventListener('click', searchDictionary);
    elements.dictSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            searchDictionary();
        }
    });
});