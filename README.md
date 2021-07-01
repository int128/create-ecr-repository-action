# create-ecr-repository-action [![ts](https://github.com/int128/create-ecr-repository-action/actions/workflows/ts.yml/badge.svg)](https://github.com/int128/create-ecr-repository-action/actions/workflows/ts.yml)

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
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v2
      - uses: aws-actions/amazon-ecr-login@v1
      - uses: int128/create-ecr-repository-action@v1
        id: ecr
        with:
          repository: hello-world
      - run: docker build -t ${{ steps.ecr.outputs.repository-uri }}:latest .
      - run: docker push ${{ steps.ecr.outputs.repository-uri }}:latest
```

Use a release tag such as `v1`.
Do not use `main` branch because it does not contain `dist` files.


## Inputs

| Name | Description
|------|-------------
| `public`            | Set `true` to create into ECR Public registry (default to `false`)
| `repository`        | Repository name to create
| `lifecycle-policy`  | Path to a file of lifecycle policy for the repository (optional)


## Outputs

| Name | Description
|------|------------
| `repository-uri` | URI of the repository (in form of `ACCOUNT.dkr.ecr.REGION.amazonaws.com/NAME` or `public.ecr.aws/ID/NAME`)
