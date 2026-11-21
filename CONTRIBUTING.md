# Contributing to Pickup

Thanks for your interest in Pickup.

> [!IMPORTANT]
> Pickup is still in active development, and its structure changes often. Until that
> settles, **pull requests are not accepted**: they would mostly collide with ongoing
> work, and pull requests opened anyway are closed without review. Bug reports and ideas
> as issues are welcome. This note goes away once contributions are open.

## Issues

- **Bugs:** what you did, what you expected, what happened instead, and the version
  (image tag or commit). Screenshots or logs help; remove personal data first.
- **Ideas:** describe the problem you want solved before the solution, so we can find
  the fitting place in Pickup together.
- **Security issues:** do not open a public issue; report them privately through
  *Security → Report a vulnerability* on GitHub (see [SECURITY.md](SECURITY.md)).

## Pull requests

Not accepted for now (see above). Once they are, this is how a change gets in:

1. Discuss larger changes in an issue first.
2. Fork, branch from `main`, keep the change focused on one topic.
3. Set up the project as described under [Development](#development) below.
4. Follow the conventions in [AGENTS.md](AGENTS.md): structure, services, UUID models,
   strict typing, English and German texts, no inline scripts. Install the pre-commit
   hooks once per clone with `uv tool run pre-commit install`.
5. Add or update tests; coverage must stay at or above the minimums (backend 90 %,
   frontend 90/90/85/85).
6. After model changes run `just migrations` (**django: makemigrations**), after API changes
   `just api-types` (**api: types**), after changing server texts `just messages`
   (**django: messages**, then translate the new entries), and commit the generated files.
7. Update the documentation when users or operators notice the change.
8. Run `just check` (**check**) before you push; CI runs the same checks on the pull
   request.

Pull requests are squash-merged, and their title becomes the commit on `main`. Write it as a
[Conventional Commit](https://www.conventionalcommits.org/) in English: `feat: show the owner
on the detail page`, `fix: …`, `deps: …` (a dependency that reaches users), `docs: …`, `chore: …`;
`feat!:` or a `BREAKING CHANGE:` footer
for incompatible changes. Releases are made from these titles (CHANGELOG.md, version number),
so they describe the change for users.

## Development

You need [uv](https://docs.astral.sh/uv/) (it brings Python 3.14), Node.js 26 with pnpm,
[just](https://just.systems/) (`uv tool install rust-just`) and optionally Docker for
PostgreSQL.

```bash
cp .env.example .env
just setup
just migrate
just dev-backend     # Django on :8000
just dev-frontend    # Vite on :5173, open http://localhost:5173
```

`just` lists every recipe; the VS Code tasks in `.vscode/tasks.json` call the same ones
(**dev** starts both servers). Vite proxies `/api`, `/admin` and `/django-static` to
Django, so both share one origin. With SQLite there is no job worker: jobs such as mails
run right away. For PostgreSQL like production: `just db-up`, then `DB_TYPE=postgres` and
`DB_HOST=localhost` in `.env`; `just worker` runs the background jobs. End-to-end tests use
Cypress: `pnpm exec cypress install` once, then `pnpm test:e2e` in `frontend/`.

Demo data for screenshots and trying things out: `uv run python manage.py seed_demo` in
`backend/` creates a pickup with four people and their photos (generated pictures, or your
own with `--photos <folder of JPEGs>`) and prints the creator's personal link.

How the code is organised, the access rules and the frontend conventions are in
[AGENTS.md](AGENTS.md); read it before changing structure. The API is described in
`frontend/openapi.json` (browsable at `/api/docs/` with `DEBUG=true`).

CI (`.github/workflows/build.yaml`) runs `just check-backend`, `check-deploy`,
`check-frontend` and `check-workflows`, scans the repository with Trivy, then builds the
image, starts it hardened against PostgreSQL, scans it and pushes it to
`ghcr.io/marank/pickup` (`latest` from `main`, versions from releases). Once a week it
rebuilds the image and checks how long the platforms are supported. Dependabot opens
weekly update pull requests.

## License

Pickup is licensed under the [AGPL-3.0-or-later](LICENSE). By submitting a contribution
you agree that it is licensed under the same terms. Dependencies must be compatible with
it (checked in CI).
