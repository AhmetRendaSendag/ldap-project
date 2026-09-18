# LDAP Project

A small FastAPI service for managing users in an LDAP directory, with a
static HTML GUI on top. Built as a warm-up project to practice API design,
authentication against an external directory service, and basic security
hardening (LDAP injection, XSS, error-leakage).

## Stack

- **FastAPI** for the HTTP API
- **ldap3** for talking to the LDAP server
- **Pydantic** for request/response models
- **PyJWT** for issuing/verifying access tokens
- Plain HTML/JS static GUI (no frontend framework)
- **Docker** / **docker-compose** for running the API alongside an OpenLDAP server

## Project layout

```
main.py                      # app entrypoint: wires up routes + middleware
api/users.py                  # HTTP routes for login + user management
services/ldap_service.py      # LDAP connection and directory query/mutation logic
services/auth_service.py      # login verification + JWT issuing/validation
models/schemas.py             # request/response models
middleware/request_logging.py # structured JSON request logging
static/index.html             # GUI
base.ldif                     # sample seed data for a local test directory
Dockerfile                    # container image for the API
docker-compose.yml            # API + OpenLDAP, wired together
```

## Endpoints

| Method | Path           | Description                              |
|--------|----------------|--------------------------------------------|
| POST   | `/login`       | Exchange LDAP credentials for an access token |
| GET    | `/users`       | List users (requires a valid token)         |
| POST   | `/users`       | Create a user (admin token only)            |
| PUT    | `/users/{uid}` | Update a user's `sn`/`ou` (admin token only)|
| DELETE | `/users/{uid}` | Delete a user (admin token only)            |

### Auth flow

1. `POST /login` with `{"username": "...", "password": "..."}` — the server
   binds to LDAP with those credentials to verify them, then issues a
   short-lived JWT (`access_token`, expires after `JWT_EXPIRE_MINUTES`,
   default 30).
2. Send that token as `Authorization: Bearer <token>` on subsequent
   requests. The password itself is only ever sent once, at login.
3. Directory writes (create/update/delete) require the token to belong to
   the LDAP admin account; the server performs the actual write using its
   own service-account bind (`LDAP_ADMIN_DN` / `LDAP_ADMIN_PASSWORD`), not
   the caller's credentials.

## Running locally

Requires a running LDAP server (e.g. OpenLDAP) seeded with `base.ldif`.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The GUI is served at `/gui`, the API at `/`.

### Environment variables

| Variable              | Default                  | Purpose                                  |
|-----------------------|---------------------------|-------------------------------------------|
| `LDAP_SERVER`          | `localhost`               | Hostname of the LDAP server                |
| `LDAP_ADMIN_PASSWORD`  | `admin`                   | Password for the app's own admin service bind |
| `JWT_SECRET`           | `dev-secret-change-me`    | Signing key for access tokens — **must** be overridden outside local dev |
| `JWT_EXPIRE_MINUTES`   | `30`                      | Access token lifetime                      |

## Running with Docker

```bash
docker compose up --build
```

This starts the API (`localhost:8000`) and an OpenLDAP server (`localhost:389`,
admin password `admin`) seeded from `base.ldif`, networked together.

## Known gaps

- Authorization is a simple `is_admin` check baked into the token at login
  time, rather than real role-based access control.
- `JWT_SECRET` defaults to a hardcoded dev value if not set via environment
  — fine for the local lab, but must be set to a real secret anywhere else.
- The LDAP connection is plaintext (no TLS/StartTLS) — fine for a local lab
  server, not for talking to a real directory over an untrusted network.
