import * as core from '@actions/core'
import { createRepositoryIfNotExist, putLifecyclePolicy } from './ecr'
import { runForECRPublic } from './ecr_public'

interface Inputs {
  public: boolean
  repository: string
  lifecyclePolicy: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  if (inputs.public) {
    if (inputs.lifecyclePolicy) {
      throw new Error(`currently ECR Public does not support the lifecycle policy`)
    }
    const outputs = await runForECRPublic(inputs)
    core.setOutput('repository-uri', outputs.repositoryUri)
    return
  }

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
