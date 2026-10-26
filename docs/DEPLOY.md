# Деплой на nfine-test (volkoffmvs.com)

Схема — как у остальных проектов godchain: CI собирает образы → Semaphore запускает ansible-плейбук → `deadnews.util.docker_compose` поднимает стек на хосте под rootless docker, Traefik выдаёт TLS.

```
Traefik (volkoffmvs.com, www.volkoffmvs.com)
   └─ web  (nginx: SPA + проксирует /api и /uploads)
        └─ api  (Fastify + Prisma)  ── postgres
                                    └─ volume uploads (фото товаров)
   backup (offen/docker-volume-backup: postgres + uploads, 7 дней)
```

## 1. Репозиторий и образы

Сейчас `origin` — GitHub. Сборка образов идёт в Gitea Actions, поэтому нужен репозиторий `godchain/volkoff-website` на `gitea.godchain.services`:

```bash
git remote add gitea https://gitea.godchain.services/godchain/volkoff-website.git
git push gitea main
git tag v0.1.0 && git push gitea v0.1.0
```

Workflow `.github/workflows/docker.yml` собирает два образа:

- `gitea.godchain.services/godchain/volkoff-website/api:<версия>` + `latest`
- `gitea.godchain.services/godchain/volkoff-website/web:<версия>` + `latest`

Пуш в `main` только собирает (проверка), публикуются образы по тегу `v*.*.*`. Секрет `PACKAGE_TOKEN_WRITE` — тот же организационный, что у остальных репо.

## 2. Секреты в Vault

Путь: **`apps/volkoff_website`** (KV v2, лукап `/apps/data/volkoff_website`). Все ключи попадают в `.env` стека как есть.

| Ключ | Что это | Как получить |
|---|---|---|
| `POSTGRES_PASSWORD` | пароль БД | `openssl rand -hex 24` (hex — без спецсимволов, т.к. идёт в URL) |
| `JWT_SECRET` | подпись access-токенов | `openssl rand -base64 48` |
| `DKIM_PRIVATE_KEY_B64` | приватный DKIM-ключ в base64 | `bash scripts/gen-dkim.sh` |

Опционально, если когда-нибудь захочется слать через внешний SMTP вместо прямой доставки: `MAIL_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`.

Несекретные настройки — в `roles/volkoff_website/vars/main.yml` ansible-репо (домен, версия, `ADMIN_EMAILS`, HELO).

## 3. Ansible

В репозитории `ansible` добавлены (не закоммичены):

- `roles/volkoff_website/{tasks/main.yml, files/docker-compose.yml, templates/.env.j2, vars/main.yml}`
- `playbooks/volkoff_website.yml` (по умолчанию `hosts: test`)

В Semaphore (`godchain`) — task template `volkoff-website` на `playbooks/volkoff_website.yml`, survey `hostsvar` = `test`.

Ручной запуск:

```bash
uv run ansible-playbook playbooks/volkoff_website.yml -e hostsvar=test
```

## 4. При первом старте

Контейнер `api` сам:
1. применяет миграции (`prisma migrate deploy`);
2. если товаров нет — заливает стартовый каталог (20 вещей из старого сайта, с фото);
3. стартует сервер.

Админ: зарегистрируйся на сайте с почтой из `volkoff_website_admin_emails` и подтверди её — роль ADMIN выдаётся после подтверждения. Админка — `/admin`.

## 5. Почта и DNS

См. [MAIL.md](MAIL.md) — записи SPF / DKIM / DMARC / PTR. Без них письма с подтверждением почты будут падать в спам.

## 6. Перед реальными продажами

- реквизиты продавца — `apps/web/src/config/site.ts` → `LEGAL` (подставляются в оферту и политику);
- реальный платёжный шлюз вместо `PAYMENT_PROVIDER=mock` — см. [PAYMENTS.md](PAYMENTS.md);
- юридические тексты показать юристу.
