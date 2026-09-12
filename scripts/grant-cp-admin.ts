/**
 * ===========================================================================
 *  GRANT CP (ADMIN CONTROL PANEL) ACCESS TO AN EXISTING ACCOUNT
 * ===========================================================================
 *
 *  /cp/login is not a separate identity system — it authenticates against the
 *  same find_users row as the member portal, then requires the `admin_login`
 *  permission through at least one find_users_groups membership. "Invalid
 *  credentials, or this account doesn't have admin access." is deliberately
 *  the SAME message for a wrong password, an inactive account and a missing
 *  permission, so the form cannot be used to enumerate admin accounts. That
 *  also means the screen can never tell you which of the three you hit.
 *
 *  This script fixes all three, and reports which ones it had to change.
 *
 *  USAGE
 *
 *    # 1. put the password you want in the environment for this one command
 *    #    PowerShell:
 *    #      $env:CP_ADMIN_PASSWORD = "<the password you choose>"
 *    #    cmd.exe:
 *    #      set CP_ADMIN_PASSWORD=<the password you choose>
 *    #
 *    # 2. run it
 *    npm run cp:grant-admin -- --email=hello@digitalageexpo.com
 *
 *    # audit only — change nothing, just report what is wrong:
 *    npm run cp:grant-admin -- --email=hello@digitalageexpo.com --dry-run
 *
 *    # group/permission fix only, leaving the existing password alone:
 *    #   simply do not set CP_ADMIN_PASSWORD
 *
 *  The password is read ONLY from the CP_ADMIN_PASSWORD environment variable.
 *  Not from a --flag (shell history keeps those) and never from a literal in
 *  this file. It is never printed, and it is not written anywhere except as a
 *  salted sha256 hash in find_users.
 *
 *  WHAT "PROPER PASSWORD" MEANS HERE
 *    find_users stores three columns, and their names are misleading:
 *      password_salt -> the salt
 *      password_hash -> the ALGORITHM NAME (e.g. "sha256"), not a hash
 *      pass          -> the actual hash, sha256(plain + salt)
 *    This writes all three consistently via src/lib/auth/password.ts, the same
 *    code the login path verifies with, so a hand-written UPDATE that guesses
 *    the column meanings cannot silently produce an unusable password.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.join(ROOT, ".env") });
  dotenv.config({ path: path.join(ROOT, ".env.local"), override: false });
} catch {
  console.warn("! dotenv unavailable — relying on the ambient environment");
}

const flags = new Map<string, string>();
for (const a of process.argv.slice(2).filter((x) => x.startsWith("--"))) {
  const [k, v] = a.replace(/^--/, "").split("=");
  flags.set(k, v ?? "true");
}

const EMAIL = (flags.get("email") ?? "").trim();
const DRY_RUN = flags.get("dry-run") === "true";
/** Create the find_users row when it does not exist, instead of stopping. */
const CREATE = flags.get("create") === "true";
const PASSWORD = process.env.CP_ADMIN_PASSWORD ?? "";

if (!EMAIL) {
  console.error("Usage: npm run cp:grant-admin -- --email=<address> [--dry-run]");
  process.exit(1);
}

