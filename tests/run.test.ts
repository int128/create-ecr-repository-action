import aws from 'aws-sdk'
import * as core from '@actions/core'
import { run } from '../src/run'

jest.mock('@actions/core', () => {
  const original = jest.requireActual('@actions/core')
  return {
    ...original,
    setOutput: jest.fn().mockImplementation(original.setOutput),
  }
})
const setOutputMock = core.setOutput as jest.Mock

const ecrPromise = {
  describeRepositories: jest.fn<Promise<aws.ECR.DescribeRepositoriesResponse>, []>(),
  createRepository: jest.fn<Promise<aws.ECR.CreateRepositoryResponse>, []>(),
  putLifecyclePolicy: jest.fn<Promise<aws.ECR.PutLifecyclePolicyResponse>, []>(),
}
const ecr = {
  describeRepositories: jest.fn(() => ({ promise: ecrPromise.describeRepositories })),
  createRepository: jest.fn(() => ({ promise: ecrPromise.createRepository })),
  putLifecyclePolicy: jest.fn(() => ({ promise: ecrPromise.putLifecyclePolicy })),
}

const ecrPublicPromise = {
  describeRepositories: jest.fn<Promise<aws.ECRPUBLIC.DescribeRepositoriesResponse>, []>(),
  createRepository: jest.fn<Promise<aws.ECRPUBLIC.CreateRepositoryResponse>, []>(),
}
const ecrPublic = {
  describeRepositories: jest.fn(() => ({ promise: ecrPublicPromise.describeRepositories })),
  createRepository: jest.fn(() => ({ promise: ecrPublicPromise.createRepository })),
}

jest.mock('aws-sdk', () => ({ ECR: jest.fn(() => ecr), ECRPUBLIC: jest.fn(() => ecrPublic) }))

test('ecr', async () => {
  ecrPromise.describeRepositories.mockResolvedValue({
    repositories: [
      {
        repositoryName: 'foobar',
        repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar',
      },
    ],
  })
  ecrPromise.putLifecyclePolicy.mockResolvedValue({
    repositoryName: 'foobar',
  })
  await run({
    repository: 'foo/bar',
    lifecyclePolicy: `${__dirname}/fixtures/lifecycle-policy.json`,
    public: false,
  })
  expect(setOutputMock).toBeCalledWith('repository-uri', '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')
})

test('ecr public', async () => {
  ecrPublicPromise.describeRepositories.mockResolvedValue({
    repositories: [
      {
        repositoryName: 'foobar',
        repositoryUri: 'public.ecr.aws/12345678/foobar',
      },
    ],
  })
  await run({
    repository: 'foo/bar',
    lifecyclePolicy: '',
    public: true,
  })
  expect(setOutputMock).toBeCalledWith('repository-uri', 'public.ecr.aws/12345678/foobar')
})
