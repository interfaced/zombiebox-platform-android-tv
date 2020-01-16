/*
 * This file is part of the ZombieBox package.
 *
 * Copyright © 2015-2020, Interfaced
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import Device from './device';


/**
 * @return {?Device}
 */
const createDevice = () => {
	const isAndroidTVPlatform = Device.detect();

	if (isAndroidTVPlatform) {
		return new Device();
	}

	return null;
};

export default createDevice;
