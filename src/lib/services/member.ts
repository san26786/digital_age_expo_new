import { prisma } from "@/lib/prisma";
import { DOMAIN_ID } from "@/lib/site-config";
import { generateSalt, hashPassword, verifyPassword } from "@/lib/auth/password";

export interface RegisterMemberInput {
  login: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  organization?: string;
}

export type RegisterMemberError = "login_taken" | "email_taken" | "phone_taken";

/**
 * Mirrors class_authentication.php::loadUser() — looks a member up by username or email within
 * this site's domain.
 *
 * The domain scope accepts 0 as well as DOMAIN_ID, and without that NO REAL ACCOUNT COULD LOG IN.
 * Every one of the 1,677 rows in find_users carries domain_id = 0 — the legacy platform never
 * populated it — so filtering on DOMAIN_ID alone could never match, and this query always returned
 * null. That is why the hardcoded demo credentials existed and were the only way into the member
 * area: real login had been broken the whole time.
 *
 * 0 is treated as "unscoped legacy row" rather than dropping the filter entirely, so
 * createMemberAccount()'s newly-registered members (which do write DOMAIN_ID) stay scoped as
 * intended.
 */
async function findUserForLogin(identifier: string) {
  return prisma.find_users.findFirst({
    where: {
      domain_id: { in: [DOMAIN_ID, 0] },
      OR: [{ login: identifier }, { user_email: identifier }],
    },
    select: {
      id: true,
      login: true,
      pass: true,
      password_salt: true,
      password_hash: true,
      user_email: true,
      user_first_name: true,
      user_last_name: true,
      user_status: true,
    },
  });
}

/**
 * Whether the hardcoded demo logins may be used.
 *
 * They used to be unconditional, and that made them a live authentication bypass: five branches
 * keyed on the password "password123", in a PUBLIC repository — including a catch-all that accepted
 * ANY identifier with that password. One returns id -30, which getEventMemberContext() grants the
 * organiser role, i.e. full access to every registration in the member area.
 *
 * Off in production. ALLOW_DEMO_LOGINS=1 re-enables them for a deployed preview; setting it in
 * production deliberately re-opens a known-password organiser login.
 */
const DEMO_LOGINS_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_LOGINS === "1";

/** The demo accounts, or null when the credentials are not one of them. Never called in production. */
function demoCredentials(ident: string, identifier: string, plainPassword: string) {
  if ((ident === "organiser" || ident === "organiser@demo.com" || ident === "organizer" || ident === "organizer@demo.com") && plainPassword === "password123") {
    return {
      id: -30,
      login: "organiser",
      pass: "demo",
      password_salt: "demo",
      password_hash: "sha256",
      user_email: "organiser@demo.com",
      user_first_name: "Oliver",
      user_last_name: "Organiser",
      user_status: "active",
    };
  }
  if ((ident === "exhibitor" || ident === "exhibitor@demo.com") && plainPassword === "password123") {
    return {
      id: -10,
      login: "exhibitor",
      pass: "demo",
      password_salt: "demo",
      password_hash: "sha256",
      user_email: "exhibitor@demo.com",
      user_first_name: "Emma",
      user_last_name: "Exhibitor",
      user_status: "active",
    };
  }
  if ((ident === "speaker" || ident === "speaker@demo.com") && plainPassword === "password123") {
    return {
      id: -20,
      login: "speaker",
      pass: "demo",
      password_salt: "demo",
      password_hash: "sha256",
      user_email: "speaker@demo.com",
      user_first_name: "Sarah",
      user_last_name: "Speaker",
      user_status: "active",
    };
  }
  if ((ident === "visitor" || ident === "visitor@demo.com") && plainPassword === "password123") {
    return {
      id: -40,
      login: "visitor",
      pass: "demo",
      password_salt: "demo",
      password_hash: "sha256",
      user_email: "visitor@demo.com",
      user_first_name: "Victor",
      user_last_name: "Visitor",
      user_status: "active",
    };
  }

  // Fallback demo account for testing any custom email/username with password123
  if (plainPassword === "password123") {
    return {
      id: -100,
      login: ident || "member",
      pass: "demo",
      password_salt: "demo",
      password_hash: "sha256",
      user_email: ident.includes("@") ? ident : `${ident}@demo.com`,
      user_first_name: identifier || "Demo",
      user_last_name: "User",
      user_status: "active",
    };
  }

  return null;
}

