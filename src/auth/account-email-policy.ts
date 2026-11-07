import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const OFFICIAL_DOMAIN = 'mcit.gov.eg';
const STAGING_SYNTHETIC_DOMAIN = 'synthetic.local';

export function isAllowedAccountEmail(
  value: unknown,
  deployment = process.env.MCIT_DEPLOYMENT_ENV,
  nodeEnv = process.env.NODE_ENV,
): value is string {
  if (typeof value !== 'string') return false;

  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return false;
  const domain = email.slice(email.lastIndexOf('@') + 1);

  if (deployment?.trim().toLowerCase() === 'staging') {
    return domain === OFFICIAL_DOMAIN || domain === STAGING_SYNTHETIC_DOMAIN;
  }

  if (deployment?.trim().toLowerCase() === 'production' || nodeEnv === 'production') {
    return domain === OFFICIAL_DOMAIN;
  }

  // Test fixtures may use non-production domains, but synthetic.local is reserved
  // exclusively for an explicitly marked staging deployment.
  return nodeEnv === 'test' && domain !== STAGING_SYNTHETIC_DOMAIN;
}

export function assertAllowedAccountEmail(value: unknown): asserts value is string {
  if (!isAllowedAccountEmail(value)) {
    throw new BadRequestException(
      'Use an official @mcit.gov.eg email address; @synthetic.local is staging-only.',
    );
  }
}

export function IsAllowedAccountEmail(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isAllowedAccountEmail',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options,
      validator: {
        validate(value: unknown) {
          return isAllowedAccountEmail(value);
        },
        defaultMessage(args: ValidationArguments) {
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
