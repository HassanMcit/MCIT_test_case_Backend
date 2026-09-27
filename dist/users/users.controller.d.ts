import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<Record<string, import("node:sqlite").SQLOutputValue>[]>;
    findOne(id: number): Promise<any>;
}
