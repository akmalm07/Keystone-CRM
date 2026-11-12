import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { authorizedSignupEmails } from '../db/schema.js';

export const signupAccessMessage = 'This email is not approved for signup. Please request access.';

export async function canSignUp(email) {
  const [approval] = await db.select({ email: authorizedSignupEmails.email })
    .from(authorizedSignupEmails)
    .where(eq(authorizedSignupEmails.email, email.trim().toLowerCase()))
    .limit(1);
  return Boolean(approval);
}
