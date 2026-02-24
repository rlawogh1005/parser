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
- **`test_endpoints.sh`**: curl 명령어로 과거 언어별 엔드포인트들(`/parse/ts`, `/parse/py`, `/parse/java`)의 동작 결괏값을 점검하기 위해 쓰인 테스트 쉘 스크립트입니다.
