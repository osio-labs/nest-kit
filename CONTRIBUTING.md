# Contributing to @os.io/nest-kit

First off, thank you for considering contributing! We welcome contributions
from everyone.

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/).
By participating, you are expected to uphold this code.

## How to contribute

### Reporting bugs

Open an [issue](https://github.com/osio-labs/nest-kit/issues) with:

- A clear, descriptive title
- Steps to reproduce
- Expected vs actual behaviour
- Environment details (Node version, OS, package versions)

### Feature requests

Open an issue with the label `enhancement`. Describe the feature, why it's
useful, and — if possible — how you envision the API.

### Pull requests

1. Fork the repo.
2. Create a branch from `main`: `git checkout -b feat/my-feature`.
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/).
4. Push and open a PR against `main`.

#### Commit convention

```
<type>(<scope>): <description>
```

**Types** (required):

| Type       | Usage                                                   |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `chore`    | Maintenance tasks (deps, tooling, config)               |
| `docs`     | Documentation changes                                   |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `style`    | Code style / formatting (whitespace, semicolons, …)     |
| `perf`     | Performance improvement                                 |
| `ci`       | CI/CD configuration changes                             |
| `build`    | Build system or external dependency changes             |
| `revert`   | Revert a previous commit                                |

**Scopes** (required):

| Scope       | Module group                                                              |
| ----------- | ------------------------------------------------------------------------- |
| `root`      | Root project config (package.json, tsconfig, eslint, …)                   |
| `core`      | Shared types, utilities                                                   |
| `bootstrap` | NestJS bootstrap helpers                                                  |
| `auth`      | Auth & Authorization                                                      |
| `saas`      | SaaS primitives                                                           |
| `infra`     | Infra modules (logger, notification, storage, stripe, audit-log, metrics) |
| `docs`      | Documentation                                                             |
| `release`   | Release / version bump                                                    |
| `deps`      | Dependency updates                                                        |

Examples:

```
feat(auth): add rbac guard
fix(bootstrap): correct swagger dark-mode path
docs(readme): update installation guide
chore(deps): bump typescript to 5.7
test(saas): add organisation crud tests
```

#### PR checklist

- [ ] Code follows project style (`npm run lint:check`)
- [ ] TypeScript compiles cleanly (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] New code includes tests
- [ ] JSDoc added for public exports

### Development setup

```bash
git clone https://github.com/osio-labs/nest-kit.git
cd nest-kit
npm install
npm run build
npm test
```

## Questions?

Open a [discussion](https://github.com/osio-labs/nest-kit/discussions).
