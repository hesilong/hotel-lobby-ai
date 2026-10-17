import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseEnv } from 'node:util'

const ROOT = process.cwd()

const paths = {
  local: resolve(ROOT, '.env.local'),
  vars: resolve(ROOT, '.env.production.vars'),
  secrets: resolve(ROOT, '.env.production.secrets'),
}

const hasValue = value => typeof value === 'string' && value.trim().length > 0

function fail(message) {
  console.error(`\n[production-env] ${message}`)
  process.exit(1)
}

function readEnvFile(path, label) {
  if (!existsSync(path)) {
    fail(`Missing ${label}: ${path.replace(ROOT, '.')}`)
  }

  try {
    return parseEnv(readFileSync(path, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`Could not parse ${label}: ${message}`)
  }
}

function isSecretKey(key) {
  const upper = key.toUpperCase()

  // Client-exposed prefixes are always regular variables.
  if (
    upper.startsWith('VITE_') ||
    upper.startsWith('NEXT_PUBLIC_') ||
    upper.startsWith('NUXT_PUBLIC_')
  ) {
    return false
  }

  return (
    /(^|_)SERVICE_ROLE_KEY($|_)/.test(upper) ||
    /(^|_)PRIVATE_KEY($|_)/.test(upper) ||
    /(^|_)SECRET($|_)/.test(upper) ||
    /(^|_)API_KEY($|_)/.test(upper) ||
    /(^|_)ACCESS_KEY_ID($|_)/.test(upper) ||
    /(^|_)PASSWORD($|_)/.test(upper) ||
    /(^|_)TOKEN($|_)/.test(upper)
  )
}

function renderEnvFile(kind, keys) {
  const title = kind === 'vars' ? 'regular variables' : 'secrets'
  return [
    `# Production ${title}.`,
    '# Generated from .env.local by: npm run env:init:prod',
    '# Production values are intentionally NOT copied from local/test.',
    '# Fill every value you want to require in production.',
    '# Delete any optional/fallback key that should not be required.',
    '',
    ...keys.map(key => `${key}=`),
    '',
  ].join('\n')
}

function initProductionEnv() {
  const force = process.argv.includes('--force')

  if (!force && (existsSync(paths.vars) || existsSync(paths.secrets))) {
    fail(
      'Production env files already exist. Refusing to overwrite them.\n' +
      'Remove them first, or run "npm run env:init:prod -- --force" if you intentionally want to regenerate them.',
    )
  }

  const local = readEnvFile(paths.local, 'local/test env file')
  const keys = Object.keys(local)

  if (!keys.length) fail('.env.local does not contain any variables.')

  const vars = keys.filter(key => !isSecretKey(key))
  const secrets = keys.filter(isSecretKey)

  writeFileSync(paths.vars, renderEnvFile('vars', vars), { mode: 0o600 })
  writeFileSync(paths.secrets, renderEnvFile('secrets', secrets), { mode: 0o600 })

  console.log('\nProduction env files generated from .env.local')
  console.log('----------------------------------------------')
  console.log(`Regular vars: ${vars.length}`)
  for (const key of vars) console.log(`  - ${key}`)
  console.log(`Secrets:      ${secrets.length}`)
  for (const key of secrets) console.log(`  - ${key}`)
  console.log('\nNo local/test values were copied.')
  console.log('Fill production values, delete optional/fallback keys you do not need, then run:')
  console.log('  npm run env:check:prod')
}

function configuredEntries(env) {
  return Object.entries(env).filter(([, value]) => hasValue(value))
}

function validateProductionEnv() {
  const vars = readEnvFile(paths.vars, 'production vars file')
  const secrets = readEnvFile(paths.secrets, 'production secrets file')

  const duplicateKeys = Object.keys(vars).filter(key =>
    Object.prototype.hasOwnProperty.call(secrets, key),
  )

  if (duplicateKeys.length) {
    fail(
      'The same key exists in both production files:\n' +
      duplicateKeys.map(key => `  - ${key}`).join('\n'),
    )
  }

  const missingVars = Object.keys(vars).filter(key => !hasValue(vars[key]))
  const missingSecrets = Object.keys(secrets).filter(key => !hasValue(secrets[key]))

  console.log('\nProduction environment check')
  console.log('----------------------------')
  console.log(`Regular vars: ${Object.keys(vars).length - missingVars.length}/${Object.keys(vars).length} configured`)
  console.log(`Secrets:      ${Object.keys(secrets).length - missingSecrets.length}/${Object.keys(secrets).length} configured`)

  if (missingVars.length) {
    console.error('\nMissing regular variables:')
    for (const key of missingVars) console.error(`  - ${key}`)
  }

  if (missingSecrets.length) {
    console.error('\nMissing secrets:')
    for (const key of missingSecrets) console.error(`  - ${key}`)
  }

  if (missingVars.length || missingSecrets.length) {
    fail('Production environment is incomplete. Deployment blocked.')
  }

  const cleanVars = Object.fromEntries(configuredEntries(vars))
  const cleanSecrets = Object.fromEntries(configuredEntries(secrets))

  console.log(`\nOK: ${Object.keys(cleanVars).length} regular vars and ${Object.keys(cleanSecrets).length} secrets are ready.`)
  return { vars: cleanVars, secrets: cleanSecrets }
}

function commandName(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name
}

function run(name, args, env) {
  const result = spawnSync(commandName(name), args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  })

  if (result.error) fail(`${name} failed to start: ${result.error.message}`)
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function deployProduction() {
  const { vars, secrets } = validateProductionEnv()

  // Build only needs regular production variables. Do not expose production
  // secrets to the build process unless the runtime explicitly needs them.
  const deploymentEnv = { ...process.env, ...vars }

  console.log('\nBuilding with production variables...')
  run('npm', ['run', 'build'], deploymentEnv)

  const tempDir = mkdtempSync(join(tmpdir(), 'production-env-secrets-'))
  const secretsFile = join(tempDir, 'secrets.json')

  try {
    const args = ['wrangler', 'deploy']

    if (Object.keys(secrets).length) {
      writeFileSync(secretsFile, JSON.stringify(secrets), { mode: 0o600 })
      args.push('--secrets-file', secretsFile)
    }

    for (const [key, value] of Object.entries(vars)) {
      args.push('--var', `${key}:${value}`)
    }

    console.log('\nDeploying to Cloudflare with production vars and secrets...')
    run('npx', args, deploymentEnv)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

const action = process.argv[2] || 'check'

if (action === 'init') {
  initProductionEnv()
} else if (action === 'check') {
  validateProductionEnv()
} else if (action === 'deploy') {
  deployProduction()
} else {
  fail(`Unknown action "${action}". Use "init", "check", or "deploy".`)
}
