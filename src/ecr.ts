import * as core from '@actions/core'
import {
  ECRClient,
  DescribeRepositoriesCommand,
  CreateRepositoryCommand,
  PutLifecyclePolicyCommand,
  SetRepositoryPolicyCommand,
  Repository,
} from '@aws-sdk/client-ecr'
import { promises as fs } from 'fs'

type Inputs = {
  repository: string
  lifecyclePolicy?: string
  repositoryPolicy?: string
}

type Outputs = {
  repositoryUri: string
}

export const runForECR = async (inputs: Inputs): Promise<Outputs> => {
  const client = new ECRClient({})

  const repository = await core.group(
    `Create repository ${inputs.repository} if not exist`,
    async () => await createRepositoryIfNotExist(client, inputs.repository),
  )
  if (repository.repositoryUri === undefined) {
    throw new Error('unexpected response: repositoryUri === undefined')
  }

  const lifecyclePolicy = inputs.lifecyclePolicy
  if (lifecyclePolicy !== undefined) {
    await core.group(
      `Put the lifecycle policy to repository ${inputs.repository}`,
      async () => await putLifecyclePolicy(client, inputs.repository, lifecyclePolicy),
    )
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

const createRepositoryIfNotExist = async (client: ECRClient, name: string): Promise<Repository> => {
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

const putLifecyclePolicy = async (client: ECRClient, repositoryName: string, path: string): Promise<void> => {
  const lifecyclePolicyText = await fs.readFile(path, { encoding: 'utf-8' })
  core.debug(`putting the lifecycle policy ${path} to repository ${repositoryName}`)

  await client.send(new PutLifecyclePolicyCommand({ repositoryName, lifecyclePolicyText }))
  core.info(`successfully put lifecycle policy ${path} to repository ${repositoryName}`)
}

export const setRepositoryPolicy = async (client: ECRClient, repositoryName: string, path: string): Promise<void> => {
  const policyText = await fs.readFile(path, { encoding: 'utf-8' })
  core.debug(`setting the repository policy ${path} to repository ${repositoryName}`)

  await client.send(new SetRepositoryPolicyCommand({ repositoryName, policyText }))
  core.info(`successfully set repository policy ${path} to repository ${repositoryName}`)
}