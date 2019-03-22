/* eslint-disable no-console */

require('colors');

const childProcess = require('child_process');
const fsp = require('fs-extra-promise');
const path = require('path');
const sharp = require('sharp');


/**
 * @implements {ZBPlatform}
 */
class PlatformAndroid {
	/**
	 */
	constructor() {
		/**
		 * @const {string}
		 * @protected
		 */
		this.CONFIG_REPLACE_PATTERN = '//[FLAVOR_INSERTION_POINT]//';
	}

	/**
	 * @override
	 */
	getName() {
		return 'android';
	}

	/**
	 * @override
	 */
	getPublicDir() {
		return path.join(__dirname, 'lib');
	}

	/**
	 * @override
	 */
	getConfig() {
		return {
			'compilation': {
				'externs': [
					path.join(__dirname, 'externs', 'player.js'),
					path.join(__dirname, 'externs', 'device.js')
				]
			},
			'android': {
				'appId': undefined,
				'versionCode': undefined,
				'versionName': undefined,
				'namespace': undefined,
				'name': 'ZombieBox',
				'launcherColor': undefined,
				'useBundledHTML': true,
				'applicationURL': undefined,
				'webViewDebug': false,
				'storeRelease': false,
				'resPath': undefined
			}
		};
	}

	/**
	 * @override
	 */
	buildApp(zbApp, distDir) {
		/**
		 * @param {number} len
		 * @return {string}
		 */
		const createRandomString = (len = 7) => Array
			.from(Array(len - 1))
			.map(() => String.fromCharCode(Math.random() * 26 + 97))
			.join('');

		const buildConfig = zbApp.getAllConfigs().build;
		const config = buildConfig.getCustomValue('android');

		const buildDir = path.join(distDir, 'src');

		if (config.storeRelease) {
			console.warn('Building unsigned release apk. It will not install unless signed.'.yellow);

			if (config.webViewDebug) {
				console.warn('Building release with debug enabled'.red);
			}
		}

		if (!config.namespace) {
			config.namespace = buildConfig.appNamespace;
			console.warn(`Namespace not set, using "${config.namespace}"`.yellow);
		}

		if (config.namespace.startsWith('test')) {
			config.namespace = createRandomString();
			console.warn(`Namespace could not start with "test", using ${config.namespace}`.yellow);
		}

		if (!config.versionName) {
			config.versionName = zbApp.getAppVersion();
			console.warn(`Version name not set, using "${config.versionName}"`.yellow);
		}

		if (!config.versionCode && config.storeRelease) {
			console.error('Version code is not set'.red);
			return Promise.reject('No versionCode');
		}

		if (!config.appId) {
			if (config.storeRelease) {
				console.error(`Application id not set`.red);
				return Promise.reject();
			}

			config.appId = `com.zombiebox.${config.namespace}.${createRandomString()}`;
			console.warn(`Application id not set, using "${config.appId}"`.yellow);
		}

		let zbBuildWarnings = '';

		return fsp.emptyDirAsync(buildDir)
			.then(() => this._cloneSources(buildDir))
			.then(() => this._applyBuildConfig(config, buildDir))
			.then(() => this._copyResources(zbApp, config, buildDir))
			.then(() => this._markDebugBuild(config, buildDir))
			.then(() => this._compileZbApplication(zbApp, distDir, config, buildDir))
			.then((warnings) => {
				zbBuildWarnings = warnings;
			})
			.then(() => this._compileApk(config, buildDir, config.namespace))
			.then(() => this._copyApk(config, buildDir, distDir))
			.then(() => zbBuildWarnings);
	}

	/**
	 * Copy apk sources
	 * @param {string} targetPath
	 * @return {IThenable}
	 * @protected
	 */
	_cloneSources(targetPath) {
		return fsp.copyAsync(path.join(__dirname, 'native'), targetPath);
	}

	/**
	 * @param {Object} config
	 * @return {IThenable<string>}
	 * @protected
	 */
	_generateBuildFlavor(config) {
		const propertyValues = {
			'appId': `applicationId "${config.appId}"`,
			'name': `resValue "string", "app_name", "${config.name}"`,
			'launcherColor': `resValue "color", "tvLauncherColor", "${config.launcherColor}"`,
			'versionCode': `versionCode ${config.versionCode}`,
			'versionName': `versionName "${config.versionName}"`,
			'useBundledHTML': `buildConfigField 'Boolean', 'USE_BUNDLED_HTML', '${config.useBundledHTML}'`,
			'applicationURL': `buildConfigField 'String', 'APPLICATION_URL', '"${config.applicationURL}"'`,
			'webViewDebug': `buildConfigField 'Boolean', 'WEBVIEW_DEBUG', '${config.webViewDebug}'`
		};

		const properties = [
			`dimension "zb-project"`,
		];
		Object.keys(config).forEach((property) => {
			const value = config[property];

			if (propertyValues.hasOwnProperty(property) && value !== undefined) {
				properties.push(propertyValues[property]);
			}
		});

		return `${config.namespace} {\n\t${properties.join('\n\t')}\n}`;
	}

	/**
	 * Writes flavor config to sources
	 * @param {Object} config
	 * @param {string} buildDir
	 * @return {IThenable}
	 * @protected
	 */
	_applyBuildConfig(config, buildDir) {
		const flavor = this._generateBuildFlavor(config);
		const gradleConfig = path.join(buildDir, 'app', 'build.gradle');

		return fsp.readFileAsync(
			gradleConfig,
			{
				encoding: 'utf8'
			}
		).then((data) => fsp.writeFileAsync(
			gradleConfig,
			data.replace(this.CONFIG_REPLACE_PATTERN, flavor))
		);
	}

