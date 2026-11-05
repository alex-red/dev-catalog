# Diagnose failed CI browser tests with Playwright traces

Capture the browser state, actions, and requests from a CI run so you can investigate a failure even when it passes locally.

## 1. Keep traces from failed attempts

Merge these settings into your existing `playwright.config.ts` for CI. Preserve existing reporters and add the HTML reporter if the suite does not already use it.

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
  },
});
```

This mode records each attempt and keeps traces for failures, including an initial failure that passes on retry. For suites where recording overhead matters, `trace: 'on-first-retry'` records only the first retry. That mode needs retries enabled and the trace shows the retry's behavior.

## 2. Publish the report even when tests fail

Configure CI to upload the full HTML report directory after the test step completes, including when that step fails. The default report path is `playwright-report/`. For sharded runs, use the [Playwright report merging procedure](https://playwright.dev/docs/test-sharding#merging-reports-from-multiple-shards).

Keep access and retention appropriate for your test data. Traces can include screenshots, page content, and network details.

## 3. Inspect the failed action

Download and extract the artifact, then open the report from the project with its existing Playwright install.

```sh
npx playwright show-report ./playwright-report
```

Open the failed test and select its trace. If a retry passed, look under flaky tests and open the failed attempt. Start at the failed action and compare the DOM snapshots immediately before and after it. Check the network and console panels for requests or errors near that action. For example, when a click times out, the snapshot may show a modal covering the target, while a missing row may point to a failed API request.

If you have a standalone trace archive, open it directly with `npx playwright show-trace ./trace.zip`.
