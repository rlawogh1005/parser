# CodeVi Parser Server

Unified AST Parser for CodeVi Project — Tree-sitter 기반 & Native AST 기반 듀얼 파서 아키텍처.

## 📌 프로젝트 개요
이 프로젝트는 다양한 프로그래밍 언어의 소스 코드를 구문 분석(Parsing)하여 AST(Abstract Syntax Tree) 형태의 JSON 데이터로 변환해 주는 API 서버입니다.
두 가지 파서 엔진을 **별도의 컨테이너**로 분리하여 동시에 운영하며, 동일한 벤치마크 수집기를 통해 성능을 공정하게 비교할 수 있도록 설계되었습니다.

| 컨테이너 | 엔트리 포인트 | 포트 | 설명 |
|----------|-------------|------|------|
| `codevi-parser-treesitter` | `index_treesitter.js` | 3001 | Tree-sitter 기반 통합 파서 |
| `codevi-parser-raw` | `index_raw.js` | 3002 | 언어별 네이티브 파서 (JavaParser, ts-morph, python3 ast, Clang) |

> ⚠️ **`index.js`는 더 이상 사용되지 않습니다.** 기존에 단일 서버로 통합 운영하던 레거시 엔트리 포인트이며, 현재는 `index_treesitter.js`와 `index_raw.js`로 분리되어 각각의 Docker 컨테이너에서 독립 실행됩니다.

## ✨ 주요 기능
- **다국어 지원**: Java (`.java`), Python (`.py`), TypeScript (`.ts`), JavaScript (`.js`), C++ (`.cpp`), C (`.c`), Header (`.h`)
- **듀얼 파서 엔진**:
  - **Tree-sitter 파서** (`index_treesitter.js`): Tree-sitter가 생성하는 전체 Raw AST를 그대로 JSON으로 변환하여 반환
  - **Native AST 파서** (`index_raw.js`): 언어별 전용 파서(JavaParser, ts-morph, python3 ast, Clang)를 호출하여 각 언어 고유의 AST를 반환
- **아카이브 기반 일괄 분석**: Zip 파일을 업로드하면, 압축 해제 → 디렉토리 순회 → 전체 소스 파일 AST 결과를 트리 구조 JSON으로 반환
- **내장 벤치마크**: 모든 분석 요청에 대해 파싱 시간, LOC, 메모리 사용량 등 성능 지표를 자동 수집

## 🛠️ 기술 스택

### Tree-sitter 파서 (`index_treesitter.js`)
- **Runtime**: Node.js 20 (Alpine)
- **Parser**: Tree-sitter
  - `tree-sitter-java`, `tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-cpp`
- **Framework**: Express

### Native AST 파서 (`index_raw.js`)
- **Runtime**: Node.js 20 (Debian Bullseye)
- **Parsers**:
  - Java → JavaParser (`lib/javaparser-core.jar` + `src/ParseJava.java`)
  - TypeScript / JavaScript → ts-morph (`src/parse_typescript.js`)
  - Python → python3 내장 ast (`src/parse_python.py`)
  - C → Clang AST dump (`src/parse_c.c` → 컴파일된 `src/parse_c`)
- **Framework**: Express

### 공통
- **File Upload & Zip**: Multer, Adm-zip
- **Benchmark**: `src/benchmark.js` (`BenchmarkCollector` 클래스)

## 🚀 API 명세서

### `POST /analyze`
압축 파일(Zip)을 통째로 업로드 받아 전체 프로젝트 구조와 AST를 반환합니다.

- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: 소스 코드 파일/폴더가 담긴 Zip 파일
- **Query Parameters**:
  - `repoName` (선택): 레포지토리 이름 (벤치마크 결과에 기록)
- **Response (200 OK)**:
  ```json
  {
    "nodes": [
      {
        "type": "directory",
        "name": "project_folder",
        "filePath": "/path/to/project_folder",
        "children": [
          {
            "type": "file",
            "name": "example.js",
            "filePath": "/path/to/example.js",
            "ast": { "type": "program", "..." : "..." }
          }
        ]
      }
    ],
    "timestamp": "2026-03-10T09:00:00.000Z",
    "benchmark": {
      "parser": "tree-sitter",
      "repo": "my-project",
      "files": 182,
      "loc": 23812,
      "parseTimeSec": 1.23,
      "totalTimeSec": 1.55,
      "peakRssMB": 124.5,
      "peakHeapMB": 45.2,
      "languages": { "java": { "files": 50, "loc": 8000, "parseTimeSec": 0.32 } }
    }
  }
  ```

### `GET /health`
서버 헬스체크용 엔드포인트입니다.
- **Tree-sitter**: `OK (TreeSitter)`
- **Native AST**: `OK (Raw Parser)`

## ⚙️ 설치 및 실행 방법

### Docker Compose (권장)
```bash
# 양쪽 파서 컨테이너를 동시에 빌드 및 실행
docker-compose up -d --build
```

> ⚠️ 양 컨테이너 모두 `cpus: 2`, `memory: 4g`로 제한되어 공정한 벤치마크 비교가 가능합니다.

### 로컬 환경 기반 실행
```bash
# 1. 패키지 설치
npm install

# 2-A. Tree-sitter 파서 실행 (포트 3001)
node index_treesitter.js

# 2-B. Native AST 파서 실행 (포트 3002)
#      ※ Java, Python, Clang 런타임이 로컬에 설치되어 있어야 합니다.
node index_raw.js
```

> ❌ **`node index.js`는 더 이상 지원되지 않습니다.** 위의 개별 엔트리 포인트를 사용하세요.

## 📁 프로젝트 구조

