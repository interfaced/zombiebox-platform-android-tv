/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import AbstractInfo from 'zb/device/abstract-info';
import {Resolution, findLargest} from 'zb/device/resolutions';
import Rect from 'zb/geometry/rect';


/**
 */
export default class Info extends AbstractInfo {
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
	getOSDResolution() {
		return findLargest(new Rect({
			x0: 0,
			y0: 0,
			x1: this._device.getScreenWidth(),
			y1: this._device.getScreenHeight()
		})) || Resolution.HD;
	}

	/**
	 * @override
	 */
	getPanelResolution() {
		return findLargest(new Rect({
			x0: 0,
			y0: 0,
			x1: this._device.getPhysicalScreenWidth(),
			y1: this._device.getPhysicalScreenHeight()
		})) || Resolution.HD;
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
}
