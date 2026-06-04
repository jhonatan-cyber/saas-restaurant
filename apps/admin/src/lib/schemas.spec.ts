import { describe, expect, it } from 'vitest';
import { loginFormDefaults, loginFormSchema } from './schemas';

describe('loginFormSchema', () => {
  it('normalizes email and tenant slug', () => {
    const parsed = loginFormSchema.parse({
      email: '  OWNER@Demo.COM ',
      password: 'Owner123!',
      businessSlug: ' Demo ',
    });

    expect(parsed).toEqual({
      email: 'owner@demo.com',
      password: 'Owner123!',
      businessSlug: 'demo',
    });
  });

  it('keeps the login default tenant slug aligned with the demo tenant', () => {
    expect(loginFormDefaults).toMatchObject({
      businessSlug: 'demo',
    });
  });
});
