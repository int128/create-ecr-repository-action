import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  await run({
    public: core.getBooleanInput('public', { required: true }),
    repository: core.getInput('repository', { required: true }),
    lifecyclePolicy: core.getInput('lifecycle-policy'),
  })
}

main().catch((error) => core.setFailed(error))
