#!/bin/sh
set -e

# Read Docker Swarm secrets and export them as environment variables.
# Secret files are mounted at /run/secrets/<secret_name>.
# Secret names follow the pattern: bonistock_{env}_VARIABLE_NAME
# e.g. bonistock_prod_DATABASE_URL -> DATABASE_URL

SECRETS_DIR="/run/secrets"

if [ -d "$SECRETS_DIR" ]; then
  for secret_file in "$SECRETS_DIR"/*; do
    if [ -f "$secret_file" ]; then
      secret_name=$(basename "$secret_file")
      # Strip app+env prefix (bonistock_prod_ or bonistock_dev_)
      var_name=$(echo "$secret_name" | sed 's/^bonistock_prod_//;s/^bonistock_dev_//')
      export "$var_name"="$(cat "$secret_file")"
    fi
  done
fi

exec "$@"
