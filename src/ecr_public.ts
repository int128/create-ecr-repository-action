import * as core from '@actions/core'
import {
  ECRPUBLICClient,
  DescribeRepositoriesCommand,
  CreateRepositoryCommand,
  SetRepositoryPolicyCommand,
  Repository,
} from '@aws-sdk/client-ecr-public'
import { promises as fs } from 'fs'

type Inputs = {
  repository: string
  repositoryPolicy?: string
}

type Outputs = {
  repositoryUri: string
}

export const runForECRPublic = async (inputs: Inputs): Promise<Outputs> => {
  // ECR Public API is supported only in us-east-1
  // https://docs.aws.amazon.com/general/latest/gr/ecr-public.html
  const client = new ECRPUBLICClient({ region: 'us-east-1' })

  const repository = await core.group(
    `Create repository ${inputs.repository} if not exist`,
    async () => await createRepositoryIfNotExist(client, inputs.repository),
  )
  if (repository.repositoryUri === undefined) {
    throw new Error('unexpected response: repositoryUri === undefined')
  }

  const repositoryPolicy = inputs.repositoryPolicy
  if (repositoryPolicy !== undefined) {
    await core.group(
      `Put the repository policy to repository ${inputs.repository}`,
      async () => await setRepositoryPolicy(client, inputs.repository, repositoryPolicy)
    )
  }

  return {
    repositoryUri: repository.repositoryUri,
  }
}

const createRepositoryIfNotExist = async (client: ECRPUBLICClient, name: string): Promise<Repository> => {
  try {
    const describe = await client.send(new DescribeRepositoriesCommand({ repositoryNames: [name] }))
    if (describe.repositories === undefined) {
      throw new Error(`unexpected response describe.repositories was undefined`)
    }
    if (describe.repositories.length !== 1) {
      throw new Error(`unexpected response describe.repositories = ${JSON.stringify(describe.repositories)}`)
    }
    const found = describe.repositories[0]
    if (found.repositoryUri === undefined) {
      throw new Error(`unexpected response repositoryUri was undefined`)
    }
    core.info(`repository ${found.repositoryUri} found`)
    return found
  } catch (error) {
    if (isRepositoryNotFoundException(error)) {
      const create = await client.send(new CreateRepositoryCommand({ repositoryName: name }))
      if (create.repository === undefined) {
        throw new Error(`unexpected response create.repository was undefined`)
      }
      if (create.repository.repositoryUri === undefined) {
        throw new Error(`unexpected response create.repository.repositoryUri was undefined`)
      }
      core.info(`repository ${create.repository.repositoryUri} has been created`)
      return create.repository
    }

    throw error
  }
}

const isRepositoryNotFoundException = (e: unknown) => e instanceof Error && e.name === 'RepositoryNotFoundException'

// ECR Public does not support the lifecycle policy
// https://github.com/aws/containers-roadmap/issues/1268

export const setRepositoryPolicy = async (client: ECRPUBLICClient, repositoryName: string, path: string): Promise<void> => {
  const policyText = await fs.readFile(path, { encoding: 'utf-8' })
  core.debug(`setting the repository policy ${path} to repository ${repositoryName}`)

  await client.send(new SetRepositoryPolicyCommand({ repositoryName, policyText }))
  core.info(`successfully set repository policy ${path} to repository ${repositoryName}`)
}
