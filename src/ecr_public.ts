import * as core from '@actions/core'
import aws from 'aws-sdk'

type Inputs = {
  repository: string
}

type Outputs = {
  repositoryUri: string
}

export const runForECRPublic = async (inputs: Inputs): Promise<Outputs> => {
  const repository = await core.group(
    `Create repository ${inputs.repository} if not exist`,
    async () => await createRepositoryIfNotExist(inputs.repository)
  )
  if (repository.repositoryUri === undefined) {
    throw new Error('unexpected response: repositoryUri === undefined')
  }
  return {
    repositoryUri: repository.repositoryUri,
  }
}

const createRepositoryIfNotExist = async (name: string): Promise<aws.ECRPUBLIC.Repository> => {
  // ECR Public API is supported only in us-east-1
  // https://docs.aws.amazon.com/general/latest/gr/ecr-public.html
  const ecr = new aws.ECRPUBLIC({ region: 'us-east-1' })
  try {
    const describe = await ecr.describeRepositories({ repositoryNames: [name] }).promise()
    if (describe.repositories === undefined) {
      throw new Error(`unexpected response describe.repositories was undefined`)
    }
    if (describe.repositories.length !== 1) {
      throw new Error(`unexpected response describe.repositories = ${describe.repositories}`)
    }
    const found = describe.repositories[0]
    core.info(`repository ${found.repositoryUri} found`)
    return found
  } catch (error) {
    if (error.code === 'RepositoryNotFoundException') {
      const create = await ecr.createRepository({ repositoryName: name }).promise()
      if (create.repository === undefined) {
        throw new Error(`unexpected response create.repository was undefined`)
      }
      core.info(`repository ${create.repository.repositoryUri} has been created`)
      return create.repository
    }

    throw error
  }
}

// ECR Public does not support the lifecycle policy
// https://github.com/aws/containers-roadmap/issues/1268
