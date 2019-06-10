# Changelog

## Planned
 * Playback rate, Aspect ratio and other fixes for 2.0.0 regression.

## 3.0.0 (10.07.2019)

* License changed to MIT
* Compatibility with ZombieBox 2.0. 
* No changes in code since `alpha.1`

## 3.0.0-alpha.1 (22.03.2019)

Platform code migrated to ES6 modules.

Compatibility with ZombieBox 2.0. 

## 2.1.0 (22.03.2019)

Compatibility with ZombieBox 1.0; Android dependencies brought up to date. 

### Breaking Changes
* `getSoftwareVersion` device API method renamed to `getAndroidVersion`.

### Added 
 * `getVideoURI` device API method.
 * `isLiveStream` device API method.
 * `IInfo.version` implemented.
 * `IInfo.softwareVersion` implemented.
 * `IVideo.getUrl` implemented.
 * Application names that start with "test" will be renamed to random strings to be compatible with gradle.

### Removed 
 * Zip aligning during build. This should be done after apk is signed.

### Internal changes
 * ExoPlayer updated to 2.9.6 
 * Gradle updated to 3.3.2 
 * Better ESLint coverage
 * `IVideo.getDuration` now returns `Infinity` for live streams

## 2.0.4 (30.07.2018) 
### Breaking Changes
 * Some methods now throw `UnsupportedFeature` instead of quietly failing.

### Added 
 * `UnsupportedFeature` error.

### Internal changes
 * Integrated ESLint and updated codebase to Interfaced code style.

## 2.0.3 (10.10.2017)
### Breaking Changes
 * After playback finished naturally by reaching the end of media file player now stays in the previous state rather than switching to `STATE_STOPPED` for better consistency across platforms.

### Fixed
 * Fixed player occasionally switching to `STATE_STOPPED` shortly after playback start.
 * Fixed `EVENT_DURATION_CHANGE` being fired with unrealistic duration value at the start of playback.

## 2.0.2 (06.09.2017)
### Known Issues
 * Mouse was discovered not to work properly and therefore was disabled.

### Breaking Changes
 * `resources` config field removed.
 * `resPath` config filed  added in its place.

### Added 
 * Ability to fully customize Android resources.

## 2.0.1 (28.08.2017)
### Fixed
 * Fixed `IVideo` going into `STOPPED` state synchronously in some cases while in fact it was still stopping.

## 2.0.0 (28.08.2017)
 * ExoPlayer instead of ExoMedia. Player underwent massive rework.
 
### Removed 
 * Playback rate support.
 * Aspect ratio changing.

### Breaking Changed
 * `version` config field renamed to `versionName`.
 * `webviewDebug` config field renamed to `webViewDebug`.
 * `setOrientation` renamed to `setVideoOrientation`
  
### Added
 * UHD and 4K video playback support.
 * Release apk building with optimisations, obfuscating and aligning.
 * Video optimisation settings. Supporting rotations unfortunately hinders performance, `Video.setVideoOptimisation` was introduced as means to choose between smooth playback and rotation support.
 * `versionCode` and `versionName` (ex `version`) config fields.
 * Better player error messages.
 * Automatic media type detection.
 
### Internal changes
 * Improved stability of `IVideo` states and events.

### Fixed
 * Rotation and scaling issues on some videos.
 * Fixed an issue when holding down Back key could stop it from triggering altogether.
 * Fixed fatal playback errors not stopping video from rendering.

## 1.2.2 (07.07.2017)
### Fixed
 * Fixed crash when pressing buttons of external gamepads. 

### Internal changes
 * Video is now hidden when stopped - should lead to less stray frames.

## 1.2.1 (06.07.207)
Erroneous release. Functionally the same as 1.2.0.

## 1.2.0 (19.05.2017)
### Removed 
 * `Viewport.setRotation({number})` - Setting arbitrary rotation angles is no longer possible. For orientation angles (0, 90, 180, 270) use `setOrientation` (see below).
 * `Viewport.getRotation()`.
 
### Added 
 * `Viewport.setOrientation({zb.device.platforms.android.Viewport.Orientation})`.

### Fixed
 * `Video.getUrl` now actually returns video url.

### Internal changes
 * Viewport now scales with native scaling instead of having its size recalculated.

## 1.1.1 (05.05.2017)
### Fixed
 * Video error event when application is suspended/resume when video is not initialized.

## 1.1.0 (17.04.2017)
### Added
 * `Viewport` implementation.
 * Ability to set `Video` orientation (`Viewport.setRotation`).
 * Launch params parsing.

### Internal changes
 * `Device.getLocale` refactored to conform with base zombiebox implementation (with the same interface).
 * ExoMedia and tools updated.
 * Android Audio Focus is now handled natively.
 * Most `Player` methods now assert video object which should lead to better stability.

## 1.0.0 (13.01.2017)
 * Initial release version.
