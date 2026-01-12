const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const fs = require('fs').promises; // fs.promises 사용

// 1. Parser 인스턴스를 전역(모듈 레벨)에서 한 번만 생성하여 재사용
const parser = new Parser();
parser.setLanguage(JavaScript);

/**
 * 비동기 방식으로 파일을 읽고 파싱 결과를 반환합니다.
 */
async function parseJavascript(filePath) {
    try {
        // 2. 비동기 I/O로 메인 스레드 블로킹 방지
        const code = await fs.readFile(filePath, 'utf8');

        // 이미 생성된 parser 인스턴스 재사용
        const tree = parser.parse(code);
        return tree.rootNode.toString();
    } catch (error) {
        console.error(`Error parsing file: ${filePath}`, error);
        throw error; // 에러를 호출자에게 전파
    }
}

// 메인 실행 블록
if (require.main === module) {
    const filePath = process.argv[2];
    if (filePath) {
        (async () => {
            try {
                console.log('--- Tree-sitter (JavaScript / Async) ---');
                const result = await parseJavascript(filePath);
                console.log(result);
            } catch (err) {
                process.exit(1);
            }
        })();
    } else {
        console.log('Usage: node script.js <file_path>');
    }
}

module.exports = { parseJavascript };