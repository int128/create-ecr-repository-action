# create-ecr-repository-action

This is a GitHub Action to create an Amazon ECR repository if it does not exist.


## Getting Started

```yaml
jobs:
  build:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v2
      - uses: aws-actions/amazon-ecr-login@v1
      - uses: int128/create-ecr-repository-action@main
        id: ecr
        with:
          repository: hello-world
          # (optional) you can put a lifecycle policy to the repository
          lifecycle-policy: path/to/lifecycle-policy.json
      - run: docker build -t ${{ steps.ecr.outputs.repository-uri }}:latest .
      - run: docker push ${{ steps.ecr.outputs.repository-uri }}:latest
```
