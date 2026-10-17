/**
 * Hash every member password still stored in plain text, against the database that RDS_HOST/RDS_DB
 * point at (from .env or the environment).
 *
 *   npm run passwords:hash            # dry run: reports how many would be hashed
 *   npm run passwords:hash -- --apply # hashes them
 */
import { config } from "../src/config";
import { passwordMigrationService } from "../src/service/password-migration.service";

async function main() {
    const apply = process.argv.includes("--apply");
    console.log(`${apply ? "Hashing" : "Dry run against"} ${config.sqlProxyUrl}`);

    const report = await passwordMigrationService.hashPlaintextPasswords({ apply });

    console.log(`Plain-text passwords found: ${report.found}`);
    if (apply) {
        console.log(`Hashed: ${report.hashed}`);
        if (report.failed.length) console.log(`Failed (re-run to retry): ${report.failed.join(", ")}`);
    } else {
        console.log("Nothing was changed. Re-run with --apply to hash them.");
    }
    process.exitCode = report.failed.length ? 1 : 0;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
