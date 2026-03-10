# Project Key Facts: [Project Name]

## Configuration & Constants
- **Production URL:** `https://api.myapp.com`
- **Development Port:** `3000` (Frontend), `8080` (Backend API)
- **Timeouts:** Global API timeout is set to `5000ms` in `src/config/constants.ts`.
- **Database Schema:** Version `v2.4.0`. Main tables: `Users`, `Orders`, `Products`.

## Critical Paths
- **Auth Logic:** `src/lib/auth/engine.ts`
- **Shared Constants:** `packages/shared/constants.json`
- **Environment Template:** `.env.example`

## External Dependencies
- **Stripe API:** Using version `2023-10-16`.
- **AWS Region:** Defaulted to `us-east-1` in Terraform.

## Important Credentials (Placeholders only)
- **Service Account ID:** `svc-app-executor`
- **Test User:** `tester@example.com` (Use password from Vault)
