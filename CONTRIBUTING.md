# Contributing to Mockoon mock-samples

Please follow the guidelines below when contributing:

## Contribution rules

The following rules apply to all contributions:

- Always search among the opened and closed issues. Assigned issues are already being worked on, and, most of the time, cannot be reassigned.
- Pull requests must refer to an open issue. Pull requests not solving existing issues may not be accepted.
- Issues and PR must follow the provided templates.

## Work on your feature or bugfix

- Start your `feature` or `fix` from `main`
- Preferably squash your commits
- Do not forget to add "Closes #xx" in one of the commit messages or in the pull request description (where xx is the GitHub issue number)

Branches naming convention:
- features and enhancements: `feature/name-or-issue-number`
- bug fixes: `fix/name-or-issue-number`

## Create a new mock sample

- Create the new mock sample using Mockoon.
- Test the new mock API and ensure that generated JSON bodies are valid. 
- Add the file to the `samples` directory.

## Open a pull request

Open a pull request to be merge in the `main` branch. All branches should start from `main` and must be merged into `main`.
Ask maintainers to review the code.
