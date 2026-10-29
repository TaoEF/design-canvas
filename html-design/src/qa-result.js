// Shared by browser diagnostics and Node resource diagnostics. Admit each bounded
// issue before appending; never serialize the complete response to find its size.
export const QA_OUTPUT = { idCodeUnits: 256, issueCount: 500, issueBytes: 128 * 1024, clippingAncestors: 32, pathCodeUnits: 4096 };
export const usableQaId = value => typeof value === 'string' && value.length > 0 && value.length <= QA_OUTPUT.idCodeUnits;
export function appendQaIssue(result, issue) {
  const bytes = new TextEncoder().encode(JSON.stringify(issue)).length + (result.issues.length ? 1 : 0);
  result.coverage.issueBytes ??= 2;
  if (result.issues.length >= QA_OUTPUT.issueCount || result.coverage.issueBytes + bytes > QA_OUTPUT.issueBytes) {
    result.truncated = true;
    result.status = 'issues';
    result.coverage.issuesOmitted++;
    return false;
  }
  result.coverage.issueBytes += bytes;
  result.issues.push(issue);
  return true;
}
