import * as core from '@actions/core'
import { runForECR } from './ecr'
import { runForECRPublic } from './ecr_public'

interface Inputs {
  public: boolean
  repository: string
  lifecyclePolicy: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  if (inputs.public === true) {
    if (inputs.lifecyclePolicy) {
      throw new Error(`currently ECR Public does not support the lifecycle policy`)
    }
    const outputs = await runForECRPublic(inputs)
    core.setOutput('repository-uri', outputs.repositoryUri)
    return
  }

  const outputs = await runForECR({
    repository: inputs.repository,
    lifecyclePolicy: inputs.lifecyclePolicy !== '' ? inputs.lifecyclePolicy : undefined,
  })
  core.setOutput('repository-uri', outputs.repositoryUri)
  return
}
