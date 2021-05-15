import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  try {
    await run({
      repository: core.getInput('repository', { required: true }),
      lifecyclePolicy: core.getInput('lifecycle-policy'),
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
