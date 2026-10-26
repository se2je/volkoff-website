# Сертификаты для исходящих HTTPS-запросов API

API Т-Кассы (`securepay.tbank.ru` / `securepay.tinkoff.ru`) работает на сертификате
**Russian Trusted Sub CA** (Минцифры). Его корня нет в стандартном наборе Node.js и Alpine,
поэтому без него запросы к Т-Кассе падают с ошибкой `fetch failed` (unable to get local issuer certificate).

Docker-образ API подхватывает файл `russian_trusted_ca.pem` из этой папки через
`NODE_EXTRA_CA_CERTS`. Сертификат добавляется **только** к доверенным для процесса Node,
системное хранилище не трогается. Если файла нет, Node пишет предупреждение и работает дальше,
просто без доступа к Т-Кассе.

## Что лежит сейчас

`russian_trusted_ca.pem` = корневой + выпускающий сертификаты Минцифры, скачаны 26.10.2026 с
`https://gu-st.ru/content/lending/` (статика Госуслуг), цепочка `securepay.tbank.ru` и `securepay.tinkoff.ru`
проверена: `Verify return code: 0 (ok)`.

| Сертификат | Действует до | SHA-256 |
|---|---|---|
| Russian Trusted Root CA | 27.02.2032 | `D2:6D:2D:02:31:B7:C3:9F:92:CC:73:85:12:BA:54:10:35:19:E4:40:5D:68:B5:BD:70:3E:97:88:CA:8E:CF:31` |
| Russian Trusted Sub CA | **06.03.2027** | `BB:BD:E2:10:3E:79:0B:99:9E:C6:2B:D0:3C:F6:25:A5:A2:E7:C3:16:E1:0A:FE:6A:49:0E:ED:EA:D8:B3:FD:9B` |

> ⚠️ Выпускающий сертификат истекает **06.03.2027** — к этому времени Минцифры выпустит новый,
> файл нужно обновить по инструкции ниже (иначе оплаты перестанут проходить).

## Как обновить

Сертификаты публикует Минцифры на Госуслугах: https://www.gosuslugi.ru/crt

1. Скачать **корневой** (Russian Trusted Root CA) и **выпускающий** (Russian Trusted Sub CA) сертификаты в формате PEM.
2. Склеить их в один файл (с переводом строки между ними — у файлов с Госуслуг его в конце нет):

   ```bash
   { cat russian_trusted_root_ca_pem.crt; echo; cat russian_trusted_sub_ca_pem.crt; echo; } | tr -d '\r' | sed '/^$/d' > apps/api/certs/russian_trusted_ca.pem
   ```

3. Проверить, что ими действительно подтверждается сертификат Т-Кассы (должно быть `Verify return code: 0 (ok)`):

   ```bash
   echo | openssl s_client -connect securepay.tbank.ru:443 -servername securepay.tbank.ru -CAfile apps/api/certs/russian_trusted_ca.pem 2>/dev/null | grep "Verify return code"
   ```

4. Закоммитить файл (это публичные сертификаты, не секрет) и выпустить новую версию.
