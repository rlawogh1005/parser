class Task {
    constructor(id, title) {
        this.id = id;
        this.title = title;
        this.isCompleted = false;
    }

    complete() {
        this.isCompleted = true;
        console.log("Task completed: " + this.title);
    }
}

const myTask = new Task(1, "Visualization");
myTask.complete();