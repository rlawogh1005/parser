class Rectangle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    getArea() {
        return this.width * this.height;
    }

    getPerimeter() {
        return 2 * (this.width + this.height);
    }
}

const rect = new Rectangle(5, 10);
console.log(`Area: ${rect.getArea()}`);
console.log(`Perimeter: ${rect.getPerimeter()}`);