/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import AbstractInput from 'zb/device/abstract-input';
import UnsupportedFeature from 'zb/device/errors/unsupported-feature';
import Key from 'zb/device/input/key';
import Info from './info';


/**
 */
export default class Input extends AbstractInput {
	/**
	 * @param {Info} info
	 */
	constructor(info) {
		super();

		/**
		 * @type {Info}
		 * @protected
		 */
		this._info = info;

		/**
		 * @type {AndroidDeviceAPI}
		 * @protected
		 */
		this._device = window['Device'];

		if (this._info.isNexusPlayer()) {
			this._createKeysMapForNexus();
		}

		if (this._info.isSonyBravia()) {
			this._createKeysMapForSonyBravia();
		}

		if (this.isPointingDeviceActive()) {
			this.attachMouse();
		}
	}

	/**
	 * @override
	 */
	isPointingDeviceSupported() {
		// TODO: stub until pointer is fully supported (#6324)
		// return true;
		return false;
	}

	/**
	 * @override
	 */
	isPointingDeviceActive() {
		// TODO: stub until pointer is fully supported (#6324)
		// return this._device.isMouseConnected();
		return false;
	}

	/**
	 * @override
	 */
	enablePointingDevice() {
		throw new UnsupportedFeature('Pointing device enabling');
	}

	/**
	 * @override
	 */
	disablePointingDevice() {
		throw new UnsupportedFeature('Pointing device disabling');
	}

	/**
	 * @return {boolean}
	 */
	hasFeatureColorKeys() {
		return this._device.areColorKeysAvailable();
	}

	/**
	 */
	attachMouse() {
		// TODO: do nothing until pointer is fully supported (#6324)
		// this._fireEvent(this.EVENT_POINTING_DEVICE_ACTIVATED);
	}

	/**
	 */
	detachMouse() {
		// TODO: do nothing until pointer is fully supported (#6324)
		// this._fireEvent(this.EVENT_POINTING_DEVICE_DEACTIVATED);
	}

	/**
	 * @override
	 */
	_createKeysMap() {
		const map = {};

		map[37] = Key.LEFT;
		map[38] = Key.UP;
		map[39] = Key.RIGHT;
		map[40] = Key.DOWN;

		map[13] = Key.ENTER;

		return map;
	}

	/**
	 * @override
	 */
	_keyboardEventToKeyCode(event) {
		if (this._info.isSonyBravia()) {
			switch (event.key) {
				case 'ColorF0Red':
					return Key.RED;
				case 'ColorF1Green':
					return Key.GREEN;
				case 'ColorF2Yellow':
					return Key.YELLOW;
				case 'ColorF3Blue':
					return Key.BLUE;

				case 'Info':
					return Key.INFO;
				case 'MediaPlay':
					return Key.PLAY;
				case 'MediaPlayPause':
					return Key.PAUSE;
			}
		}

		return super._keyboardEventToKeyCode(event);
	}

	/**
	 * @private
	 */
	_createKeysMapForSonyBravia() {
		const zero = 48;

		this._map[zero + 0] = Key.DIGIT_0;
		this._map[zero + 1] = Key.DIGIT_1;
		this._map[zero + 2] = Key.DIGIT_2;
		this._map[zero + 3] = Key.DIGIT_3;
		this._map[zero + 4] = Key.DIGIT_4;
		this._map[zero + 5] = Key.DIGIT_5;
		this._map[zero + 6] = Key.DIGIT_6;
		this._map[zero + 7] = Key.DIGIT_7;
		this._map[zero + 8] = Key.DIGIT_8;
		this._map[zero + 9] = Key.DIGIT_9;

		this._map[33] = Key.PAGE_UP;
		this._map[34] = Key.PAGE_DOWN;

		// Bravia 2015 has separate Play and Pause keys, but they have the same keycode.
		// They can be identified by key property in _keyboardEventToKeyCode
		this._map[179] = Key.PLAY_PAUSE;

		this._map[178] = Key.STOP;
		this._map[227] = Key.REW;
		this._map[228] = Key.FWD;
		this._map[176] = Key.NEXT_CHAPTER;
		this._map[177] = Key.PREV_CHAPTER;

		this._map[27] = Key.EXIT;
	}

	/**
	 * @private
	 */
	_createKeysMapForNexus() {
		this._map[179] = Key.PLAY_PAUSE;
	}
}
