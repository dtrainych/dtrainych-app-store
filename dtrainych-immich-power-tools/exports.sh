# The official Immich package has no exports.sh database credential contract.
# Read only its installed Compose configuration using Umbrel's bundled yq.
# Never copy the credentials into this package or derive a different password.
_dtrainych_immich_compose="${UMBREL_ROOT}/app-data/immich/docker-compose.yml"

_dtrainych_immich_db_value() {
  local value
  value="$(yq e -e -r ".services.postgres.environment.${1}" "${_dtrainych_immich_compose}")" || {
    printf '%s\n' "Immich Power Tools: cannot read Immich's ${1}; check the installed Immich package." >&2
    return 1
  }
  # Do not silently pass an unresolved Compose expression as a credential.
  if [[ -z "${value}" || "${value}" == *'$'* ]]; then
    printf '%s\n' "Immich Power Tools: Immich's ${1} is empty or uses interpolation; this package requires literal database settings." >&2
    return 1
  fi
  printf '%s' "${value}"
}

APP_DTRAINYCH_IMMICH_POWER_TOOLS_DB_USERNAME="$(_dtrainych_immich_db_value POSTGRES_USER)" || return 1
APP_DTRAINYCH_IMMICH_POWER_TOOLS_DB_PASSWORD="$(_dtrainych_immich_db_value POSTGRES_PASSWORD)" || return 1
APP_DTRAINYCH_IMMICH_POWER_TOOLS_DB_DATABASE_NAME="$(_dtrainych_immich_db_value POSTGRES_DB)" || return 1
APP_DTRAINYCH_IMMICH_POWER_TOOLS_JWT_SECRET="$(derive_entropy "${app_entropy_identifier}-jwt-secret")" || return 1
export APP_DTRAINYCH_IMMICH_POWER_TOOLS_DB_USERNAME
export APP_DTRAINYCH_IMMICH_POWER_TOOLS_DB_PASSWORD
export APP_DTRAINYCH_IMMICH_POWER_TOOLS_DB_DATABASE_NAME
export APP_DTRAINYCH_IMMICH_POWER_TOOLS_JWT_SECRET

unset _dtrainych_immich_compose
unset -f _dtrainych_immich_db_value
