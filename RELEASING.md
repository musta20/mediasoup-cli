# Publishing a release

Use a major version for breaking changes, minor for compatible features, and patch for compatible fixes.

1. Commit the finished work on its feature branch and run the tests:

   ```sh
   npm ci
   npm test
   ```

   For the real demo/browser suite, follow `test/live/README.md`.

2. Fetch the current branches, update the version without creating a tag yet, and update `CHANGELOG.md`:

   ```sh
   git fetch origin
   npm version major --no-git-tag-version
   # Or: npm version minor --no-git-tag-version
   # Or: npm version patch --no-git-tag-version
   ```

   Commit the version changes, push the feature branch and merge into `main` after checking CI. With no branch protection and a linear history, `git switch main` followed by `git merge --ff-only FEATURE_BRANCH` preserves the commits. If GitHub requires a pull request, merge it there and update local main with `git pull --ff-only`.

3. On the final `main` commit, check and pack the release:

   ```sh
   npm test
   npm pack
   ```

   Inspect the tarball contents and smoke-test installing it in a separate directory. `dist/`, public typings, CLI entry point, README, changelog and license should be included. Local browser artifacts, certificates, logs and development dependencies must not be bundled. `config.env` should contain the default port 5462.

4. Authenticate and publish the tested tarball. Replace VERSION with the actual package version:

   ```sh
   npm login
   npm whoami
   npm publish ./mediasoup-cli-VERSION.tgz --access public --tag latest
   ```

   Complete any browser authentication or 2FA prompt in your own terminal. Never put credentials in git or a release document. npm does not permit reusing a published package/version pair.

5. Verify the version is available, then tag the corresponding commit:

   ```sh
   npm view mediasoup-cli version dist-tags
   git tag -a vVERSION -m "Release VERSION"
   git push origin main
   git push origin vVERSION
   ```

   Tag the exact commit used to produce the published tarball. If publishing fails, inspect the error and query the registry before retrying; do not assume the package was published.

Reference: [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).
