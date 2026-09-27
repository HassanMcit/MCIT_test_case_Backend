import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    db: DatabaseSync;
    onModuleInit(): void;
    onModuleDestroy(): void;
    private initTables;
    private seedInitialData;
}
