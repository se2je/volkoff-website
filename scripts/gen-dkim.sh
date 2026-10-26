#!/usr/bin/env bash
# Генерирует DKIM-ключ для почты сайта.
#   приватный ключ (base64 одной строкой) → Vault: apps/volkoff_website → DKIM_PRIVATE_KEY_B64
#   публичный → DNS TXT-запись <selector>._domainkey.<domain>
# Ключи пишутся во временную папку и в репозиторий не попадают.
set -euo pipefail
SELECTOR="${1:-volkoff}"
DOMAIN="${2:-volkoffmvs.com}"
DIR="$(mktemp -d)"
openssl genrsa -out "$DIR/dkim.private.pem" 2048 2>/dev/null
openssl rsa -in "$DIR/dkim.private.pem" -pubout -out "$DIR/dkim.public.pem" 2>/dev/null
PUB=$(grep -v -- '-----' "$DIR/dkim.public.pem" | tr -d '\n')

echo "=== Vault: apps/volkoff_website -> DKIM_PRIVATE_KEY_B64 ==="
base64 < "$DIR/dkim.private.pem" | tr -d '\n'
echo
echo
echo "=== DNS TXT: ${SELECTOR}._domainkey.${DOMAIN} ==="
echo "v=DKIM1; k=rsa; p=${PUB}"
echo
echo "Файлы ключей лежат в $DIR — удали их после переноса в Vault."
