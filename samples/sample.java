public class Task {
    int id;
    String title;
    boolean isCompleted;

    public Task(int id, String title) {
        this.id = id;
        this.title = title;
        this.isCompleted = false;
    }

    public void complete() {
        this.isCompleted = true;
        System.out.println("Task completed: " + this.title);
    }

    public static void main(String[] args) {
        Task myTask = new Task(1, "Visualization");
        myTask.complete();
    }
}