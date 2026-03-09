class Rectangle:
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height

    def get_area(self) -> int:
        return self.width * self.height

    def get_perimeter(self) -> int:
        return 2 * (self.width + self.height)

if __name__ == "__main__":
    rect = Rectangle(5, 10)
    print(f"Area: {rect.get_area()}")
    print(f"Perimeter: {rect.get_perimeter()}")