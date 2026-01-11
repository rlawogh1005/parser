// Sample TypeScript Code
interface User {
    id: number;
    username: string;
    email?: string;
}

class UserManager {
    private users: User[] = [];

    addUser(user: User): void {
        this.users.push(user);
    }
}
