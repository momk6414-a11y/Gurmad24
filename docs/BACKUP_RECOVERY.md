# Backup and recovery plan

- **Automatic:** a backup is created at start-up (if none exist) and every 24 h into `DATA_DIR/backups/` (newest 14 kept).
- **Manual:** `npm run backup`, or Admin → Settings → *Create backup now*.
- **Corruption safety:** writes are atomic (temp file + rename). If `db.json` is unreadable at start-up the newest backup is loaded automatically.
- **Restore:** stop the server → `npm run restore` (lists backups) → `npm run restore -- db-2026-...json` (current db saved as `db.before-restore.json`) → start.
- **Off-site copy (required for real use):** the backups folder lives on the same disk. Regularly copy `DATA_DIR/backups` to a different location (host snapshot feature, scheduled `rclone`/`scp`). Test a restore at least monthly.
- **RPO/RTO (pilot):** up to 24 h of data at risk between backups; recovery in minutes by restore.
