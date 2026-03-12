/**
 * 벤치마크 테스트 스크립트
 *
 * samples 디렉토리를 zip으로 묶어서
 * tree-sitter (port 3001)와 native-ast (port 3002) 양쪽에 보내고
 * 벤치마크 결과를 비교 출력한다.
 *
 * 사용법:
 *   node test_scripts/test_benchmark.js
 *   node test_scripts/test_benchmark.js --repeat 5
 *   node test_scripts/test_benchmark.js --dir /path/to/code
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const AdmZip = require('adm-zip');

// ─── 설정 ─────────────────────────────────────────────────

const ROOT_DIR = path.join(__dirname, '..');
const DEFAULT_SAMPLE_DIR = path.join(ROOT_DIR, 'samples');

const TREESITTER_URL = process.env.TREESITTER_URL || 'http://localhost:3001';
const NATIVE_AST_URL = process.env.NATIVE_AST_URL || 'http://localhost:3002';

// CLI 인자 파싱
const args = process.argv.slice(2);
let targetDir = DEFAULT_SAMPLE_DIR;
let repeatCount = 1;
let repoName = 'samples';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
        targetDir = path.resolve(args[i + 1]);
        repoName = path.basename(targetDir);
        i++;
    }
    if (args[i] === '--repeat' && args[i + 1]) {
        repeatCount = parseInt(args[i + 1], 10) || 1;
        i++;
    }
    if (args[i] === '--repo' && args[i + 1]) {
        repoName = args[i + 1];
        i++;
    }
}

// ─── Zip 생성 ─────────────────────────────────────────────

function createZipFromDir(dirPath) {
    const zip = new AdmZip();
    const addFilesRecursive = (currentPath, zipPath) => {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
            if (['node_modules', '.git', 'dist', '__pycache__'].includes(item)) continue;
            const fullPath = path.join(currentPath, item);
            const entryPath = path.join(zipPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                addFilesRecursive(fullPath, entryPath);
            } else {
                zip.addLocalFile(fullPath, path.dirname(entryPath));
            }
        }
    };
    addFilesRecursive(dirPath, '');
    return zip.toBuffer();
}

// ─── HTTP multipart/form-data 전송 ───────────────────────

function sendZipToParser(baseUrl, zipBuffer, repoName) {
    return new Promise((resolve, reject) => {
        const url = new URL('/analyze', baseUrl);
        const boundary = '----BenchmarkBoundary' + Date.now();

        const header = Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${repoName}.zip"\r\n` +
            `Content-Type: application/zip\r\n\r\n`
        );
        const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
        const body = Buffer.concat([header, zipBuffer, footer]);

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: `${url.pathname}?repoName=${encodeURIComponent(repoName)}`,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            timeout: 120000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Response parse error: ${data.substring(0, 200)}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        req.write(body);
        req.end();
    });
}

// ─── 결과 비교 출력 ──────────────────────────────────────

function printComparison(tsResult, nativeResult) {
    const ts = tsResult?.benchmark;
    const na = nativeResult?.benchmark;

    if (!ts || !na) {
        console.error('[Error] Benchmark data missing from one or both parsers.');
        return;
    }

    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                    BENCHMARK COMPARISON RESULT                      ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║  Metric               │  Tree-sitter      │  Native AST           ║');
    console.log('╠═══════════════════════╪═══════════════════╪═══════════════════════╣');

    const rows = [
        ['Files', ts.files, na.files],
        ['LOC', ts.loc, na.loc],
        ['Total Nodes', ts.totalNodes, na.totalNodes],
        ['Max Depth', ts.maxDepth, na.maxDepth],
        ['Parse Time', `${ts.parseTimeSec}s`, `${na.parseTimeSec}s`],
        ['Total Time', `${ts.totalTimeSec}s`, `${na.totalTimeSec}s`],
        ['Peak RSS (MB)', ts.peakRssMB, na.peakRssMB],
        ['Peak Heap (MB)', ts.peakHeapMB, na.peakHeapMB]
    ];

    for (const [label, tsVal, naVal] of rows) {
        const l = label.padEnd(21);
        const t = String(tsVal).padEnd(17);
        const n = String(naVal).padEnd(21);
        console.log(`║  ${l} │  ${t} │  ${n} ║`);
    }

    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    // 속도 비교 요약
    if (ts.parseTimeSec > 0 && na.parseTimeSec > 0) {
        const ratio = na.parseTimeSec / ts.parseTimeSec;
        if (ratio > 1) {
            console.log(`\n  ⚡ Tree-sitter is ${ratio.toFixed(2)}x faster than Native AST`);
        } else {
            console.log(`\n  ⚡ Native AST is ${(1 / ratio).toFixed(2)}x faster than Tree-sitter`);
        }
    }

    // Robustness 비교
    if (ts.successRate !== na.successRate) {
        console.log(`  🛡️  Robustness: Tree-sitter ${ts.successRate}% vs Native AST ${na.successRate}%`);
    }
    console.log('');
}

// ─── 메인 실행 ────────────────────────────────────────────

(async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Parser Benchmark Test');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Target:     ${targetDir}`);
    console.log(`  Repo Name:  ${repoName}`);
    console.log(`  Repeat:     ${repeatCount}`);
    console.log(`  TreeSitter: ${TREESITTER_URL}`);
    console.log(`  NativeAST:  ${NATIVE_AST_URL}`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (!fs.existsSync(targetDir)) {
        console.error(`[Error] Target directory not found: ${targetDir}`);
        process.exit(1);
    }

    // Zip 생성
    console.log('[1/3] Creating zip from target directory...');
    const zipBuffer = createZipFromDir(targetDir);
    console.log(`      Zip size: ${(zipBuffer.length / 1024).toFixed(1)} KB\n`);

    const allTsResults = [];
    const allNaResults = [];

    for (let run = 1; run <= repeatCount; run++) {
        console.log(`[2/3] Run ${run}/${repeatCount} — Sending to parsers...`);

        try {
            // 순차 실행 (동시 실행 시 CPU 경쟁 발생 가능)
            console.log('      → Tree-sitter...');
            const tsResponse = await sendZipToParser(TREESITTER_URL, zipBuffer, repoName);
            allTsResults.push(tsResponse);

            console.log('      → Native AST...');
            const naResponse = await sendZipToParser(NATIVE_AST_URL, zipBuffer, repoName);
            allNaResults.push(naResponse);

            printComparison(tsResponse, naResponse);
        } catch (e) {
            console.error(`      [Error] Run ${run} failed: ${e.message}`);
        }
    }

    // 반복 실행 통계 (2회 이상일 때)
    if (repeatCount > 1 && allTsResults.length === repeatCount) {
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  AGGREGATE STATISTICS (across all runs)');
        console.log('═══════════════════════════════════════════════════════');

        const tsTimes = allTsResults.map(r => r.benchmark?.parseTimeSec).filter(v => v !== undefined);
        const naTimes = allNaResults.map(r => r.benchmark?.parseTimeSec).filter(v => v !== undefined);

        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        const std = arr => {
            const m = avg(arr);
            return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
        };
        const median = arr => {
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        console.log(`\n  Tree-sitter Parse Time (${tsTimes.length} runs):`);
        console.log(`    mean   = ${avg(tsTimes).toFixed(4)}s`);
        console.log(`    std    = ${std(tsTimes).toFixed(4)}s`);
        console.log(`    median = ${median(tsTimes).toFixed(4)}s`);
        console.log(`    min    = ${Math.min(...tsTimes).toFixed(4)}s`);
        console.log(`    max    = ${Math.max(...tsTimes).toFixed(4)}s`);

        console.log(`\n  Native AST Parse Time (${naTimes.length} runs):`);
        console.log(`    mean   = ${avg(naTimes).toFixed(4)}s`);
        console.log(`    std    = ${std(naTimes).toFixed(4)}s`);
        console.log(`    median = ${median(naTimes).toFixed(4)}s`);
        console.log(`    min    = ${Math.min(...naTimes).toFixed(4)}s`);
        console.log(`    max    = ${Math.max(...naTimes).toFixed(4)}s`);

        const speedup = avg(naTimes) / avg(tsTimes);
        console.log(`\n  ⚡ Average speedup: Tree-sitter is ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'}`);
        console.log('═══════════════════════════════════════════════════════\n');
    }

    console.log('[3/3] Done. Check benchmark-results/ directory for detailed JSON & CSV files.');
})();
