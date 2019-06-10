/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */


/**
 */
class AndroidDeviceAPI {
	/**
	 * Hook to be declared
	 * @param {string} event
	 * @param {...?string} var_args
	 */
	onEvent(event, var_args) {}

	/**
	 * @return {string}
	 */
	getPlatformName() {}

	/**
	 * @return {string}
	 */
	getManufacturer() {}

	/**
	 * @return {string}
	 */
	getModel() {}

	/**
	 * @return {string}
	 */
	getSerialNumber() {}

	/**
	 * @return {string}
	 */
	getAndroidVersion() {}

	/**
	 * @return {string}
	 */
	getHardwareVersion() {}

	/**
	 * @return {string} - JSON
	 */
	getLaunchParams() {}

	/**
	 * @return {string}
	 */
	getMacAddress() {}

	/**
	 * @return {string}
	 */
	getIPAddress() {}

	/**
	 * Returns screen size available for application
	 * @return {number} - integer
	 */
	getScreenWidth() {}

	/**
	 * Returns screen size available for application
	 * @return {number} - integer
	 */
	getScreenHeight() {}

	/**
	 * Returns actual device screen size. This size may not be available for use by application
	 * @return {number} - integer
	 */
	getPhysicalScreenWidth() {}

	/**
	 * Returns actual device screen size. This size may not be available for use by application
	 * @return {number} - integer
	 */
	getPhysicalScreenHeight() {}

	/**
	 * Returns whether there's a USB or Bluetooth mouse device currently connected
	 * @return {boolean}
	 */
	isMouseConnected() {}

	/**
	 * Returns whether RED, GREEN, YELLOW and BLUE keys are present on current remote/keyboard setup
	 * @return {boolean}
	 */
	areColorKeysAvailable() {}

	/**
	 * BCP-47 valid language tag, see: https://developer.android.com/reference/java/util/Locale.html#toLanguageTag()
	 * Note that it returns locale that was set at the start of application and it may not be current system locale
	 * @return {string}
	 */
	getLocale() {}

	/**
	 */
	exit() {}
}


/**
 * @type {AndroidDeviceAPI}
 */
window.Device;
