#include <stdio.h>
#include <stdlib.h>
#include <clang-c/Index.h>

/**
 * libclang을 이용한 재귀적 AST 탐색 함수 (Visitor 패턴)
 */
enum CXChildVisitResult visitor(CXCursor cursor, CXCursor parent, CXClientData client_data) {
    int *level = (int *)client_data;
    
    // 현재 커서(노드)의 종류(Kind)와 텍스트(Spelling) 가져오기
    CXString kind_spelling = clang_getCursorKindSpelling(clang_getCursorKind(cursor));
    CXString spelling = clang_getCursorSpelling(cursor);
    
    // 들여쓰기를 통한 트리 구조 표현
    for (int i = 0; i < *level; ++i) {
        printf("  ");
    }
    
    printf("%s: \'%s\'\n", clang_getCString(kind_spelling), clang_getCString(spelling));
    
    clang_disposeString(kind_spelling);
    clang_disposeString(spelling);
    
    // 자식 노드 재귀 탐색
    int next_level = *level + 1;
    clang_visitChildren(cursor, visitor, &next_level);
    
    return CXChildVisit_Continue;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s <c_file_path>\n", argv[0]);
        return 1;
    }

    // 1. clang 인덱스(Index) 생성
    CXIndex index = clang_createIndex(0, 0);

    // 2. C 소스코드 구문 분석(Parsing)
    CXTranslationUnit unit = clang_parseTranslationUnit(
        index,
        argv[1], 
        NULL, 0,
        NULL, 0,
        CXTranslationUnit_None
    );

    if (unit == NULL) {
        fprintf(stderr, "Error: Unable to parse translation unit. Make sure the file exists and is valid C/C++.\n");
        clang_disposeIndex(index);
        return 1;
    }

    // 3. 최상위 AST 커서(TranslationUnit) 가져오기
    CXCursor cursor = clang_getTranslationUnitCursor(unit);
    
    // 4. 루트 노드 출력
    CXString spelling = clang_getCursorSpelling(cursor);
    CXString kind_spelling = clang_getCursorKindSpelling(clang_getCursorKind(cursor));
    printf("%s: \'%s\'\n", clang_getCString(kind_spelling), clang_getCString(spelling));
    clang_disposeString(spelling);
    clang_disposeString(kind_spelling);

    // 5. 트리 순회 시작
    int level = 1;
    clang_visitChildren(cursor, visitor, &level);

    // 6. 메모리 정리
    clang_disposeTranslationUnit(unit);
    clang_disposeIndex(index);

    return 0;
}
