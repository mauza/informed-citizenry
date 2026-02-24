# MAU-17: Update Flutter Frontend Dependencies

## Overview

Update all Flutter dependencies in `app/pubspec.yaml` to their latest available versions as of 2026-02-23.

## Dependency Audit

| Package | Current | Latest | Type | Risk |
|---|---|---|---|---|
| `cupertino_icons` | `^1.0.2` | `1.0.8` | Patch | Low |
| `supabase_flutter` | `^2.8.3` | `2.12.0` | Minor | Low |
| `app_links` | `^6.3.3` | `7.0.0` | **Major** | Medium |
| `app_links_web` | `^1.0.4` | `1.0.4` | No change | None |
| `mocktail` | `^1.0.0` | `1.0.4` | Patch | Low |
| `flutter_launcher_icons` | `^0.14.3` | `0.14.4` | Patch | Low |
| `flutter_lints` | `^5.0.0` | `6.0.0` | **Major** | Medium |

## Breaking Change Notes

### `app_links` v6 → v7
- **Dart API is unchanged** — no code changes required for the Dart side
- **Requires Flutter >= 3.38.1**
- **Requires iOS 13+** — current deployment target is iOS 12.0 (must bump to 13.0)
- If a custom `UISceneDelegate` is in use on iOS, the Flutter UIScene migration guide must be followed. The project currently has no custom `AppDelegate`/`SceneDelegate` overrides, so this is likely not needed.

### `flutter_lints` v5 → v6
- Introduces new lint rules that may produce analyzer warnings/errors
- After upgrading, `flutter analyze` must be run and any new violations fixed

## Relevant Files

- `app/pubspec.yaml` — dependency version constraints
- `app/pubspec.lock` — resolved dependency lockfile (auto-updated by `flutter pub upgrade`)
- `app/ios/Runner.xcodeproj/project.pbxproj` — iOS deployment target (must change from `12.0` to `13.0`)
- `app/analysis_options.yaml` — lint configuration (may need rule suppressions if new flutter_lints rules conflict with existing code)
- `app/lib/main.dart` — imports `app_links`, uses `AppLinks()`, `.getInitialLink()`, `.uriLinkStream` (all still valid in v7)
- `app/test/widget_test.dart` — stale boilerplate test (tests a counter that doesn't exist); should be fixed or removed to keep CI green

## Implementation Steps

### Step 1: Update `app/pubspec.yaml`

Update version constraints:
```yaml
dependencies:
  cupertino_icons: ^1.0.8
  supabase_flutter: ^2.12.0
  app_links: ^7.0.0
  # app_links_web stays at ^1.0.4 (no new version)

dev_dependencies:
  mocktail: ^1.0.4
  flutter_launcher_icons: ^0.14.4
  flutter_lints: ^6.0.0
```

Keep `sdk: ^3.6.0` — the caret constraint already allows Dart 3.11.0.

### Step 2: Update iOS Deployment Target

In `app/ios/Runner.xcodeproj/project.pbxproj`, change all occurrences of:
```
IPHONEOS_DEPLOYMENT_TARGET = 12.0;
```
to:
```
IPHONEOS_DEPLOYMENT_TARGET = 13.0;
```
(There are 3 occurrences in the file.)

### Step 3: Run `flutter pub upgrade`

From the `app/` directory:
```sh
flutter pub upgrade
```
This resolves all dependencies and regenerates `pubspec.lock`.

### Step 4: Run `flutter analyze`

```sh
flutter analyze
```
Review output for new lint violations introduced by `flutter_lints` v6. Fix any issues found (likely in `app/lib/` source files). Common new rules in flutter_lints v6 include stricter void callback checks and deprecated API usage warnings.

### Step 5: Fix Stale Widget Test

`app/test/widget_test.dart` tests a counter widget that no longer exists in the app. This will cause `flutter test` to fail. Options:
1. Remove the test file (preferred if there are no other tests to keep)
2. Replace the test body with a basic smoke test that actually matches the current app structure (e.g., just verifies `MyApp` renders without crashing)

### Step 6: Run Tests

```sh
flutter test
```
Confirm all tests pass after the dependency upgrade and any code fixes.

## Acceptance Criteria

- [ ] `app/pubspec.yaml` has updated version constraints for all upgradeable packages
- [ ] iOS deployment target is bumped to 13.0 in `project.pbxproj`
- [ ] `flutter pub upgrade` completes successfully
- [ ] `flutter analyze` reports no errors (warnings may be acceptable if pre-existing)
- [ ] `flutter test` passes
- [ ] `pubspec.lock` is committed with the updated resolved versions
