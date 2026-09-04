# Fix the blank GitHub Pages deployment

## What will change
- Add a GitHub Pages workflow that builds the Vite app before publishing it, instead of serving the source `index.html` directly.
- Configure the production asset base and router base for the repository path `/schooltrade/` while preserving the existing root-path behavior on Lovable.
- Make embedded runner and premium-game URLs honor the deployment base path.
- Correct the runner bundle's root-relative asset URL.

## Verification
- Build the same way GitHub Actions will build.
- Serve the built output beneath `/schooltrade/` and confirm the Hebrew app and embedded games load without missing scripts or route errors.

## Technical details
The current live page serves `/src/main.tsx` from the repository source. GitHub Pages cannot compile TypeScript/React in the browser, and root-relative URLs such as `/favicon.png` and `/runner/...` point at the account domain root rather than the `/schooltrade/` repository path. The deployment must publish Vite's generated `dist` directory and use a repository-aware base path.
