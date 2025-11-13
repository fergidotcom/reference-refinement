// Initialize v30.0 SQLite database
// Usage: node init-db.js

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'v30.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Read schema file
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

// Create database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error creating database:', err);
        process.exit(1);
    }
    console.log('✓ Database file created:', DB_PATH);
});

// Temporarily disable foreign key constraints during creation
db.serialize(() => {
    console.log('Creating schema...');

    // Execute schema using serialize to ensure statements run in order
    db.run('PRAGMA foreign_keys = OFF', (err) => {
        if (err) {
            console.error('Error disabling foreign keys:', err);
            process.exit(1);
        }
    });

    // Split statements and execute
    const statements = schema.split(';').map(s => s.trim()).filter(s => s && !s.match(/^--/));

    statements.forEach((stmt, i) => {
        if (stmt) {
            db.run(stmt, (err) => {
                if (err) {
                    console.error(`Error in statement ${i}:`, err.message);
                    console.error('Statement:', stmt.substring(0, 200));
                }
            });
        }
    });

    // Re-enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
            console.error('Error enabling foreign keys:', err);
            process.exit(1);
        }
    });

    // Verify tables after all statements complete
    db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
        if (err) {
            console.error('Error verifying tables:', err);
            process.exit(1);
        }

        console.log('\n✓ Schema created successfully');
        console.log('\n✓ Tables created:');
        rows.forEach(row => console.log('  -', row.name));

        // Verify indexes
        db.all("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name", [], (err, indexes) => {
            if (err) {
                console.error('Error verifying indexes:', err);
                process.exit(1);
            }

            console.log(`\n✓ ${indexes.length} indexes created`);

            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                    process.exit(1);
                }
                console.log('\n✅ Database initialization complete!');
                console.log('Database location:', DB_PATH);
            });
        });
    });
});
