// Comment bodies posted after silent-commit step pushes (fix in commit mode,
// conflict-resolve) so the timeline shows a card instead of just a "X pushed
// N commits" line. Pure functions — kept here so they can be unit-tested
// without exercising the runner.
import { CROSSCHECK_REPO_URL } from './product.js'

// Cap the file list at this length to keep comment bodies readable when a
// resolve touches many files.
const MAX_FILES_LISTED = 20

export interface FixAppliedCommentInput {
  owner: string
  repo: string
  sha: string
  appliedCount: number
  reviewCommentId?: number
}

export function buildFixAppliedCommentBody(input: FixAppliedCommentInput): string {
  const { owner, repo, sha, appliedCount, reviewCommentId } = input
  const shortSha = sha.slice(0, 7)
  const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`
  const backlink = reviewCommentId
    ? ` addressing the [code review](#issuecomment-${reviewCommentId})`
    : ''
  const plural = appliedCount !== 1 ? 's' : ''
  return [
    '### ✅ Auto-fix applied',
    '',
    `Pushed [\`${shortSha}\`](${commitUrl})${backlink}: **${appliedCount} change${plural} applied**.`,
    '',
    '---',
    `_Applied by Claude Code via [Crosscheck](${CROSSCHECK_REPO_URL})._`,
    '',
    '<!-- crosscheck: fix_applied -->',
  ].join('\n')
}

// Prominent banner prepended to a review comment when the first review attempt
// timed out but the delayed retry (same timeout) succeeded. Signals a transient
// blip that resolved on its own — the user's timeout budget was respected.
export function buildRetriedReviewBanner(timeoutMs: number, delayMs: number): string {
  const timeoutSec = Math.round(timeoutMs / 1000)
  const delaySec = Math.round(delayMs / 1000)
  return `> ⏱ **Retried** — the first review attempt timed out at ${timeoutSec}s. ` +
    `This review succeeded on the second attempt after a ${delaySec}s wait. ` +
    `If this happens repeatedly the PR may genuinely need a longer \`timeout_sec\`.`
}

export interface ReviewTimeoutFailedInput {
  prUrl: string
  timeoutSec: number
  retryDelaySec: number
}

// Posted when a review/recheck times out on both the first attempt and the
// delayed retry, so the failure reason is visible on the PR instead of only in
// the logs. Uses a distinct marker (not a review annotation) so it never counts
// as a completed review for Phase 1 detection — the next push still triggers a retry.
export function buildReviewTimeoutFailedCommentBody(input: ReviewTimeoutFailedInput): string {
  const { prUrl, timeoutSec, retryDelaySec } = input
  return [
    '### ⏱️ Review failed — timed out',
    '',
    `crosscheck could not finish reviewing this PR: the reviewer subprocess timed out ` +
      `after **${timeoutSec}s**, was retried once after a ${retryDelaySec}s wait, and timed out again.`,
    '',
    'This usually means the PR diff is too large to review within the configured time budget, ' +
      'or the reviewer service is degraded. Consider splitting the PR or raising ' +
      '`vendor.<reviewer>.timeout_sec` in `crosscheck.config.yml`.',
    '',
    `Push a new commit or run \`crosscheck run ${prUrl}\` to retry.`,
    '',
    '---',
    `_Reported by [Crosscheck](${CROSSCHECK_REPO_URL})._`,
    '',
    '<!-- crosscheck: review_failed -->',
  ].join('\n')
}

export interface ConflictResolvedCommentInput {
  owner: string
  repo: string
  sha: string
  conflictCount: number
  files: string[]
}

export function buildConflictResolvedCommentBody(input: ConflictResolvedCommentInput): string {
  const { owner, repo, sha, conflictCount, files } = input
  const shortSha = sha.slice(0, 7)
  const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`
  const plural = conflictCount !== 1 ? 's' : ''

  const shown = files.slice(0, MAX_FILES_LISTED)
  const remainder = files.length - shown.length
  const fileLines = shown.map(p => `- \`${p}\``)
  if (remainder > 0) fileLines.push(`- _...and ${remainder} more_`)

  return [
    '### 🔀 Conflicts resolved',
    '',
    `Resolved ${conflictCount} conflict${plural} in:`,
    ...fileLines,
    '',
    `Pushed [\`${shortSha}\`](${commitUrl}).`,
    '',
    '---',
    `_Resolved by Claude Code via [Crosscheck](${CROSSCHECK_REPO_URL})._`,
    '',
    '<!-- crosscheck: conflict_resolved -->',
  ].join('\n')
}
