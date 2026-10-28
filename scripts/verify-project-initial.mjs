#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const withArg = readOption('--with');
const all = args.includes('--all');
const rootArg = positionalArgs()[0];
const root = path.resolve(rootArg || process.cwd());

const requiredByCapability = {
  'ai-wiki': [
    'AGENTS.md',
    'CODEX.md',
    '.harness/index.md',
    '.harness/catalog.md',
    '.harness/rules.md',
    '.harness/workflows/small-change.md',
    '.harness/workflows/large-change.md',
    '.harness/workflows/review-sync.md',
    '.harness/workflows/knowledge-sync.md',
    '.harness/workflows/wiki-update.md',
    '.project-wiki/schema.md',
    '.project-wiki/index.md',
    '.project-wiki/log.md',
    '.project-wiki/templates/method.md',
    'raw/README.md',
  ],
  github: [
    'COMMIT_MESSAGE_GUIDE.md',
    'GITHUB-PROJECT-MANAGEMENT.md',
    '.harness/workflows/github-planning.md',
    '.harness/release-status-profile.json',
    '.project-wiki/architecture/ai-development-system.md',
    '.project-wiki/decisions/github-object-planning.md',
    '.github/ISSUE_TEMPLATE/intake.yml',
    '.github/ISSUE_TEMPLATE/development-plan.yml',
    '.github/ISSUE_TEMPLATE/feature.yml',
    '.github/ISSUE_TEMPLATE/bug.yml',
    '.github/ISSUE_TEMPLATE/rfc.yml',
    '.github/ISSUE_TEMPLATE/feedback.yml',
    '.github/ISSUE_TEMPLATE/release-checklist.yml',
    '.github/PULL_REQUEST_TEMPLATE.md',
  ],
  'review-loopback': [
    '.agents/skills/threaded-code-review-loopback/SKILL.md',
    '.agents/skills/threaded-code-review-loopback/agents/openai.yaml',
  ],
  mcm: [
    'MCM.md',
    '.mcm/project.manifest.json',
    '.mcm/snapshot.seed.json',
    '.harness/workflows/mcm-external-knowledge.md',
    '.project-wiki/contracts/mcm-external-knowledge.md',
  ],
};

