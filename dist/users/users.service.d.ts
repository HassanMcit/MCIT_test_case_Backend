import { DatabaseService } from '../database/database.service';
export declare class UsersService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    findAll(): Promise<Record<string, import("node:sqlite").SQLOutputValue>[]>;
    findOne(id: number): Promise<any>;
}
