const { runMigrations } = require('./db/migrations');
const { pool } = require('./db/database');

console.log('Starting manual migration...');

(async () => {
    try {
        await runMigrations();
        console.log("✅ Manual migration finished successfully.");
    } catch (e) {
        console.error("❌ Migration failed:", e);
    } finally {
        pool.end();
    }
})();
