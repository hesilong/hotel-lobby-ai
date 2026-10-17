import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseEnv } from 'node:util'

const ROOT = process.cwd()

const paths = {
  vars: resolve(ROOT, '.env.production.vars'),
  varsExample: resolve(ROOT, '.env.production.vars.example'),
  secrets: resolve(ROOT, '.env.production.secrets'),
  secretsExample: resolve(ROOT, '.env.production.secrets.example'),
}

const hasValue = value => typeof value === 'string' && value.trim().length > 0

function fail(message) {
  console.error(`\n[production-env] ${message}`)
  process.exit(1)
}

function readEnvFile(path, label) {
  if (!existsSync(path)) {
    fail(`Missing ${label}: ${path.replace(ROOT, '.')}\nCopy its .example file and fill the production values first.`)
  }

  try {
    return parseEnv(readFileSync(path, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`Could not parse ${label}: ${message}`)
  }
}

function configuredEntries(env) {
  return Object.entries(env).filter(([, value]) => hasValue(value))
}

function validateProductionEnv() {
  const requiredVars = readEnvFile(paths.varsExample, 'production vars example')
  const requiredSecrets = readEnvFile(paths.secretsExample, 'production secrets example')
  const vars = readEnvFile(paths.vars, 'production vars file')
  const secrets = readEnvFile(paths.secrets, 'production secrets file')

  const duplicateKeys = Object.keys(vars).filter(key => Object.prototype.hasOwnProperty.call(secrets, key))
  if (duplicateKeys.length) {
    fail(
      'The same key exists in both production files:\n' +
      duplicateKeys.map(key => `  - ${key}`).join('\n'),
    )
  }

  const missingVars = Object.keys(requiredVars).filter(key => !hasValue(vars[key]))
  const missingSecrets = Object.keys(requiredSecrets).filter(key => !hasValue(secrets[key]))

  console.log('\nProduction environment check')
  console.log('----------------------------')
  console.log(`Regular vars: ${Object.keys(requiredVars).length - missingVars.length}/${Object.keys(requiredVars).length} required configured`)
  console.log(`Secrets:      ${Object.keys(requiredSecrets).length - missingSecrets.length}/${Object.keys(requiredSecrets).length} required configured`)

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
  const deploymentEnv = { ...process.env, ...vars, ...secrets }

  console.log('\nBuilding with production environment...')
  run('npm', ['run', 'build'], deploymentEnv)

  const tempDir = mkdtempSync(join(tmpdir(), 'hotel-lobby-prod-secrets-'))
  const secretsFile = join(tempDir, 'secrets.json')

  try {
    writeFileSync(secretsFile, JSON.stringify(secrets), { mode: 0o600 })

    const args = ['wrangler', 'deploy', '--secrets-file', secretsFile]
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

if (action === 'check') {
  validateProductionEnv()
} else if (action === 'deploy') {
  deployProduction()
} else {
  fail(`Unknown action "${action}". Use "check" or "deploy".`)
}
