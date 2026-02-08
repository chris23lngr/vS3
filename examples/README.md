# vs3 Examples

This folder contains example applications demonstrating how to use `vs3`.

Each example is a standalone app that you can run independently. They use the `vs3` package from the monorepo workspace.

## Available Examples

| Example | Description |
|---------|-------------|
| *(coming soon)* | |

## Running Examples

From the repository root:

```bash
# Run a specific example
pnpm --filter "example-with-auth" dev

# Run all examples (in parallel)
pnpm --filter "./examples/*" dev

# Or from the examples folder
pnpm dev
```

## Adding a New Example

1. Create a new directory under `examples/` (e.g., `examples/with-auth`)
2. Add a `package.json` with `"vs3": "workspace:*"` in dependencies
3. Implement the example app
4. Update this README with the new example
