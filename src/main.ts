import * as core from '@actions/core'
import { run } from './run.js'

const main = async (): Promise<void> => {
  const outputs = await run({
    public: core.getBooleanInput('public', { required: true }),
    repository: core.getInput('repository', { required: true }),
    lifecyclePolicy: core.getInput('lifecycle-policy') || undefined,
    repositoryPolicy: core.getInput('repository-policy') || undefined,
  })
  core.info(`Outputs: ${JSON.stringify(outputs)}`)
  core.setOutput('repository-uri', outputs.repositoryUri)
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
