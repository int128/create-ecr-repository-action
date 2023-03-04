# create-ecr-repository-action [![ts](https://github.com/int128/create-ecr-repository-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/create-ecr-repository-action/actions/workflows/ts.yaml)

This is a GitHub Action to create a repository into Amazon ECR or ECR Public registry if it does not exist.
It can put a lifecycle policy to the repository for cost saving.


## Getting Started

To create a repository:

```yaml
jobs:
  build:
    steps:
      - uses: int128/create-ecr-repository-action@v1
        with:
          repository: hello-world
```

If the repository exists, this action does nothing.


### Put a lifecycle policy

To create a repository with a lifecycle policy:

```yaml
      - uses: int128/create-ecr-repository-action@v1
        with:
          repository: hello-world
          lifecycle-policy: config/lifecycle-policy.json
```

If the repository exists, this action just puts the lifecycle policy.


### Create into ECR Public

To create a repository into ECR Public registry:

```yaml
      - uses: int128/create-ecr-repository-action@v1
        with:
          repository: hello-world
          public: true
```

If the repository exists, this action does nothing.
Note that currently ECR Public does not support the lifecycle polocy.


### Full example

Here is a full example to build an image and put it into an ECR repository:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v1
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/ROLE
      - uses: aws-actions/amazon-ecr-login@v1
      - uses: int128/create-ecr-repository-action@v1
        id: ecr
        with:
          repository: ${{ github.repository }}
      - uses: docker/metadata-action@v4
        id: metadata
        with:
          images: ${{ steps.ecr.outputs.repository-uri }}
      - uses: docker/build-push-action@v3
        with:
          push: true
          tags: ${{ steps.metadata.outputs.tags }}
          labels: ${{ steps.metadata.outputs.labels }}
```


## Inputs

| Name | Default | Description
|------|---------|------------
| `public` | `false` | Set `true` to create into ECR Public registry
| `repository` | (required) | Repository name to create
| `lifecycle-policy` | - | Path to a file of lifecycle policy for the repository


## Outputs

| Name | Description
|------|------------
| `repository-uri` | URI of the repository (in form of `ACCOUNT.dkr.ecr.REGION.amazonaws.com/NAME` or `public.ecr.aws/ID/NAME`)
