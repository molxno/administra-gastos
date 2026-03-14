---
applyTo: "**"
---

# Copilot Review Instructions

## Architecture

This is a **frontend-only** React/TypeScript SPA. The Supabase backend (schema, migrations, RLS policies) lives in a **separate repository**. Do NOT flag missing DB columns or migrations — they are handled in the backend repo independently.

## PR Scope

PRs in this repo may intentionally bundle related changes (e.g., a feature + its error handling + its sync layer). If the PR description documents the full scope, do not suggest splitting it into separate PRs.

## Offline Resilience

The app is designed to work offline using localStorage-persisted state. When cloud sync fails, the app proceeds with local data and shows a non-blocking toast — this is intentional, not a bug.
