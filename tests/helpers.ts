import { CreateRepositoryResponse, DescribeRepositoriesResponse } from '@aws-sdk/client-ecr'

// Helper to create a DescribeRepositoriesResponse
export const mockDescribeResponse = (region = 'ap-northeast-1', isPublic = false): DescribeRepositoriesResponse => ({
  repositories: [
    {
      repositoryName: 'foobar',
      repositoryUri: isPublic
        ? 'public.ecr.aws/12345678/foobar'
        : `123456789012.dkr.ecr.${region}.amazonaws.com/foobar`,
    },
  ],
})

// Helper to create a CreateRepositoryResponse
export const mockCreateResponse = (region = 'ap-northeast-1', isPublic = false): CreateRepositoryResponse => ({
  repository: {
    repositoryName: 'foobar',
    repositoryUri: isPublic ? 'public.ecr.aws/12345678/foobar' : `123456789012.dkr.ecr.${region}.amazonaws.com/foobar`,
  },
})