const ADMIN_LOGIN = "admin_login";
const line = (n = 78) => "-".repeat(n);
const changes: string[] = [];

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { DOMAIN_ID } = await import("../src/lib/site-config");
  const { generateSalt, hashPassword } = await import("../src/lib/auth/password");
  const { verifyCpCredentials } = await import("../src/lib/cp/auth/authRepository");

  console.log("=".repeat(78));
  console.log(` CP admin access for ${EMAIL}   (domain_id ${DOMAIN_ID})${DRY_RUN ? "   [DRY RUN]" : ""}`);
  console.log("=".repeat(78));

  // ---------------------------------------------------------------- the user
  // Both values, matching findUserForLogin() and verifyCpCredentials(): the migration left
  // find_users.domain_id at 0 on imported rows, so a strict DOMAIN_ID match finds nothing.
  const user = await prisma.find_users.findFirst({
    where: { domain_id: { in: [DOMAIN_ID, 0] }, OR: [{ user_email: EMAIL }, { login: EMAIL }] },
    select: {
      id: true, login: true, user_email: true, user_status: true,
      user_first_name: true, user_last_name: true,
      pass: true, password_salt: true, password_hash: true,
    },
  });

  if (!user && CREATE) {
    if (!PASSWORD) {
      console.log("\n  x --create needs CP_ADMIN_PASSWORD set, so the new account has a password.");
      process.exit(1);
    }
    if (PASSWORD.length < 12) {
      console.log("\n  x CP_ADMIN_PASSWORD is shorter than 12 characters. Nothing was created.");
      process.exit(1);
    }
    if (DRY_RUN) {
      console.log(`\n  would create a find_users row for ${EMAIL} (domain_id ${DOMAIN_ID}, active), then grant admin.`);
      console.log("\n Dry run — nothing was written.");
      return;
    }
    const { createMemberAccount } = await import("../src/lib/services/member");
    /*
     * findRegistrationConflict() is deliberately NOT used here. It also matches on user_phone,
     * and this script has no phone to supply — an empty string would collide with every existing
     * row that has an empty phone and report a bogus "phone_taken". The lookup above already
     * proved no row holds this email or login on domain_id 150 or 0, which is the stronger check.
     */
    // Uses the app's own account-creation path rather than a hand-rolled insert, so every
    // NOT NULL column without a default gets the same neutral value a real signup writes.
    const created = await createMemberAccount({
      login: EMAIL,
      email: EMAIL,
      password: PASSWORD,
      firstName: flags.get("first") ?? "Digital Age",
      lastName: flags.get("last") ?? "Expo",
      phone: flags.get("phone") ?? "",
      organization: flags.get("org") ?? "Digital Age Expo",
    });
    console.log(`\n  + created find_users #${created.id} (domain_id ${DOMAIN_ID}, active, sha256 password)`);
    changes.push(`find_users: created account #${created.id} for ${EMAIL}`);
    // Re-enter main() so the rest of the script (groups, permissions, verification) runs
    // against the row that now exists, instead of duplicating that logic here.
    return main();
  }

  if (!user) {
    console.log(`\n  x No find_users row with that email (checked domain_id ${DOMAIN_ID} and 0).`);

    // Which domain_id values DO exist? A mismatch here is the single most common reason a
    // migrated account cannot log in anywhere, so name it rather than leaving it to be guessed.
    const census = await prisma.find_users.groupBy({
      by: ["domain_id"],
      _count: { domain_id: true },
      orderBy: { _count: { domain_id: "desc" } },
      take: 8,
    });
    if (census.length) {
      console.log("\n  find_users.domain_id values present (top 8):");
      for (const c of census as any[]) {
        const flag = c.domain_id === DOMAIN_ID ? "  <- site-config DOMAIN_ID" : c.domain_id === 0 ? "  <- migrated rows" : "";
        console.log(`    domain_id ${String(c.domain_id).padEnd(6)} ${String(c._count.domain_id).padStart(8)} account(s)${flag}`);
      }
    }
    const near = await prisma.find_users.findMany({
      where: { user_email: { contains: EMAIL.split("@")[1] ?? EMAIL, mode: "insensitive" } },
      select: { id: true, user_email: true, login: true, domain_id: true, user_status: true },
      take: 15,
      orderBy: { id: "asc" },
    });
    if (near.length) {
      console.log("\n  Accounts on the same mail domain (any site domain):");
      for (const n of near) {
        console.log(`    #${String(n.id).padEnd(8)} domain ${String(n.domain_id).padEnd(5)} ${String(n.user_status).padEnd(9)} ${n.user_email}  (login: ${n.login})`);
      }
    }
    console.log("\n  Either re-run with an address that exists, or add --create to make this one:");
    console.log(`    npm run cp:grant-admin -- --email=${EMAIL} --create`);
    console.log("  --create goes through the app's own createMemberAccount(), so every NOT NULL");
    console.log("  column without a default gets the value a real signup would write.");
    process.exit(1);
  }

  const who = `${user.user_first_name} ${user.user_last_name}`.trim() || user.login;
  console.log(`\n  user  #${user.id}  ${who}`);
  console.log(`        login=${user.login}  email=${user.user_email}  status=${user.user_status}`);
  console.log(`        password set: ${user.pass ? "yes" : "NO (empty)"}   algo=${user.password_hash || "(empty)"}   salt=${user.password_salt ? "present" : "MISSING"}`);

  // ------------------------------------------------------------ status check
  if (user.user_status !== "active") {
    changes.push(`user_status: ${user.user_status} -> active`);
    if (!DRY_RUN) {
      await prisma.find_users.update({ where: { id: user.id }, data: { user_status: "active" } });
    }
  }

  // ---------------------------------------------------------------- password
  if (PASSWORD) {
    if (PASSWORD.length < 12) {
      console.log("\n  x CP_ADMIN_PASSWORD is shorter than 12 characters. This account can reach");
      console.log("    every event's data — pick a longer one. Nothing was changed.");
      process.exit(1);
    }
    const salt = generateSalt();
    const hash = hashPassword(PASSWORD, salt, "sha256");
    changes.push("password: re-hashed (salt + sha256) for this account");
    if (!DRY_RUN) {
      await prisma.find_users.update({
        where: { id: user.id },
        data: { password_salt: salt, password_hash: "sha256", pass: hash, is_password_changed: true },
      });
    }
  } else {
    console.log("\n  i CP_ADMIN_PASSWORD is not set — leaving the existing password untouched.");
    console.log("    Set it and re-run if the password is what is failing.");
  }

  // ------------------------------------------------------- groups and rights
  const permRow = await prisma.find_users_permissions.findFirst({ where: { id: ADMIN_LOGIN } });
  if (!permRow) {
    changes.push(`find_users_permissions: created the "${ADMIN_LOGIN}" slug (it did not exist)`);
    if (!DRY_RUN) await prisma.find_users_permissions.create({ data: { id: ADMIN_LOGIN } });
  }

  const adminGroupIds = (
    await prisma.find_users_groups_permissions_lookup.findMany({
      where: { permission_id: ADMIN_LOGIN },
      select: { group_id: true },
    })
  ).map((r: any) => r.group_id);

  let group = adminGroupIds.length
    ? await prisma.find_users_groups.findFirst({
        where: { id: { in: adminGroupIds } },
        orderBy: [{ administrator: "desc" }, { id: "asc" }],
        select: { id: true, name: true, administrator: true },
      })
    : null;

  if (!group) {
    changes.push('find_users_groups: created "Super Admin" (administrator=1) with every permission');
    if (!DRY_RUN) {
      group = await prisma.find_users_groups.create({
        data: {
          name: "Super Admin",
          description: "Full control-panel access. Created by scripts/grant-cp-admin.ts.",
          administrator: 1,
          advertiser: 0,
          user: 0,
        },
        select: { id: true, name: true, administrator: true },
      });
      const all = await prisma.find_users_permissions.findMany({ select: { id: true } });
      await prisma.find_users_groups_permissions_lookup.createMany({
        data: all.map((p: any) => ({ group_id: group!.id, permission_id: p.id })),
        skipDuplicates: true,
      });
      console.log(`\n  + created group #${group.id} "${group.name}" with ${all.length} permission(s)`);
    } else {
      console.log("\n  would create a Super Admin group holding every permission slug");
    }
  } else {
    console.log(`\n  group #${group.id} "${group.name}" already carries ${ADMIN_LOGIN} (administrator=${group.administrator})`);
    // A group that gates CP access but is missing newer slugs blocks individual CP screens
    // with a misleading "no permission" error, so top it up.
    const all = await prisma.find_users_permissions.findMany({ select: { id: true } });
    const held = new Set(
      (
        await prisma.find_users_groups_permissions_lookup.findMany({
          where: { group_id: group.id },
          select: { permission_id: true },
        })
      ).map((r: any) => r.permission_id)
    );
    const missing = all.filter((p: any) => !held.has(p.id));
    if (missing.length && group.administrator === 1) {
      changes.push(`group #${group.id}: granted ${missing.length} missing permission slug(s)`);
      if (!DRY_RUN) {
        await prisma.find_users_groups_permissions_lookup.createMany({
          data: missing.map((p: any) => ({ group_id: group!.id, permission_id: p.id })),
          skipDuplicates: true,
        });
      }
    } else if (missing.length) {
      console.log(`  i ${missing.length} permission slug(s) not granted to this group — left alone,`);
      console.log("    because it is not flagged administrator=1 and may be a narrower role.");
    }
  }

  if (group) {
    const member = await prisma.find_users_groups_lookup.findFirst({
      where: { user_id: user.id, group_id: group.id },
    });
    if (!member) {
      changes.push(`find_users_groups_lookup: added user #${user.id} to group #${group.id}`);
      if (!DRY_RUN) {
        await prisma.find_users_groups_lookup.create({ data: { user_id: user.id, group_id: group.id } });
      }
    } else {
      console.log(`  already a member of group #${group.id}`);
    }
  }

  // ----------------------------------------------------------------- report
  console.log(`\n${line()}`);
  if (changes.length === 0) {
    console.log(" No changes were needed.");
  } else {
    console.log(DRY_RUN ? " WOULD CHANGE:" : " CHANGED:");
    for (const c of changes) console.log(`   - ${c}`);
  }
  console.log(line());

  // ------------------------------------------------------- prove it actually works
  if (DRY_RUN) {
    console.log("\n Dry run — nothing was written, so no login check was attempted.");
    return;
  }
  if (!PASSWORD) {
    console.log("\n CP_ADMIN_PASSWORD was not set, so the login could not be verified end to end.");
    console.log(" Try signing in; if it still fails, re-run with the variable set.");
    return;
  }

  const verified = await verifyCpCredentials(EMAIL, PASSWORD);
  if (verified) {
    console.log("\n VERIFIED: verifyCpCredentials() — the exact function /cp/login calls — accepts");
    console.log(` this account. id=${verified.id}  role="${verified.primaryGroup.name}"  permissions=${verified.permissions.length}`);
    console.log(` Sign in at /cp/login with ${EMAIL} and the password you set.`);
  } else {
    console.log("\n x STILL REJECTED by verifyCpCredentials(). The three usual causes are now");
    console.log("   ruled out, so check: DOMAIN_ID in src/lib/site-config.ts matches the row's");
    console.log("   domain_id, and that no second find_users row shares this email.");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("\nFATAL:", e?.stack ?? e);
    process.exit(1);
  })
  .then(() => process.exit(0));
