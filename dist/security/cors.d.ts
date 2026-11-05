import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
export declare const PRODUCTION_FRONTEND_ORIGIN = "https://mcit-test-case-front.vercel.app";
export declare const PRODUCTION_BACKEND_ORIGIN = "https://mcit-test-case-backend.onrender.com";
export declare function createCorsOptions(additionalOrigins?: string): CorsOptions;
