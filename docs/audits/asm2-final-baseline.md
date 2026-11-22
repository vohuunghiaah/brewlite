# Baseline ASM2 — 23/11/2026

Main 4e47d14c35177b94d287f1f3814c9299b896ea5b. API package 0.0.1. No Git tags or GitHub Releases at inspection. Issues 1–5 closed. PR #44 open, mergeable, touches README, quality workflow, gitleaks and handover/release/security documents. Its checkout has an uncommitted security report edit. Audit starts from main in a separate worktree. PR #7 also open.

Quality gates require API and web on up-to-date main. Positive run 45056571129, negative run 45056240033. Main deployment 45049566612 includes successful GHCR publication and Lightsail deployment. Public GET /api/health returned database up. Runtime image digest and host firewall require separate evidence.

Compose: docker-compose.yml (LOCAL), docker-compose.prod.yml (Lightsail), compose.test.yml (isolated CI overlay). CI staging selector only reports unavailable. Production Caddy proxies to web:3000 and api:3001. PostgreSQL 16 uses a named volume.

## Branch inventory

| Remote branch | PR/state | Tip ancestor of main | Tip/date | Action and risk |
|---|---|---|---|---|
| chore/setup-repository | 6 MERGED | True | 762f399d 2026-11-12 | Candidate, approval required (low) |
| ci/task4-4-final-acceptance | 28 MERGED | True | 54e24eeb 2026-11-18 | Candidate, approval required (low) |
| codex/brewlite-swe-free-domain | 42 MERGED | True | 24dddc0a 2026-11-22 | Candidate, approval required (low) |
| codex/fix-production-stdin-verification | 39 MERGED | True | c14b386e 2026-11-21 | Candidate, approval required (low) |
| codex/production-verification-report | 36 MERGED | True | 885777da 2026-11-20 | Candidate, approval required (low) |
| docs/final-production-acceptance-handover | 40 MERGED | True | f82015c1 2026-11-21 | Candidate, approval required (low) |
| docs/separate-order-payment-usecases | 16 CLOSED | False | bc9211a2 2026-11-16 | Keep, investigate history/owner (high) |
| docs/task1-final-audit-and-merge | 17 MERGED | True | f662d5d3 2026-11-16 | Candidate, approval required (low) |
| docs/task1-final-requirements-alignment | 14 MERGED | True | 4cb19a93 2026-11-14 | Candidate, approval required (low) |
| docs/task1-requirements-fix | 12 MERGED | True | bff23eff 2026-11-13 | Candidate, approval required (low) |
| docs/task2-1-activity-correction | 19 MERGED | True | 263e304a 2026-11-16 | Candidate, approval required (low) |
| docs/task2-1-final-activity-diagram | 15 MERGED | True | aee5fbba 2026-11-14 | Candidate, approval required (low) |
| docs/task2-2-sequence-correction | 20 MERGED | True | 8edb91b8 2026-11-16 | Candidate, approval required (low) |
| docs/task2-3-class-diagram | 21 MERGED | True | 3706286d 2026-11-16 | Candidate, approval required (low) |
| docs/task2-handover-gap-audit | 22 MERGED | True | 842bb99d 2026-11-16 | Candidate, approval required (low) |
| docs/task3-2-aws-lightsail-deployment | 24 MERGED | True | 95e316f5 2026-11-18 | Candidate, approval required (low) |
| docs/task3-architecture-and-deployment | 23 MERGED | True | 7e48a8e1 2026-11-16 | Candidate, approval required (low) |
| docs/task4-1-final-acceptance | 25 MERGED | True | dd213fa3 2026-11-18 | Candidate, approval required (low) |
| docs/task4-2-document-management | 26 MERGED | True | 5ba7cda9 2026-11-18 | Candidate, approval required (low) |
| docs/task5-4-1-production-readiness | 37 MERGED | True | da3f8381 2026-11-20 | Candidate, approval required (low) |
| docs/task5-4-release-security-handover | 44 OPEN | False | 905f80e2 2026-11-23 | Keep (protected/active) |
| feat/devops-config | 8 MERGED | True | d020ca27 2026-11-08 | Candidate, approval required (low) |
| feat/figma-ui-restoration | 41 MERGED | True | 97ac6997 2026-11-22 | Candidate, approval required (low) |
| feat/order-status-staff-and-navigation | 38 MERGED | True | 54b4f6be 2026-11-20 | Candidate, approval required (low) |
| feat/task4-3-menu-mvp | 27 MERGED | True | 05c9dd31 2026-11-18 | Candidate, approval required (low) |
| feat/task5-1-1-product-customization-cart | 29 MERGED | True | 41f35173 2026-11-19 | Candidate, approval required (low) |
| feat/task5-1-2-auth-jwt-integration | 30 MERGED | True | 7fc18f78 2026-11-19 | Candidate, approval required (low) |
| feat/task5-1-3-mock-payment | 31 MERGED | True | 1c6f438f 2026-11-20 | Candidate, approval required (low) |
| feat/task5-1-order-history-status | 33 MERGED | True | badbbac4 2026-11-20 | Candidate, approval required (low) |
| feat/task5-2-integration-testing | 34 MERGED | True | a191bd26 2026-11-20 | Candidate, approval required (low) |
| feat/task5-3-continuous-delivery | 35 MERGED | True | 256c9306 2026-11-20 | Candidate, approval required (low) |
| feat/ui-v2-home-catalog-stock | 43 MERGED | True | 06e9f2bb 2026-11-23 | Candidate, approval required (low) |
| feature/menu-ui | 10 MERGED | False | 6ec99bfc 2026-11-13 | Keep, investigate history/owner (high) |
| feature/sprint1-mvp-foundation | 7 OPEN | False | 7f8cb4cb 2026-11-13 | Keep (protected/active) |
| feature/sprint2-full-flow | 9 MERGED | False | 588e3362 2026-11-09 | Keep, investigate history/owner (high) |
| fix/baseline-quality-gates | 18 MERGED | True | ae01c396 2026-11-16 | Candidate, approval required (low) |
| fix/e2e-cors-idempotency-header | 32 MERGED | True | 19409025 2026-11-20 | Candidate, approval required (low) |
| fix/task1-post-merge-audit | 13 MERGED | True | bd29fbb7 2026-11-14 | Candidate, approval required (low) |
| main |   | True | 4e47d14c 2026-11-23 | Keep (protected/active) |
| pr16-reference |   | False | bc9211a2 2026-11-16 | Keep, investigate history/owner (high) |
| thuong | 11 MERGED | True | 53aa653c 2026-11-13 | Candidate, approval required (low) |

