/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import * as console from 'zb/console/console';
import AbstractViewPort from 'zb/device/abstract-view-port';
import {Transferring} from 'zb/device/aspect-ratio/aspect-ratio';
import {Common as ProportionCommon} from 'zb/device/aspect-ratio/proportion';
import Rect from 'zb/geometry/rect';


/**
 */
export default class Viewport extends AbstractViewPort {
	/**
	 * @param {Rect} rect
	 * @param {AndroidPlayerAPI} player
	 */
	constructor(rect, player) {
		super(rect);

		/**
		 * @type {AndroidPlayerAPI}
		 * @protected
		 */
		this._player = player;

		/**
		 * @type {Orientation}
		 * @protected
		 */
		this._orientation = Orientation.LANDSCAPE;
	}

	/**
	 * @override
	 */
	updateViewPort() {
		const areaRect = this.getCurrentArea();

		const topLeft = areaRect.getPointA();
		const size = areaRect.getSize();

		this._player.setArea(topLeft.x, topLeft.y, size.x, size.y);
		this._player.setOrientation(this._orientation);
	}

	/**
	 * @override
	 */
	hasAspectRatioFeature() {
		return true;
	}

	/**
	 * @override
	 */
	hasAreaChangeFeature() {
		return true;
	}

	/**
	 * @override
	 */
	isAspectRatioSupported(ratio) {
		const proportion = ratio.getProportion();
		const transferring = ratio.getTransferring();

		const isProportionSupported = proportion === ProportionCommon.AUTO || ProportionCommon.KEEP;
		const isTransferringSupported = transferring === Transferring.AUTO || transferring === Transferring.KEEP;

		return isProportionSupported && isTransferringSupported;
	}

	/**
	 * Sets video orientation within viewport
	 * @param {Orientation} orientation
	 */
	setVideoOrientation(orientation) {
		if (
			orientation !== Orientation.LANDSCAPE &&
			this._player.getVideoType() === 'SURFACE_VIEW'
		) {
			console.warn('SurfaceView does not support rotation');
		}

		this._orientation = orientation;
		this.updateViewPort();
	}
}


/**
 * @enum {string}
 */
const NativeScaleType = { // eslint-disable-line no-unused-vars
	CENTER: 'CENTER',
	CENTER_CROP: 'CENTER_CROP',
	CENTER_INSIDE: 'CENTER_INSIDE',
	FIT_CENTER: 'FIT_CENTER',
	NONE: 'NONE'
};


/**
 * @enum {string}
 */
export const Orientation = {
	LANDSCAPE: 'LANDSCAPE',
	LANDSCAPE_INVERSE: 'LANDSCAPE_INVERSE',
	PORTRAIT: 'PORTRAIT',
	PORTRAIT_INVERSE: 'PORTRAIT_INVERSE'
};


/**
 * @enum {string}
 */
export const ResizeMode = {
	FIT: 'FIT',
	FILL: 'FILL',
	DEFAULT: 'DEFAULT',
	FIXED_HEIGHT: 'FIXED_HEIGHT',
	FIXED_WIDTH: 'FIXED_WIDTH',
	FIXED_MIN: 'FIXED_MIN',
	FIXED_MAX: 'FIXED_MAX'
};
