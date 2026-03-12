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
        this.totalNodes = 0;
        this.maxDepth = 0;
        this._totalParseTimeMs = 0;
        this._totalStartNs = null;
        this._totalEndNs = null;
        this._memPeak = null;
        this._langs = {};   // { [lang]: { files, loc, parseTimeMs, nodes, maxDepth } }
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
     * @param {number} nodeCount - 전체 노드 수
     * @param {number} maxDepth  - 트리 최대 깊이
     */
    record(filePath, loc, ms, nodeCount = 0, maxDepth = 0) {
        this.totalFiles++;
        this.totalLoc += loc;
        this._totalParseTimeMs += ms;
        this.totalNodes += nodeCount;
        if (maxDepth > this.maxDepth) this.maxDepth = maxDepth;

        const ext = require('path').extname(filePath);
        const lang = EXT_LANG[ext] || ext || 'unknown';
        if (!this._langs[lang]) this._langs[lang] = { files: 0, loc: 0, parseTimeMs: 0, nodes: 0, maxDepth: 0 };
        this._langs[lang].files++;
        this._langs[lang].loc += loc;
        this._langs[lang].parseTimeMs += ms;
        this._langs[lang].nodes += nodeCount;
        if (maxDepth > this._langs[lang].maxDepth) this._langs[lang].maxDepth = maxDepth;

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

    /** AST 통계 (노드 수, 깊이) 계산 */
    static getAstStats(ast) {
        let nodeCount = 0;
        let maxDepth = 0;

        function traverse(node, depth) {
            if (!node || typeof node !== 'object') return;
            nodeCount++;
            if (depth > maxDepth) maxDepth = depth;

            // 'children' 배열이 있으면 순회 (Tree-sitter, TS)
            if (Array.isArray(node.children)) {
                for (const child of node.children) {
                    traverse(child, depth + 1);
                }
            }
            // 그 외의 경우 (JavaParser JSON 구조 등)
            else {
                for (const key in node) {
                    if (key === 'parent') continue; // 무한루프 방지
                    const value = node[key];
                    if (value && typeof value === 'object') {
                        if (Array.isArray(value)) {
                            for (const item of value) {
                                if (item && typeof item === 'object') traverse(item, depth + 1);
                            }
                        } else {
                            traverse(value, depth + 1);
                        }
                    }
                }
            }
        }

        traverse(ast, 1);
        return { nodeCount, maxDepth };
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
                nodes: s.nodes,
                maxDepth: s.maxDepth,
                parseTimeSec: Math.round(s.parseTimeMs / 1000 * 1000) / 1000,
            };
        }

        return {
            parser: this.parserName,
            repo: repoName,
            timestamp: new Date().toISOString(),
            files: this.totalFiles,
            loc: this.totalLoc,
            totalNodes: this.totalNodes,
            maxDepth: this.maxDepth,
            parseTimeSec: Math.round(parseSec * 1000) / 1000,
            totalTimeSec: Math.round(totalNs / 1e6) / 1000,
            peakRssMB: this._mb(this._memPeak?.rss),
            peakHeapMB: this._mb(this._memPeak?.heapUsed),
            languages,
        };
    }

    /**
     * 결과를 JSON 파일로 저장 + CSV 누적 + (선택) AST 데이터 저장
     *
     * 저장 구조:
     *   dir/
     *   └── {parserName}/
     *       ├── stats/   ← 벤치마크 JSON + CSV
     *       └── ast/     ← AST 데이터 JSON
     *
     * @param {object} result  - getResult() 반환값
     * @param {object} [astData] - 파싱된 AST 트리 (선택)
     * @param {string} baseDir - 루트 저장 디렉토리
     * @returns {string} 저장된 벤치마크 JSON 파일 경로
     */
    static save(result, astData = null, baseDir = null) {
        const fs = require('fs');
        const path = require('path');

        // 기본 경로: 프로젝트 루트의 benchmark-results
        const rootDir = baseDir || path.join(process.cwd(), 'benchmark-results');
        const parserDir = path.join(rootDir, result.parser);
        const statsDir = path.join(parserDir, 'stats');
        const astDir = path.join(parserDir, 'ast');

        if (!fs.existsSync(statsDir)) fs.mkdirSync(statsDir, { recursive: true });

        const safeRepo = (result.repo || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
        const ts = result.timestamp.replace(/[:.]/g, '-').split('T')[0]; // 날짜 위주로 요약
        const fullTs = result.timestamp.replace(/[:.]/g, '-');
        const tag = `${safeRepo}_${fullTs}`;

        // 벤치마크 JSON 저장 → {parser}/stats/
        const jsonPath = path.join(statsDir, `bench_${tag}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

        // AST 데이터 JSON 저장 → {parser}/ast/
        if (astData) {
            if (!fs.existsSync(astDir)) fs.mkdirSync(astDir, { recursive: true });
            const astPath = path.join(astDir, `ast_${tag}.json`);
            fs.writeFileSync(astPath, JSON.stringify(astData, null, 2));
            console.log(`[Benchmark] AST saved: ${astPath}`);
        }

        // CSV 누적 → {parser}/stats/benchmark.csv
        const csvPath = path.join(statsDir, 'benchmark.csv');
        const header = 'timestamp,parser,repo,language,files,loc,nodes,max_depth,parse_sec,total_sec,peak_rss_mb,peak_heap_mb\n';

        const rows = Object.entries(result.languages).map(([lang, s]) =>
            [result.timestamp, result.parser, result.repo, lang,
            s.files, s.loc, s.nodes, s.maxDepth,
            s.parseTimeSec, result.totalTimeSec,
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
