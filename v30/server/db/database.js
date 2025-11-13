// Database connection module for v30.0
// Provides async/await interface to SQLite

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'v30.db');

class Database {
    constructor() {
        this.db = null;
    }

    // Open database connection
    async open() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Close database connection
    async close() {
        return new Promise((resolve, reject) => {
            if (!this.db) resolve();
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Run a query (INSERT, UPDATE, DELETE)
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    // Get a single row
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Get all rows
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Begin transaction
    async beginTransaction() {
        await this.run('BEGIN TRANSACTION');
    }

    // Commit transaction
    async commit() {
        await this.run('COMMIT');
    }

    // Rollback transaction
    async rollback() {
        await this.run('ROLLBACK');
    }

    // Documents table methods
    async createDocument(filename, title, author, filePath, fileSize) {
        const sql = `INSERT INTO documents (filename, title, author, file_path, file_size)
                     VALUES (?, ?, ?, ?, ?)`;
        const result = await this.run(sql, [filename, title, author, filePath, fileSize]);
        return result.lastID;
    }

    async getDocument(id) {
        return await this.get('SELECT * FROM documents WHERE id = ?', [id]);
    }

    async getAllDocuments() {
        return await this.all('SELECT * FROM documents ORDER BY upload_date DESC');
    }

    async updateDocumentStatus(id, status, errorMessage = null) {
        const sql = `UPDATE documents SET status = ?, error_message = ?,
                     processed_date = CURRENT_TIMESTAMP WHERE id = ?`;
        await this.run(sql, [status, errorMessage, id]);
    }

    // Citations table methods
    async createCitation(documentId, citationText, paragraphContext, metadata) {
        const sql = `INSERT INTO citations
                     (document_id, citation_text, is_empty_bracket, paragraph_context,
                      section_title, paragraph_number, page_number, char_offset)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const result = await this.run(sql, [
            documentId,
            citationText,
            citationText === '[ ]' ? 1 : 0,
            paragraphContext,
            metadata.sectionTitle || null,
            metadata.paragraphNumber || null,
            metadata.pageNumber || null,
            metadata.charOffset || null
        ]);
        return result.lastID;
    }

    async getCitationsByDocument(documentId) {
        return await this.all('SELECT * FROM citations WHERE document_id = ?', [documentId]);
    }

    // Refs table methods
    async createReference(data) {
        const sql = `INSERT INTO refs
                     (citation_text, authors, year, title, publication,
                      context_source, context_text, context_location)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const result = await this.run(sql, [
            data.citationText,
            data.authors,
            data.year,
            data.title,
            data.publication,
            data.contextSource || 'citation_auto',
            data.contextText,
            JSON.stringify(data.contextLocation || {})
        ]);
        return result.lastID;
    }

    async getReference(id) {
        return await this.get('SELECT * FROM refs WHERE id = ?', [id]);
    }

    async updateReferenceContext(id, contextText, contextSource) {
        const sql = `UPDATE refs SET
                     context_text = ?, context_source = ?, context_overridden = 1,
                     context_override_date = CURRENT_TIMESTAMP, modified_date = CURRENT_TIMESTAMP
                     WHERE id = ?`;
        await this.run(sql, [contextText, contextSource, id]);
    }

    async updateReferenceRelevance(id, relevanceText, relevanceSource) {
        const sql = `UPDATE refs SET
                     relevance_text = ?, relevance_source = ?, relevance_overridden = 1,
                     relevance_override_date = CURRENT_TIMESTAMP,
                     relevance_generated_date = CURRENT_TIMESTAMP,
                     modified_date = CURRENT_TIMESTAMP
                     WHERE id = ?`;
        await this.run(sql, [relevanceText, relevanceSource, id]);
    }

    async updateReferenceURLs(id, primaryUrl, secondaryUrl, tertiaryUrl, metadata) {
        const sql = `UPDATE refs SET
                     primary_url = ?, primary_url_source = ?, primary_url_validation_status = ?,
                     secondary_url = ?, secondary_url_source = ?, secondary_url_validation_status = ?,
                     tertiary_url = ?, tertiary_url_source = ?, tertiary_url_validation_status = ?,
                     search_query = ?, search_strategy = ?, search_date = CURRENT_TIMESTAMP,
                     modified_date = CURRENT_TIMESTAMP
                     WHERE id = ?`;
        await this.run(sql, [
            primaryUrl, metadata.primarySource, metadata.primaryStatus,
            secondaryUrl, metadata.secondarySource, metadata.secondaryStatus,
            tertiaryUrl, metadata.tertiarySource, metadata.tertiaryStatus,
            metadata.searchQuery, metadata.searchStrategy,
            id
        ]);
    }

    // Audit log methods
    async logChange(referenceId, changeType, level, fieldName, oldValue, newValue, trigger) {
        const sql = `INSERT INTO audit_log
                     (reference_id, change_type, level, field_name, old_value, new_value, trigger)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await this.run(sql, [referenceId, changeType, level, fieldName, oldValue, newValue, trigger]);
    }

    async getAuditLog(referenceId) {
        return await this.all(
            'SELECT * FROM audit_log WHERE reference_id = ? ORDER BY timestamp DESC',
            [referenceId]
        );
    }

    // URL candidates methods
    async saveURLCandidates(referenceId, searchId, candidates) {
        for (const candidate of candidates) {
            const sql = `INSERT INTO url_candidates
                         (reference_id, search_id, url, title, snippet, rank, score, validation_status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            await this.run(sql, [
                referenceId, searchId, candidate.url, candidate.title,
                candidate.snippet, candidate.rank, candidate.score, 'pending'
            ]);
        }
    }

    async getURLCandidates(referenceId) {
        return await this.all(
            'SELECT * FROM url_candidates WHERE reference_id = ? ORDER BY rank ASC',
            [referenceId]
        );
    }
}

module.exports = Database;
