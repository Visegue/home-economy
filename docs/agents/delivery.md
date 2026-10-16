# Automated issue delivery

The user authorized this workflow on 2026-10-14 for #104 and future user-requested issues in Home-Economy. A request to implement an issue includes verification, commits, push, PR creation, independent review, resolution of review comments, and merge when the conditions below pass. This standing authorization overrides a skill's narrower default commit boundary for this repository. Starting unrelated backlog issues remains a separate user request.

## Prepare the PR

1. Keep the implementation in its assigned branch/worktree. Inspect current main and existing PRs before creating or updating anything.
2. Complete issue-specific tests, repository checks, versioning and working-tree review. Use `git-commit` for task and review-fix commits. Push the issue branch and use `pr`, the repository template and `gh` to create or update its GitHub PR.
3. Describe the final change, before/after evidence, version choice, material limitations and rollback scope. Apply the user's runtime-model attribution to external text. Link the originating issue and attach the PR to its Codex chat.

## Review in a separate session

Create a fresh Codex chat for the PR review, without forking the implementing conversation. The review may run the `code-review` skill's separate Standards and Spec agents, but those agents alone do not replace the requested independent chat. Read the PR/issue and repository standards in that chat; inspect committed code at a pinned base and head. Keep review operations read-only on the implementation checkout.

The user authorizes messages to that review chat requesting the initial review and subsequent reviews of changed heads, and authorizes posting review findings and replies to the PR. Return the reviewed head SHA, Standards/Spec findings, verification concerns and an explicit disposition. Reviewer text uses the reviewing session's own runtime-model attribution. A COMMENT review with an explicit disposition is valid independent-session evidence when GitHub disallows approving one's own PR; it does not replace any required GitHub approval.

The implementing session investigates actionable comments, makes the smallest correct fix, runs affected checks, commits and pushes, then requests review of the new head. For an inapplicable comment, explain the reason and evidence and obtain reviewer agreement. Resolve review threads after the finding is addressed or agreed inapplicable. Reuse the review chat through this loop.

## Merge gate

Merge only when all of the following hold for the current PR head:

- The independent review has no unresolved blocking Standards or Spec findings, and material verification concerns have an evidenced disposition.
- Required GitHub checks and preview/migration gates pass; apply the release runbook and security checks relevant to the changed code.
- PR comments/review threads have been handled, required approvals are present, and main/version/conflict checks remain valid.

Recheck PR state, head SHA, review evidence and checks immediately before merging. Use a merge operation pinned to that head and a repository-supported method consistent with linear history. Preserve branch protections and required checks. If main or head changes invalidate the evidence, refresh the affected checks and review first.

## Continue and verify

While review or CI is pending, use a thread heartbeat to continue this same delivery chat. Save the PR, issue, workspace, reviewer chat and reviewed-head identities in its prompt/state so resumed runs recover the correct work. Use bounded waits and notify on meaningful changes, failures, required user action or completion; unchanged pending state stays quiet. Reuse an existing matching heartbeat.

The implementation and reviewer chats are the authorized participants; continue their work without further routine permission prompts. Do not run the same delivery concurrently from unrelated chats.

After merge, verify the CI/deployment/release result against the exact merge commit and the production identity under the release runbook. Only CI creates release tags. Mark project delivery status from verified results, then pause the completed issue's heartbeat. Preserve the branch/worktree until cleanup is explicitly requested. A review/CI/deploy failure is investigated and corrected within the issue scope; an unresolved external blocker is reported as such.
