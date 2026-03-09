class Task:
    def __init__(self, task_id: int, title: str):
        self.id = task_id
        self.title = title
        self.is_completed = False

    def complete(self) -> None:
        self.is_completed = True
        print("Task completed: " + self.title)

my_task = Task(1, "Visualization")
my_task.complete()