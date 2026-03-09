class Rectangle {
    constructor(public width: number, public height: number) { }

    getArea(): number {
        return this.width * this.height;
    }

    getPerimeter(): number {
        return 2 * (this.width + this.height);
    }
}

const rect = new Rectangle(5, 10);
console.log(`Area: ${rect.getArea()}`);
console.log(`Perimeter: ${rect.getPerimeter()}`);

export { }