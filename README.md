# zombiebox-platform-android-tv

[ZombieBox](https://zombiebox.tv) platform for Android TV.

Unlike most ZombieBox platforms Android TV consists of two components: `AbstractPlatform` implementation and apk wrapper which lets it to run on Android devices.

The wrapper is a java application which is essentially a bare WebView overlaying a video player ([ExoPlayer](https://exoplayer.dev/)).
WebView opens html page with ZombieBox application and provides proxy methods to control application and player.

## Requirements

For building applications you'll need Android SDK and Java JDK/JRE above version 8.

* You can either install Android Studio (recommended for hacking the platform itself) or just CLI (good enough for building and deploying) from [https://developer.android.com/studio/index.html](https://developer.android.com/studio/index.html).

* Unpack the tools into some directory that will serve as SDK root and set up path to this directory as `ANDROID_HOME` environment variable.
 
```bash
 echo 'export ANDROID_HOME=<path-to-sdk>' >> ~/.bashrc && source ~/.bashrc
 ```

* Accept SDK licenses: `$ANDROID_HOME/tools/bin/sdkmanager --licenses`.

## Configuraion

 * `appId` — Unique app identifier. Typically in reverse-domain notation, i.e. `ru.interfaced.appName`. Required for release build (`storeRelease`), optional in debug build (will be randomly generated). See [Set the application ID](https://developer.android.com/studio/build/application-id)
 * `namespace` — Build name. Same as `name` in `package.json` by default.
 * `versionName` — User version. `version` field in `package.json` by default. See [Version your app](https://developer.android.com/studio/publish/versioning)
 * `versionCode` — Numeric version code. Used by Google Play to determine updates. Required with `storeRelease` set to `true`. Should be increment for each store release. See [Version your app](https://developer.android.com/studio/publish/versioning)
 * `name` — Application display name.
 * `launcherColor` — Launch animation color. Black by default
 * `useBundledHTML`
   * `true` (default) — html artifact will be bundled into .apk
   * `false` — html artifact is to be loaded by HTTP from `applicationURL`.
 * `applicationURL` — See `useBundledHTML`.
 * `webViewDebug` – Enables WebView debug. `false` by default.
 * `storeRelease` — If `true`, application will be compiled for the purposes of uploading to Google Play.
 * `resPath` — Resources directory, see Resources below.

## Building and installing applications

Application can be either built with ZombieBox build system: `npx zb build android`.
 
Or in Android Studio from [`native`](./native) directory. Configure the platform in `build.gradle`.

### apk signing

Android apk are always signed. Debug builds are automatically signed with an unsafe keys. If you plan to build and run a Release build, it will be compiled unsigned and won't install on any device unless signed. For testing purposes you can sign it with a temporary key:

* Generate a key with [`keytool`](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/keytool.html):

```bash
keytool -genkey -v -keystore key.jks -keyalg RSA -keysize 2048 -validity 10 -alias my-alias
```

This will generate a `key.jks` file valid for 10 days. Don't generate keys with long validity to avoid incidents.

If `keytool` is not found in `PATH`, its typically in `bin/` folder of `JDK` (`/Library/Java/JavaVirtualMachines` on MacOS).

* To sign apk use `apksigner` tool from  Android SDK found in `$ANDROID_HOME/build-tools/<VERSION>`:

```
apksigner sign --ks key.jks --out app-release-signed.apk app-unsigned.apk
```

See [Sign your app](https://developer.android.com/studio/publish/app-signing) for more details.

### Installing applications

First, enable Developer Mode on target device, typically it's in devices settings: Settings - Developer Options - USB debugging.
If there are no Developer Options, try clicking several times on Build Number under Device Information.

TVs typically have wireless remote debugging enabled by default and you can connect to them straight away with `adb connect <ip-address>`.
With STBs it's often not the case and you'll first need to connect them with a cable and enable wireless debug with `adb tcpip 5555`. 

After connecting verify device is ready with `adb devices`. It should list the devices with status either `device` or its name.

The first time device is connected to a new host, it should ask you to confirm whether it should trust the device. If this does not happen, try disabling and enabling USB debugging and reconnecting.

It's a good idea to remove previous versions of your application before installing. 

Installing apk: `adb install path/to/app.apk`.

See [Run your app](https://developer.android.com/training/basics/firstapp/running-app#RealDevice) for more details.

#### adb notes

* `adb` seems to conflict with a similar Tizen utility (`sdb`). Very weird behavior can be observed if both are running at the same time. If you have problems with adb, try stopping `sdb` before using `adb` (`sdb kill-server`). Same goes the other way, stop `adb` before using `sdb` (`adb kill-server`). 

* If you have more than one device connected, use `-d` flag to identify which one you're working with.

* `adb disconnect` to disconnect a device.

* `adb logcat` - log output, see [documentation](https://developer.android.com/studio/command-line/logcat.html).

* Most weird and inconsistent problems are solvable by turning Developer Mode off and on.

See full `adb` guide at: [https://developer.android.com/studio/command-line/adb.html](https://developer.android.com/studio/command-line/adb.html).

## Application development

### Platform API 

Platform provides two objects in global context: `Device` and `Player`.

`Device` provides methods to work with platform, `Player` — video. The methods are covered in [externs](./externs).

Note that because Java unlike JavaScript is strictly typed all API parameters are strict as well. For example, calling `Player.setVolume('40')`instead of `Player.setVolume(40)` will throw an exception.

### Resources

`resPath` should follow Android [resources structure](https://developer.android.com/guide/topics/resources/providing-resources.html).

Missing resources will be replaced with default images (i.e. Interfaced logo instead of icons).

Most important resource for all applications are icons for various resolutions.

For Android TV you also need a banner image (`drawable/banner.png`), see [Provide a home screen banner](https://developer.android.com/training/tv/start/start.html#banner).

### Debugging

1. Build the app with `webViewDebug` `true`

1. Connect to device with `adb`

1. Open [chrome://inspect](chrome://inspect) in Chromium based browser and click Inspect on app page.

One convenient way to debug applications is to use ZombieBox development server (`npx zb run`) and use its address as `applicationURL`.

Additionally, `logcat` might help trace some logs and android Developer Menu has plethora of debug tools.
