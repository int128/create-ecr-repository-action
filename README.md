# create-ecr-repository-action [![test](https://github.com/int128/create-ecr-repository-action/actions/workflows/test.yml/badge.svg)](https://github.com/int128/create-ecr-repository-action/actions/workflows/test.yml)

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

You can put a lifecycle policy:

```yaml
      - uses: int128/create-ecr-repository-action@v1
        with:
          repository: hello-world
          lifecycle-policy: config/lifecycle-policy.json
```

Here is a full example to build an image:

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


## Versioning

Please use a release tag such as `v1`.
Note that `main` branch does not contain `dist` files.
