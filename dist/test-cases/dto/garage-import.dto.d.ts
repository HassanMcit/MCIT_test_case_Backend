export declare class GarageImportRowDto {
    original: Record<string, string | null>;
}
export declare class GarageImportDto {
    dryRun: boolean;
    previewHash?: string;
    rows: GarageImportRowDto[];
}
