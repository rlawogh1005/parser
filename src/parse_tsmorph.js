const { Project } = require('ts-morph');

function parseTypescript(filePath) {
    // 1. Project 초기화 및 파일 로드
    const project = new Project();
    let sourceFile;

    try {
        sourceFile = project.addSourceFileAtPath(filePath);
    } catch (e) {
        console.error(`Error loading file: ${e.message}`);
        return JSON.stringify({ error: "File not found" });
    }

    // 2. 전체 AST를 재귀적으로 순회하는 함수
    // 필터링 없이 모든 노드(node)를 방문하여 구조화함
    function traverse(node) {
        const nodeData = {
            kind: node.getKindName(), // SyntaxKind를 사람이 읽을 수 있는 문자열로 변환 (예: ClassDeclaration)
            text: node.getText().trim(),     // 해당 노드의 실제 텍스트 (공백 제거)
            range: {
                start: node.getStart(),
                end: node.getEnd()
            }
        };

        // 자식 노드가 있다면 재귀적으로 탐색
        const children = [];
        node.forEachChild(child => {
            children.push(traverse(child));
        });

        if (children.length > 0) {
            nodeData.children = children;
        }

        return nodeData;
    }

    // 3. 최상위 파일 노드부터 탐색 시작
    const result = traverse(sourceFile);

    return JSON.stringify(result, null, 2);
}

// 실행부
if (require.main === module) {
    const filePath = process.argv[2];
    if (filePath) {
        console.log(parseTypescript(filePath));
    } else {
        console.log("Usage: node parser.js <file-path>");
    }
}

module.exports = { parseTypescript };