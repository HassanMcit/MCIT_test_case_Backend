"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtSecret = getJwtSecret;
const node_crypto_1 = require("node:crypto");
let localEphemeralSecret;
function getJwtSecret(env = process.env) {
    const configured = env.JWT_SECRET?.trim();
    if (configured)
        return configured;
    if (env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be explicitly configured before starting in production.');
    }
    localEphemeralSecret ??= (0, node_crypto_1.randomBytes)(32).toString('base64url');
    return localEphemeralSecret;
}
//# sourceMappingURL=jwt-secret.js.map