const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

const fs = require('fs');

function parseJavascript(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const tree = parser.parse(code);
    return tree.rootNode.toString();
}

if (require.main === module) {
    const filePath = process.argv[2];
    if (filePath) {
        console.log('--- Tree-sitter (JavaScript) ---');
        console.log(parseJavascript(filePath));
    }
}

module.exports = { parseJavascript };
