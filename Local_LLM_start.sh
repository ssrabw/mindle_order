#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

VENV_PATH="./.venv"

setup_venv() {
    if command -v uv &> /dev/null; then
        HAS_UV=true
        echo "⏳ uv 환경을 감지했습니다. 최적화 속도로 가상환경을 준비합니다."
    else
        HAS_UV=false
        echo "⏳ uv가 없으므로 파이썬 기본 명령어로 가상환경을 준비합니다."
    fi

    if [ ! -d "$VENV_PATH" ]; then
        if [ "$HAS_UV" = true ]; then
            uv venv "$VENV_PATH"
        else
            python3 -m venv "$VENV_PATH"
        fi
        echo "✅ 가상환경 생성 완료: $VENV_PATH"
    fi

    source "$VENV_PATH/bin/activate"
}

install_deps() {
    echo "⏳ 의존성 패키지 확인 및 동기화 중..."
    if command -v uv &> /dev/null; then
        uv pip install --quiet mlx-lm mlx-vlm
    else
        pip install --quiet --upgrade pip
        pip install --quiet mlx-lm mlx-vlm
    fi
    echo "✅ 패키지(mlx-lm, mlx-vlm) 준비 완료"
}

cleanup() {
    if [ -n "$CAFFEINATE_PID" ]; then
        kill "$CAFFEINATE_PID" 2>/dev/null || true
    fi
    exit 0
}

setup_venv
install_deps

trap '' SIGINT

if command -v caffeinate &>/dev/null; then
    caffeinate -i -w $$ &
    CAFFEINATE_PID=$!
fi

while true; do
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║              MLX Server Launcher                     ║"
    echo "╠══════════════════════════════════════════════════════╣"
    echo "║  1)  LM  · Gemma4-26B  8bit   → :15510/v1            ║"
    echo "║  2)  LM  · Qwen3.6-35B 4bit   → :15512/v1            ║"
    echo "║  3)  VLM · Gemma4-26B  8bit   → :15511/v1            ║"
    echo "║  4)  VLM · Qwen3.6-35B 4bit   → :15513/v1            ║"
    echo "║  q)  종료                                            ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo "**모델 전환: Ctrl+C → 메뉴에서 새 번호 선택**"
    echo "**로컬 AI AGENT는 LM 서버만 지원**"
    read -p "  번호를 선택 (1~4, q=종료): " CHOICE
    echo ""

    case "$CHOICE" in
      1)
        echo "=========================================================="
        echo "  mlx-community/gemma-4-26b-a4b-it-8bit → http://localhost:15510/v1"
        echo "  (종료하려면 Ctrl+C)"
        echo "=========================================================="
        ( trap - SIGINT; exec mlx_lm.server \
            --model mlx-community/gemma-4-26b-a4b-it-8bit \
            --host 0.0.0.0 \
            --port 15510 \
            --allowed-origins "*" \
            --chat-template-args '{"enable_thinking": false}' 
            )
        ;;
      2)
        echo "=========================================================="
        echo "  mlx-community/Qwen3.6-35B-A3B-4bit → http://localhost:15512/v1"
        echo "  (종료하려면 Ctrl+C)"
        echo "=========================================================="
        ( trap - SIGINT; exec mlx_lm.server \
            --model mlx-community/Qwen3.6-35B-A3B-4bit \
            --host 0.0.0.0 \
            --port 15512 \
            --allowed-origins "*" \
            --chat-template-args '{"enable_thinking": false}' 
            )
        ;;
      3)
        echo "=========================================================="
        echo "  mlx-community/gemma-4-26b-a4b-it-8bit → http://localhost:15511/v1"
        echo "  (종료하려면 Ctrl+C)"
        echo "=========================================================="
        ( trap - SIGINT; exec mlx_vlm.server \
            --model mlx-community/gemma-4-26b-a4b-it-8bit \
            --host 0.0.0.0 \
            --port 15511 )
        ;;
      4)
        echo "=========================================================="
        echo "  mlx-community/Qwen3.6-35B-A3B-4bit → http://localhost:15513/v1"
        echo "  (종료하려면 Ctrl+C)"
        echo "=========================================================="
        ( trap - SIGINT; exec mlx_vlm.server \
            --model mlx-community/Qwen3.6-35B-A3B-4bit \
            --host 0.0.0.0 \
            --port 15513 )
        ;;
      q|Q)
        echo "  👋 종료합니다."
        cleanup
        ;;
      *)
        echo "  ❌ 올바른 번호를 입력하세요 (1~4, q=종료)"
        ;;
    esac

    echo ""
    echo "  ✓ 서버가 종료되었습니다. 메뉴로 돌아갑니다..."
    sleep 1
done