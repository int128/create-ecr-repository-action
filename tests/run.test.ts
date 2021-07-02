import aws from 'aws-sdk'
import { run } from '../src/run'

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

test('create a repository', async () => {
  ecrPromise.describeRepositories.mockRejectedValue({ code: 'RepositoryNotFoundException' })
  ecrPromise.createRepository.mockResolvedValue({
    repository: {
      repositoryName: 'foo/bar',
      repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foo/bar',
    },
  })

  await run({
    repository: 'foo/bar',
    lifecyclePolicy: '',
    public: false,
  })
})

test('create a repository with a lifecycle policy', async () => {
  ecrPromise.describeRepositories.mockRejectedValue({ code: 'RepositoryNotFoundException' })
  ecrPromise.createRepository.mockResolvedValue({
    repository: {
      repositoryName: 'foo/bar',
      repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foo/bar',
    },
  })
  ecrPromise.putLifecyclePolicy.mockResolvedValue({
    repositoryName: 'foo/bar',
  })

  await run({
    repository: 'foo/bar',
    lifecyclePolicy: `${__dirname}/fixtures/lifecycle-policy.json`,
    public: false,
  })
})
