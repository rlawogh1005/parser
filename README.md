# CodeVi Parser Server

Unified AST Parser for CodeVi Project, built with Node.js and Tree-sitter.

## 📌 프로젝트 개요
이 프로젝트는 다양한 프로그래밍 언어의 소스 코드를 구문 분석(Parsing)하여 표준화된 추상 구문 트리(AST, Abstract Syntax Tree) 형태의 JSON 데이터로 변환해 주는 API 서버입니다. 여러 언어별로 존재하던 구문 분석기를 **Tree-sitter** 하나로 통일하여 단일 Express 서버 형태로 구축하였습니다.
생성된 AST 데이터는 대상 코드의 구조를 파악하고, 코드 품질 및 메트릭 등 다양한 분석에 핵심적인 요소로 활용됩니다.

## ✨ 주요 기능
- **다국어 지원**: Java (`.java`), Python (`.py`), TypeScript (`.ts`), JavaScript (`.js`), C++ (`.cpp`), Header (`.h`)
- **표준화된 AST 추출**: 각 언어별로 상이한 `tree-sitter` 노드 타입 중 클래스와 메서드 관련 노드만을 `CLASS`, `METHOD`, `INTERFACE`로 정규화하여 추출함으로써, 어느 언어이든 일관성 있는 4계층 구조 응답을 제공합니다.
- **아카이브 기반 일괄 분석**: 분석할 프로젝트가 담긴 Zip 파일을 업로드하면, 압축을 해제하고 디렉토리를 순회하면서 모든 소스 파일의 AST 결과를 트리 구조의 단일 JSON으로 묶어 반환합니다.

## 🛠️ 기술 스택
- **Backend API**: Node.js, Express
- **Parser Core**: Tree-sitter 
  - `tree-sitter-java`
  - `tree-sitter-python`
  - `tree-sitter-javascript`
  - `tree-sitter-typescript`
  - `tree-sitter-cpp`
- **File Upload & Utils**: Multer, Adm-zip

## 🚀 API 명세서

### `POST /analyze`
압축 파일(Zip)을 통째로 업로드 받아 전체 프로젝트 구조와 AST를 반환합니다.

- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: 소스 코드 파일/폴더가 담긴 Zip 파일
- **Response (200 OK)**:
  ```json
  {
    "nodes": [
      {
        "type": "DIRECTORY",
        "name": "project_folder",
        "children": [
          {
            "type": "FILE",
            "name": "example.js",
            "children": [
              {
                "type": "CLASS",
                "name": "ExampleClass",
                "range": { "start": { "line": 1, "col": 0 }, "end": { "line": 10, "col": 1 } },
                "children": [
                  {
                    "type": "METHOD",
                    "name": "exampleMethod",
                    "range": { "start": { "line": 2, "col": 4 }, "end": { "line": 9, "col": 5 } },
                    "children": []
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "timestamp": "2026-02-24T05:00:00.000Z"
  }
  ```

### `GET /health`
서버 헬스체크용 엔드포인트입니다.
- **Response**: `OK`

## ⚙️ 설치 및 실행 방법

### 로컬 환경 기반 실행
```bash
# 1. 패키지 설치
npm install

# 2. 서버 실행 (기본 포트: 3001)
node index.js
```

### Docker를 이용한 실행
```bash
# Docker Compose로 이미지 빌드 및 컨테이너 백그라운드 실행
docker-compose up -d --build
```

## 📁 프로젝트 구조 및 주요 파일

- **`index.js`**: 애플리케이션의 엔트리 포인트입니다. 파일 업로드 캐치, 압축 해제, 파일 시스템 순회 및 Tree-sitter 기반 파싱 로직을 포함합니다.
- **`Dockerfile` / `docker-compose.yaml`**: 배포 및 애플리케이션 컨테이너화를 위한 구성을 정의합니다.
- **`test_*.js`**: 파서 모듈 도입 초기, 각 파서 라이브러리가 정상적으로 동작하는지 개별적으로 검증하기 위해 작성된 파일 기반 테스트 스크립트들입니다.
  - `test_js_acorn.js`: JavaScript 코드 테스트 (Acorn 라이브러리 기반)
  - `test_ts.js`: TypeScript 코드 테스트 (ts-morph 라이브러리 기반)
  - `test_py.js`: Python 코드 테스트 (파이썬 내장 `ast` 기반)
  - `test_java.js`: Java 코드 테스트 (JavaParser 라이브러리 및 `ParseJava.class` 기반)
  - `test_js_treesitter.js`: Tree-sitter로 파서 엔진 통일 후 JavaScript 파싱 동작 테스트
