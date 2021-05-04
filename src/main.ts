import * as core from '@actions/core'
import { createRepositoryIfNotExist, putLifecyclePolicy } from './ecr'

async function run(): Promise<void> {
  try {
    const repositoryName = core.getInput('repository')
    const lifecyclePolicyPath = core.getInput('lifecycle-policy')

    core.startGroup(`Create repository ${repositoryName} if not exist`)
    const repository = await createRepositoryIfNotExist(repositoryName)
    core.setOutput('repository-uri', repository.repositoryUri)
    core.endGroup()

    if (lifecyclePolicyPath !== '') {
      core.startGroup(`Put the lifecycle policy to repository ${repositoryName}`)
      await putLifecyclePolicy(repositoryName, lifecyclePolicyPath)
      core.endGroup()
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
