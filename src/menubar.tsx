import { Color, Icon, MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { controlDevice, loadDevicesWithFallback } from "./utils/deviceSource";
import { ShowToastError } from "./utils/functions";
import { Device } from "./utils/interfaces";
import { extractSwitches, switchKey } from "./utils/filters";
import { cleanName } from "./utils/deviceSemantics";

export default function MenuBarCommand() {
  const [cachedDevices] = useCachedState<Device[]>("devices", []);

  // Shows whatever the main command last cached, then revalidates in the background.
  const { data, isLoading, revalidate } = useCachedPromise(loadDevicesWithFallback, [], {
    initialData: { devices: cachedDevices ?? [], source: "cache" as const },
    keepPreviousData: true,
    onError: ShowToastError,
  });

  const devices = data?.devices ?? cachedDevices ?? [];
  const cachedNameFor = (deviceId: string, code: string) =>
    (cachedDevices ?? []).find((device) => device.id === deviceId)?.status?.find((status) => status.code === code)
      ?.name;

  // Pinning is per device; the menu bar exposes the switches those devices carry.
  const pinnedIds = new Set((cachedDevices ?? []).filter((device) => device.pinned).map((device) => device.id));
  const pinned = extractSwitches(devices).filter(({ device }) => pinnedIds.has(device.id));

  const onCount = pinned.filter(({ status }) => status.value === true).length;

  return (
    <MenuBarExtra
      icon={{ source: Icon.LightBulb, tintColor: onCount > 0 ? Color.Yellow : Color.SecondaryText }}
      isLoading={isLoading}
      tooltip="Tuya Smart"
      title={pinned.length > 0 ? `${onCount}/${pinned.length}` : undefined}
    >
      {pinned.length === 0 ? (
        <MenuBarExtra.Section title="No Pinned Devices">
          <MenuBarExtra.Item
            title="Pin a Device in Tuya Smart"
            icon={Icon.Pin}
            onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="Pinned Switches">
          {pinned.map(({ device, status }) => (
            <MenuBarExtra.Item
              key={switchKey(device.id, status.code)}
              title={cleanName(device.name)}
              subtitle={cachedNameFor(device.id, status.code) ?? status.name ?? status.code}
              icon={{ source: Icon.Circle, tintColor: status.value ? Color.Green : Color.Red }}
              onAction={async () => {
                try {
                  await controlDevice(device, { ...status, value: !status.value });
                  revalidate();
                } catch (error) {
                  ShowToastError(error);
                }
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
        <MenuBarExtra.Item
          title="Open Tuya Smart"
          icon={Icon.AppWindow}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
