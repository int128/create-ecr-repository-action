import * as core from '@actions/core'
import {createRepositoryIfNotExist, putLifecyclePolicy} from './ecr'

async function run(): Promise<void> {
  try {
    const repositoryName = core.getInput('repository')
    const repository = await createRepositoryIfNotExist(repositoryName)
    core.setOutput('repository-uri', repository.repositoryUri)

    const lifecyclePolicyPath = core.getInput('lifecycle-policy')
    if (lifecyclePolicyPath !== '') {
      await putLifecyclePolicy(repositoryName, lifecyclePolicyPath)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
