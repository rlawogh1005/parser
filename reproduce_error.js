const Parser = require('tree-sitter');
const Python = require('tree-sitter-python');
const parser = new Parser();
parser.setLanguage(Python);

console.log("Testing with empty string...");
try {
    parser.parse("");
    console.log("Empty string: OK");
} catch (e) {
    console.error("Empty string: Error -", e.message);
}

console.log("\nTesting with null...");
try {
    parser.parse(null);
    console.log("null: OK");
} catch (e) {
    console.error("null: Error -", e.message);
}

console.log("\nTesting with undefined...");
try {
    parser.parse(undefined);
    console.log("undefined: OK");
} catch (e) {
    console.error("undefined: Error -", e.message);
}

console.log("\nTesting with object...");
try {
    parser.parse({});
    console.log("object: OK");
} catch (e) {
    console.error("object: Error -", e.message);
}

console.log("\nTesting with a valid string...");
try {
    parser.parse("print('hello')");
    console.log("valid string: OK");
} catch (e) {
    console.error("valid string: Error -", e.message);
}
