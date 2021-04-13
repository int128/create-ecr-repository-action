import aws from 'aws-sdk'
import {createRepositoryIfNotExist} from '../src/ecr'

const mockECR = {
  describeRepositories: jest.fn(),
  createRepository: jest.fn()
}
jest.mock('aws-sdk', () => {
  return {
    ECR: jest.fn(() => mockECR)
  }
})

describe('Create an ECR repository if not exist', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns the existing repository', async () => {
    mockECR.describeRepositories.mockImplementation((req: aws.ECR.DescribeRepositoriesRequest) => ({
      promise() {
        expect(req.repositoryNames).toEqual(['foobar'])
        return Promise.resolve<aws.ECR.DescribeRepositoriesResponse>({
          repositories: [
            {
              repositoryName: 'foobar',
              repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar'
            }
          ]
        })
      }
    }))
    const repository = await createRepositoryIfNotExist('foobar')
    expect(repository.repositoryName).toEqual('foobar')
    expect(repository.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')
  })

  test('creates a repository', async () => {
    mockECR.describeRepositories.mockImplementation(() => ({
      promise() {
        return Promise.reject({
          code: 'RepositoryNotFoundException'
        })
      }
    }))
    mockECR.createRepository.mockImplementation((req: aws.ECR.CreateRepositoryRequest) => ({
      promise() {
        expect(req.repositoryName).toEqual('foobar')
        return Promise.resolve<aws.ECR.CreateRepositoryResponse>({
          repository: {
            repositoryName: 'foobar',
            repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar'
          }
        })
      }
    }))
    const repository = await createRepositoryIfNotExist('foobar')
    expect(repository.repositoryName).toEqual('foobar')
    expect(repository.repositoryUri).toEqual('123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar')
  })

  test('general error occurred on describe', async () => {
    mockECR.describeRepositories.mockImplementation(() => ({
      promise() {
        return Promise.reject({
          code: 'ConfigError'
        })
      }
    }))
    await expect(createRepositoryIfNotExist('foobar')).rejects.toEqual({
      code: 'ConfigError'
    })
  })

  test('general error occurred on create', async () => {
    mockECR.describeRepositories.mockImplementation(() => ({
      promise() {
        return Promise.reject({
          code: 'RepositoryNotFoundException'
        })
      }
    }))
    mockECR.createRepository.mockImplementation((req: aws.ECR.CreateRepositoryRequest) => ({
      promise() {
        return Promise.reject({
          code: 'ConfigError'
        })
      }
    }))
    await expect(createRepositoryIfNotExist('foobar')).rejects.toEqual({
      code: 'ConfigError'
    })
  })
})
