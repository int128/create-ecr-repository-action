import aws from 'aws-sdk'
import { runForECRPublic } from '../src/ecr_public'

const ecrPromise = {
  describeRepositories: jest.fn<Promise<aws.ECRPUBLIC.DescribeRepositoriesResponse>, []>(),
  createRepository: jest.fn<Promise<aws.ECRPUBLIC.CreateRepositoryResponse>, []>(),
}
const ecr = {
  describeRepositories: jest.fn(() => ({ promise: ecrPromise.describeRepositories })),
  createRepository: jest.fn(() => ({ promise: ecrPromise.createRepository })),
}
jest.mock('aws-sdk', () => ({ ECRPUBLIC: jest.fn(() => ecr) }))

describe('Create an ECR repository if not exist', () => {
  test('returns the existing repository', async () => {
    ecrPromise.describeRepositories.mockResolvedValue({
      repositories: [
        {
          repositoryName: 'foobar',
          repositoryUri: 'public.ecr.aws/12345678/foobar',
        },
      ],
    })

    const repository = await runForECRPublic({ repository: 'foobar' })
    expect(repository.repositoryUri).toEqual('public.ecr.aws/12345678/foobar')

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
        repositoryUri: 'public.ecr.aws/12345678/foobar',
      },
    })

    const repository = await runForECRPublic({ repository: 'foobar' })
    expect(repository.repositoryUri).toEqual('public.ecr.aws/12345678/foobar')

    expect(ecr.describeRepositories).toHaveBeenCalledWith({ repositoryNames: ['foobar'] })
    expect(ecr.createRepository).toHaveBeenCalledWith({ repositoryName: 'foobar' })
  })

  test('general error occurred on describe', async () => {
    ecrPromise.describeRepositories.mockRejectedValue({
      code: 'ConfigError',
    })

    await expect(runForECRPublic({ repository: 'foobar' })).rejects.toEqual({ code: 'ConfigError' })

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

    await expect(runForECRPublic({ repository: 'foobar' })).rejects.toEqual({ code: 'ConfigError' })

    expect(ecr.describeRepositories).toHaveBeenCalledWith({ repositoryNames: ['foobar'] })
    expect(ecr.createRepository).toHaveBeenCalledWith({ repositoryName: 'foobar' })
  })
})
