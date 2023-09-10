import { mockClient } from 'aws-sdk-client-mock'
import * as ecr from '@aws-sdk/client-ecr'
import * as ecrPublic from '@aws-sdk/client-ecr-public'
import { run } from '../src/run'

const mocks = {
  ecr: mockClient(ecr.ECRClient),
  ecrPublic: mockClient(ecrPublic.ECRPUBLICClient),
}

test('ecr', async () => {
  mocks.ecr.on(ecr.DescribeRepositoriesCommand).resolves({
    repositories: [
      {
        repositoryName: 'foobar',
        repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar',
      },
    ],
  })
  mocks.ecr.on(ecr.PutLifecyclePolicyCommand).resolves({
    repositoryName: 'foobar',
  })
  const outputs = await run({
    repository: 'foo/bar',
    lifecyclePolicy: `${__dirname}/fixtures/lifecycle-policy.json`,
    repositoryPolicy: `${__dirname}/fixtures/repository-policy.json`,
    public: false,
  })
  expect(outputs).toStrictEqual({ repositoryUri: '123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/foobar' })
})

test('ecr public', async () => {
  mocks.ecrPublic.on(ecrPublic.DescribeRepositoriesCommand).resolves({
    repositories: [
      {
        repositoryName: 'foobar',
        repositoryUri: 'public.ecr.aws/12345678/foobar',
      },
    ],
  })
  const outputs = await run({
    repository: 'foo/bar',
    lifecyclePolicy: undefined,
    repositoryPolicy: `${__dirname}/fixtures/repository-policy.json`,
    public: true,
  })
  expect(outputs).toStrictEqual({ repositoryUri: 'public.ecr.aws/12345678/foobar' })
})