function readOption(name) {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] || '';
  const prefix = `${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : '';
}

function positionalArgs() {
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--with') {
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) continue;
    result.push(arg);
  }
  return result;
}

function inferCapabilities() {
  const inferred = [];
  if (fs.existsSync(path.join(root, '.project-wiki', 'schema.md'))) inferred.push('ai-wiki');
  if (fs.existsSync(path.join(root, '.github', 'PULL_REQUEST_TEMPLATE.md'))) inferred.push('github');
  if (fs.existsSync(path.join(root, '.agents', 'skills', 'threaded-code-review-loopback', 'SKILL.md'))) inferred.push('review-loopback');
  if (fs.existsSync(path.join(root, '.mcm', 'project.manifest.json'))) inferred.push('mcm');
  return inferred;
}

const selected = all
  ? Object.keys(requiredByCapability)
  : withArg
    ? [...new Set(withArg.split(',').map((item) => item.trim()).filter(Boolean))]
    : inferCapabilities();

if (selected.length === 0) {
  console.error('No capabilities selected or detected. Use --with ai-wiki,github,review-loopback,mcm or --all.');
  process.exit(2);
}

for (const capability of selected) {
  if (!requiredByCapability[capability]) {
    console.error(`Unknown capability: ${capability}`);
    process.exit(1);
  }
}

const requiredFiles = selected.flatMap((capability) => requiredByCapability[capability]);

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

const expectedReleaseStages = [
  ['planned', 'status:planned', 'definition_of_ready_and_stable_order'],
  ['in_progress', 'status:in-progress', 'dev_manager_admission_and_active_local_delivery'],
  ['ready_for_staging', 'status:ready-for-staging', 'product_accepted_local_candidate_integrated'],
  ['staging_validation', 'status:staging-validation', 'exact_revision_live_on_test_server'],
  ['ready_for_production', 'status:ready-for-production', 'test_acceptance_for_exact_revision'],
  ['production_validation', 'status:production-validation', 'exact_accepted_revision_live_on_production'],
  ['done', 'status:done', 'production_acceptance_and_required_observation'],
];

if (selected.includes('github')) {
  const workflowPath = path.join(root, '.harness', 'workflows', 'github-planning.md');
  const intakePath = path.join(root, '.github', 'ISSUE_TEMPLATE', 'intake.yml');
  const releaseProfilePath = path.join(root, '.harness', 'release-status-profile.json');
  if (
    (fs.existsSync(workflowPath) && (
      !fs.readFileSync(workflowPath, 'utf8').includes('Canonical Ledger And Roles')
      || !fs.readFileSync(workflowPath, 'utf8').includes('.harness/release-status-profile.json')
    ))
    || !fs.existsSync(releaseProfilePath)
    || (!fs.existsSync(intakePath) && fs.existsSync(path.join(root, '.github', 'ISSUE_TEMPLATE')))
  ) {
    console.error('Legacy GitHub governance templates detected. Run init-project-initial.mjs with the selected capabilities and --upgrade, review .project-initial-backup/, then verify again.');
    process.exit(1);
  }
}

if (selected.includes('review-loopback')) {
  const reviewSkillPath = path.join(root, '.agents', 'skills', 'threaded-code-review-loopback', 'SKILL.md');
  if (fs.existsSync(reviewSkillPath) && !fs.readFileSync(reviewSkillPath, 'utf8').includes('exactly one full independent audit')) {
    console.error('Legacy review-loopback skill detected. Run init-project-initial.mjs with review-loopback --upgrade, review .project-initial-backup/, then verify again.');
    process.exit(1);
  }
}

if (missing.length > 0) {
  console.error('Missing project initialization files:');
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

if (selected.includes('github')) {
  const releaseProfilePath = path.join(root, '.harness', 'release-status-profile.json');
  let releaseProfile;
  try {
    releaseProfile = JSON.parse(fs.readFileSync(releaseProfilePath, 'utf8'));
  } catch (error) {
    console.error(`Release status profile is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  if (releaseProfile.version !== 2 || releaseProfile.profile !== 'seven-stage-server-release') {
    console.error('Release status profile must use version 2 and profile seven-stage-server-release.');
    process.exit(1);
  }

  const localFirst = releaseProfile.localFirstDelivery || {};
  const requiredIdentity = [
    'base_sha',
    'feature_tip_sha',
    'local_integration_commit',
    'local_integration_tree',
    'test_profile',
    'local_entry_point',
  ];
  if (
    localFirst.requiredBeforeRemoteCodeDelivery !== true
    || localFirst.invalidatedBySemanticRemoteBaseDrift !== true
    || localFirst.productionRequiresSeparateAuthorization !== true
    || !Array.isArray(localFirst.candidateIdentity)
    || requiredIdentity.some((token) => !localFirst.candidateIdentity.includes(token))
  ) {
    console.error('Release status profile is missing the local-first exact-candidate delivery gate.');
    process.exit(1);
  }

  const intake = releaseProfile.intake || {};
  if (
    intake.projectStageKey !== 'planned'
    || intake.issueLabel !== 'status:triage'
    || intake.readinessLabel !== 'ai-needs-context'
  ) {
    console.error('Release status profile has an invalid Intake mapping.');
    process.exit(1);
  }

  if (!Array.isArray(releaseProfile.stages) || releaseProfile.stages.length !== expectedReleaseStages.length) {
    console.error('Release status profile must contain exactly seven ordered stages.');
    process.exit(1);
  }

  const projectStatuses = new Set();
  for (let index = 0; index < expectedReleaseStages.length; index += 1) {
    const stage = releaseProfile.stages[index] || {};
    const [key, issueLabel, evidence] = expectedReleaseStages[index];
    if (stage.key !== key || stage.issueLabel !== issueLabel || stage.evidence !== evidence) {
      console.error(`Release status profile stage ${index + 1} must map ${key} to ${issueLabel} with evidence ${evidence}.`);
      process.exit(1);
    }
    if (typeof stage.projectStatus !== 'string' || stage.projectStatus.trim() === '') {
      console.error(`Release status profile stage ${key} needs a non-empty Project display name.`);
      process.exit(1);
    }
    if (projectStatuses.has(stage.projectStatus)) {
      console.error(`Release status profile repeats Project display name: ${stage.projectStatus}`);
      process.exit(1);
    }
    projectStatuses.add(stage.projectStatus);
  }
}

