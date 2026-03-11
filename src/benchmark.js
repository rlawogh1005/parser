/**
 * Benchmark Module — 파서 성능 측정 (compact)
 *
 * 측정 항목 (언어별):
 *   1. 파일 개수 / LOC
 *   2. 파싱 시간 (순수 파싱 합산 + 전체 소요)
 *   3. 메모리 사용량 (peak RSS, heapUsed)
 */

const EXT_LANG = {
    '.java': 'java', '.py': 'python',
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.cpp': 'cpp', '.c': 'c', '.h': 'c/cpp'
};

class BenchmarkCollector {
    constructor(parserName) {
        this.parserName = parserName;
        this.totalFiles = 0;
        this.totalLoc = 0;
        this._totalParseTimeMs = 0;
        this._totalStartNs = null;
        this._totalEndNs = null;
        this._memPeak = null;
        this._langs = {};   // { [lang]: { files, loc, parseTimeMs } }
    }

    /** 전체 측정 시작 */
    startTotal() {
        this._totalStartNs = process.hrtime.bigint();
        this._memPeak = process.memoryUsage();
    }

    /** 전체 측정 종료 */
    endTotal() {
        this._totalEndNs = process.hrtime.bigint();
        this._updatePeak();
    }

    /**
     * 파일 하나의 파싱 결과 기록
     * @param {string} filePath - 파일 경로 (확장자로 언어 분류)
     * @param {number} loc      - 라인 수
     * @param {number} ms       - 파싱 소요 시간 (ms)
     */
    record(filePath, loc, ms) {
        this.totalFiles++;
        this.totalLoc += loc;
        this._totalParseTimeMs += ms;

        const ext = require('path').extname(filePath);
        const lang = EXT_LANG[ext] || ext || 'unknown';
        if (!this._langs[lang]) this._langs[lang] = { files: 0, loc: 0, parseTimeMs: 0 };
        this._langs[lang].files++;
        this._langs[lang].loc += loc;
        this._langs[lang].parseTimeMs += ms;

        if (this.totalFiles % 50 === 0) this._updatePeak();
    }

    /** 고정밀 시간 측정 래퍼 */
    static measure(fn) {
        const s = process.hrtime.bigint();
        const result = fn();
        return { result, ms: Number(process.hrtime.bigint() - s) / 1e6 };
    }

    /** LOC 카운팅 */
    static countLoc(code) {
        return code ? code.split('\n').length : 0;
    }

    /** 최종 결과 반환 */
    getResult(repoName) {
        this._updatePeak();
        const parseSec = this._totalParseTimeMs / 1000;
        const totalNs = this._totalEndNs && this._totalStartNs
            ? Number(this._totalEndNs - this._totalStartNs) : 0;

        // 언어별 통계 정리
        const languages = {};
        for (const [lang, s] of Object.entries(this._langs)) {
            languages[lang] = {
                files: s.files,
                loc: s.loc,
                parseTimeSec: Math.round(s.parseTimeMs / 1000 * 1000) / 1000,
            };
        }

        return {
            parser: this.parserName,
            repo: repoName,
            timestamp: new Date().toISOString(),
            files: this.totalFiles,
            loc: this.totalLoc,
            parseTimeSec: Math.round(parseSec * 1000) / 1000,
            totalTimeSec: Math.round(totalNs / 1e6) / 1000,
            peakRssMB: this._mb(this._memPeak?.rss),
            peakHeapMB: this._mb(this._memPeak?.heapUsed),
            languages,
        };
    }

    /**
     * 결과를 JSON 파일로 저장 + CSV 누적
     * @param {object} result - getResult() 반환값
     * @param {string} dir    - 저장 디렉토리
     * @returns {string} 저장된 JSON 파일 경로
     */
    static save(result, dir = '/app/benchmark-results') {
        const fs = require('fs');
        const path = require('path');

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // JSON 저장
        const safe = (result.repo || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
        const ts = result.timestamp.replace(/[:.]/g, '-');
        const jsonPath = path.join(dir, `bench_${result.parser}_${safe}_${ts}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

        // CSV 누적 (언어별 한 줄씩)
        const csvPath = path.join(dir, 'benchmark.csv');
        const header = 'timestamp,parser,repo,language,files,loc,parse_sec,total_sec,peak_rss_mb,peak_heap_mb\n';

        const rows = Object.entries(result.languages).map(([lang, s]) =>
            [result.timestamp, result.parser, result.repo, lang,
            s.files, s.loc, s.parseTimeSec, result.totalTimeSec,
            result.peakRssMB, result.peakHeapMB].join(',')
        ).join('\n') + '\n';

        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, header + rows);
        } else {
            fs.appendFileSync(csvPath, rows);
        }

        console.log(`[Benchmark] saved: ${jsonPath}`);
        return jsonPath;
    }

    // ── internal ──

    _updatePeak() {
        const m = process.memoryUsage();
        if (!this._memPeak || m.rss > this._memPeak.rss) this._memPeak = { ...m };
        if (this._memPeak && m.heapUsed > this._memPeak.heapUsed) {
            this._memPeak.heapUsed = m.heapUsed;
        }
    }

    _mb(bytes) {
        return bytes ? Math.round(bytes / 1048576 * 100) / 100 : 0;
    }
}

module.exports = { BenchmarkCollector };
