import * as core from '@actions/core'
import {createRepositoryIfNotExist} from './ecr'

async function run(): Promise<void> {
  try {
    const repositoryName: string = core.getInput('repository')
    const repository = await createRepositoryIfNotExist(repositoryName)
    core.setOutput('repository-uri', repository.repositoryUri)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
