# Git Rebase And PR Workflow

## Purpose

Scripts to help publish this project to GitHub and prepare a pull request with minimal manual Git steps.

## Prerequisites

- `git` installed and available in `PATH`
- GitHub repository created:
  - `https://github.com/ngtuanhaidhbk/TS-D1000`
- authenticated Git access via Git Credential Manager, GitHub Desktop, or a browser login prompt

## 1. Initial Push

Run once to initialize the local repository and push the first `main` branch:

```powershell
.\Start-GitInitialPush.ps1
```

Optional:

```powershell
.\Start-GitInitialPush.ps1 -RepoUrl "https://github.com/ngtuanhaidhbk/TS-D1000.git" -BaseBranch "main" -CommitMessage "Initial commit"
```

## 2. Create Or Update Feature Branch And Prepare PR

Run this when you have changes ready for a feature branch:

```powershell
.\Start-GitFeaturePR.ps1 -FeatureBranch "feature/rbac-foundation" -CommitMessage "Implement role-based access foundation"
```

What the script does:

- ensures `origin` points to the target GitHub repo
- creates or checks out the feature branch
- commits local changes if needed
- fetches `origin`
- rebases the feature branch onto `origin/main`
- pushes the branch to GitHub
- prints the GitHub compare URL for creating the PR

If you already rebased and need to update a rewritten branch:

```powershell
.\Start-GitFeaturePR.ps1 -FeatureBranch "feature/rbac-foundation" -CommitMessage "Update RBAC implementation" -ForceWithLease
```

## 3. Create The Pull Request

After the feature script finishes, open the printed compare URL in your browser and create the PR.

Example format:

```text
https://github.com/ngtuanhaidhbk/TS-D1000/compare/main...feature/rbac-foundation?expand=1
```

## Notes

- The feature script assumes the repository already exists on GitHub.
- If there are no local changes, the script skips the commit and only rebases and pushes.
- If `git rebase` reports conflicts, resolve them locally, then continue with:

```powershell
git rebase --continue
```

Then push again:

```powershell
git push -u origin <feature-branch> --force-with-lease
```
