import * as core from '@actions/core'
import {
  ECRClient,
  DescribeRepositoriesCommand,
  CreateRepositoryCommand,
  PutLifecyclePolicyCommand,
  SetRepositoryPolicyCommand,
  Repository,
  Tag,
} from '@aws-sdk/client-ecr'
import assert from 'assert'
import { promises as fs } from 'fs'

type Inputs = {
  repository: string
  immutable?: boolean
  tags?: string
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
    async () => await createRepositoryIfNotExist(client, inputs.repository, inputs.immutable, inputs.tags),
  )
  assert(repository.repositoryUri !== undefined)

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
      async () => await setRepositoryPolicy(client, inputs.repository, repositoryPolicy),
    )
  }

  return {
    repositoryUri: repository.repositoryUri,
  }
}

const parseTags = (tagsString?: string): Tag[] | undefined => {
  if (!tagsString) return undefined;
  return tagsString.split(',').map(tag => {
    const [Key, Value] = tag.split('=');
    return { Key, Value };
  });
}

const createRepositoryIfNotExist = async (client: ECRClient, name: string, immutable: boolean = false, tags?: string): Promise<Repository> => {
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
      const parsedTags = parseTags(tags);
      const create = await client.send(new CreateRepositoryCommand({
        repositoryName: name,
        imageTagMutability: immutable ? 'IMMUTABLE' : 'MUTABLE',
        tags: parsedTags
      }))
      assert(create.repository !== undefined)
      assert(create.repository.repositoryUri !== undefined)
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
