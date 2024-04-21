import { mockClient } from 'aws-sdk-client-mock'
import {
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
  SetRepositoryPolicyCommand,
  ECRPUBLICClient,
} from '@aws-sdk/client-ecr-public'
import { runForECRPublic } from '../src/ecr_public.js'

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

describe('Put a repository policy', () => {
  test('success', async () => {
    ecrMock.on(DescribeRepositoriesCommand).resolves({
      repositories: [
        {
          repositoryName: 'foobar',
          repositoryUri: 'public.ecr.aws/12345678/foobar',
        },
      ],
    })
    ecrMock
      .on(SetRepositoryPolicyCommand, {
        repositoryName: 'foobar',
        policyText: `{ "Version": "2008-10-17", "Statement": [{"Sid": "AllowPull", "Effect": "Allow", "Principal": {"AWS": ["arn:aws:iam::012345678910:root"]}, "Action": ["ListImages"]}]}`,
      })
      .resolves({
        repositoryName: 'foobar',
      })

    const output = await runForECRPublic({
      repository: 'foobar',
      repositoryPolicy: `${__dirname}/fixtures/repository-policy.json`,
    })
    expect(output.repositoryUri).toBe('public.ecr.aws/12345678/foobar')
  })

  test('file not exist', async () => {
    ecrMock.on(DescribeRepositoriesCommand).resolves({
      repositories: [
        {
          repositoryName: 'foobar',
          repositoryUri: 'public.ecr.aws/12345678/foobar',
        },
      ],
    })

    await expect(runForECRPublic({ repository: 'foobar', repositoryPolicy: 'wrong-path' })).rejects.toThrow()
  })
})