- **`debug_java.js`**: JavaParser 사용 시, 시스템 Java 컴파일러(`javac`)의 동작 상태를 점검하기 위한 디버깅용 파일입니다.
- **`reproduce_error.js`**: Tree-sitter 도입 시 잘못된 입력(빈 문자열, `null` 등)을 넣었을 때 에러 로직을 파악하고 예외를 처리하기 위한 테스트용 코드입니다.
- **`test_endpoints.sh`**: 양쪽 파서 컨테이너에 zip을 보내고 벤치마크 결과를 비교하는 쉘 스크립트입니다.
- **`src/benchmark.js`**: 파서 성능 벤치마크 측정 모듈 (Latency, LOC, Throughput, Memory, Robustness).

## 📊 벤치마크 (Parser Performance Benchmark)

### 측정 항목

| Metric | 설명 |
|--------|------|
| **Parsing Latency** | 파싱 소요 시간 (초 단위, `process.hrtime.bigint()` 기반 고정밀) |
| **Throughput** | LOC/sec, files/sec |
| **Memory** | Peak RSS, Peak Heap (MB) |
| **Success Rate** | 파싱 성공률 (Robustness / 파싱 커버리지) |
| **Error Nodes** | Tree-sitter의 ERROR 노드 개수 (error-tolerant parsing 측정) |
| **Language Breakdown** | 언어별 파일 수, LOC, 시간, 성공률 |

### 실행 방법

#### 1. Docker Compose로 양쪽 컨테이너 실행
```bash
docker-compose up -d --build
```

> ⚠️ 양 컨테이너 모두 `cpus: 2`, `memory: 4g`로 제한되어 공정한 비교가 가능합니다.

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

### 벤치마크 API 엔드포인트

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/analyze?repoName=xxx` | POST | 파싱 + 벤치마크 결과 포함 응답 |
| `/benchmark/results` | GET | 저장된 벤치마크 JSON 결과 목록 조회 |
| `/benchmark/summary` | GET | 누적 벤치마크 CSV 다운로드 |

### 결과 저장 구조

```
benchmark-results/
├── treesitter/                      # Tree-sitter 컨테이너 결과
│   ├── benchmark_tree-sitter_xxx_2026-03-10T...json
│   └── benchmark_summary.csv
└── native-ast/                      # Native AST 컨테이너 결과
    ├── benchmark_native-ast_xxx_2026-03-10T...json
    └── benchmark_summary.csv
```

### CSV 포맷 예시

```csv
timestamp,parser,repo,files,success,failed,success_rate,loc,parse_time_sec,total_time_sec,loc_per_sec,files_per_sec,peak_rss_mb,peak_heap_mb
2026-03-10T09:00:00Z,tree-sitter,my-repo,182,180,2,98.9,23812,1.23,1.55,19359,147.97,124.5,45.2
2026-03-10T09:00:05Z,native-ast,my-repo,182,165,17,90.66,23812,3.82,4.10,6234,47.64,198.3,78.1
```

### JSON 결과 포맷 예시

```json
{
  "parser": "tree-sitter",
  "repo": "my-project",
  "timestamp": "2026-03-10T09:00:00.000Z",
  "summary": {
    "totalFiles": 182,
    "successFiles": 180,
    "failedFiles": 2,
    "successRate": 98.9,
    "totalLoc": 23812,
    "parseTimeSec": 1.23,
    "totalTimeSec": 1.55,
    "throughput": { "locPerSec": 19359, "filesPerSec": 147.97 },
    "memory": { "peakRssMB": 124.5, "peakHeapMB": 45.2 }
  },
  "languageBreakdown": {
    "java": { "files": 50, "loc": 8000, "successFiles": 50, "failedFiles": 0, "totalTimeMs": 320 },
    "typescript": { "files": 80, "loc": 12000, "successFiles": 78, "failedFiles": 2, "totalTimeMs": 450 }
  },
  "fileDetails": [
    { "file": "src/App.ts", "language": "typescript", "status": "success", "loc": 120, "parseTimeMs": 2.31, "errorNodes": 0, "error": null }
  ]
}
```
