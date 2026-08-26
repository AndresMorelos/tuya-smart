import { useEffect, useRef, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { getDevices, getCategories } from "./utils/tuyaConnector";
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

  useEffect(() => {
    getCategories()
      .then((result) => setCategories(result ?? []))
      .catch((error) => {
        setIsLoading(false);
        ShowToastError(error);
      });
  }, []);

  useEffect(() => {
    if (!categories || categories.length === 0) {
      return;
    }

    const getAllDevices = async () => {
      const newDevicesInfo = await getDevices();
      const previousDevices = devicesRef.current ?? [];

      const devicesPopulated = await Promise.all(
        newDevicesInfo.map(async (device) => ({
          ...device,
          status: await getDeviceFunctions(
            device,
            previousDevices.find((deviceInfo) => deviceInfo.id === device.id),
          ),
        })),
      );

      setDevices((prev) =>
        devicesPopulated.map((device) => ({
          ...device,
          pinned: isPinned(device, prev ?? []),
          category: getCategory(categories, device.category),
        })),
      );
      setIsLoading(false);
    };

    getAllDevices().catch((error) => {
      setIsLoading(false);
      ShowToastError(error);
    });
  }, [categories]);

  return (
    <DeviceList
      devices={filterDevices(devices ?? [], filter)}
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
