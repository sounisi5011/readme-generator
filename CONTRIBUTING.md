# Contributing rules

* MUST NOT commit to the `master` branch.
* MUST NOT merge locally into the `master` branch. MUST use Pull Request.
* MUST NOT use "merge commit" or "Rebase and merge". MUST use "Squash and merge".
* Pull Request titles MUST comply with [Conventional Commits spec].
* git commit message SHOULD follow [Conventional Commits spec].
* If you make a fix that changes behavior (feature addition, bug fix, etc), you MUST add a test codes that fails before the fixes and succeeds after the fixes.
* If you want to update the `README.md` file, you MUST edit the `.template/README.njk` file instead.

[Conventional Commits spec]: https://www.conventionalcommits.org/