## Tracked documents at baseline

- docs/README.md
- docs/architecture/DeploymentDiagram.puml
- docs/architecture/DeploymentDiagram.svg
- docs/architecture/README.md
- docs/architecture/adr/README.md
- docs/architecture/adr/adr/001-modular-monolith.md
- docs/architecture/adr/adr/002-postgresql-migration.md
- docs/architecture/adr/adr/003-mock-payment.md
- docs/architecture/adr/adr/004-logging-healthcheck.md
- docs/architecture/adr/adr/005-configuration-management.md
- docs/architecture/adr/adr/006-orm-migration-prisma.md
- docs/architecture/adr/adr/007-aws-lightsail-deployment.md
- docs/audits/task2-to-task3-gap-audit.md
- docs/backlog/product-backlog.md
- docs/backlog/sprint-1.md
- docs/backlog/sprint-2.md
- docs/branching-strategy.md
- docs/commit-convention.md
- docs/definition-of-done.md
- docs/deployment/brewlite-swe-duckdns.jpg
- docs/deployment/brewlite-swe-free-domain-report.md
- docs/deployment/deployment-guide.md
- docs/deployment/final-production-acceptance-2026-11-21.md
- docs/deployment/github-environment-setup.md
- docs/deployment/production-prerequisites.md
- docs/deployment/production-readiness-report.md
- docs/deployment/production-release-checklist.md
- docs/deployment/production-release-runbook.md
- docs/deployment/production-verification-report.md
- docs/deployment/rollback-guide.md
- docs/diagram/ActivityDiagram-UC10.puml
- docs/diagram/ActivityDiagram-UC10.svg
- docs/diagram/ActivityDiagram-Unified.puml
- docs/diagram/ActivityDiagram-Unified.svg
- docs/diagram/ActivityDiagram.puml
- docs/diagram/ActivityDiagram.svg
- docs/diagram/ClassDiagram-Conceptual.mmd
- docs/diagram/ClassDiagram-Conceptual.svg
- docs/diagram/SequenceDiagram-UC10.puml
- docs/diagram/SequenceDiagram-UC10.svg
- docs/diagram/SequenceDiagram-Unified.puml
- docs/diagram/SequenceDiagram-Unified.svg
- docs/diagram/SequenceDiagram.puml
- docs/diagram/SequenceDiagram.svg
- docs/document-control.md
- docs/final-handover-report.md
- docs/github-setup.md
- docs/requirements/context-and-scope.md
- docs/requirements/srs.md
- docs/requirements/task1-final-audit.md
- docs/requirements/use-case-overview.puml
- docs/requirements/use-case-overview.svg
- docs/requirements/use-case-place-order.md
- docs/requirements/use-case-place-order.puml
- docs/requirements/use-case-place-order.svg
- docs/requirements/use-cases.md
- docs/task-4.1-verification.md
- docs/task-4.4-ci-verification.md
- docs/task-5-2-completion-report.md
- docs/task-5-3-completion-report.md
- docs/testing/screenshots/01-menu-discovery.png
- docs/testing/screenshots/02-customizer-modal.png
- docs/testing/screenshots/03-cart-drawer.png
- docs/testing/screenshots/04-auth-modal.png
- docs/testing/screenshots/05-checkout-flow.png
- docs/testing/screenshots/06-pickup-ticket.png
- docs/testing/screenshots/07-order-history.png
- docs/testing/task-5-2-evidence/01-menu-discovery.png
- docs/testing/task-5-2-evidence/02-customizer-modal.png
- docs/testing/task-5-2-evidence/03-cart-drawer.png
- docs/testing/task-5-2-evidence/04-auth-modal.png
- docs/testing/task-5-2-evidence/05-checkout-flow.png
- docs/testing/task-5-2-evidence/06-pickup-ticket.png
- docs/testing/task-5-2-evidence/07-order-history.png
- docs/testing/task-5-2-evidence/acceptance.txt
- docs/testing/task-5-2.md
- docs/traceability-matrix.md
- docs/ui/assets/01-menu-discovery.png
- docs/ui/assets/02-customizer-modal.png
- docs/ui/assets/03-cart-drawer.png
- docs/ui/assets/04-auth-modal.png
- docs/ui/assets/05-checkout-flow.png
- docs/ui/assets/06-pickup-ticket.png
- docs/ui/assets/07-order-history.png
- docs/ui/assets/08-loyalty-account.png
- docs/ui/figma-design-spec.md
- docs/ui/figma-ui-restoration-plan.md
- docs/ui/restoration-evidence/01-menu-desktop.png
- docs/ui/restoration-evidence/02-menu-mobile.png
- docs/ui/restoration-evidence/03-customizer-modal.png
- docs/ui/restoration-evidence/04-cart-drawer.png
- docs/ui/restoration-evidence/05-auth-modal.png
- docs/ui/restoration-evidence/06-checkout-flow.png
- docs/ui/restoration-evidence/07-order-confirmation.png
- docs/ui/restoration-evidence/08-order-history.png
- docs/ui/restoration-evidence/09-account-screen.png
- docs/ui/v2-evidence/ui-v2-01-home-hero-desktop.png
- docs/ui/v2-evidence/ui-v2-02-home-full-desktop.png
- docs/ui/v2-evidence/ui-v2-03-menu-catalog-desktop.png
- docs/ui/v2-evidence/ui-v2-04-category-filter-fruit-tea.png
- docs/ui/v2-evidence/ui-v2-05-modal-in-stock.png
- docs/ui/v2-evidence/ui-v2-06-modal-out-of-stock.png
- docs/ui/v2-evidence/ui-v2-07-modal-low-stock.png
- docs/ui/v2-evidence/ui-v2-08-home-mobile.png
- docs/ui/v2-evidence/ui-v2-09-menu-mobile.png
