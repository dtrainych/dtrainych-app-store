# Migrate Open Wearables from Portainer

**No migration has been performed.** Never bind the Umbrel database service to
the live Portainer volume, and never run two app stacks writing to one database.
Perform a logical database transfer with a retained rollback copy.

The original Portainer stack is named `open-wereables`. Its Compose file
defines `postgres__open-wearables`, `backend__open-wearables`,
`celery-worker__open-wearables`, `celery-beat__open-wearables`,
`redis__open-wearables`, `frontend__open-wearables`, Flower, and Svix. It declares
`postgres_data` and `redis_data` named volumes; inspect their actual Docker names
on the device before backing them up. The stack uses moving `latest` application
tags, so the running version and digest must be checked before choosing a target.

Migration sequence:

1. **Verify the source version and schema.** Inspect the actual backend/frontend
   image digests and database Alembic revision. The target must not be older than
   the source schema. If the source is newer than 0.10.0, update/test the package
   to a compatible release first. Record counts for users, connections and key
   health-data tables, provider settings, active public URLs, and the actual
   PostgreSQL version. Test the fresh Umbrel package before moving real data.
2. **Record configuration privately.** Preserve provider credentials/settings,
   the original `SECRET_KEY`, any `MASTER_KEY` used for encrypted configuration,
   and custom sync/storage/email settings. Portainer's MCP redacts environment
   values; do not copy its `[REDACTED]` placeholders. Store a backup of the old
   stack and its secrets outside Git. Keep the existing signing secret if SDK
   tokens or provider webhook secrets depend on it.
3. **Create the migration secret file on the device.** In the target app's
   current data folder (which can be moved to external storage), create
   `config/migration.env`, readable only by the owner, with shell assignments:

   ```sh
   export APP_DTRAINYCH_OPEN_WEARABLES_SECRET_KEY='THE_EXISTING_SECRET_KEY'
   export APP_DTRAINYCH_OPEN_WEARABLES_INGEST_WORKOUT_SAMPLES='true'
   ```

   Use the real current value of `INGEST_WORKOUT_SAMPLES`, which was an explicit
   setting in your old stack. Quote/escape secret values as shell literals.
   `exports.sh` sources this trusted local file after generating defaults. It is
   ignored by Git and lives under movable/backed-up `data/`. Do not change the
   target database/Redis passwords to source passwords; a logical restore works
   with the target's independently generated credentials. If source configuration
   requires `MASTER_KEY` or additional env-only settings, add a deliberate
   package mapping before migrating; the current inspected stack does not declare it.
4. **Quiesce the source.** Pause inbound writes/provider delivery, stop the old
   scheduler, allow queued/running sync and import tasks to finish, then stop
   the old workers, API, frontend and optional emitters. Keep its database
   running for the dump. A database dump alone does not capture queued Redis
   payloads. Do not discard queues with pending imports or sync batches.
5. **Back up PostgreSQL and Redis.** On the Umbrel host, a logical application
   database dump can be made with:

   ```sh
   umask 077
   docker exec postgres__open-wearables pg_dump \
     --username=open-wearables --dbname=open-wearables \
     --format=custom --no-owner --no-acl > open-wearables.dump
   docker exec postgres__open-wearables pg_dumpall \
     --username=open-wearables --globals-only > open-wearables-globals.sql
   ```

   Substitute the actual source database/user if customized. Keep a cold backup
   of the source volumes too; do not remove them. The target defaults to fresh
   Redis **only after the source queue is drained**. This resets transient cache,
   locks and in-progress sleep/session tracking. If that loss is unacceptable,
   plan and test a separate Redis RDB/AOF migration with authentication before
   cutover. Svix delivery state needs its own database/Redis transfer if you
   actually used outgoing webhooks; this package currently disables delivery.
6. **Restore only into the new, disposable target.** Stop target API, workers,
   scheduler, frontend and MCP while leaving target PostgreSQL running. Back up
   any target data you intend to retain. Restore the application database, not
   global roles/passwords, using the target role:

   ```sh
   docker exec -i dtrainych-open-wearables_db_1 pg_restore \
     --username=open-wearables --dbname=open-wearables \
     --clean --if-exists --exit-on-error --no-owner --no-acl < open-wearables.dump
   ```

   This overwrites the target application's tables. Restart through Umbrel;
   upstream startup applies any supported forward migrations. Sign in with your
   **existing account/password**, not the fresh-install credentials shown by
   Umbrel. API keys stored in the restored database should remain usable.
7. **Verify before cutover.** Compare the recorded data counts, inspect several
   historical workouts/sleep records and provider connections, test an API key
   and an MCP query, and restart through Umbrel to confirm persistence. Repoint
   the existing reverse proxy/provider callbacks/mobile clients to the new API.
   Resume provider delivery and one scheduler/worker set, then check a real sync.
8. **Retain rollback.** Keep the old stopped stack, original volumes and backups
   until the new deployment is proven. To roll back, stop the new writers before
   resuming the old stack. Changes accepted after cutover are not in the old
   database; decide how to preserve them before switching back.
