const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function parseTypescript(filePath) {
    try {
        const absPath = path.resolve(filePath);
        const code = fs.readFileSync(absPath, 'utf8');

        // TypeScript Compiler API를 직접 사용하여 파일 파싱
        const sourceFile = ts.createSourceFile(
            path.basename(absPath),
            code,
            ts.ScriptTarget.Latest,
            true // setParentNodes (부모 노드 정보 활성화)
        );

        // 재귀적인 AST 탐색
        function traverse(node) {
            // ts.SyntaxKind Enum 값을 통해 노드 종류 이름을 가져옴
            const kindName = ts.SyntaxKind[node.kind];

            const nodeData = {
                kind: kindName,
                text: node.getText(sourceFile).trim(),
                range: {
                    start: node.getStart(sourceFile),
                    end: node.getEnd()
                }
            };

            const children = [];
            ts.forEachChild(node, child => {
                children.push(traverse(child));
            });

            if (children.length > 0) {
                nodeData.children = children;
            }

            return nodeData;
        }

        const result = traverse(sourceFile);
        return JSON.stringify(result, null, 2);
    } catch (e) {
        return JSON.stringify({ error: e.message });
    }
}

if (require.main === module) {
    const filePath = process.argv[2];
    if (filePath) {
        console.log(parseTypescript(filePath));
    } else {
        console.log(parseTypescript("../samples/sample.ts"));
    }
}

module.exports = { parseTypescript };