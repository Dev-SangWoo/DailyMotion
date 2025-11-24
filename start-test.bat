@echo off
REM 테스트 환경 빠른 시작 스크립트
REM 서버 + 클라이언트를 한 번에 실행합니다

echo.
echo ============================================
echo  경로 검색 기능 테스트 시작
echo ============================================
echo.
echo PC IP: 172.20.1.213
echo 서버: http://172.20.1.213:8000
echo API: http://172.20.1.213:8000/api/v1
echo.

REM 방화벽 포트 개방 확인
echo [1/3] Windows 방화벽 포트 8000 개방 확인 중...
netsh advfirewall firewall show rule name="DailyMotion Server Port 8000" >nul 2>&1
if %errorlevel% neq 0 (
    echo 포트 8000을 방화벽에 추가합니다...
    netsh advfirewall firewall add rule name="DailyMotion Server Port 8000" dir=in action=allow protocol=tcp localport=8000
    if %errorlevel% equ 0 (
        echo ✅ 포트 8000이 개방되었습니다
    ) else (
        echo ⚠️  관리자 권한이 필요합니다. 관리자 권한으로 다시 실행해주세요.
    )
) else (
    echo ✅ 포트 8000은 이미 개방되어 있습니다
)

echo.
echo [2/3] 백엔드 서버 시작 중...
start "DailyMotion Server" cmd /k "cd /d d:\Work\DailyMotion2\server && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak

echo.
echo [3/3] 프론트엔드 시작 중...
start "DailyMotion Client" cmd /k "cd /d d:\Work\DailyMotion2\client && npm start"

echo.
echo ============================================
echo ✅ 테스트 환경 시작 완료!
echo ============================================
echo.
echo 다음 단계:
echo  1. 서버 터미널: "Uvicorn running on http://0.0.0.0:8000" 확인
echo  2. 클라이언트 터미널: Expo QR 코드 표시 확인
echo  3. 휴대폰 EXPO GO: QR 코드 스캔
echo.
echo 휴대폰이 PC와 동일한 WiFi에 연결되어 있는지 확인하세요!
echo.
pause
