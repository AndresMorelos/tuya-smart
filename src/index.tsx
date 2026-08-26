import { useEffect, useRef, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { getCategories } from "./utils/tuyaConnector";
import { loadDevicesWithFallback } from "./utils/deviceSource";
import { DeviceCategory, Device } from "./utils/interfaces";
import { DeviceList } from "./components/list";
import { getCategory, getDeviceFunctions, isPinned, ShowToastError } from "./utils/functions";
import { DeviceOnlineFilterDropdown, placeholder } from "./components/filter";
import { DeviceOnlineFilterType, filterDevices, switchKey } from "./utils/filters";

export default function Command() {
  const [filter, setFilter] = useState(DeviceOnlineFilterType.all);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useCachedState<Device[]>("devices", []);
  const [categories, setCategories] = useCachedState<DeviceCategory[]>("categories", []);
  const [pinnedSwitches, setPinnedSwitches] = useCachedState<string[]>("pinnedSwitches", []);

  // Keeps the effect below from reading a stale device list through its closure.
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  // Categories only translate a code into a display name, so a failure here must not
  // stop the device list from loading.
  useEffect(() => {
    getCategories()
      .then((result) => setCategories(result ?? []))
      .catch(() => setCategories((previous) => previous ?? []));
  }, []);

  useEffect(() => {
    const load = async () => {
      const { devices: fetched, source } = await loadDevicesWithFallback();
      const previousDevices = devicesRef.current ?? [];

      const populated = await Promise.all(
        fetched.map(async (device) => ({
          ...device,
          status: await getDeviceFunctions(
            device,
            previousDevices.find((deviceInfo) => deviceInfo.id === device.id),
          ),
        })),
      );

      setDevices((prev) => populated.map((device) => ({ ...device, pinned: isPinned(device, prev ?? []) })));
      setIsLoading(false);

      if (source === "cache") {
        showToast(
          Toast.Style.Failure,
          "Showing Cached Devices",
          "The Tuya cloud is unavailable, so commands will be sent over the local network where possible.",
        );
      }
    };

    load().catch((error) => {
      setIsLoading(false);
      ShowToastError(error);
    });
  }, []);

  const visible = filterDevices(devices ?? [], filter).map((device) => ({
    ...device,
    category: getCategory(categories ?? [], device.category),
  }));

  return (
    <DeviceList
      devices={visible}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<DeviceOnlineFilterDropdown onSelect={setFilter} />}
      isLoading={isLoading}
      filter={filter}
      pinnedSwitches={pinnedSwitches}
      onTogglePinSwitch={(deviceId, commandCode) => {
        const key = switchKey(deviceId, commandCode);
        setPinnedSwitches((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
      }}
      onAction={(device) => {
        setDevices((prev) => (prev ?? []).map((oldDevice) => (device.id === oldDevice.id ? device : { ...oldDevice })));
      }}
    />
  );
}
