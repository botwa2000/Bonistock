# Bonifatus — Deploy Procedure

## Live URLs

- **Production:** https://bonistock.vercel.app
- **Vercel Dashboard:** https://vercel.com/botwa2000s-projects/bonifatus-stock
- **GitHub Repo:** https://github.com/botwa2000/Bonistock

## How It Works

Vercel is connected to the `main` branch of the GitHub repo. Any push to `main` triggers an automatic production deployment.

Local development happens on the `master` branch. To deploy, push `master` to `main` on GitHub.

## Step-by-Step: Commit & Deploy

### 1. Verify the build locally

```bash
npm run build
```

Should complete with zero errors and list all routes.

### 2. Stage and commit your changes

```bash
git add <files>
git commit -m "Description of changes"
```

### 3. Push to GitHub (triggers Vercel deploy)

```bash
git push origin master:main
```

This pushes your local `master` branch to the remote `main` branch, which triggers Vercel.

### 4. Verify the deployment

Check deployment status:

```bash
vercel ls
```

You should see a new deployment with status `● Building` then `● Ready`.

Inspect a specific deployment:

```bash
vercel inspect <deployment-url>
```

Or visit the Vercel dashboard: https://vercel.com/botwa2000s-projects/bonifatus-stock

### 5. Verify the live site

Open https://bonistock.vercel.app and confirm changes are visible.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `vercel ls` shows no new deployment after push | Check that Vercel GitHub integration has access to the `Bonistock` repo in GitHub Settings > Installations > Vercel |
| Build fails on Vercel | Run `npm run build` locally first to catch errors before pushing |
| Changes on `master` but not deployed | You need to push to `main`: `git push origin master:main` |
| Vercel CLI not authenticated | Run `vercel login` |

## Branch Setup

| Branch | Purpose |
|--------|---------|
| `master` (local) | Development branch, all work happens here |
| `main` (remote) | Production branch, Vercel deploys from this |
