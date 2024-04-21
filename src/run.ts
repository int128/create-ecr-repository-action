import { runForECR } from './ecr.js'
import { runForECRPublic } from './ecr_public.js'

type Inputs = {
  public: boolean
  repository: string
  lifecyclePolicy: string | undefined
  repositoryPolicy: string | undefined
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

  return await runForECR(inputs)
}
