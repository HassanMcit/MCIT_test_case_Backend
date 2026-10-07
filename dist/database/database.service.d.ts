import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    db: Pool;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    static readonly DEFAULT_PHOTO_URL = "https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png";
    getPersistedPhoto(): string;
    resolvePhotoUrl(user: {
        id: number;
        photo?: string;
        profileImage?: string;
        updatedAt?: string;
    } | undefined, req?: any): string;
    private runMigrations;
    private initTables;
    private seedInitialData;
}
