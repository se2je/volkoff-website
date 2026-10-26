# Почта: свой мини-почтовик на бэкенде

Письма (подтверждение почты, сброс пароля, «заказ оплачен», «заказ отправлен») отправляет сам API — без Google, Mailgun и прочих.

## Как устроено

1. Код кладёт письмо в таблицу `MailOutbox` — HTTP-запрос не ждёт SMTP.
2. Воркер раз в 5 секунд забирает очередь и отправляет. Ошибка → повтор с бэкоффом 1, 2, 4, 8, 16 минут, после 6 попыток — `FAILED`.
3. Режимы (`MAIL_TRANSPORT`):
   - `direct` — **прод.** API находит MX-сервер домена получателя и доставляет письмо на его 25-й порт, подписывая DKIM. Исходящий 25-й порт на nfine-test открыт (проверено: gmail и yandex MX доступны).
   - `smtp` — через любой SMTP. В dev это Mailpit из `docker-compose.yml` (веб-интерфейс http://localhost:8025).
   - `log` — только в лог.

Входящую почту сервер не принимает (MX не нужен). Отвечать на письма с `no-reply@` никто не будет — контакты для клиентов на сайте.

## DNS-записи (Netlify DNS → volkoffmvs.com)

| Тип | Имя | Значение |
|---|---|---|
| A | `mail` | `92.51.44.179` |
| TXT | `@` | `v=spf1 ip4:92.51.44.179 ~all` |
| TXT | `volkoff._domainkey` | вывод `scripts/gen-dkim.sh` (`v=DKIM1; k=rsa; p=...`) |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:marcvolkov@icloud.com` |

И **PTR** (обратная зона) для `92.51.44.179` → `mail.volkoffmvs.com` — ставится в панели хостинг-провайдера VPS, не в Netlify. Должно совпадать с `MAIL_HELO_NAME`.

> Нюанс: PTR у IP один. Если на этом же сервере другие проекты тоже начнут слать почту напрямую, им придётся использовать тот же HELO/PTR.

После того как всё заработает и письма доходят во «Входящие» — можно ужесточить: SPF `-all`, DMARC `p=quarantine`.

## Проверка

```bash
# после деплоя: зарегистрироваться на сайте и посмотреть очередь
docker exec volkoff-website-postgres psql -U volkoff -c 'select "to", status, attempts, "lastError" from "MailOutbox" order by "createdAt" desc limit 5;'
```

Проверить подпись и SPF: отправить письмо на адрес с https://www.mail-tester.com.