if (selected.includes('ai-wiki') || fs.existsSync(path.join(root, '.project-wiki', 'schema.md'))) {
  const schema = fs.readFileSync(path.join(root, '.project-wiki', 'schema.md'), 'utf8');
  for (const token of ['architecture', 'module', 'feature', 'contract', 'decision', 'method']) {
    if (!schema.includes(token)) {
      console.error(`Project wiki schema is missing entity type: ${token}`);
      process.exit(1);
    }
  }
  for (const token of ['current', 'historical', 'conflict', 'needs-verification', 'raw']) {
    if (!schema.includes(token)) {
      console.error(`Project wiki schema is missing source status: ${token}`);
      process.exit(1);
    }
  }
  for (const token of ['Runtime Graph Rules', 'Raw Source Rules']) {
    if (!schema.includes(token)) {
      console.error(`Project wiki schema is missing section: ${token}`);
      process.exit(1);
    }
  }
}

if (selected.includes('ai-wiki') && fs.existsSync(path.join(root, '.harness', 'catalog.md'))) {
  const catalog = fs.readFileSync(path.join(root, '.harness', 'catalog.md'), 'utf8');
  if (!catalog.includes('knowledge-sync.md')) {
    console.error('Harness catalog does not route knowledge sync work.');
    process.exit(1);
  }

  const index = fs.readFileSync(path.join(root, '.harness', 'index.md'), 'utf8');
  if (!index.includes('When GitHub planning is configured, do not modify product code')) {
    console.error('Harness development admission gate must be conditional on GitHub planning.');
    process.exit(1);
  }

  const reviewWorkflow = fs.readFileSync(path.join(root, '.harness', 'workflows', 'review-sync.md'), 'utf8');
  for (const token of ['For every code-producing development task, run exactly one independent', 'When review-loopback is configured', 'otherwise return it to the']) {
    if (!reviewWorkflow.includes(token)) {
      console.error(`Base review workflow is missing capability-safe audit guidance: ${token}`);
      process.exit(1);
    }
  }
}

