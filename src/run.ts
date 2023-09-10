import { runForECR } from './ecr'
import { runForECRPublic } from './ecr_public'

type Inputs = {
  public: boolean
  repository: string
  lifecyclePolicy: string
  repositoryPolicy: string
}

type Outputs = {
  repositoryUri: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  if (inputs.public === true) {
    if (inputs.lifecyclePolicy) {
      throw new Error(`currently ECR Public does not support the lifecycle policy`)
    }
    return await runForECRPublic(inputs)
  }

  return await runForECR({
    repository: inputs.repository,
    lifecyclePolicy: inputs.lifecyclePolicy ?? undefined,
    repositoryPolicy: inputs.repositoryPolicy ?? undefined,
  })
}
