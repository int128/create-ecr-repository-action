import * as core from '@actions/core'
import aws from 'aws-sdk'
import { promises as fs } from 'fs'

export async function createRepositoryIfNotExist(name: string): Promise<aws.ECR.Repository> {
  const ecr = new aws.ECR()
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

export async function putLifecyclePolicy(repositoryName: string, path: string): Promise<void> {
  const lifecyclePolicyText = await fs.readFile(path, { encoding: 'utf-8' })
  core.debug(`putting the lifecycle policy ${path} to repository ${repositoryName}`)

  const ecr = new aws.ECR()
  await ecr.putLifecyclePolicy({ repositoryName, lifecyclePolicyText }).promise()
  core.info(`successfully put lifecycle policy ${path} to repository ${repositoryName}`)
}
