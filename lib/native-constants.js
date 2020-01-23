/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * @enum {string}
 */
export const Event = {
	READY: 'ready', // Fired with {boolean} - whether playback will start or not
	TIMELINE_CHANGED: 'timeline_changed',
	TRACKS_CHANGED: 'tracks_changed',
	ENDED: 'ended',
	DESTROYED: 'destroyed',
	STALLED: 'stalled',
	FIRST_FRAME: 'first_frame',
	IDLE: 'idle',
	POSITION_DISCONTINUITY: 'position_discontinuity',
	SEEK: 'seek',
	SEEK_PROCESSED: 'seek_processed',
	VOLUME_CHANGED: 'volume_changed',
	PLAYBACK_RATE_CHANGED: 'playback_rate_changed',
	ERROR: 'error' // Fired with {number} error code and {?string} error description
};


/**
 * @enum {number}
 */
export const Error = {
	UNINITIALIZED: 3,
	MEDIA_ERROR: 5,
	UNKNOWN: 100
};


/**
 * @enum {string}
 */
export const VideoType = {
	SURFACE_VIEW: 'SURFACE_VIEW',
	TEXTURE_VIEW: 'TEXTURE_VIEW'
};


/**
 * @enum {string}
 */
export const MediaType = {
	AUTO: 'auto',
	DASH: 'dash',
	HLS: 'hls',
	SS: 'ss',
	RTMP: 'rtmp'
};


export const DRMType = {
	PLAYREADY: 'playready',
	NONE: 'none'
};


/**
 * Android platforms has two options for video rendering engine,
 * unfortunately, one does not support rotations, while the other has poor performance.
 * It's up to application to choose which one to use.
 * Changing is only possible before play() is called.
 * @enum {symbol}
 */
export const VideoOptimisation = {
	ROTATION_SUPPORT: Symbol('Optimised for rotation support'),
	SMOOTH_PLAYBACK: Symbol('Optimised for smooth playback')
};
