const fs = require('fs');
const path = require('path');

const hostedGitInfo = require('hosted-git-info');

const pkg = require('./package.json');

const repoURL = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository.url;
const repoInfo = hostedGitInfo.fromUrl(repoURL);

module.exports = {
  versionUpdated({ dir }) {
    // Remove header text in `CHANGELOG.md`
    const changelogPath = path.resolve(dir, 'CHANGELOG.md');
    const changelogText = fs.readFileSync(changelogPath, { encoding: 'utf8' });
    const omitHeaderChangelogText = changelogText.replace(
      /^\n*(?:# Change Log\n(?:(?!#+ )[^\n]*\n)*)?##? (?:(?:Unreleased|\[Unreleased\](?:\([^)]+\))?)(?: \([0-9-]+\))?)\n(?:(?!#+ )[^\n]*\n)*/,
    );
    fs.writeFileSync(changelogPath, omitHeaderChangelogText);
  },
  beforeCommitChanges({ nextVersion, exec, dir }) {
    // Add header text in `CHANGELOG.md`
    const changelogPath = path.resolve(dir, 'CHANGELOG.md');
    const changelogText = fs.readFileSync(changelogPath, { encoding: 'utf8' });
    const updatedChangelogText = [
      `# Change Log`,
      ``,
      `## [Unreleased](${repoInfo._fill(`https://{domain}/{user}/{project}/compare/v${nextVersion}...master`)})`,
      ``,
      changelogText,
    ].join('\n');
    fs.writeFileSync(changelogPath, updatedChangelogText);

    // Update `README.md`
    exec(`npm run build:readme`);
  },
};
