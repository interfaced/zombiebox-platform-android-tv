/*
 * This file is part of the ZombieBox package.
 *
 * Copyright (c) 2011-nowadays, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
goog.provide('zb.device.platforms.android.Viewport');
goog.require('zb.console');
goog.require('zb.device.AbstractViewPort');
goog.require('zb.device.aspectRatio.Proportion');
goog.require('zb.device.aspectRatio.Transferring');


/**
 */
zb.device.platforms.android.Viewport = class extends zb.device.AbstractViewPort {
	/**
	 * @param {zb.std.plain.Rect} rect
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
		 * @type {zb.device.platforms.android.Viewport.Orientation}
		 * @protected
		 */
		this._orientation = zb.device.platforms.android.Viewport.Orientation.LANDSCAPE;
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
		const Proportion = zb.device.aspectRatio.Proportion;
		const Transferring = zb.device.aspectRatio.Transferring;

		const proportion = ratio.getProportion();
		const transferring = ratio.getTransferring();

		const isProportionSupported = proportion === Proportion.Common.AUTO || Proportion.Common.KEEP;
		const isTransferringSupported = transferring === Transferring.AUTO || transferring === Transferring.KEEP;

		return isProportionSupported && isTransferringSupported;
	}

	/**
	 * Sets video orientation within viewport
	 * @param {zb.device.platforms.android.Viewport.Orientation} orientation
	 */
	setVideoOrientation(orientation) {
		if (
			orientation !== zb.device.platforms.android.Viewport.Orientation.LANDSCAPE &&
			this._player.getVideoType() === 'SURFACE_VIEW'
		) {
			zb.console.warn('SurfaceView does not support rotation');
		}

		this._orientation = orientation;
		this.updateViewPort();
	}
};


/**
 * @enum {string}
 */
zb.device.platforms.android.Viewport.NativeScaleType = {
	CENTER: 'CENTER',
	CENTER_CROP: 'CENTER_CROP',
	CENTER_INSIDE: 'CENTER_INSIDE',
	FIT_CENTER: 'FIT_CENTER',
	NONE: 'NONE'
};


/**
 * @enum {string}
 */
zb.device.platforms.android.Viewport.Orientation = {
	LANDSCAPE: 'LANDSCAPE',
	LANDSCAPE_INVERSE: 'LANDSCAPE_INVERSE',
	PORTRAIT: 'PORTRAIT',
	PORTRAIT_INVERSE: 'PORTRAIT_INVERSE'
};


/**
 * @enum {string}
 */
zb.device.platforms.android.Viewport.ResizeMode = {
	FIT: 'FIT',
	FILL: 'FILL',
	DEFAULT: 'DEFAULT',
	FIXED_HEIGHT: 'FIXED_HEIGHT',
	FIXED_WIDTH: 'FIXED_WIDTH',
	FIXED_MIN: 'FIXED_MIN',
	FIXED_MAX: 'FIXED_MAX'
};
