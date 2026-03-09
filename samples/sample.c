#include <stdio.h>

typedef struct {
    int width;
    int height;
} Rectangle;

int getArea(Rectangle r) {
    return r.width * r.height;
}

int getPerimeter(Rectangle r) {
    return 2 * (r.width + r.height);
}

int main() {
    Rectangle rect = {5, 10};
    
    printf("Area: %d\n", getArea(rect));
    printf("Perimeter: %d\n", getPerimeter(rect));
    
    return 0;
}