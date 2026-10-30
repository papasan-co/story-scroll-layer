# Repository Instructions

## Git Promotion Policy

Application code and CI/config changes always follow `feature branch` → `staging` → `main`. Open implementation PRs against staging; the production PR head must be staging, after the combined staging head is reviewed and verified. Normal urgency, missing deployment or agent preference never authorizes a direct feature-to-main path. Design/content publication follows its existing owner and does not bypass this code policy.

Before promotion, inspect current main/staging ancestry AND actual file differences. Unique release merge IDs alone do not establish missing application code. Reconcile necessary main ancestry on a reviewed staging-based feature, preserving all unrelated staged work; do not replace staging with an older production tree, reset history or silently relabel source refs. An explicit authorized reconciliation does not require repeating routine approval questions. Report exact checked heads and real divergence.

Run the existing presentation contract generator and unit suite for source reconciliation. Keep consumer layer selectors unchanged; source branch ancestry alone does not prove deployed runtime differences.
