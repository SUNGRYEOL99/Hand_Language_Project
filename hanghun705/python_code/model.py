import time
import logging
import os
from dataclasses import dataclass, asdict
from typing import List, Optional, Callable, Dict, Any
import random

# --- Data Classes (Model Interface) ---

@dataclass
class FrameKeypoints:
    """A single frame's keypoint information (OpenPose format)"""
    frame_index: int
    timestamp: float
    pose: List[List[float]]  # [[x, y, confidence], ...]
    face: List[List[float]]
    hand_left: List[List[float]]
    hand_right: List[List[float]]

@dataclass
class VideoInfo:
    """Video metadata"""
    width: int
    height: int
    fps: float
    duration: float
    total_frames: int
    codec: str

@dataclass
class TranslationResult:
    """Data class holding the translation result"""
    success: bool
    word: str
    keypoints: List[FrameKeypoints]
    video_info: VideoInfo
    annotated_video_path: str
    processing_time: float
    error: Optional[str] = None

# --- Dummy Class ---

class SignLanguageTranslator:
    """
    SignLanguageTranslator implementation (Dummy version for integration testing).
    This class simulates video processing and model inference.
    """
    def __init__(self, model_path: str = "dummy_model.pth"):
        logging.info(f"SignLanguageTranslator initialized with dummy model path: {model_path}")
        self.model_path = model_path
        self.mock_words = ["안녕하세요", "사랑합니다", "감사합니다", "화이팅", "좋아요"]

    def translate_sign_language(
        self,
        video_path: str,
        output_dir: str,
        progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> TranslationResult:
        """
        Analyzes the video, translates sign language, and extracts keypoints (Dummy).
        """
        start_time = time.time()
        logging.info(f"Starting translation for video: {video_path}")
        
        # 1. Input Validation
        if not os.path.exists(video_path):
            error_msg = f"Video file not found: {video_path}"
            if progress_callback:
                progress_callback(0, f"에러: {error_msg}")
            logging.error(error_msg)
            return TranslationResult(success=False, word="", keypoints=[], video_info=None, annotated_video_path="", processing_time=0.0, error=error_msg)

        # 2. Mock Video Info (Based on a typical short video)
        width, height, fps, duration, total_frames, codec = 640, 480, 30.0, 3.0, 90, "avc1"
        video_info = VideoInfo(width, height, fps, duration, total_frames, codec)
        
        # 3. Define progress steps
        steps = [
            (10, "동영상 로드 및 검증 중... (10%)"),
            (30, "프레임 추출 및 전처리 중... (30%)"),
            (50, "OpenPose 키포인트 추출 중... (50%)"),
            (75, "수어 인식 AI 모델 추론 중... (75%)"),
            (90, "번역 결과 및 주석 영상 생성 중... (90%)"),
            (100, "완료 (100%)")
        ]

        # 4. Simulate Processing and Report Progress
        for progress, msg in steps:
            if progress_callback:
                # 0.5초 대기 시뮬레이션
                time.sleep(0.5) 
                progress_callback(progress, msg)

        # 5. Generate Mock Results
        dummy_annotated_path = os.path.join(output_dir, "annotated.mp4")
        
        # Mock Keypoint data generation (Random points for visualization demo)
        all_keypoints = []
        for i in range(total_frames):
            frame_kp = FrameKeypoints(
                frame_index=i,
                timestamp=i/fps,
                # Random keypoints (x, y, confidence)
                pose=[[random.random()*width, random.random()*height, random.random()] for _ in range(25)],
                face=[[random.random()*width, random.random()*height, random.random()] for _ in range(70)],
                hand_left=[[random.random()*width, random.random()*height, random.random()] for _ in range(21)],
                hand_right=[[random.random()*width, random.random()*height, random.random()] for _ in range(21)]
            )
            all_keypoints.append(frame_kp)
            
        processing_time = time.time() - start_time
        
        # Dummy result file creation (An empty file to satisfy os.path.exists in app.py)
        # In a real scenario, this would be the actual annotated video file.
        with open(dummy_annotated_path, 'w') as f:
            f.write("dummy video content")
            
        # Select a random mock word for varied results
        result_word = random.choice(self.mock_words)

        logging.info(f"Translation complete. Word: {result_word}, Time: {processing_time:.2f}s")
        
        return TranslationResult(
            success=True,
            word=f"{result_word} (Mock)", # Mock임을 명시
            keypoints=all_keypoints,
            video_info=video_info,
            annotated_video_path=dummy_annotated_path,
            processing_time=processing_time,
        )

if __name__ == "__main__":
    # Test code
    logging.basicConfig(level=logging.INFO)
    translator = SignLanguageTranslator()
    
    def print_progress(p, m):
        print(f"[{p}%] {m}")

    temp_video_path = "test_video.mp4"
    if not os.path.exists(temp_video_path):
        # Create a dummy file if not exists
        with open(temp_video_path, 'w') as f:
            f.write("This is a mock video file.")
            
    temp_output_dir = "temp_output"
    os.makedirs(temp_output_dir, exist_ok=True)
    
    result = translator.translate_sign_language(temp_video_path, temp_output_dir, print_progress)
    print("\\n--- Result ---")
    print(asdict(result))
    
    # Cleanup (Optional)
    # os.remove(temp_video_path)
    # os.remove(os.path.join(temp_output_dir, "annotated.mp4"))
    # os.rmdir(temp_output_dir)