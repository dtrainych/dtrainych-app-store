export APP_MONERO_RPC_USER="monero"
export APP_MONERO_RPC_PASS="$(derive_entropy "${app_entropy_identifier}-monero-rpc")"
