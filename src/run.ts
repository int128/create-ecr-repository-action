import * as core from '@actions/core'
import { createRepositoryIfNotExist, putLifecyclePolicy } from './ecr'

interface Inputs {
  repository: string
  lifecyclePolicy: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  core.startGroup(`Create repository ${inputs.repository} if not exist`)
  const repository = await createRepositoryIfNotExist(inputs.repository)
  core.setOutput('repository-uri', repository.repositoryUri)
  core.endGroup()

  if (inputs.lifecyclePolicy !== '') {
    core.startGroup(`Put the lifecycle policy to repository ${repository.repositoryName}`)
    await putLifecyclePolicy(inputs.repository, inputs.lifecyclePolicy)
    core.endGroup()
  }
}
