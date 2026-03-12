# Evaluation Results Storage Organization

이 문서는 파서의 평가 결과가 저장되는 구조와 방식을 체계적으로 정리한 가이드입니다.

## 1. 전체 저장 구조

평가 결과는 크게 **벤치마크 지표(Metrics)**와 **개별 파일 AST(Structural Results)**로 나뉘어 저장됩니다.

```
project-root/
├── benchmark-results/          # [Systematic] 파서 성능 및 통계 데이터
│   ├── {parser_name}/          # (예: tree-sitter, native-ast)
│   │   ├── stats/              # 성능 통계 지표
│   │   │   ├── benchmark.csv   # 누적 벤치마크 데이터 (시계열 분석용)
│   │   │   └── bench_{repo}_{ts}.json  # 개별 실행 상세 결과
│   │   └── ast/                # 전체 레포지토리 AST 스냅샷 (선택사항)
│   │       └── ast_{repo}_{ts}.json
│   └── ...
└── parser-results/             # [Debug/Samples] 개별 파일 파싱 테스트 결과
    ├── sample.java.json
    ├── sample.py.json
    └── ...
```

## 2. 세부 저장 방식

### 2.1 Benchmark Results (metrics)
`src/benchmark.js`의 `BenchmarkCollector` 클래스를 통해 관리됩니다.

- **저장 위치**: `./benchmark-results/{parserName}/stats/`
- **저장 파일**:
    - `benchmark.csv`: 모든 실행 결과가 한 행씩 누적됩니다. (Time, Memory, Nodes, Depth 등 포함)
    - `bench_*.json`: 특정 시점의 상세 실행 결과(언어별 통계 포함)가 저장됩니다.
- **자동화**: `index.js` 또는 `index_treesitter.js` API 호출 시 분석이 완료되면 자동으로 저장됩니다.

### 2.2 AST Results (structural)
파싱된 트리의 실제 구조 데이터를 저장합니다.

- **스냅샷 저장**: 벤치마크 시 `ast` 폴더에 레포지토리 전체의 트리 구조가 JSON으로 저장됩니다.
- **샘플 저장**: `test_scripts/save_asts.js` 실행 시 `parser-results/` 디렉토리에 주요 샘플 파일들의 파싱 결과가 덤프됩니다. (디버깅 및 시각화 확인용)

## 3. 주요 변경 사항 및 설정

- **경로 정규화**: 기존의 하드코딩된 `/app/benchmark-results` 경로를 프로젝트 상대 경로인 `./benchmark-results`로 변경하여 로컬 환경과 컨테이너 환경 모두에서 일관되게 동작하도록 수정했습니다.
- **파서별 분리**: `tree-sitter`와 `native-ast` 결과가 섞이지 않도록 최상위 디렉토리를 분리했습니다.
- **태그 체계**: 파일명에 레포지토리 이름과 타임스탬프를 포함하여 결과 추적이 용이하도록 했습니다.

## 4. 활용 방법

- **성능 분석**: `benchmark-results/{parser}/stats/benchmark.csv` 파일을 엑셀이나 데이터 분석 도구로 로드하여 파서 간 성능(시간, 메모리, 노드 수)을 비교할 수 있습니다.
- **구조 검증**: `parser-results/`의 JSON 파일을 통해 각 파서가 생성하는 노드 타입과 계층 구조가 정확한지 확인할 수 있습니다.
