import { mockClient } from 'aws-sdk-client-mock'
import { CreateRepositoryCommand, DescribeRepositoriesCommand, ECRPUBLICClient } from '@aws-sdk/client-ecr-public'
import { runForECRPublic } from '../src/ecr_public'
import { mockCreateResponse, mockDescribeResponse } from './helpers'

describe('Create an ECR repository if not exist', () => {
  const ecrMock = mockClient(ECRPUBLICClient)
  beforeEach(() => ecrMock.reset())

  test('returns the existing repository', async () => {
    ecrMock.on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] }).resolves(mockDescribeResponse('', true))

    const repository = await runForECRPublic({ repository: 'foobar' })
    expect(repository.repositoryUri).toEqual('public.ecr.aws/12345678/foobar')
  })

  test('creates a repository', async () => {
    ecrMock
      .on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] })
      .rejects({ name: 'RepositoryNotFoundException' })
    ecrMock.on(CreateRepositoryCommand, { repositoryName: 'foobar' }).resolves(mockCreateResponse('', true))

    const repository = await runForECRPublic({ repository: 'foobar' })

    expect(repository.repositoryUri).toEqual('public.ecr.aws/12345678/foobar')
  })

  test('general error occurred on describe', async () => {
    ecrMock
      .on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] })
      .rejects({ name: 'ConfigError', message: 'ConfigError' })

    await expect(runForECRPublic({ repository: 'foobar' })).rejects.toThrow({
      name: 'ConfigError',
      message: 'ConfigError',
    })
  })

  test('general error occurred on create', async () => {
    ecrMock
      .on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] })
      .rejects({ name: 'RepositoryNotFoundException' })
    ecrMock
      .on(CreateRepositoryCommand, { repositoryName: 'foobar' })
      .rejects({ name: 'ConfigError', message: 'ConfigError' })

    await expect(runForECRPublic({ repository: 'foobar' })).rejects.toThrow({
      name: 'ConfigError',
      message: 'ConfigError',
    })
  })
})
