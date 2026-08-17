# Security

AllSender Mobile is a native client. Never commit or embed:

- `client_secret`
- AllSender user passwords
- OAuth access/refresh tokens
- Evolution, Meta, Zernio or Firebase server credentials
- EAS signing credentials

Only public configuration belongs in `.env`, and `.env` is ignored by Git.

The app delegates tenant, role, branch and chat authorization to `auth.allsender.tech`. A client-side `team_id`, `user_id`, `jid` or `instanceId` is never sufficient authority by itself.

Report security issues privately to the repository owner rather than opening a public issue containing credentials or customer data.
