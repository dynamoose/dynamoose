# Contributing to Dynamoose

:+1::tada: **THANK YOU** for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing to Dynamoose and all projects in the [dynamoose Organization](https://github.com/dynamoose) on GitHub. Although these are strongly encouraged guidelines, nothing about this project is set in stone, if you believe something here should be edited, open a pull request to start a discussion about it.

## Code of Conduct

This project and everyone participating in it is governed by the [Dynamoose Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the contact method in the [Code of Conduct](CODE_OF_CONDUCT.md).

## What should I know before I get started?

### Documentation

All of the documentation for the project is housed within the `docs/docs` folder. The general website is housed within the `docs` folder. It is important while contributing to Dynamoose to ensure that the documentation is complete, up to date, and helpful.

### Resources

It is highly encouraged to read through the following resources before contributing.

- [README](README.md)
- [Website](https://dynamoosejs.com)

## How Can I Contribute?

### Reporting Bugs

When reporting bugs please fill out the issue template with as much detail as possible. If you do not fill out the issue template with enough detail for us to debug your issue, your issue is at risk for being closed.

#### Minimal, Complete and Verifiable Example (MCVE)

One of the most important things when submitting an issue is to provide a *Minimal, Complete and Verifiable Example* (or MCVE for short). If you are reporting a bug it is important for us to be able to test and debug your code as quickly as possible.

- *Minimal* – Use as little code as possible that still produces the same problem
- *Complete* – Provide all parts needed to reproduce your problem
- *Reproducible* – Test the code to make sure it reproduces the problem

Without following these steps when creating code examples it is nearly impossible for us to debug your issue. Help us help you by putting time and care into code examples. Not following this guideline puts your issue at risk for being closed.

### Submitting a Pull Request (PR)

It is highly recommended (although not required) to follow the pattern below before submitting a pull request. Not every step below will be relevant to all pull requests.

#### Before

1. **Identify a need in the project** - This can be a bug, feature request, or other change.
2. **Create a detailed issue to gauge interest** - Although most pull requests are merged, we don't want you to waste time creating a pull request that doesn't have the support of the community. This doesn't mean that even if the community supports an issue that the corosponding pull request will be merged, but it increases the chances with community support. *This step is highly encouraged for larger contributions, but not required. For smaller contributions (typos, adding tests, updating documentaion, minor code changes, etc.) it is not necessary to create a seperate issue.*
3. **Read through the `package.json`** - The `package.json` file in the root of the repository has a **lot** of useful information about the project. Especially read through the `scripts` section, as a lot of those scripts can help speed up your development process when working in Dynamoose. There are scripts for running tests, building the website, debugging code, fixing lint issues, etc.

#### During

1. **Create a fork & branch** - Before contributing to Dynamoose you must create a fork of the [main repository](https://github.com/dynamoose/dynamoose) and create a branch on your fork. It is highly discouraged from using a primary branch (ex. `master` or `alpha`) to make your changes. This is due to the fact that if you enable `Allow edits from maintainers` option, maintainers might commit directly to your primary branch which could cause problems if others are using your fork in their applications.
2. **Install dependencies** - Run `npm install` to install all the dependencies of the project.
3. **Maintain consistency throughout** - While working in the project, we highly encourage you to maintain the same coding style that the rest of the project uses. This means looking around at similar code and trying to adopt the same style and conventions in your code.
4. **Run tests & linter often** - It is highly encouraged to run `npm test` & `npm run lint` often to ensure you are conforming to the project guidelines. In order for a pull request to be merged all tests must pass, the linter must throw no errors, and test code coverage must not decrease.
5. **Write tests** - While (or better yet, before) making changes you should write tests in the test suite to ensure things work as expected.
	1. **Test Edge Cases** - While writing tests try to consider edge cases that might occur and write test for those edge cases. For example, what happens if you a user passes in no arguments, or what happens if the type passed in is not the type you expect.
	2. **Code Coverage Must Not Decrease** - Your pull request will not be merged if it decreases the code coverage for tests, so it is important to write tests to ensure any code added or modified is covered by tests.
	3. **No Log Output** - It is also important that your tests do not print any output to the console or logs, this includes `console.log`, UncaughtPromiseExceptions, etc. All logs printed should come directly from Mocha.
	4. **One Test Must Fail Prior to Code Changes** - At *least* one test you write should fail without the code changes you have made.
	5. **Self Contained and Static** - All tests should be self contained and should not rely on each other in order to pass. All tests must also be static and have no potiental of failing based on random or outside factors.
	6. **Logic inside Mocha Blocks** - All test logic should take place within Mocha blocks (ex. `it`, `before`, `beforeEach`, `after` or `afterEach`). No interaction with Dynamoose or outside references should take place outside of those blocks (ex. you should not create models or schemas in the global or `describe` scope).
6. **Update documentation** - For anything that effects users using Dynamoose, documentation should be added/deleted/modified to reflect the changes you have made. It is important to ensure the documentation you write is as clear as possible, giving examples, and attempting to answer as many relevent questions as possible.
7. **Commit small & often** - Please commit changes often and keep commit size to a minimum. It is highly discouraged from creating one massive commit with all of your changes in it. Every commit should also aim to pass the linter and tests. Commit messages should also be detailed enough to give a good explaination of the change made. Commit messages such as `changes` or `did stuff` are considered **poor** commit messages.

#### After

1. **Submit the pull request** - When submitting the pull request it is important to fill out the complete pull request template. This ensures reviewers of your pull request can easily understand what is going on and make sure all guidelines and requirements have been met. It is also highly recommended to enable the `Allow edits from maintainers` option (be aware that enabling this option means that maintainers have the right to commit to your branch at any time, *we do use this ability*).
2. **Be prepared for questions and suggestions** - As others review your pull request it is important to be available to answer questions and promptly respond to code suggestions. Stale pull requests run the risk of being closed, even if it's a large change or a lot of effort was put into it.
3. **Ask others for reviews** - If you know someone who is anticipating your work, ask them to test your branch and leave a detailed review on the pull request.

#### Release

Dynamoose does not currently have a release schedule that we conform to. We atttempt to batch work into a release every so often. If you have a need that requires us releasing a version sooner, please notify us, and we will attempt to cut a new release earlier (however this is not guaranteed, and you are still welcome to point to a branch in NPM if we are unable to release on your timeline).

## How do I become a project maintainer?

At this time we are pretty strict in terms of who gets write/merge access to Dynamoose. The following are general guidelines we look for before granting those permissions, but other factors may apply depending on the situation.

1. **Activity** - Likely the most important factor is we need to see you remain active on the project for an extended period of time. We want maintainers to be active and although we don't require maintainers to dedicated all their time to Dynamoose, we are looking for maintainers to be active in the community.
2. **Contributions** - We are looking for project maintainers to be active in contributing feedback, features, bug fixes, documentation improvements, and more to the project. Short verison: we want project maintainers to show that they are dedicated to improving the project.

In short, some starting tips towards becoming a project maintainer include:

1. Submit pull requests to improve the project
2. Answer questions in Slack or Stack Overflow
3. Reply to issues on GitHub

If you believe you have a case for becoming a project maintainer and feel as tho you meet those requirements [contact me](https://charlie.fish/contact) or reach out on Slack (Charlie Fish) and I'd be happy to discuss next steps with you.

It is also important to note that if you become a project maintainer, and become inactive on the project, your project maintainer status may be revoked.

---

## What do project maintainers need to know?

The following section is unlikely to be useful to general contributors to Dynamoose, and is reserved for project maintainers.

### Release

In order to release a version of Dynamoose you can kick off this process by running `node publish`. This will kick off the release process. Following the steps it guides you through should lead to a successful release. Please [contact me](https://charlie.fish/contact) or message me on the Dynamoose Slack (Charlie Fish) if you have questions or run into any issues.

It is important to note that you must have write permissions to the `master` branch in order for this process to be successful.
