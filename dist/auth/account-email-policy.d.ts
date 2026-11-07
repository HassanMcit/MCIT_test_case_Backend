import { type ValidationOptions } from 'class-validator';
export declare function isAllowedAccountEmail(value: unknown, deployment?: string, nodeEnv?: string): value is string;
export declare function assertAllowedAccountEmail(value: unknown): asserts value is string;
export declare function IsAllowedAccountEmail(options?: ValidationOptions): PropertyDecorator;
