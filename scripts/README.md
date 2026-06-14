# scripts

Repo helper scripts. Day-to-day tasks are exposed as root `pnpm` scripts (powered by Turborepo);
these are convenience wrappers.

| Script        | Purpose                                                       |
| ------------- | ------------------------------------------------------------- |
| `verify.sh`   | Run the full local quality gate (install → lint → typecheck → test → build), mirroring CI. |

```bash
bash scripts/verify.sh
```
