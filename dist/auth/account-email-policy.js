"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAllowedAccountEmail = isAllowedAccountEmail;
exports.assertAllowedAccountEmail = assertAllowedAccountEmail;
exports.IsAllowedAccountEmail = IsAllowedAccountEmail;
const class_validator_1 = require("class-validator");
const common_1 = require("@nestjs/common");
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const OFFICIAL_DOMAIN = 'mcit.gov.eg';
const STAGING_SYNTHETIC_DOMAIN = 'synthetic.local';
function isAllowedAccountEmail(value, deployment = process.env.MCIT_DEPLOYMENT_ENV, nodeEnv = process.env.NODE_ENV) {
    if (typeof value !== 'string')
        return false;
    const email = value.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email))
        return false;
    const domain = email.slice(email.lastIndexOf('@') + 1);
    if (deployment?.trim().toLowerCase() === 'staging') {
        return domain === OFFICIAL_DOMAIN || domain === STAGING_SYNTHETIC_DOMAIN;
    }
    if (deployment?.trim().toLowerCase() === 'production' || nodeEnv === 'production') {
        return domain === OFFICIAL_DOMAIN;
    }
    return nodeEnv === 'test' && domain !== STAGING_SYNTHETIC_DOMAIN;
}
function assertAllowedAccountEmail(value) {
    if (!isAllowedAccountEmail(value)) {
        throw new common_1.BadRequestException('Use an official @mcit.gov.eg email address; @synthetic.local is staging-only.');
    }
}
function IsAllowedAccountEmail(options) {
    return (target, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            name: 'isAllowedAccountEmail',
            target: target.constructor,
            propertyName: propertyName.toString(),
            options,
            validator: {
                validate(value) {
                    return isAllowedAccountEmail(value);
                },
                defaultMessage(args) {
                    const email = typeof args.value === 'string' ? args.value.trim().toLowerCase() : '';
                    if (email.endsWith(`@${STAGING_SYNTHETIC_DOMAIN}`)) {
                        return '@synthetic.local addresses are only allowed in staging.';
                    }
                    return 'Use a valid @mcit.gov.eg email address.';
                },
            },
        });
    };
}
//# sourceMappingURL=account-email-policy.js.map