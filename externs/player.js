/*
 * This file is part of the ZombieBox package.
 *
 * Copyright (c) 2011-nowadays, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */


/**
 */
class AndroidPlayerAPI {
	/**
	 */
	create() {}

	/**
	 */
	start() {}

	/**
	 */
	pause() {}

	/**
	 */
	stop() {}

	/**
	 */
	restart() {}

	/**
	 */
	destroy() {}

	/**
	 * Content type to try ro render video as
	 * @param {string} type - if not set or set to 'auto', player will try to guess from url extension
	 */
	setMediaType(type) {}

	/**
	 * @param {string} uri
	 */
	setVideoURI(uri) {}

	/**
	 * @return {string}
	 */
	getVideoURI() {}

	/**
	 * Hook to be declared
	 * @param {string} event
	 * @param {...?string} var_args
	 */
	onEvent(event, var_args) {}

	/**
	 * @return {number} - integer
	 */
	getDuration() {}

	/**
	 * @return {boolean}
	 */
	isLiveStream() {}

	/**
	 * @return {number} - integer
	 */
	getCurrentPosition() {}

	/**
	 * @param {number} time - integer
	 */
	seekTo(time) {}

	/**
	 * @return {number} - integer from 0 to 100
	 */
	getVolume() {}

	/**
	 * @param {number} percent - integer from 0 to 100
	 */
	setVolume(percent) {}

	/**
	 * @return {boolean}
	 */
	getMuted() {}

	/**
	 * @param {boolean} mute
	 */
	setMuted(mute) {}

	/**
	 * @param {number} x - integer
	 * @param {number} y - integer
	 * @param {number} width - integer
	 * @param {number} height - integer
	 */
	setArea(x, y, width, height) {}

	/**
	 * @param {string} orientation - One of: LANDSCAPE|LANDSCAPE_INVERSE|PORTRAIT|PORTRAIT_INVERSE
	 */
	setOrientation(orientation) {}

	/**
	 * @deprecated - This method is expected to misbehave
	 * @param {string} type - One of: FIT|FILL|DEFAULT|FIXED_HEIGHT|FIXED_WIDTH|FIXED_MIN|FIXED_MAX
	 */
	setResizeMode(type) {}

	/**
	 * @deprecated - This method is expected to misbehave
	 * @param {number} ratio - float
	 */
	setAspectRatio(ratio) {}

	/**
	 * Sets video rendering engine type.
	 * Can only be used after video is created, but before playback is started.
	 * @param {string} type - One of: SURFACE_VIEW|TEXTURE_VIEW
	 */
	setVideoType(type) {}

	/**
	 * @return {string} See setVideoType
	 */
	getVideoType() {}
}


/**
 * @type {AndroidPlayerAPI}
 */
window.Player;
