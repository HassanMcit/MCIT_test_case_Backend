export declare enum ProjectEnvironment {
    PRODUCTION = "production",
    STAGING = "staging"
}
export declare enum ProjectStatus {
    ACTIVE = "active",
    ARCHIVED = "archived"
}
export declare class CreateProjectDto {
    name: string;
    description?: string;
    environment?: ProjectEnvironment;
    status?: ProjectStatus;
}
declare const UpdateProjectDto_base: import("@nestjs/common").Type<Partial<CreateProjectDto>>;
export declare class UpdateProjectDto extends UpdateProjectDto_base {
}
export {};
