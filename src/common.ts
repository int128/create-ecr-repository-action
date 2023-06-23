import * as core from '@actions/core'
import {
  ECRClient,
  SetRepositoryPolicyCommand,
} from '@aws-sdk/client-ecr'
import { promises as fs } from 'fs'

export const setRepositoryPolicy = async (client: ECRClient, repositoryName: string, path: string): Promise<void> => {
    const policyText = await fs.readFile(path, { encoding: 'utf-8' })
    core.debug(`setting the repository policy ${path} to repository ${repositoryName}`)
  
    await client.send(new SetRepositoryPolicyCommand({ repositoryName, policyText }))
    core.info(`successfully set repository policy ${path} to repository ${repositoryName}`)
  }
  