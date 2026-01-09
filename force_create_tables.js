const { pool } = require('./db/database');

const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        path VARCHAR(500) NOT NULL,
        size BIGINT NOT NULL,
        type VARCHAR(100),
        folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
    CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
    CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
`;

(async () => {
    try {
        console.log("Executing raw SQL to create Drive tables...");
        await pool.query(createTablesSQL);
        console.log("✅ Tables created.");

        // Check again
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tables:", res.rows.map(r => r.table_name));

    } catch (e) {
        console.error("❌ Failed:", e);
    } finally {
        pool.end();
    }
})();
