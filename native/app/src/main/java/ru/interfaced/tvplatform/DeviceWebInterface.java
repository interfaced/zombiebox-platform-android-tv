package ru.interfaced.tvplatform;

import android.app.Activity;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Point;
import android.hardware.usb.UsbConfiguration;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import androidx.annotation.Nullable;
import android.text.format.Formatter;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;

import com.google.android.exoplayer2.util.Util;

import org.json.JSONArray;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.Locale;

class DeviceWebInterface {
    private static final String TAG = "DeviceInterface";

    private Context context;

    private int connectedBluetoothMiceCount;
    private Boolean cumulativeMouseActivationState;

    private final Point physicalDisplaySize;

    DeviceWebInterface(Context aContext) {
        context = aContext;

        connectedBluetoothMiceCount = 0;    // We can't detect if any mices are connected from the start without initiating a scan
        registerMouseConnectionListener();

        physicalDisplaySize = Util.getPhysicalDisplaySize(context);
    }

    void suspend() {
        dispatchEvent("suspend");
    }

    void resume() {
        dispatchEvent("resume");
    }

    private void dispatchEvent(String event, @Nullable JSONArray params, @Nullable ValueCallback<String> callback) {
        ((MainActivity)context).notifyWebView(context.getString(R.string.device_interface), event, params, callback);
    }

    private void dispatchEvent(String event, @Nullable JSONArray params) {
        dispatchEvent(event, params, null);
    }

    private void dispatchEvent(String event) {
        dispatchEvent(event, null, null);
    }

    private void registerMouseConnectionListener() {
        BroadcastReceiver mouseReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();

                boolean isConnected = action.equals(UsbManager.ACTION_USB_DEVICE_ATTACHED) || action.equals(BluetoothDevice.ACTION_ACL_CONNECTED);
                boolean isBluetooth = action.equals(BluetoothDevice.ACTION_ACL_CONNECTED) || action.equals(BluetoothDevice.ACTION_ACL_DISCONNECTED);
                boolean isUsb = action.equals(UsbManager.ACTION_USB_DEVICE_ATTACHED) || action.equals(UsbManager.ACTION_USB_DEVICE_DETACHED);

                if (isBluetooth) {
                    BluetoothDevice btDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (isDeviceMouse(btDevice)) {
                        connectedBluetoothMiceCount += isConnected ? +1 : -1;
                        connectedBluetoothMiceCount = Math.max(connectedBluetoothMiceCount, 0);
                        onMouseConnectionChanged();
                    }
                } else if (isUsb) {
                    UsbDevice usbDevice = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (isDeviceMouse(usbDevice)) {
                        onMouseConnectionChanged();
                    }
                }

            }
        };

        IntentFilter filter = new IntentFilter();

        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);

        filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
        filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);

        context.registerReceiver(mouseReceiver, filter);
    }

    private boolean isDeviceMouse(UsbDevice device) {
        // See http://www.usb.org/developers/hidpage/HID1_11.pdf Appendix B.1
        int PROTOCOL_MOUSE = 2;

        if (device.getDeviceClass() != UsbConstants.USB_CLASS_PER_INTERFACE) {
            return device.getDeviceClass() == UsbConstants.USB_CLASS_HID &&
                   device.getDeviceSubclass() == UsbConstants.USB_INTERFACE_SUBCLASS_BOOT &&
                   device.getDeviceProtocol() == PROTOCOL_MOUSE;
        }

        for (int i = 0; i < device.getConfigurationCount(); i++) {
            UsbConfiguration configuration = device.getConfiguration(i);

            for (int j = 0; j < configuration.getInterfaceCount(); j++) {
                UsbInterface iface = configuration.getInterface(j);

                if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_HID &&
                    iface.getInterfaceSubclass() == UsbConstants.USB_INTERFACE_SUBCLASS_BOOT &&
                    iface.getInterfaceProtocol() == PROTOCOL_MOUSE) {
                    return true;
                }
            }
        }

        return false;
    }

    private boolean isDeviceMouse(BluetoothDevice device) {
        // These are defined in BluetoothDevice.Device but hidden
        int PERIPHERAL_NON_KEYBOARD_NON_POINTING = 0x0500;
        int PERIPHERAL_KEYBOARD                  = 0x0540;
        int PERIPHERAL_POINTING                  = 0x0580;
        int PERIPHERAL_KEYBOARD_POINTING         = 0x05C0;

        BluetoothClass btClass = device.getBluetoothClass();
        return (btClass.getMajorDeviceClass() == BluetoothClass.Device.Major.PERIPHERAL) &&
               (btClass.getDeviceClass() & PERIPHERAL_KEYBOARD_POINTING) == PERIPHERAL_POINTING;
    }

    private void onMouseConnectionChanged() {
        boolean connected = isMouseConnected();

        if (cumulativeMouseActivationState != null && cumulativeMouseActivationState == connected) {
            return;
        }

        cumulativeMouseActivationState = connected;

        if (connected) {
            dispatchEvent("mouseConnected");
        } else {
            dispatchEvent("mouseDisconnected");
        }
    }

    void onMouseSuspicion() {
        if (cumulativeMouseActivationState == null || !cumulativeMouseActivationState) {
            // Mouse slipped pas USB and Bluetooth checks somehow and we started getting mouse events.
            // Trigger mouseConnected and move on
            cumulativeMouseActivationState = true;
            onMouseConnectionChanged();
        }
    }

    @JavascriptInterface
    public String getPlatformName() {
        return "Android";
    }

    @JavascriptInterface
    public String getManufacturer() {
        return Build.MANUFACTURER;
    }

    @JavascriptInterface
    public String getModel() {
        return Build.MODEL;
    }

    @JavascriptInterface
    public String getSerialNumber() {
        return Build.SERIAL;
    }

    @JavascriptInterface
    public String getHardwareVersion() {
        return Build.BOARD;
    }

    @JavascriptInterface
    public String getAndroidVersion() {
        return Build.VERSION.RELEASE;
    }

    // TODO: bulletproof implementation: http://stackoverflow.com/questions/6064510/how-to-get-ip-address-of-the-device/13007325#13007325
    @JavascriptInterface
    public String getMacAddress() {
        WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        WifiInfo wInfo = wifiManager.getConnectionInfo();
        return wInfo.getMacAddress();
    }

