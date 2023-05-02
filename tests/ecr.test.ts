import { mockClient } from 'aws-sdk-client-mock'
import {
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
  ECRClient,
  PutLifecyclePolicyCommand,
} from '@aws-sdk/client-ecr'
import { runForECR } from '../src/ecr'
import { mockCreateResponse, mockDescribeResponse } from './helpers'

describe('Create an ECR repository if not exist', () => {
  const ecrMock = mockClient(ECRClient)
  beforeEach(() => ecrMock.reset())

  test('returns the existing repository', async () => {
    ecrMock
      .on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] })
      .resolves(mockDescribeResponse('ap-northeast-1'))

    const output = await runForECR({ repository: 'foobar' })
    expect(output.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')
  })

  test('creates a repository', async () => {
    ecrMock
      .on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] })
      .rejects({ name: 'RepositoryNotFoundException' })
    ecrMock.on(CreateRepositoryCommand, { repositoryName: 'foobar' }).resolves(mockCreateResponse('ap-northeast-1'))

    const output = await runForECR({ repository: 'foobar' })

    expect(output.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')
  })

  test('general error occurred on describe', async () => {
    ecrMock.on(DescribeRepositoriesCommand).rejects({ name: 'ConfigError' })

    await expect(runForECR({ repository: 'foobar' })).rejects.toThrow()
  })

  test('general error occurred on create', async () => {
    ecrMock
      .on(DescribeRepositoriesCommand, { repositoryNames: ['foobar'] })
      .rejects({ name: 'RepositoryNotFoundException' })
    ecrMock.on(CreateRepositoryCommand, { repositoryName: 'foobar' }).rejects({ name: 'ConfigError' })

    await expect(runForECR({ repository: 'foobar' })).rejects.toThrow()
  })
})

describe('Put a lifecycle policy', () => {
  const ecrMock = mockClient(ECRClient)
  beforeEach(() => ecrMock.reset())

  test('success', async () => {
    ecrMock.on(DescribeRepositoriesCommand).resolves(mockDescribeResponse('ap-northeast-1'))
    ecrMock
      .on(PutLifecyclePolicyCommand, {
        repositoryName: 'foobar',
        lifecyclePolicyText: `{ "rules": [{ "description": "dummy" }] }`,
      })
      .resolves({ repositoryName: 'foobar' })

    const output = await runForECR({
      repository: 'foobar',
      lifecyclePolicy: `${__dirname}/fixtures/lifecycle-policy.json`,
    })

    expect(output.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')
  })

  test('file not exist', async () => {
    ecrMock.on(DescribeRepositoriesCommand).resolves(mockDescribeResponse('ap-northeast-1'))

    await expect(runForECR({ repository: 'foobar', lifecyclePolicy: 'wrong-path' })).rejects.toThrow()
  })
})