	/**
	 * Copy icons from config paths
	 * @param {ZBApplication} zbApp
	 * @param {Object} config
	 * @param {string} buildDir
	 * @return {IThenable}
	 * @protected
	 */
	_copyResources(zbApp, config, buildDir) {
		if (!config.resPath) {
			console.warn('No resources set, will use default zb resources'.yellow);
			return Promise.resolve();
		}

		const configRoot = zbApp.getPathInfo().getRootDir();
		const resPath = path.resolve(configRoot, config.resPath);
		const targetResPath = path.join(buildDir, 'app', 'src', config.namespace, 'res');

		let promise = fsp.copyAsync(resPath, targetResPath);

		const bannerPath = path.join(resPath, 'drawable', 'banner.png');
		if (!fsp.existsSync(bannerPath)) {
			console.warn('Banner image is not set. Will fall back to zb image'.yellow);
			const fallbackBanner = path.join(buildDir, 'app', 'src', 'main', 'res', 'drawable', 'banner.png');
			const targetBannerPath = path.join(targetResPath, 'drawable', 'banner.png');
			promise = promise.then(() => fsp.copyAsync(fallbackBanner, targetBannerPath));
		}

		return promise;
	}

	/**
	 * @param {ZBApplication} zbApp
	 * @param {string} distDir
	 * @param {Object} config
	 * @param {string} buildDir
	 * @return {IThenable}
	 * @protected
	 */
	_compileZbApplication(zbApp, distDir, config, buildDir) {
		let zbAppPath;
		if (config.useBundledHTML) {
			zbAppPath = path.join(buildDir, 'app', 'src', config.namespace, 'assets', 'html', 'index.html');
		} else {
			zbAppPath = path.join(buildDir, 'index.html');
		}

		const buildHelper = zbApp.getBuildHelper();
		let warnings = '';

		return fsp.ensureDirAsync(path.dirname(zbAppPath))
			.then(() => buildHelper.writeIndexHTML(zbAppPath))
			.then((res) => {
				warnings = res;
			})
			.then(() => buildHelper.copyCustomWebFiles(distDir))
			.then(() => warnings);
	}

	/**
	 * Apply distinctly noticeable overlay to app banner when building in debug configuration
	 * @param {Object} config
	 * @param {string} buildDir
	 * @return {IThenable}
	 * @protected
	 */
	_markDebugBuild(config, buildDir) {
		if (config.storeRelease || config.resPath === undefined) {
			return Promise.resolve();
		}

		const overlay = path.join(buildDir, 'app', 'src', 'main', 'res', 'drawable', 'debug.png');
		const baseResourcesPath = path.join(buildDir, 'app', 'src', config.namespace, 'res');

		return fsp.readdirAsync(baseResourcesPath)
			.then((fileNames) =>
				fileNames.filter((name) => name.startsWith('drawable'))
			)
			.then((fileNames) =>
				fileNames.filter((name) => fsp.statSync(path.join(baseResourcesPath, name)).isDirectory())
			)
			.then((drawableDirNames) => {
				const promises = [];

				drawableDirNames.forEach((dir) => {
					const bannerPath = path.join(baseResourcesPath, dir, 'banner.png');
					if (fsp.existsSync(bannerPath)) {
						promises.push(sharp(bannerPath)
							.overlayWith(overlay)
							.toFile(bannerPath + '~')
							.then(() => fsp.renameAsync(bannerPath + '~', bannerPath))
						);
					}
				});

				return Promise.all(promises);
			});
	}

	/**
	 * @param {Object} config
	 * @param {string} root
	 * @param {string} flavor
	 * @return {IThenable}
	 * @protected
	 */
	_compileApk(config, root, flavor) {
		const gradlePath = path.join(root, 'gradlew');

		const buildType = config.storeRelease ? 'Release' : 'Debug';

		console.log(`Compiling ${flavor} ${buildType} apk`.green);

		const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

		const runGradle = (args) => {
			console.log('Running', `gradle ${args[0]}`.yellow);

			return new Promise((resolve, reject) => {
				const gradleProcess = childProcess.execFile(
					gradlePath,
					args,
					{
						cwd: root
					},
					(error) => error ? reject(error) : resolve()
				);

				gradleProcess.stdout.pipe(process.stdout);
				gradleProcess.stderr.pipe(process.stderr);
			});
		};

		return runGradle(['clean']).then(
			() => runGradle(['assemble' + capitalize(flavor) + buildType])
		);
	}

	/**
	 * @param {Object} config
	 * @param {string} buildDir
	 * @param {string} distDir
	 * @return {IThenable}
	 * @protected
	 */
	_copyApk(config, buildDir, distDir) {
		const debugBuild = path.join(
			buildDir, 'app', 'build', 'outputs', 'apk', config.namespace, 'debug',
			`app-${config.namespace}-debug.apk`
		);

		const releaseBuild = path.join(
			buildDir, 'app', 'build', 'outputs', 'apk', config.namespace, 'release',
			`app-${config.namespace}-release-unsigned.apk`
		);

		let filename = `${config.namespace}-${config.versionName}`;
		if (config.storeRelease) {
			filename += `-v${config.versionCode}`;
		}

		const debugTarget = path.join(distDir, filename + '-debug.apk');
		const releaseTarget = path.join(distDir, filename + '-release-unsigned.apk');

		const promises = [];

		if (config.storeRelease && fsp.existsSync(releaseBuild)) {
			promises.push(fsp.copyAsync(releaseBuild, releaseTarget));
		} else if (fsp.existsSync(debugBuild)) {
			promises.push(fsp.copyAsync(debugBuild, debugTarget));
		}

		return Promise.all(promises);
	}
}


module.exports = PlatformAndroid;
