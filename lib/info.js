/*
 * This file is part of the ZombieBox package.
 *
 * Copyright (c) 2011-nowadays, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
goog.provide('zb.device.platforms.android.Info');
goog.require('zb.device.AbstractInfo');
goog.require('zb.device.Resolution');


/**
 */
zb.device.platforms.android.Info = class extends zb.device.AbstractInfo {
	/**
	 */
	constructor() {
		super();

		/**
		 * @type {AndroidDeviceAPI}
		 * @protected
		 */
		this._device = window['Device'];
	}

	/**
	 * @override
	 */
	type() {
		return 'android';
	}

	/**
	 * @override
	 */
	manufacturer() {
		return this._device.getManufacturer();
	}

	/**
	 * @override
	 */
	model() {
		return this._device.getModel();
	}

	/**
	 * @override
	 */
	serialNumber() {
		return this._device.getSerialNumber();
	}

	/**
	 * @override
	 */
	version() {
		return this._device.getAndroidVersion();
	}

	/**
	 * @override
	 */
	softwareVersion() {
		return this._device.getAndroidVersion();
	}

	/**
	 * @override
	 */
	hardwareVersion() {
		return this._device.getHardwareVersion();
	}

	/**
	 * @override
	 */
	osdResolutionType() {
		const width = this.getScreenWidth();
		const height = this.getScreenHeight();

		const resolutions = this._getResolutionsByScreenSize(width, height);

		return resolutions[0] || zb.device.Resolution.HD;
	}

	/**
	 * @return {string}
	 */
	getMAC() {
		return this._device.getMacAddress();
	}

	/**
	 * @return {string}
	 */
	getIP() {
		return this._device.getIPAddress();
	}

	/**
	 * @return {number}
	 */
	getScreenWidth() {
		return this._device.getScreenWidth();
	}

	/**
	 * @return {number}
	 */
	getScreenHeight() {
		return this._device.getScreenHeight();
	}

	/**
	 * @return {boolean}
	 */
	isSonyBravia() {
		return /sony/i.test(this.manufacturer()) && /bravia/i.test(this.model());
	}

	/**
	 * @return {boolean}
	 */
	isNexusPlayer() {
		return /asus/i.test(this.manufacturer()) && /nexus player/i.test(this.model());
	}

	/**
	 * @override
	 */
	_getLocale() {
		return this._device.getLocale();
	}
};