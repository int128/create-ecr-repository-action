import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  const outputs = await run({
    public: core.getBooleanInput('public', { required: true }),
    repository: core.getInput('repository', { required: true }),
    lifecyclePolicy: core.getInput('lifecycle-policy'),
    repositoryPolicy: core.getInput('repository-policy'),
  })
  core.info(`Outputs: ${JSON.stringify(outputs)}`)
  core.setOutput('repository-uri', outputs.repositoryUri)
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
