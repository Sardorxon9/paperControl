# Invoice & Client Migration Script

## Quick Start

```bash
node scripts/migrateInvoicesAndClients.mjs
```

## What This Script Does

This script performs a complete migration of the invoice system to support the new catalogue-based architecture:

### Step 1: Add Type to All Invoices
- Adds `type: "custom"` to all existing invoices in `all-invoices` collection
- Skips invoices that already have a type field

### Step 2: Backup Standard Design Clients
- Finds all clients with `designType === "standart"`
- Backs up complete data including branches and invoices
- Saves to timestamped JSON file: `standard-clients-backup-[timestamp].json`

### Step 3: Delete Standard Design Clients
- **WARNING:** This permanently deletes standard design clients from Firestore
- Only runs after successful backup
- Includes 3-second safety delay

## Safety Features

✅ **No data loss** - Complete backup before deletion
✅ **Detailed logging** - See exactly what's happening
✅ **Error handling** - Graceful failure with clear messages
✅ **Idempotent** - Safe to run multiple times

## Before Running

1. **Backup your database** (just in case)
2. **Verify credentials** - Ensure Firebase config is correct
3. **Check disk space** - Backup file will be saved locally

## After Running

1. **Verify backup file** - Check that JSON file was created
2. **Check logs** - Review any errors or warnings
3. **Test the application** - Create a new standard invoice
4. **Verify invoice history** - Check that both types display correctly

## Output Files

The script creates a backup file in the same directory:
```
scripts/standard-clients-backup-2026-01-01T12-30-45-123Z.json
```

## Backup File Structure

```json
{
  "backupDate": "2026-01-01T12:30:45.123Z",
  "totalClients": 10,
  "clients": [
    {
      "id": "client_id",
      "name": "Restaurant Name",
      "designType": "standart",
      "catalogueItemID": "cat_123",
      "productTypeID": "pt_456",
      "branches": [...],
      "invoices": [...]
    }
  ]
}
```

## Troubleshooting

### Script fails with "Permission denied"
- Check Firestore security rules
- Verify Firebase credentials are correct

### "No standard design clients found"
- This is normal if you've already run the migration
- Or if there were never any standard design clients

### Backup file not created
- Check write permissions in scripts directory
- Verify disk space available

### Deletion fails but backup succeeded
- Backup is safe - you can manually delete clients
- Check error logs for specific issue

## Rollback

If you need to restore deleted clients:

1. Open the backup JSON file
2. Use Firebase console or script to restore data
3. Manually recreate each client document
4. Restore subcollections (branches, invoices)

Or use this helper script:
```javascript
// TODO: Create restore script if needed
```

## Script Output Example

```
============================================================
🚀 INVOICE & CLIENT MIGRATION SCRIPT
============================================================

STEP A: Adding type='custom' to all existing invoices
------------------------------------------------------------
📋 Found 145 invoices in all-invoices collection
  ✅ Updated invoice abc123 with type='custom'
  ✅ Updated invoice def456 with type='custom'
  ...
✅ Successfully updated: 145
⏭ Skipped: 0
❌ Errors: 0

STEP B: Backing up standard design clients
------------------------------------------------------------
📋 Found 12 standard design clients
  ✅ Backed up client: Samarkand Restaurant (ID: client_001)
  ✅ Backed up client: Tashkent Cafe (ID: client_002)
  ...
✅ Backup saved to: standard-clients-backup-2026-01-01T12-30-45.json
📊 Total clients backed up: 12

⚠️  WARNING: About to delete standard design clients!
Backup has been saved. Proceeding with deletion in 3 seconds...

STEP C: Deleting standard design clients
------------------------------------------------------------
📋 Found 12 standard design clients to delete
    🗑 Deleted 3 branches
    🗑 Deleted 8 invoices
  ✅ Deleted client: Samarkand Restaurant (ID: client_001)
  ...
✅ Successfully deleted: 12 clients
❌ Errors: 0

============================================================
📊 MIGRATION SUMMARY
============================================================
✅ Migration completed successfully!
============================================================
```

## Next Steps After Migration

1. Test creating a new standard design invoice
2. Verify invoice history shows both custom and standard invoices correctly
3. Check that product codes display for standard invoices
4. Archive the backup JSON file in a safe location
5. Update any documentation or training materials

## Important Notes

- **This is a ONE-TIME migration** - Don't run multiple times unless necessary
- **Backup file is precious** - Store it safely
- **Standard design clients will be gone** - They should be recreated via the new flow
- **Existing invoices are safe** - They're just marked as `type: "custom"`

## Need Help?

Check the full documentation: `INVOICE_MIGRATION_SUMMARY.md`
