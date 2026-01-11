const { Project } = require('ts-morph');

function parseTypescript(filePath) {
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(filePath);

    // Demonstrate getting structure
    const structure = sourceFile.getStructure();
    return JSON.stringify(structure, null, 2);
}

if (require.main === module) {
    const filePath = process.argv[2];
    if (filePath) {
        console.log('--- ts-morph (TypeScript) ---');
        console.log(parseTypescript(filePath));
    }
}

module.exports = { parseTypescript };
