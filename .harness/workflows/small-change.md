# Small Change Workflow

Use for local, low-risk changes.

1. Read `.harness/index.md` and `.harness/catalog.md`.
2. Read relevant `.project-wiki/` pages.
3. Use the runtime wiki graph helper when related knowledge is unclear.
4. Inspect the immediate code path.
5. When GitHub planning applies, confirm Dev-Manager admission before changing
   product code.
6. Make the smallest compatible change.
7. Keep one main variable changing at a time.
8. Run narrow verification.
9. Run the configured exactly-one independent audit for code-producing work.
10. Update wiki if durable knowledge changed.
11. Build the clean local integration candidate and obtain acceptance of its
    exact identity before any remote push, PR, merge, or test deployment.

## Local Acceptance Before Remote Delivery

After verification and the configured independent review, build the clean local
integration candidate and obtain exact product acceptance before remote push,
PR, merge, or test deployment. Plan approval does not authorize delivery.
