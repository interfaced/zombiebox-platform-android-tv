/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2019, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import app from 'generated/app';
import Device from './device';


/**
 * @return {?Device}
 */
const createDevice = () => {
	const isAndroidTVPlatform = Device.detect();

	if (isAndroidTVPlatform) {
		const videoContainer = app.getVideoContainer();
		return new Device(videoContainer);
	}

	return null;
};

export default createDevice;
