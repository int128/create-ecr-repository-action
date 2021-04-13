import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    const repository: string = core.getInput('repository')
    core.debug(`creating ${repository}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
