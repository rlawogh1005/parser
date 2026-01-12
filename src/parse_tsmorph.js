const { Project, SyntaxKind } = require('ts-morph');

function parseTypescript(filePath) {
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(filePath);

    function traverse(node) {
        const type = node.getKindName();
        const text = node.getText().substring(0, 50); // Truncate for brevity in visualization cache

        const children = [];
        node.forEachChild(child => {
            children.push(traverse(child));
        });

        const result = {
            type: type,
            // Add more metadata if needed
            // start: node.getStart(),
            // end: node.getEnd(),
        };

        // For visualization, helpful to have some label
        // If it's an Identifier, show the name
        if (node.getKind() === SyntaxKind.Identifier) {
            result.label = node.getText();
        } else if (children.length === 0) {
            // Leaf node, maybe show text
            result.label = text;
        }

        if (children.length > 0) {
            result.children = children;
        }

        return result;
    }

    const ast = traverse(sourceFile);
    return JSON.stringify(ast, null, 2);
}

if (require.main === module) {
    const filePath = process.argv[2];
    if (filePath) {
        console.log(parseTypescript(filePath));
    }
}

module.exports = { parseTypescript };
