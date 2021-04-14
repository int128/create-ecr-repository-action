import aws from 'aws-sdk'
import {createRepositoryIfNotExist} from '../src/ecr'

const mockECR = {
  describeRepositories: jest.fn(),
  createRepository: jest.fn()
}
jest.mock('aws-sdk', () => ({
  ECR: jest.fn(() => mockECR)
}))

describe('Create an ECR repository if not exist', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns the existing repository', async () => {
    mockECR.describeRepositories.mockReturnValue({
      promise: () =>
        Promise.resolve<aws.ECR.DescribeRepositoriesResponse>({
          repositories: [
            {
              repositoryName: 'foobar',
              repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar'
            }
          ]
        })
    })

    const repository = await createRepositoryIfNotExist('foobar')
    expect(repository.repositoryName).toEqual('foobar')
    expect(repository.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')

    expect(mockECR.describeRepositories).toHaveBeenCalledWith<[aws.ECR.DescribeRepositoriesRequest]>({repositoryNames: ['foobar']})
    expect(mockECR.createRepository).not.toHaveBeenCalled()
  })

  test('creates a repository', async () => {
    mockECR.describeRepositories.mockReturnValue({
      promise: () => Promise.reject({code: 'RepositoryNotFoundException'})
    })
    mockECR.createRepository.mockReturnValue({
      promise: () =>
        Promise.resolve<aws.ECR.CreateRepositoryResponse>({
          repository: {
            repositoryName: 'foobar',
            repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar'
          }
        })
    })

    const repository = await createRepositoryIfNotExist('foobar')
    expect(repository.repositoryName).toEqual('foobar')
    expect(repository.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')

    expect(mockECR.describeRepositories).toHaveBeenCalledWith<[aws.ECR.DescribeRepositoriesRequest]>({repositoryNames: ['foobar']})
    expect(mockECR.createRepository).toHaveBeenCalledWith<[aws.ECR.CreateRepositoryRequest]>({repositoryName: 'foobar'})
  })

  test('general error occurred on describe', async () => {
    mockECR.describeRepositories.mockReturnValue({
      promise: () => Promise.reject({code: 'ConfigError'})
    })
    await expect(createRepositoryIfNotExist('foobar')).rejects.toEqual({
      code: 'ConfigError'
    })
    expect(mockECR.createRepository).not.toHaveBeenCalled()
  })

  test('general error occurred on create', async () => {
    mockECR.describeRepositories.mockReturnValue({
      promise: () => Promise.reject({code: 'RepositoryNotFoundException'})
    })
    mockECR.createRepository.mockReturnValue({
      promise: () => Promise.reject({code: 'ConfigError'})
    })
    await expect(createRepositoryIfNotExist('foobar')).rejects.toEqual({
      code: 'ConfigError'
    })
  })
})
