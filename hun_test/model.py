import logging
import os
import random
import shutil
import time
from dataclasses import dataclass, field
from typing import List, Optional, Callable


# --- 1. Data Transfer Objects (DTOs) ---

@dataclass
class FrameKeypoints:
    """프레임별 키포인트 데이터"""
    frame_index: int
    timestamp: float
    pose: List[List[float]] = field(default_factory=list)
    face: List[List[float]] = field(default_factory=list)
    hand_left: List[List[float]] = field(default_factory=list)
    hand_right: List[List[float]] = field(default_factory=list)


@dataclass
class VideoInfo:
    """동영상 메타 데이터"""
    width: int
    height: int
    fps: float
    duration: float
    total_frames: int
    codec: str


@dataclass
class TranslationResult:
    """수어 번역 결과 반환 객체"""
    success: bool
    word: str
    keypoints: List[FrameKeypoints]
    video_info: Optional[VideoInfo]
    annotated_video_path: str
    processing_time: float
    error: Optional[str] = None


@dataclass
class GameResult:
    """게임(퀴즈) 채점 결과 반환 객체"""
    success: bool
    recognized_word: str
    score: int
    similarity: float
    processing_time: float
    error: Optional[str] = None


# --- 2. Service Logic ---

class SignLanguageTranslator:
    """
    수어 번역 및 게임 채점을 담당하는 서비스 클래스
    (현재 단계: Mock Data 사용)
    """

    # 테스트용 목업 단어 리스트
    MOCK_WORDS = ["안녕하세요", "사랑합니다", "감사합니다", "화이팅", "좋아요"]

    def __init__(self, model_path: str = "dummy_model.pth"):
        self.model_path = model_path
        logging.info(f"SignLanguageTranslator initialized with path: {model_path}")

    def _simulate_progress(self, steps: List[tuple], callback: Optional[Callable] = None):
        """처리 진행률을 시뮬레이션하는 헬퍼 메서드"""
        for progress, msg in steps:
            if callback:
                time.sleep(0.3)  # 처리 시간 시뮬레이션
                callback(progress, msg)

    def translate_sign_language(
            self,
            video_path: str,
            output_dir: str,
            progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> TranslationResult:
        """
        업로드된 비디오를 분석하여 수어를 번역합니다.
        """
        start_time = time.time()
        logging.info(f"Starting translation: {video_path}")

        if not os.path.exists(video_path):
            return TranslationResult(
                success=False,
                word="",
                keypoints=[],
                video_info=None,
                annotated_video_path="",
                processing_time=0.0,
                error="File not found"
            )

        # 1. 진행률 시뮬레이션
        steps = [
            (10, "동영상 로드 및 검증 중..."),
            (30, "프레임 추출 중..."),
            (50, "키포인트 분석 중..."),
            (75, "AI 모델 추론 중..."),
            (90, "결과 생성 중..."),
            (100, "완료")
        ]
        self._simulate_progress(steps, progress_callback)

        # 2. 결과 영상 생성 (Dummy: 원본 복사)
        dummy_annotated_path = os.path.join(output_dir, "annotated.mp4")
        try:
            shutil.copyfile(video_path, dummy_annotated_path)
        except OSError as e:
            logging.error(f"Video copy failed: {e}")
            dummy_annotated_path = video_path

        # 3. 결과 반환 (Mock Data)
        video_info = VideoInfo(640, 480, 30.0, 3.0, 90, "avc1")
        result_word = random.choice(self.MOCK_WORDS)

        return TranslationResult(
            success=True,
            word=f"{result_word} (Mock)",
            keypoints=[],
            video_info=video_info,
            annotated_video_path=dummy_annotated_path,
            processing_time=time.time() - start_time,
        )

    def evaluate_attempt(
            self,
            user_video_path: str,
            target_word: str,
            progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> GameResult:
        """
        사용자의 수어 동작이 제시어(target_word)와 일치하는지 채점합니다.
        """
        start_time = time.time()
        logging.info(f"Starting evaluation for target: {target_word}")

        # 1. 진행률 시뮬레이션
        steps = [
            (20, "영상 업로드 확인..."),
            (40, "동작 분석 중..."),
            (60, "정답과 비교 중..."),
            (80, "점수 계산 중..."),
            (100, "채점 완료")
        ]
        self._simulate_progress(steps, progress_callback)

        # 2. 결과 계산 (Mock Logic: 50% 확률)
        is_correct = random.choice([True, False])

        if is_correct:
            recognized = target_word
            score = 100
            similarity = 0.95
        else:
            candidates = [w for w in self.MOCK_WORDS if w != target_word]
            recognized = random.choice(candidates) if candidates else "Unknown"
            score = random.randint(0, 50)
            similarity = 0.4

        return GameResult(
            success=is_correct,
            recognized_word=recognized,
            score=score,
            similarity=similarity,
            processing_time=time.time() - start_time
        )