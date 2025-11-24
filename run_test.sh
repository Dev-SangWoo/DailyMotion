#!/bin/bash

# 가상환경 활성화
source venv/bin/activate

# 필요한 패키지 설치
pip install aiohttp --quiet 2>/dev/null || true

# 테스트 실행
python3 test_odsay_simple.py
