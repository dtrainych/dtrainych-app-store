export APP_DTRAINYCH_OPEN_WEARABLES_DB_PASSWORD="$(derive_entropy "${app_entropy_identifier}-postgres-password")"
export APP_DTRAINYCH_OPEN_WEARABLES_REDIS_PASSWORD="$(derive_entropy "${app_entropy_identifier}-redis-password")"
export APP_DTRAINYCH_OPEN_WEARABLES_SECRET_KEY="$(derive_entropy "${app_entropy_identifier}-jwt-secret")"

# Optional, manually transferred migration settings. Never commit this file.
# Preserve the old signing secret for existing SDK tokens/provider webhooks.
if [ -f "${EXPORTS_APP_DATA_DIR}/config/migration.env" ]; then
  . "${EXPORTS_APP_DATA_DIR}/config/migration.env"
fi
