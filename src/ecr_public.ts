import assert from 'node:assert'
import { promises as fs } from 'node:fs'
import * as core from '@actions/core'
import {
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
  ECRPUBLICClient,
  type Repository,
  SetRepositoryPolicyCommand,
} from '@aws-sdk/client-ecr-public'

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
  assert(repository.repositoryUri !== undefined)

  const repositoryPolicy = inputs.repositoryPolicy
  if (repositoryPolicy !== undefined) {
    await core.group(
      `Put the repository policy to repository ${inputs.repository}`,
      async () => await setRepositoryPolicy(client, inputs.repository, repositoryPolicy),
    )
  }

  return {
    repositoryUri: repository.repositoryUri,
  }
}

const createRepositoryIfNotExist = async (client: ECRPUBLICClient, name: string): Promise<Repository> => {
  try {
    const describe = await client.send(new DescribeRepositoriesCommand({ repositoryNames: [name] }))
    assert(describe.repositories !== undefined)
    assert.strictEqual(describe.repositories.length, 1)

    const found = describe.repositories[0]
    assert(found.repositoryUri !== undefined)
    core.info(`repository ${found.repositoryUri} found`)
    return found
  } catch (error) {
    if (isRepositoryNotFoundException(error)) {
      const create = await client.send(new CreateRepositoryCommand({ repositoryName: name }))
      assert(create.repository !== undefined)
      assert(create.repository.repositoryUri !== undefined)
      core.info(`repository ${create.repository.repositoryUri} has been created`)
      return create.repository
    }
    throw error
  }
}

const isRepositoryNotFoundException = (e: unknown) => e instanceof Error && e.name === 'RepositoryNotFoundException'

// ECR Public does not support the lifecycle policy
// https://github.com/aws/containers-roadmap/issues/1268

export const setRepositoryPolicy = async (
  client: ECRPUBLICClient,
  repositoryName: string,
  path: string,
): Promise<void> => {
  const policyText = await fs.readFile(path, { encoding: 'utf-8' })
  core.debug(`setting the repository policy ${path} to repository ${repositoryName}`)

  await client.send(new SetRepositoryPolicyCommand({ repositoryName, policyText }))
  core.info(`successfully set repository policy ${path} to repository ${repositoryName}`)
}
