# Сертификаты для исходящих HTTPS-запросов API

API Т-Кассы (`securepay.tbank.ru` / `securepay.tinkoff.ru`) работает на сертификате
**Russian Trusted Sub CA** (Минцифры). Его корня нет в стандартном наборе Node.js и Alpine,
поэтому без него запросы к Т-Кассе падают с ошибкой `fetch failed` (unable to get local issuer certificate).

Docker-образ API подхватывает файл `russian_trusted_ca.pem` из этой папки через
`NODE_EXTRA_CA_CERTS`. Сертификат добавляется **только** к доверенным для процесса Node,
системное хранилище не трогается. Если файла нет, Node пишет предупреждение и работает дальше,
просто без доступа к Т-Кассе.

## Как добавить

Сертификаты публикует Минцифры на Госуслугах: https://www.gosuslugi.ru/crt

1. Скачать **корневой** (Russian Trusted Root CA) и **выпускающий** (Russian Trusted Sub CA) сертификаты в формате PEM.
2. Склеить их в один файл:

   ```bash
   cat russian_trusted_root_ca_pem.crt russian_trusted_sub_ca_pem.crt > apps/api/certs/russian_trusted_ca.pem
   ```

3. Проверить, что ими действительно подтверждается сертификат Т-Кассы (должно быть `Verify return code: 0 (ok)`):

   ```bash
   echo | openssl s_client -connect securepay.tbank.ru:443 -servername securepay.tbank.ru -CAfile apps/api/certs/russian_trusted_ca.pem 2>/dev/null | grep "Verify return code"
   ```

4. Закоммитить файл (это публичные сертификаты, не секрет) и выпустить новую версию.
