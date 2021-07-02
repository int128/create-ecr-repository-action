import aws from 'aws-sdk'
import { runForECR } from '../src/ecr'

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
jest.mock('aws-sdk', () => ({ ECR: jest.fn(() => ecr) }))

describe('Create an ECR repository if not exist', () => {
  test('returns the existing repository', async () => {
    ecrPromise.describeRepositories.mockResolvedValue({
      repositories: [
        {
          repositoryName: 'foobar',
          repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar',
        },
      ],
    })

    const repository = await runForECR({ repository: 'foobar' })
    expect(repository.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')

    expect(ecr.describeRepositories).toHaveBeenCalledWith({ repositoryNames: ['foobar'] })
    expect(ecr.createRepository).not.toHaveBeenCalled()
  })

  test('creates a repository', async () => {
    ecrPromise.describeRepositories.mockRejectedValue({
      code: 'RepositoryNotFoundException',
    })
    ecrPromise.createRepository.mockResolvedValue({
      repository: {
        repositoryName: 'foobar',
        repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar',
      },
    })

    const repository = await runForECR({ repository: 'foobar' })
    expect(repository.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')

    expect(ecr.describeRepositories).toHaveBeenCalledWith({ repositoryNames: ['foobar'] })
    expect(ecr.createRepository).toHaveBeenCalledWith({ repositoryName: 'foobar' })
  })

  test('general error occurred on describe', async () => {
    ecrPromise.describeRepositories.mockRejectedValue({
      code: 'ConfigError',
    })

    await expect(runForECR({ repository: 'foobar' })).rejects.toEqual({ code: 'ConfigError' })

    expect(ecr.describeRepositories).toHaveBeenCalledWith({ repositoryNames: ['foobar'] })
    expect(ecr.createRepository).not.toHaveBeenCalled()
  })

  test('general error occurred on create', async () => {
    ecrPromise.describeRepositories.mockRejectedValue({
      code: 'RepositoryNotFoundException',
    })
    ecrPromise.createRepository.mockRejectedValue({
      code: 'ConfigError',
    })

    await expect(runForECR({ repository: 'foobar' })).rejects.toEqual({ code: 'ConfigError' })

    expect(ecr.describeRepositories).toHaveBeenCalledWith({ repositoryNames: ['foobar'] })
    expect(ecr.createRepository).toHaveBeenCalledWith({ repositoryName: 'foobar' })
  })
})

describe('Put a lifecycle policy', () => {
  test('success', async () => {
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

    await runForECR({ repository: 'foobar', lifecyclePolicy: `${__dirname}/fixtures/lifecycle-policy.json` })

    expect(ecr.putLifecyclePolicy).toHaveBeenCalledWith({
      repositoryName: 'foobar',
      lifecyclePolicyText: `{ "rules": [{ "description": "dummy" }] }`,
    })
  })

  test('file not exist', async () => {
    ecrPromise.describeRepositories.mockResolvedValue({
      repositories: [
        {
          repositoryName: 'foobar',
          repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar',
        },
      ],
    })

    await expect(runForECR({ repository: 'foobar', lifecyclePolicy: 'wrong-path' })).rejects.toThrowError()
  })
})
