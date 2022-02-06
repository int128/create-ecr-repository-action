import { mockClient } from 'aws-sdk-client-mock'
import { CreateRepositoryCommand, DescribeRepositoriesCommand, ECRPUBLICClient } from '@aws-sdk/client-ecr-public'
import { runForECRPublic } from '../src/ecr_public'

const ecrMock = mockClient(ECRPUBLICClient)

describe('Create an ECR repository if not exist', () => {
  test('returns the existing repository', async () => {
    ecrMock.on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] }).resolves({
      repositories: [
        {
          repositoryName: 'foobar',
          repositoryUri: 'public.ecr.aws/12345678/foobar',
        },
      ],
    })

    const repository = await runForECRPublic({ repository: 'foobar' })
    expect(repository.repositoryUri).toEqual('public.ecr.aws/12345678/foobar')
  })

  test('creates a repository', async () => {
    ecrMock
      .on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] })
      .rejects({ name: 'RepositoryNotFoundException' })
    ecrMock.on(CreateRepositoryCommand, { repositoryName: 'foobar' }).resolves({
      repository: {
        repositoryName: 'foobar',
        repositoryUri: 'public.ecr.aws/12345678/foobar',
      },
    })

    const repository = await runForECRPublic({ repository: 'foobar' })
    expect(repository.repositoryUri).toEqual('public.ecr.aws/12345678/foobar')
  })

  test('general error occurred on describe', async () => {
    ecrMock
      .on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] })
      .rejects({ name: 'ConfigError', message: 'ConfigError' })

    await expect(runForECRPublic({ repository: 'foobar' })).rejects.toThrowError({
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

    await expect(runForECRPublic({ repository: 'foobar' })).rejects.toThrowError({
      name: 'ConfigError',
      message: 'ConfigError',
    })
  })
})
