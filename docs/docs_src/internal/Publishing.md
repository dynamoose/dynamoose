Dynamoose uses a custom publishing system to publish all of our versions, and handle tasks such as updating resources across the project to ensure all publishing actions are handled properly.

This document describes the high level process of how the Dynamoose publishing system works.

There are two major stages to deploying a new version of Dynamoose:

1. Actions that will be committed to the repository, and included in the GitHub Tag.
2. Actions that happen after the final commit and Git tag has been created.

### Stage 1

To start the deployment process, run `node publish` from the root of the repository.

This will guide you through a process and ask questions such as the version number, changelog contents, etc. Having the changelog contents be generated here is a major benefit as it allows for the changelog to have any formatting customizations that we want. It also allows us to easily include the changelog in the GitHub version details.

After that is complete, it will create a pull request, that you will need to merge. This pull request should include all changes included in the final commit.

### Stage 2

Once the final pull request from stage 1 has been created, the `node publish` script you ran earlier should still be running, and after a little bit should detect that the pull request has been merged.

At this point that same script will create a new GitHub version/tag, which will kickoff a GitHub Action to deploy to npm (`.github/workflows/publish.yml`). This will also do a few final actions, such as deploy the website, ensure README files are copied to the package directory, etc.

### Cleanup

After the `node publish` script detects that Dynamoose has been published to npm, it will run a few cleanup tasks such as checking out the original branch, and deleting the version branch.