export async function verifyMemberCredentials(identifier: string, plainPassword: string) {
  // Support demo credentials for organiser, exhibitor, speaker, and visitor for design and testing
  const ident = identifier.toLowerCase().trim();
  if (DEMO_LOGINS_ENABLED) {
    const demo = demoCredentials(ident, identifier, plainPassword);
    if (demo) return demo;
  }

  const user = await findUserForLogin(identifier);
  if (!user || user.user_status !== "active") return null;
  if (!verifyPassword(plainPassword, user.password_salt, user.password_hash, user.pass)) return null;
  return user;
}

/**
 * Columns below are unrelated to a simple event-attendee account (bank details, franchise
 * hierarchy, CRM sync, listing ownership) but find_users defines them NOT NULL with no
 * DB-level default, so a fresh row must supply neutral placeholder values.
 */
const LEGACY_UNUSED_USER_FIELDS = {
  date_of_birth: new Date("1970-01-01T00:00:00Z"),
  work_phone: "",
  bank_account_holder_name: "",
  bank_account_sort_code: "",
  bank_account_number: "",
  bank_account_ifsc: "",
  bank_name: "",
  bank_address: "",
  custom_6: "",
  custom_13: "",
  custom_55: "",
  custom_1202: "",
  custom_1203: "",
  custom_1204: "",
  under_franchise_user: 0,
  allocation_date: new Date("1970-01-01T00:00:00Z"),
  under_support_user: 0,
  request_for_frenchise: 0,
  franchise_request_updated_on: new Date("1970-01-01T00:00:00Z"),
  email_verified: 0,
  email_verifed_code: 0,
  is_synced_to_crm: 0,
  is_invoice_sent: 0,
  is_email_sent: 0,
  razorpay_customer_id: "",
  credit_balance: 0,
} as const;

/** Mirrors members/user_account_add.php's uniqueness checks, scoped to this microsite's domain. */
export async function findRegistrationConflict(
  login: string,
  email: string,
  phone: string,
): Promise<RegisterMemberError | null> {
  const existing = await prisma.find_users.findFirst({
    where: { domain_id: DOMAIN_ID, OR: [{ login }, { user_email: email }, { user_phone: phone }] },
    select: { login: true, user_email: true, user_phone: true },
  });
  if (!existing) return null;
  if (existing.login === login) return "login_taken";
  if (existing.user_email === email) return "email_taken";
  return "phone_taken";
}

export async function createMemberAccount(input: RegisterMemberInput) {
  const salt = generateSalt();
  const hash = hashPassword(input.password, salt, "sha256");

  return prisma.find_users.create({
    data: {
      domain_id: DOMAIN_ID,
      login: input.login,
      user_email: input.email,
      pass: hash,
      password_salt: salt,
      password_hash: "sha256",
      user_first_name: input.firstName,
      user_last_name: input.lastName,
      user_phone: input.phone,
      user_organization: input.organization || "",
      user_status: "active",
      terms_accepted: 1,
      created: new Date(),
      ...LEGACY_UNUSED_USER_FIELDS,
    },
    select: { id: true },
  });
}

export async function getMemberProfile(userId: number) {
  if (userId === -30) {
    return {
      id: -30,
      login: "organiser",
      user_email: "organiser@demo.com",
      user_first_name: "Oliver",
      user_last_name: "Organiser",
      user_phone: "+44 7111 222333",
      user_organization: "Digital Age Expo Management",
      user_position: "",
      linkedin_user_profile: "",
      date_of_birth: null,
      profile_description: "",
      timezone: "Europe/London",
      created: new Date(),
    };
  }
  if (userId === -10) {
    return {
      id: -10,
      login: "exhibitor",
      user_email: "exhibitor@demo.com",
      user_first_name: "Emma",
      user_last_name: "Exhibitor",
      user_phone: "+44 7123 456789",
      user_organization: "InnovateTech Exhibitions",
      user_position: "",
      linkedin_user_profile: "",
      date_of_birth: null,
      profile_description: "",
      timezone: "Europe/London",
      created: new Date(),
    };
  }
  if (userId === -20) {
    return {
      id: -20,
      login: "speaker",
      user_email: "speaker@demo.com",
      user_first_name: "Sarah",
      user_last_name: "Speaker",
      user_phone: "+44 7987 654321",
      user_organization: "Future AI Labs",
      user_position: "",
      linkedin_user_profile: "",
      date_of_birth: null,
      profile_description: "",
      timezone: "Europe/London",
      created: new Date(),
    };
  }
  if (userId === -40) {
    return {
      id: -40,
      login: "visitor",
      user_email: "visitor@demo.com",
      user_first_name: "Victor",
      user_last_name: "Visitor",
      user_phone: "+44 7555 666777",
      user_organization: "Global Visitors Network",
      user_position: "",
      linkedin_user_profile: "",
      date_of_birth: null,
      profile_description: "",
      timezone: "Europe/London",
      created: new Date(),
    };
  }
  if (userId < 0) {
    return {
      id: userId,
      login: "member",
      user_email: "member@demo.com",
      user_first_name: "Demo",
      user_last_name: "Member",
      user_phone: "+44 7000 000000",
      user_organization: "Digital Age Expo",
      user_position: "",
      linkedin_user_profile: "",
      date_of_birth: null,
      profile_description: "",
      timezone: "Europe/London",
      created: new Date(),
    };
  }

  return prisma.find_users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      login: true,
      user_email: true,
      user_first_name: true,
      user_last_name: true,
      user_phone: true,
      user_organization: true,
      // Job title and LinkedIn, so /account_onboarding can prefill Personal Details from the
      // signed-in account instead of presenting the user an empty form about themselves.
      user_position: true,
      linkedin_user_profile: true,
      date_of_birth: true,
      profile_description: true,
      timezone: true,
      created: true,
    },
  });
}

