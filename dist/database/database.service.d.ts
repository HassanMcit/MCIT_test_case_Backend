import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    db: DatabaseSync;
    onModuleInit(): void;
    onModuleDestroy(): void;
    getPersistedPhoto(): string;
    private runMigrations;
    private initTables;
    private seedInitialData;
}
