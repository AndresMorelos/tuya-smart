import { Color, Icon, MenuBarExtra, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { controlDevice, loadDevicesWithFallback } from "./utils/deviceSource";
import { describeError } from "./utils/functions";
import { Device, FunctionItem } from "./utils/interfaces";
import { extractSwitches, switchKey } from "./utils/filters";
import { cleanName } from "./utils/deviceSemantics";

/**
 * A menu bar command has no view, so `showToast` renders nowhere. Every outcome here
 * has to be reported with a HUD or it looks like the click did nothing.
 */
export default function MenuBarCommand() {
  const [cachedDevices] = useCachedState<Device[]>("devices", []);

  const { data, isLoading, revalidate, mutate } = useCachedPromise(loadDevicesWithFallback, [], {
    initialData: { devices: cachedDevices ?? [], source: "cache" as const },
    keepPreviousData: true,
    onError: (error) => showHUD(describeError(error)),
  });

  const devices = data?.devices ?? cachedDevices ?? [];
  const cachedNameFor = (deviceId: string, code: string) =>
    (cachedDevices ?? []).find((device) => device.id === deviceId)?.status?.find((status) => status.code === code)
      ?.name;

  // Pinning is per device; the menu bar exposes the switches those devices carry.
  const pinnedIds = new Set((cachedDevices ?? []).filter((device) => device.pinned).map((device) => device.id));
  const pinned = extractSwitches(devices).filter(({ device }) => pinnedIds.has(device.id));
  const pinnedWithoutSwitches = (cachedDevices ?? []).filter(
    (device) => pinnedIds.has(device.id) && extractSwitches([device]).length === 0,
  );

  const onCount = pinned.filter(({ status }) => status.value === true).length;

  const toggle = async (device: Device, status: FunctionItem) => {
    const next = !status.value;
    const label = `${cleanName(device.name)} ${next ? "on" : "off"}`;

    try {
      await mutate(controlDevice(device, { ...status, value: next }), {
        // Tuya's device list lags behind a command, so the menu reflects the change
        // immediately and rolls back if the command actually failed.
        optimisticUpdate: (current) => ({
          ...current,
          devices: (current?.devices ?? []).map((item) =>
            item.id === device.id
              ? {
                  ...item,
                  status: (item.status ?? []).map((s) => (s.code === status.code ? { ...s, value: next } : s)),
                }
              : item,
          ),
        }),
        rollbackOnError: true,
        shouldRevalidateAfter: false,
      });
      await showHUD(`Turned ${label}`);
    } catch (error) {
      await showHUD(describeError(error));
    }
  };

  return (
    <MenuBarExtra
      icon={{ source: Icon.LightBulb, tintColor: onCount > 0 ? Color.Yellow : Color.SecondaryText }}
      isLoading={isLoading}
      tooltip="Tuya Smart"
      title={pinned.length > 0 ? `${onCount}/${pinned.length}` : undefined}
    >
      {pinned.length > 0 && (
        <MenuBarExtra.Section title="Pinned Switches">
          {pinned.map(({ device, status }) => (
            <MenuBarExtra.Item
              key={switchKey(device.id, status.code)}
              title={cleanName(device.name)}
              subtitle={
                device.online ? (cachedNameFor(device.id, status.code) ?? status.name ?? status.code) : "Offline"
              }
              icon={{
                source: status.value ? Icon.CircleFilled : Icon.Circle,
                tintColor: !device.online ? Color.SecondaryText : status.value ? Color.Green : Color.Red,
              }}
              onAction={() => toggle(device, status)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {pinnedWithoutSwitches.length > 0 && (
        <MenuBarExtra.Section title="Pinned, Nothing to Toggle">
          {pinnedWithoutSwitches.map((device) => (
            <MenuBarExtra.Item
              key={device.id}
              title={cleanName(device.name)}
              subtitle="Sensor"
              icon={{ source: Icon.Eye, tintColor: Color.SecondaryText }}
              onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {pinned.length === 0 && pinnedWithoutSwitches.length === 0 && (
        <MenuBarExtra.Section title="No Pinned Devices">
          <MenuBarExtra.Item
            title="Pin a Device in Tuya Smart"
            icon={Icon.Pin}
            onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            revalidate();
            await showHUD("Refreshing Tuya devices");
          }}
        />
        <MenuBarExtra.Item
          title="Open Tuya Smart"
          icon={Icon.AppWindow}
          onAction={async () => {
            try {
              await launchCommand({ name: "index", type: LaunchType.UserInitiated });
            } catch (error) {
              await showHUD(describeError(error));
            }
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