if (selected.includes('github')) {
  const workflow = fs.readFileSync(path.join(root, '.harness', 'workflows', 'github-planning.md'), 'utf8');
  if (!workflow.includes('Cross-Repo GitHub Projects')) {
    console.error('GitHub planning workflow is missing cross-repo project guidance.');
    process.exit(1);
  }
  for (const token of ['Canonical Ledger And Roles', 'Repo-Issue-Manager', 'Dev-Manager', 'Project Status']) {
    if (!workflow.includes(token)) {
      console.error(`GitHub planning workflow is missing repository governance guidance: ${token}`);
      process.exit(1);
    }
  }
  for (const token of [
    '.harness/release-status-profile.json',
    'server/deployment system is the',
    'last provable stage',
    'Live Project Configuration',
    'local template verification alone',
    'may automate only exact-revision transitions',
    'acceptance stages require recorded acceptance',
  ]) {
    if (!workflow.includes(token)) {
      console.error(`GitHub planning workflow is missing server-release status contract: ${token}`);
      process.exit(1);
    }
  }
  for (const token of ['Intake And Issue Submission Gate', 'status:triage + ai-needs-context', '24-48 hour effect-tracking']) {
    if (!workflow.includes(token)) {
      console.error(`GitHub planning workflow is missing issue/effect tracking guidance: ${token}`);
      process.exit(1);
    }
  }
  for (const token of ['Definition Of Ready', 'Task size', 'Queue Model And WIP', 'Delivery Packet', 'depends-on-merge']) {
    if (!workflow.includes(token)) {
      console.error(`GitHub planning workflow is missing development queue guidance: ${token}`);
      process.exit(1);
    }
  }
  for (const token of ['Local acceptance queue', 'exact product acceptance', 'Before acceptance, do not push', 'Semantic or shared-surface drift', 'Production requires separate authorization']) {
    if (!workflow.includes(token)) {
      console.error(`GitHub planning workflow is missing local-first delivery guidance: ${token}`);
      process.exit(1);
    }
  }
  for (const token of ['exactly one read-only audit', 'routine second full audit', 'weekday quick pass', 'weekly deep pass', 'one recurring job']) {
    if (!workflow.includes(token)) {
      console.error(`GitHub planning workflow is missing review/hygiene guidance: ${token}`);
      process.exit(1);
    }
  }

  const reviewWorkflowPath = path.join(root, '.harness', 'workflows', 'review-sync.md');
  if (fs.existsSync(reviewWorkflowPath)) {
    const reviewWorkflow = fs.readFileSync(reviewWorkflowPath, 'utf8');
    for (const token of ['originating Developer', 'exactly one independent', 'without a routine second full audit', 'Delivery Packet', 'local acceptance candidate', 'local integration commit/tree', 'Before acceptance, do not push']) {
      if (!reviewWorkflow.includes(token)) {
        console.error(`Review workflow is missing direct-return/handoff guidance: ${token}`);
        process.exit(1);
      }
    }
  }

  const harnessRulesPath = path.join(root, '.harness', 'rules.md');
  if (fs.existsSync(harnessRulesPath)) {
    const harnessRules = fs.readFileSync(harnessRulesPath, 'utf8');
    for (const token of ['Local-First Delivery', 'clean acceptance worktree', 'Semantic or shared-surface drift', 'Production requires separate']) {
      if (!harnessRules.includes(token)) {
        console.error(`Harness rules are missing local-first delivery guidance: ${token}`);
        process.exit(1);
      }
    }
  }

  for (const template of ['development-plan.yml', 'feature.yml', 'bug.yml']) {
    const content = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', template), 'utf8');
    for (const token of ['task_size', 'dependencies']) {
      if (!content.includes(token)) {
        console.error(`${template} is missing repository queue field: ${token}`);
        process.exit(1);
      }
    }
  }

  const developmentPlan = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', 'development-plan.yml'), 'utf8');
  if (!developmentPlan.includes('local_acceptance')) {
    console.error('development-plan.yml is missing the local acceptance and remote-delivery gate.');
    process.exit(1);
  }

  for (const template of ['intake.yml', 'development-plan.yml', 'feature.yml', 'bug.yml', 'rfc.yml', 'feedback.yml', 'release-checklist.yml']) {
    const content = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', template), 'utf8');
    for (const token of ['status:triage', 'ai-needs-context']) {
      if (!content.includes(token)) {
        console.error(`${template} is missing canonical Intake default: ${token}`);
        process.exit(1);
      }
    }
  }

  const planningDecision = fs.readFileSync(path.join(root, '.project-wiki', 'decisions', 'github-object-planning.md'), 'utf8');
  for (const hardcodedBranch of ['`dev`', '`main`']) {
    if (planningDecision.includes(hardcodedBranch)) {
      console.error(`Generic GitHub planning decision hardcodes a source-repository branch: ${hardcodedBranch}`);
      process.exit(1);
    }
  }
  for (const token of ['.harness/release-status-profile.json', 'exact server or deployment-system']) {
    if (!planningDecision.includes(token)) {
      console.error(`GitHub planning decision is missing server-release mapping: ${token}`);
      process.exit(1);
    }
  }
}

