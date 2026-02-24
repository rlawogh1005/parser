// Enhanced Sample JavaScript Code

// Global Variable
const GLOBAL_CONFIG = {
    version: "1.0.0",
    debug: true
};

/**
 * Rectangle Class
 */
class Rectangle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    // Method with multiple parameters
    calculateArea(scale = 1, unit = 'cm') {
        const area = this.width * this.height * scale; // Local variable
        console.log(`Area: ${area} ${unit}^2`);
        return area;
    }

    // Static method
    static createSquare(side) {
        return new Rectangle(side, side);
    }
}

// Function with multiple parameters
function addNumbers(a, b) {
    let result = a + b; // Local variable
    return result;
}

// Main execution
const rect = new Rectangle(10, 20);
rect.calculateArea(1.5, 'm');

const sum = addNumbers(5, 10);
console.log("Sum:", sum);
