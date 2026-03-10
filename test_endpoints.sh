#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 벤치마크 테스트 엔드포인트 스크립트
#
# 사용법:
#   ./test_endpoints.sh                    # 기본 (samples 디렉토리)
#   ./test_endpoints.sh /path/to/code      # 특정 디렉토리
#   ./test_endpoints.sh /path/to/code 5    # 5회 반복
# ═══════════════════════════════════════════════════════════════

set -e

TARGET_DIR="${1:-samples}"
REPEAT="${2:-1}"
TREESITTER_PORT="${TREESITTER_PORT:-3001}"
NATIVE_AST_PORT="${NATIVE_AST_PORT:-3002}"

mkdir -p output

echo "════════════════════════════════════════════════"
echo "  Parser Benchmark Test"
echo "════════════════════════════════════════════════"
echo "  Target dir: $TARGET_DIR"
echo "  Repeat:     $REPEAT"
echo ""

# ── 1. Health Check ──────────────────────────────

echo "▶ Health Check"
echo -n "  Tree-sitter (port $TREESITTER_PORT): "
curl -sf http://localhost:$TREESITTER_PORT/health && echo "" || echo "FAIL"

echo -n "  Native AST  (port $NATIVE_AST_PORT): "
curl -sf http://localhost:$NATIVE_AST_PORT/health && echo "" || echo "FAIL"
echo ""

# ── 2. 디렉토리를 zip으로 묶기 ──────────────────

ZIP_FILE="output/benchmark_payload.zip"
echo "▶ Creating zip from $TARGET_DIR..."
cd "$TARGET_DIR" && zip -r -q "../$ZIP_FILE" . -x '*/node_modules/*' '*.git*' && cd - > /dev/null
echo "  Zip created: $ZIP_FILE ($(du -h $ZIP_FILE | cut -f1))"
echo ""

# ── 3. 벤치마크 실행 ────────────────────────────

REPO_NAME=$(basename "$TARGET_DIR")

for i in $(seq 1 $REPEAT); do
    echo "════════════════════════════════════════════════"
    echo "  Run $i / $REPEAT"
    echo "════════════════════════════════════════════════"

    # Tree-sitter
    echo "▶ Sending to Tree-sitter parser..."
    TS_RESULT=$(curl -sf -X POST \
        -F "file=@$ZIP_FILE" \
        "http://localhost:$TREESITTER_PORT/analyze?repoName=$REPO_NAME")

    echo "$TS_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
b = d.get('benchmark', {}).get('summary', {})
print(f\"  ✅ Tree-sitter: {b.get('parseTimeSec', '?')}s | LOC: {b.get('totalLoc', '?')} | Success: {b.get('successRate', '?')}%  | LOC/s: {b.get('throughput', {}).get('locPerSec', '?')}\")
" 2>/dev/null || echo "  ⚠ Failed to parse benchmark result"

    # Native AST
    echo "▶ Sending to Native AST parser..."
    NA_RESULT=$(curl -sf -X POST \
        -F "file=@$ZIP_FILE" \
        "http://localhost:$NATIVE_AST_PORT/analyze?repoName=$REPO_NAME")

    echo "$NA_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
b = d.get('benchmark', {}).get('summary', {})
print(f\"  ✅ Native AST:  {b.get('parseTimeSec', '?')}s | LOC: {b.get('totalLoc', '?')} | Success: {b.get('successRate', '?')}%  | LOC/s: {b.get('throughput', {}).get('locPerSec', '?')}\")
" 2>/dev/null || echo "  ⚠ Failed to parse benchmark result"

    echo ""
done

# ── 4. 전체 벤치마크 결과 (CSV) 확인 ────────────

echo "════════════════════════════════════════════════"
echo "  Benchmark History (CSV)"
echo "════════════════════════════════════════════════"

echo "▶ Tree-sitter accumulated results:"
curl -sf http://localhost:$TREESITTER_PORT/benchmark/summary 2>/dev/null | head -20 || echo "  (no data yet)"
echo ""

echo "▶ Native AST accumulated results:"
curl -sf http://localhost:$NATIVE_AST_PORT/benchmark/summary 2>/dev/null | head -20 || echo "  (no data yet)"
echo ""

# ── 5. 정리 ─────────────────────────────────────

echo "════════════════════════════════════════════════"
echo "  Done!"
echo "  Results saved in: benchmark-results/"
echo "════════════════════════════════════════════════"
