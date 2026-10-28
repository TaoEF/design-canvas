# Large Change Workflow

Use for shared paths, contracts, schemas, architecture, or multi-domain changes.

1. Read harness and wiki context.
2. Use the runtime wiki graph helper to discover related entities and source
   paths when scope crosses domains.
3. Inspect current code and tests.
4. Produce an implementation plan.
5. Produce test cases.
6. Get user confirmation.
7. When GitHub planning applies, confirm Dev-Manager admission before changing
   product code.
8. Implement progressively.
9. Preserve backward compatibility unless explicitly approved.
10. Run planned verification.
11. Run the configured exactly-one independent audit for code-producing work.
12. Update wiki/harness when durable knowledge changes.
13. Build the clean local integration candidate and obtain acceptance of its
    exact identity before any remote push, PR, merge, or test deployment. The
    step 6 plan confirmation is not delivery authorization.

## Local Acceptance Before Remote Delivery

After verification and the configured independent review, build the clean local
integration candidate and obtain exact product acceptance before remote push,
PR, merge, or test deployment. Plan approval does not authorize delivery.
