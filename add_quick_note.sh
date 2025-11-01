#!/bin/bash
# Add Quick Note functionality to index.html for v16.3

FILE="index.html"

# 1. Add CSS for quick note button and modal (before </style> at line 1043)
sed -i '' '1042 a\
\
        /* v16.3: Quick Note Button - Always Visible */\
        .quick-note-button {\
            position: fixed;\
            bottom: 20px;\
            right: 20px;\
            width: 60px;\
            height: 60px;\
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\
            border: none;\
            border-radius: 50%;\
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);\
            cursor: pointer;\
            display: flex;\
            align-items: center;\
            justify-content: center;\
            font-size: 1.8rem;\
            color: white;\
            z-index: 1000;\
            transition: all 0.3s ease;\
        }\
\
        .quick-note-button:hover {\
            transform: scale(1.1);\
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);\
        }\
\
        .quick-note-button:active {\
            transform: scale(0.95);\
        }\
\
        /* Quick Note Modal */\
        .quick-note-modal {\
            display: none;\
            position: fixed;\
            top: 0;\
            left: 0;\
            width: 100%;\
            height: 100%;\
            background: rgba(0, 0, 0, 0.5);\
            z-index: 2000;\
            align-items: center;\
            justify-content: center;\
        }\
\
        .quick-note-modal.show {\
            display: flex;\
        }\
\
        .quick-note-content {\
            background: white;\
            border-radius: 12px;\
            padding: 1.5rem;\
            width: 90%;\
            max-width: 500px;\
            max-height: 80vh;\
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);\
            animation: slideIn 0.3s ease-out;\
        }\
\
        @keyframes slideIn {\
            from {\
                transform: translateY(-50px);\
                opacity: 0;\
            }\
            to {\
                transform: translateY(0);\
                opacity: 1;\
            }\
        }\
\
        .quick-note-header {\
            display: flex;\
            align-items: center;\
            gap: 0.5rem;\
            margin-bottom: 1rem;\
            padding-bottom: 0.75rem;\
            border-bottom: 2px solid var(--accent-color);\
        }\
\
        .quick-note-header h3 {\
            margin: 0;\
            font-size: 1.1rem;\
            color: var(--primary-color);\
        }\
\
        .quick-note-textarea {\
            width: 100%;\
            min-height: 150px;\
            padding: 0.75rem;\
            border: 2px solid var(--border-color);\
            border-radius: 8px;\
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;\
            font-size: 0.95rem;\
            resize: vertical;\
            margin-bottom: 1rem;\
        }\
\
        .quick-note-textarea:focus {\
            outline: none;\
            border-color: var(--accent-color);\
        }\
\
        .quick-note-actions {\
            display: flex;\
            gap: 0.75rem;\
            justify-content: flex-end;\
        }
' "$FILE"

# 2. Add HTML for quick note button and modal (before </body> at line 4741)
# Find the actual line number of </body> since it may have shifted
BODY_LINE=$(grep -n "</body>" "$FILE" | tail -1 | cut -d: -f1)

sed -i '' "${BODY_LINE} i\\
\\
    <!-- v16.3: Quick Note Button - Always Visible -->\\
    <button class=\"quick-note-button\" onclick=\"app.showQuickNote()\" title=\"Add Quick Note\">\\
        📝\\
    </button>\\
\\
    <!-- Quick Note Modal -->\\
    <div id=\"quickNoteModal\" class=\"quick-note-modal\" onclick=\"if(event.target === this) app.hideQuickNote()\">\\
        <div class=\"quick-note-content\">\\
            <div class=\"quick-note-header\">\\
                <span style=\"font-size: 1.5rem;\">📝</span>\\
                <h3>Quick Note</h3>\\
            </div>\\
            <textarea id=\"quickNoteTextarea\" class=\"quick-note-textarea\" \\
                placeholder=\"Type your observation or note here...\\nThis will be immediately saved to your session log with full context.\"></textarea>\\
            <div class=\"quick-note-actions\">\\
                <button onclick=\"app.hideQuickNote()\" class=\"secondary\">Cancel</button>\\
                <button onclick=\"app.saveQuickNote()\" class=\"primary\">Done</button>\\
            </div>\\
        </div>\\
    </div>
" "$FILE"

echo "Quick Note UI added successfully!"
echo "Now adding JavaScript functions..."

# 3. Add JavaScript functions (after saveUserNote function around line 3912)
# Find line with saveUserNote function end
SAVE_NOTE_LINE=$(grep -n "}, 1000); // Debounce for 1 second" "$FILE" | head -1 | cut -d: -f1)
AFTER_SAVE_NOTE=$((SAVE_NOTE_LINE + 1))

sed -i '' "${AFTER_SAVE_NOTE} i\\
\\
            // ===== v16.3: QUICK NOTE FUNCTIONALITY =====\\
\\
            showQuickNote() {\\
                const modal = document.getElementById('quickNoteModal');\\
                const textarea = document.getElementById('quickNoteTextarea');\\
                modal.classList.add('show');\\
                textarea.value = '';\\
                // Focus after animation\\
                setTimeout(() => textarea.focus(), 100);\\
            },\\
\\
            hideQuickNote() {\\
                const modal = document.getElementById('quickNoteModal');\\
                modal.classList.remove('show');\\
            },\\
\\
            saveQuickNote() {\\
                const textarea = document.getElementById('quickNoteTextarea');\\
                const note = textarea.value.trim();\\
                \\
                if (!note) {\\
                    this.hideQuickNote();\\
                    return;\\
                }\\
\\
                // Gather full app context\\
                const context = {\\
                    currentTab: document.querySelector('.tab-btn.active')?.textContent.trim() || 'Unknown',\\
                    activeReference: this.selectedReference ? {\\
                        id: this.selectedReference.id,\\
                        title: this.selectedReference.title || 'Untitled',\\
                        finalized: this.selectedReference.finalized || false\\
                    } : null,\\
                    editModalOpen: document.getElementById('editModal')?.style.display === 'flex',\\
                    totalReferences: this.references.length,\\
                    finalizedCount: this.references.filter(r => r.finalized).length\\
                };\\
\\
                // Build context string\\
                let contextStr = '';\\
                if (context.activeReference) {\\
                    contextStr += \`Reference: [\${context.activeReference.id}] \${context.activeReference.title}\\\\n\`;\\
                    contextStr += \`Status: \${context.activeReference.finalized ? 'Finalized' : 'Unfinalized'}\\\\n\`;\\
                }\\
                contextStr += \`Tab: \${context.currentTab}\\\\n\`;\\
                if (context.editModalOpen) contextStr += \`Edit Modal: Open\\\\n\`;\\
                contextStr += \`Total Refs: \${context.totalReferences} (\${context.finalizedCount} finalized)\`;\\
\\
                // Save immediately to session log with full context\\
                const timestamp = new Date().toLocaleTimeString();\\
                this.saveToSessionLog({\\
                    timestamp,\\
                    title: '📝 User Note',\\
                    content: \`\${note}\\\\n\\\\n--- Context ---\\\\n\${contextStr}\`,\\
                    type: 'QUICK_NOTE',\\
                    context: context\\
                });\\
\\
                // Show confirmation toast\\
                this.showToast('Note saved to session log!', 'success');\\
\\
                // Close modal\\
                this.hideQuickNote();\\
            },
" "$FILE"

echo "JavaScript functions added successfully!"
echo ""
echo "v16.3 Quick Note implementation complete!"
echo "  - Always-visible floating button (bottom-right)"
echo "  - Modal popup for quick notes"
echo "  - Immediate save to session log with full context"
echo "  - Context includes: active reference, tab, modal state, counts"
