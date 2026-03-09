class Task {
    public isCompleted: boolean = false;

    constructor(public id: number, public title: string) { }

    complete(): void {
        this.isCompleted = true;
        console.log(`Task completed: ${this.title}`);
    }
}

const myTask = new Task(1, "Visualization");
myTask.complete();

export { };
