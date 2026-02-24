const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const fs = require('fs').promises;
const path = require('path');

// 1. 파서 인스턴스 초기화 (전역 재사용)
const parser = new Parser();
parser.setLanguage(JavaScript);

/**
 * Range 변환 헬퍼 함수
 */
function mapRange(start, end) {
    return {
        start: { line: start.row, col: start.column },
        end: { line: end.row, col: end.column }
    };
}

/**
 * AST 노드 재귀 탐색 함수
 */
function traverseNode(node) {
    let result = [];

    // 현재 노드의 자식들을 순회
    for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);

        result.push({
            type: child.type,
            text: child.text,
            range: mapRange(child.startPosition, child.endPosition),
            children: traverseNode(child)
        });
    }
    return result;
}

/**
 * [수정됨] 함수 이름을 parseJavascript로 통일
 * 요청하신 JSON 구조를 반환합니다.
 */
async function parseJavascript(filePath) {
    try {
        const code = await fs.readFile(filePath, 'utf8');
        const tree = parser.parse(code);

        // AST 순회 및 구조화
        const astChildren = traverseNode(tree.rootNode);

        // 파일 노드 생성
        const fileStructure = {
            type: "file",
            name: path.basename(filePath),
            range: mapRange(tree.rootNode.startPosition, tree.rootNode.endPosition),
            children: astChildren
        };

        // 디렉토리 노드 생성
        const dirStructure = {
            type: "directory",
            name: path.dirname(filePath),
            range: mapRange(tree.rootNode.startPosition, tree.rootNode.endPosition),
            children: [fileStructure]
        };

        return [dirStructure]; // 배열 반환

    } catch (error) {
        console.error(`Tree-sitter error processing ${filePath}:`, error);
        throw error;
    }
}

// 실행 블록
if (require.main === module) {
    const filePath = process.argv[2];
    if (filePath) {
        (async () => {
            try {
                // 함수 호출 이름 일치
                const result = await parseJavascript(filePath);
                console.log(JSON.stringify(result, null, 4));
            } catch (err) {
                console.error('Tree-sitter error:', err.message);
                process.exit(1);
            }
        })();
    } else {
        console.log('Usage: node tree_sitter_json.js <file_path>');
    }
}

// 모듈 내보내기 이름 일치
module.exports = { parseJavascript };