export interface SecurityDetailsInput {
  firstName: string;
  lastName: string;
  phone: string;
  organization?: string;
  newPassword?: string;
}

/** Mirrors members/user_account.php's manage=security_question section. */
export async function updateSecurityDetails(userId: number, input: SecurityDetailsInput) {
  const passwordFields = input.newPassword
    ? (() => {
        const salt = generateSalt();
        return { pass: hashPassword(input.newPassword!, salt, "sha256"), password_salt: salt, password_hash: "sha256" };
      })()
    : {};

  return prisma.find_users.update({
    where: { id: userId },
    data: {
      user_first_name: input.firstName,
      user_last_name: input.lastName,
      user_phone: input.phone,
      user_organization: input.organization || "",
      ...passwordFields,
    },
    select: { id: true },
  });
}

export interface MemberMeeting {
  id: number;
  subject: string | null;
  location: string | null;
  startTime: Date | null;
  endTime: Date | null;
  status: string | null;
  counterpartName: string;
}

/** Mirrors members/user_meeting.php — the signed-in member's upcoming/past meetings for this site's event. */
export async function getMemberSchedule(userId: number): Promise<MemberMeeting[]> {
  if (userId === -10 || userId === -20) {
    return [
      {
        id: 991,
        subject: "B2B Partnership & Stand Showcase",
        location: "Stand A12 - Tech Zone",
        startTime: new Date(Date.now() + 86400000 * 1), // tomorrow
        endTime: new Date(Date.now() + 86400000 * 1 + 3600000), // 1 hour later
        status: "Accepted",
        counterpartName: userId === -10 ? "Sarah Speaker (Future AI Labs)" : "Emma Exhibitor (InnovateTech Exhibitions)",
      },
      {
        id: 992,
        subject: "AI Panel Discussion prep",
        location: "Keynote Lounge",
        startTime: new Date(Date.now() + 86400000 * 2), // day after tomorrow
        endTime: new Date(Date.now() + 86400000 * 2 + 1800000), // 30 mins later
        status: "Proposed",
        counterpartName: userId === -10 ? "Dr. Alan Turing" : "Prof. Grace Hopper",
      }
    ];
  }

  const meetings = await prisma.find_meeting.findMany({
    where: {
      DOMAIN: DOMAIN_ID,
      OR: [{ from_user_id: userId }, { to_user_id: userId }],
    },
    orderBy: { start_time: "asc" },
    select: {
      id: true,
      subject: true,
      location: true,
      start_time: true,
      end_time: true,
      status: true,
      from_user_id: true,
      to_user_id: true,
      from_firstname: true,
      from_lastname: true,
      to_firstname: true,
      to_lastname: true,
    },
  });

  return meetings.map((meeting: any) => {
    const isRequester = meeting.from_user_id === userId;
    const counterpartName = isRequester
      ? `${meeting.to_firstname ?? ""} ${meeting.to_lastname ?? ""}`.trim()
      : `${meeting.from_firstname ?? ""} ${meeting.from_lastname ?? ""}`.trim();

    return {
      id: meeting.id,
      subject: meeting.subject,
      location: meeting.location,
      startTime: meeting.start_time,
      endTime: meeting.end_time,
      status: meeting.status,
      counterpartName: counterpartName || "—",
    };
  });
}

export async function getUpcomingMeetingsCount(userId: number): Promise<number> {
  const meetings = await getMemberSchedule(userId);
  const now = Date.now();
  return meetings.filter((m) => m.startTime && m.startTime.getTime() > now).length;
}