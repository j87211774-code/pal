# Vision NGO Backend (scaffold)

This is a scaffold for the Vision NGO Management System backend.

Tech stack:
- Node.js + TypeScript + Express
- PostgreSQL (Prisma)
- Docker / docker-compose for local dev

Quick start (local):
1. Copy `.env.example` to `.env` and update variables.
2. Start db + backend using Docker Compose: `docker-compose up --build`
3. In another terminal you can run migrations (Prisma) after installing dependencies.

Notes:
- The `auth` route is a placeholder and should be replaced with secure implementations using the DB and hashed passwords.
- CI workflow is included under `.github/workflows/ci.yml`.

CI badges
-------

Add these badges to your repo README to show CI status (replace OWNER/REPO with your GitHub repo):

![Quick checks](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg?event=push&branch=main)

![Build & Tests (matrix)](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg?event=push&branch=main)

Note: Replace OWNER/REPO in the URLs above with your repository details to enable live badges.

Code coverage (Codecov)
-----------------------

We upload coverage reports to Codecov in the CI workflow. To enable full reporting in your repository:

- Create a Codecov account and add this repository (https://codecov.io).
- Create a repository secret `CODECOV_TOKEN` in GitHub (Settings → Secrets) and set it to your Codecov upload token.
- Once CI runs with a valid token, Codecov will display coverage details and you can add a Codecov badge:

![Codecov](https://codecov.io/gh/OWNER/REPO/branch/main/graph/badge.svg)

Replace OWNER/REPO with your repository path to enable the badge.

Pull request comments
---------------------

The CI workflow can post coverage diffs as comments on pull requests. To enable this:

- Add `CODECOV_TOKEN` to your repository secrets (Settings → Secrets).
- Ensure Codecov is configured for the repo (https://codecov.io).
- The CI job `codecov-comment` runs on pull requests and will request Codecov to post a coverage summary comment on the PR.

If you prefer not to post comments, you can disable it by removing the `codecov-comment` job from `.github/workflows/ci.yml`.

Storage configuration:
- The export persistence supports two backends controlled by `EXPORT_STORAGE` in the environment: `local` (default) and `s3`.
- See `.env.example` for the S3-related variables (`S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
- When using `s3`, saved exports are stored under the key prefix `<projectId>/` and downloads are served via presigned URLs (the download endpoints redirect to the presigned URL).