if (selected.includes('mcm')) {
  const mcmConfig = fs.readFileSync(path.join(root, '.mcm', 'project.manifest.json'), 'utf8');
  if (!mcmConfig.includes('"id"')) {
    console.error('MCM project manifest is missing id.');
    process.exit(1);
  }
}

if (selected.includes('review-loopback')) {
  const reviewSkill = fs.readFileSync(
    path.join(root, '.agents', 'skills', 'threaded-code-review-loopback', 'SKILL.md'),
    'utf8',
  );
  for (const token of ['create_thread', 'send_message_to_thread', 'Do not modify files', 'Findings', 'fork_thread', 'exactly one full independent audit', 'routine second full audit', 'otherwise it returns to the originating owner or user']) {
    if (!reviewSkill.includes(token)) {
      console.error(`Review loopback skill is missing guardrail token: ${token}`);
      process.exit(1);
    }
  }

  const reviewOpenai = fs.readFileSync(
    path.join(root, '.agents', 'skills', 'threaded-code-review-loopback', 'agents', 'openai.yaml'),
    'utf8',
  );
  if (!reviewOpenai.includes('$threaded-code-review-loopback')) {
    console.error('Review loopback openai metadata is missing the default prompt skill reference.');
    process.exit(1);
  }

  if (fs.existsSync(path.join(root, '.harness', 'catalog.md'))) {
    const catalog = fs.readFileSync(path.join(root, '.harness', 'catalog.md'), 'utf8');
    if (!catalog.includes('threaded-code-review-loopback')) {
      console.error('Harness catalog does not route review loopback work.');
      process.exit(1);
    }
  }
}

if (selected.includes('github') && fs.existsSync(path.join(root, '.harness', 'catalog.md'))) {
  const catalog = fs.readFileSync(path.join(root, '.harness', 'catalog.md'), 'utf8');
  if (!catalog.includes('github-planning.md')) {
    console.error('Harness catalog does not route GitHub planning work.');
    process.exit(1);
  }
}

if (selected.includes('mcm') && fs.existsSync(path.join(root, '.harness', 'catalog.md'))) {
  const catalog = fs.readFileSync(path.join(root, '.harness', 'catalog.md'), 'utf8');
  if (!catalog.includes('mcm-external-knowledge.md')) {
    console.error('Harness catalog does not route MCM external knowledge work.');
    process.exit(1);
  }
}

if (selected.includes('github')) {
  const prTemplate = fs.readFileSync(path.join(root, '.github', 'PULL_REQUEST_TEMPLATE.md'), 'utf8');
  for (const token of ['Related Objects', 'Regression Risk', 'Effect Tracking', 'Delivery And Independent Review', 'Project Wiki / Harness Sync', 'Release Promotion Evidence', 'Current Project status', 'Current Issue label', 'Next Project status', 'Next Issue label', '.harness/release-status-profile.json', 'Test server revision', 'Production revision', 'Local integration commit/tree', 'Product acceptance reference', 'Remote-base drift / forward audit', 'accepted the exact local candidate']) {
    if (!prTemplate.includes(token)) {
      console.error(`PR template is missing section: ${token}`);
      process.exit(1);
    }
  }

  const releaseTemplate = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', 'release-checklist.yml'), 'utf8');
  for (const token of ['promotion_evidence', 'status_contract', 'local_acceptance_evidence', 'Product acceptance reference', 'Remote-base drift', 'Current Project status', 'Current Issue label', 'Next Project status', 'Next Issue label', '.harness/release-status-profile.json']) {
    if (!releaseTemplate.includes(token)) {
      console.error(`Release checklist is missing server-release gate: ${token}`);
      process.exit(1);
    }
  }
}

console.log(`Project initialization structure verified in ${root}`);
console.log(`Verified capabilities: ${selected.join(', ')}`);
