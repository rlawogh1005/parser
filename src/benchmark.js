/**
 * Benchmark Module — 파서 성능 측정 도구
 *
 * 측정 항목:
 *   1. Parsing Latency (개별 파일 파싱 시간의 합산, 파일 I/O 제외)
 *   2. File count / LOC
 *   3. Success / Failure count & rate (Robustness)
 *   4. Throughput (LOC/sec, files/sec)
 *   5. Peak Memory (RSS, heapUsed)
 *   6. 파일별 상세 기록
 *
 * 사용법:
 *   const { BenchmarkCollector } = require('./src/benchmark');
 *   const bench = new BenchmarkCollector('tree-sitter');
 *   bench.startTotal();
 *   // ... unzip ...
 *   // ... parse files (각 파일 파싱 시 BenchmarkCollector.measure() + bench.recordFile(...) 호출) ...
 *   bench.endTotal();
 *   const result = bench.getResult(repoName);
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class BenchmarkCollector {
    /**
     * @param {string} parserName - 파서 이름 (예: 'tree-sitter', 'native-ast')
     */
    constructor(parserName) {
        this.parserName = parserName;
        this.files = [];
        this.totalLoc = 0;
        this.totalFiles = 0;
        this.successFiles = 0;
        this.failedFiles = 0;

        // Timing
        this._totalStartNs = null;
        this._totalEndNs = null;
        this._totalParseTimeMs = 0; // 개별 파일 순수 파싱 시간(measure)의 합산

        // Memory snapshot
        this._memBefore = null;
        this._memPeak = null;

        // Language breakdown
        this.languageStats = {};
    }

    // ─── Timing ───────────────────────────────────────────────

    /** 전체 요청(unzip 포함) 시작 */
    startTotal() {
        this._totalStartNs = process.hrtime.bigint();
        this._memBefore = process.memoryUsage();
        this._memPeak = { ...this._memBefore };
    }

    /** 전체 요청 종료 */
    endTotal() {
        this._totalEndNs = process.hrtime.bigint();
        this._updatePeakMemory();
    }

    // ─── File Recording ───────────────────────────────────────

    /**
     * 개별 파일 파싱 결과 기록
     * @param {string} filePath - 파일 경로
     * @param {boolean} success - 파싱 성공 여부
     * @param {number} loc - 라인 수
     * @param {number} elapsedMs - 파싱 소요 시간 (ms)
     * @param {string} [errorMsg] - 에러 메시지 (실패 시)
     * @param {number} [errorNodes] - error node 개수 (tree-sitter 전용)
     */
    recordFile(filePath, success, loc, elapsedMs, errorMsg = null, errorNodes = 0) {
        const ext = path.extname(filePath);
        const lang = this._extToLanguage(ext);

        this.totalFiles++;
        this.totalLoc += loc;

        if (success) {
            this.successFiles++;
        } else {
            this.failedFiles++;
        }

        // Language breakdown
        if (!this.languageStats[lang]) {
            this.languageStats[lang] = { files: 0, loc: 0, successFiles: 0, failedFiles: 0, totalTimeMs: 0 };
        }
        this.languageStats[lang].files++;
        this.languageStats[lang].loc += loc;
        this.languageStats[lang].totalTimeMs += elapsedMs;
        this._totalParseTimeMs += elapsedMs;
        if (success) {
            this.languageStats[lang].successFiles++;
        } else {
            this.languageStats[lang].failedFiles++;
        }

        this.files.push({
            file: filePath,
            language: lang,
            status: success ? 'success' : 'fail',
            loc,
            parseTimeMs: Math.round(elapsedMs * 1000) / 1000,
            errorNodes,
            error: errorMsg
        });

        // 주기적으로 peak memory 갱신
        if (this.totalFiles % 50 === 0) {
            this._updatePeakMemory();
        }
    }

    // ─── Result Generation ────────────────────────────────────

    /**
     * 최종 벤치마크 결과 생성
     * @param {string} repoName - 레포 이름
     * @returns {object} 구조화된 벤치마크 결과
     */
    getResult(repoName) {
        this._updatePeakMemory();

        // 순수 파싱 시간 = 개별 파일별 BenchmarkCollector.measure() 결과의 합산
        // 파일 시스템 순회(readdir, stat, readFile) 시간은 포함되지 않음
        const parseTimeSec = this._totalParseTimeMs / 1000;

        const totalTimeNs = this._totalEndNs && this._totalStartNs
            ? Number(this._totalEndNs - this._totalStartNs)
            : 0;
        const totalTimeSec = totalTimeNs / 1e9;

        const successRate = this.totalFiles > 0
            ? Math.round((this.successFiles / this.totalFiles) * 10000) / 100
            : 0;

        const locPerSec = parseTimeSec > 0
            ? Math.round(this.totalLoc / parseTimeSec)
            : 0;
        const filesPerSec = parseTimeSec > 0
            ? Math.round((this.totalFiles / parseTimeSec) * 100) / 100
            : 0;

        const memPeakMB = this._memPeak
            ? Math.round(this._memPeak.rss / 1024 / 1024 * 100) / 100
            : 0;
        const heapPeakMB = this._memPeak
            ? Math.round(this._memPeak.heapUsed / 1024 / 1024 * 100) / 100
            : 0;

        const result = {
            // ── 식별 정보
            parser: this.parserName,
            repo: repoName,
            timestamp: new Date().toISOString(),

            // ── 요약 통계
            summary: {
                totalFiles: this.totalFiles,
                successFiles: this.successFiles,
                failedFiles: this.failedFiles,
                successRate: successRate,
                totalLoc: this.totalLoc,
                parseTimeSec: Math.round(parseTimeSec * 1000) / 1000,
                totalTimeSec: Math.round(totalTimeSec * 1000) / 1000,
                throughput: {
                    locPerSec,
                    filesPerSec
                },
                memory: {
                    peakRssMB: memPeakMB,
                    peakHeapMB: heapPeakMB
                }
            },

            // ── 언어별 통계
            languageBreakdown: this.languageStats,

            // ── 파일별 상세 기록
            fileDetails: this.files
        };

        return result;
    }

    /**
     * CI 로그 친화적 출력 (stdout)
     * @param {object} result - getResult()의 반환값
     */
    static printCILog(result) {
        console.log('\n══════════════════════════════════════════════════════');
        console.log('  BENCHMARK_RESULT');
        console.log('══════════════════════════════════════════════════════');
        console.log(`  parser        = ${result.parser}`);
        console.log(`  repo          = ${result.repo}`);
        console.log(`  timestamp     = ${result.timestamp}`);
        console.log('──────────────────────────────────────────────────────');
        console.log(`  files         = ${result.summary.totalFiles}`);
        console.log(`  success       = ${result.summary.successFiles}`);
        console.log(`  failed        = ${result.summary.failedFiles}`);
        console.log(`  success_rate  = ${result.summary.successRate}%`);
        console.log(`  loc           = ${result.summary.totalLoc}`);
        console.log(`  parse_time    = ${result.summary.parseTimeSec}s`);
        console.log(`  total_time    = ${result.summary.totalTimeSec}s`);
        console.log(`  loc/sec       = ${result.summary.throughput.locPerSec}`);
        console.log(`  files/sec     = ${result.summary.throughput.filesPerSec}`);
        console.log(`  peak_rss_mb   = ${result.summary.memory.peakRssMB}`);
        console.log(`  peak_heap_mb  = ${result.summary.memory.peakHeapMB}`);
        console.log('──────────────────────────────────────────────────────');

        // 언어별 요약
        for (const [lang, stats] of Object.entries(result.languageBreakdown)) {
            const langRate = stats.files > 0
                ? Math.round((stats.successFiles / stats.files) * 10000) / 100
                : 0;
            console.log(`  [${lang}] files=${stats.files} loc=${stats.loc} time=${Math.round(stats.totalTimeMs)}ms success=${langRate}%`);
        }
        console.log('══════════════════════════════════════════════════════\n');
    }

    /**
     * 결과를 JSON 파일로 저장
     * @param {object} result - getResult()의 반환값
     * @param {string} outputDir - 저장 디렉토리
     * @returns {string} 저장된 파일 경로
     */
    static saveResult(result, outputDir = '/app/benchmark-results') {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const safeRepo = (result.repo || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `benchmark_${result.parser}_${safeRepo}_${ts}.json`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf8');
        console.log(`[Benchmark] Result saved to: ${filepath}`);

        // 누적 CSV에도 한 줄 추가 (요약만)
        const csvPath = path.join(outputDir, 'benchmark_summary.csv');
        const csvExists = fs.existsSync(csvPath);
        const csvHeader = 'timestamp,parser,repo,files,success,failed,success_rate,loc,parse_time_sec,total_time_sec,loc_per_sec,files_per_sec,peak_rss_mb,peak_heap_mb\n';
        const csvRow = [
            result.timestamp,
            result.parser,
            result.repo,
            result.summary.totalFiles,
            result.summary.successFiles,
            result.summary.failedFiles,
            result.summary.successRate,
            result.summary.totalLoc,
            result.summary.parseTimeSec,
            result.summary.totalTimeSec,
            result.summary.throughput.locPerSec,
            result.summary.throughput.filesPerSec,
            result.summary.memory.peakRssMB,
            result.summary.memory.peakHeapMB
        ].join(',') + '\n';

        if (!csvExists) {
            fs.writeFileSync(csvPath, csvHeader + csvRow, 'utf8');
        } else {
            fs.appendFileSync(csvPath, csvRow, 'utf8');
        }
        console.log(`[Benchmark] Summary appended to: ${csvPath}`);

        return filepath;
    }

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * 고정밀 시간 측정 유틸 (파일 단위 래핑용)
     * @param {Function} fn - 실행할 함수
     * @returns {{ result: any, elapsedMs: number }}
     */
    static measure(fn) {
        const start = process.hrtime.bigint();
        const result = fn();
        const end = process.hrtime.bigint();
        const elapsedMs = Number(end - start) / 1e6;
        return { result, elapsedMs };
    }

    /**
     * LOC 카운팅
     * @param {string} code - 소스코드 문자열
     * @returns {number} 라인 수
     */
    static countLoc(code) {
        if (!code) return 0;
        return code.split('\n').length;
    }

    /**
     * NCLOC 카운팅 (빈 줄 제외)
     * @param {string} code - 소스코드 문자열
     * @returns {number} 비공백 라인 수
     */
    static countNcloc(code) {
        if (!code) return 0;
        return code.split('\n').filter(line => line.trim().length > 0).length;
    }

    /** peak memory 갱신 */
    _updatePeakMemory() {
        const current = process.memoryUsage();
        if (!this._memPeak || current.rss > this._memPeak.rss) {
            this._memPeak = { ...current };
        }
        if (this._memPeak && current.heapUsed > this._memPeak.heapUsed) {
            this._memPeak.heapUsed = current.heapUsed;
        }
    }

    /** 확장자 → 언어명 매핑 */
    _extToLanguage(ext) {
        const map = {
            '.java': 'java',
            '.py': 'python',
            '.ts': 'typescript',
            '.js': 'javascript',
            '.tsx': 'typescript',
            '.jsx': 'javascript',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c/cpp'
        };
        return map[ext] || ext || 'unknown';
    }
}

module.exports = { BenchmarkCollector };