//    copy-pasted from http://stackoverflow.com/questions/6064510/how-to-get-ip-address-of-the-device
    @JavascriptInterface
    public String getIPAddress() {
        try {
            for (Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces(); en.hasMoreElements();) {
                NetworkInterface intf = en.nextElement();
                for (Enumeration<InetAddress> enumIpAddr = intf.getInetAddresses(); enumIpAddr.hasMoreElements();) {
                    InetAddress inetAddress = enumIpAddr.nextElement();
                    if (!inetAddress.isLoopbackAddress()) {
                        return Formatter.formatIpAddress(inetAddress.hashCode());
                    }
                }
            }
        } catch (SocketException ex) {
            Log.e("IP", ex.toString());
        }
        return Build.UNKNOWN;
    }

    @JavascriptInterface
    public int getScreenWidth() {
        DisplayMetrics display = context.getResources().getDisplayMetrics();
        return display.widthPixels;
    }

    @JavascriptInterface
    public int getScreenHeight() {
        DisplayMetrics display = context.getResources().getDisplayMetrics();

        return display.heightPixels;
    }

    @JavascriptInterface
    public int getPhysicalScreenWidth() {
        return physicalDisplaySize.x;
    }

    @JavascriptInterface
    public int getPhysicalScreenHeight() {
        return physicalDisplaySize.y;
    }

    @JavascriptInterface
    public boolean isMouseConnected() {
        if (connectedBluetoothMiceCount > 0) {
            return true;
        }

        UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        for (UsbDevice device: usbManager.getDeviceList().values()) {
            if (isDeviceMouse(device)) {
                return true;
            }
        }

        return false;
    }

    // TODO: for bulletproof implementation we should notify on keyboard change
    @JavascriptInterface
    public boolean areColorKeysAvailable() {
        int[] colorKeys = {
            KeyEvent.KEYCODE_PROG_RED,
            KeyEvent.KEYCODE_PROG_GREEN,
            KeyEvent.KEYCODE_PROG_YELLOW,
            KeyEvent.KEYCODE_PROG_BLUE,
        };
        boolean[] availability = KeyCharacterMap.deviceHasKeys(colorKeys);

        for (boolean flag: availability) {
            if (!flag) {
                return false;
            }
        }

        return true;
    }

    @JavascriptInterface
    public String getLocale() {
        return Locale.getDefault().toLanguageTag();
    }

    @JavascriptInterface
    public String getLaunchParams() {
        // This was found experimentally and there's no known documentation on how to get DIAL params

        Intent intent = ((Activity) context).getIntent();
        Bundle bundle = intent.getExtras();

        if (bundle != null) {
            byte[] params = bundle.getByteArray("PostBody");

            if (params != null) {
                return new String(params, StandardCharsets.UTF_8);
            }
        }

        return "{}";
    }

    @JavascriptInterface
    public void exit() {
        android.os.Process.killProcess(android.os.Process.myPid());
        System.exit(0);
    }
}
