# create-ecr-repository-action [![ts](https://github.com/int128/create-ecr-repository-action/actions/workflows/ts.yml/badge.svg)](https://github.com/int128/create-ecr-repository-action/actions/workflows/ts.yml)

This is a GitHub Action to create an Amazon ECR repository if it does not exist.
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

| Name | Required | Default | Description
|------|----------|---------|------------
| `repository` | `true` | - | Repository name to create
| `lifecycle-policy` | `false` | - | Path to a file of lifecycle policy for the repository


## Outputs

| Name | Description
|------|------------
| `repository-uri` | URI of the repository (in form of `ACCOUNT.dkr.ecr.REGION.amazonaws.com/NAME`)