```
parser/
├── index_treesitter.js          # ✅ Tree-sitter 파서 엔트리 포인트 (포트 3001)
├── index_raw.js                 # ✅ Native AST 파서 엔트리 포인트 (포트 3002)
├── index.js                     # ❌ 레거시 (사용하지 않음)
│
├── src/                         # 코어 모듈
│   ├── benchmark.js             #   벤치마크 수집기 (BenchmarkCollector)
│   ├── parse_treesitter.js      #   Tree-sitter JavaScript 파싱 모듈
│   ├── parse_typescript.js      #   ts-morph 기반 TS/JS 파싱 모듈
│   ├── parse_python.py          #   Python ast 기반 파싱 스크립트
│   ├── parse_c.c                #   Clang AST dump C 소스
│   ├── parse_c                  #   (빌드된) C 파서 바이너리
│   ├── ParseJava.java           #   JavaParser 기반 Java 파싱 소스
│   └── setup_java.js            #   Java 환경 설정 유틸리티
│
├── lib/                         # 외부 라이브러리
│   └── javaparser-core.jar      #   JavaParser JAR
│
├── test_scripts/                # 테스트 스크립트
│   ├── test_benchmark.js        #   벤치마크 자동화 테스트
│   ├── test_all.js              #   전체 파서 통합 테스트
│   ├── save_asts.js             #   AST 결과 저장 스크립트
│   ├── test_java.js             #   Java 파싱 테스트
│   ├── test_py.js               #   Python 파싱 테스트
│   ├── test_ts.js               #   TypeScript 파싱 테스트
│   ├── test_js_acorn.js         #   JavaScript 파싱 테스트 (Acorn)
│   └── test_js_treesitter.js    #   JavaScript 파싱 테스트 (Tree-sitter)
│
├── samples/                     # 테스트용 샘플 소스 파일
│   ├── sample.java
│   ├── sample.py
│   ├── sample.js
│   ├── sample.ts
│   └── sample.c
│
├── parser-results/              # 파싱 결과 저장소 (언어별 JSON)
├── benchmark-results/           # 벤치마크 결과 저장소
│   ├── treesitter/              #   Tree-sitter 벤치마크
│   │   ├── stats/               #     벤치마크 JSON + CSV
│   │   └── ast/                 #     AST 데이터 JSON
│   └── native-ast/              #   Native AST 벤치마크
│       ├── stats/
│       └── ast/
│
├── Dockerfile                   # Tree-sitter 컨테이너 (Alpine)
├── Dockerfile.raw               # Native AST 컨테이너 (Debian)
├── docker-compose.yaml          # 듀얼 컨테이너 구성
├── package.json
│
├── test_endpoints.sh            # 양쪽 파서 벤치마크 비교 쉘 스크립트
├── reproduce_error.js           # 에러 재현/예외 처리 테스트
└── debug_java.js                # JavaParser 디버깅 유틸리티
```

## 📊 벤치마크 (Parser Performance Benchmark)

### 측정 항목

| Metric | 설명 |
|--------|------|
| **Parsing Latency** | 순수 파싱 소요 시간 (초 단위, `process.hrtime.bigint()` 기반 고정밀) |
| **Total Time** | ZIP 해제 ~ 결과 반환까지 전체 소요 시간 |
| **Throughput** | LOC/sec, files/sec |
| **Memory** | Peak RSS, Peak Heap (MB) |
| **Language Breakdown** | 언어별 파일 수, LOC, 파싱 시간 |

### 벤치마크 실행

#### 1. Docker Compose로 양쪽 컨테이너 실행
```bash
docker-compose up -d --build
```

#### 2. 벤치마크 실행 (Node.js 스크립트)
```bash
# 기본 실행 (samples 디렉토리 대상)
node test_scripts/test_benchmark.js

# 특정 디렉토리, 5회 반복
node test_scripts/test_benchmark.js --dir /path/to/code --repeat 5

# 레포 이름 지정
node test_scripts/test_benchmark.js --dir ./my-project --repo my-project --repeat 10
```

#### 3. 벤치마크 실행 (Shell 스크립트)
```bash
# 기본
./test_endpoints.sh

# 특정 디렉토리, 3회 반복
./test_endpoints.sh /path/to/code 3
```

### 결과 저장 구조

```
benchmark-results/
├── treesitter/                      # Tree-sitter 컨테이너
│   ├── stats/
│   │   ├── bench_tree-sitter_xxx_2026-03-10T...json
│   │   └── benchmark.csv
│   └── ast/
│       └── ast_tree-sitter_xxx_2026-03-10T...json
└── native-ast/                      # Native AST 컨테이너
    ├── stats/
    │   ├── bench_native-ast_xxx_2026-03-10T...json
    │   └── benchmark.csv
    └── ast/
        └── ast_native-ast_xxx_2026-03-10T...json
```

### CSV 포맷

```csv
timestamp,parser,repo,language,files,loc,parse_sec,total_sec,peak_rss_mb,peak_heap_mb
2026-03-10T09:00:00Z,tree-sitter,my-repo,java,50,8000,0.32,1.55,124.5,45.2
2026-03-10T09:00:05Z,native-ast,my-repo,java,50,8000,1.24,4.10,198.3,78.1
```

### JSON 결과 포맷

```json
{
  "parser": "tree-sitter",
  "repo": "my-project",
  "timestamp": "2026-03-10T09:00:00.000Z",
  "files": 182,
  "loc": 23812,
  "parseTimeSec": 1.23,
  "totalTimeSec": 1.55,
  "peakRssMB": 124.5,
  "peakHeapMB": 45.2,
  "languages": {
    "java": { "files": 50, "loc": 8000, "parseTimeSec": 0.32 },
    "typescript": { "files": 80, "loc": 12000, "parseTimeSec": 0.45 }
  }
}
```
