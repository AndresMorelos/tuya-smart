import { Color, Icon, MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getDevices, sendCommand } from "./utils/tuyaConnector";
import { ShowToastError } from "./utils/functions";
import { Device } from "./utils/interfaces";
import { extractSwitches, switchKey } from "./utils/filters";

export default function MenuBarCommand() {
  const [pinnedSwitches] = useCachedState<string[]>("pinnedSwitches", []);
  const [cachedDevices] = useCachedState<Device[]>("devices", []);

  // Shows whatever the main command last cached, then revalidates in the background.
  const { data, isLoading, revalidate } = useCachedPromise(getDevices, [], {
    initialData: cachedDevices ?? [],
    keepPreviousData: true,
    onError: ShowToastError,
  });

  const devices = data ?? cachedDevices ?? [];
  const cachedNameFor = (deviceId: string, code: string) =>
    (cachedDevices ?? []).find((device) => device.id === deviceId)?.status?.find((status) => status.code === code)
      ?.name;

  const pinned = extractSwitches(devices).filter(({ device, status }) =>
    (pinnedSwitches ?? []).includes(switchKey(device.id, status.code)),
  );

  const onCount = pinned.filter(({ status }) => status.value === true).length;

  return (
    <MenuBarExtra
      icon={{ source: Icon.LightBulb, tintColor: onCount > 0 ? Color.Yellow : Color.SecondaryText }}
      isLoading={isLoading}
      tooltip="Tuya Smart"
      title={pinned.length > 0 ? `${onCount}/${pinned.length}` : undefined}
    >
      {pinned.length === 0 ? (
        <MenuBarExtra.Section title="No Pinned Switches">
          <MenuBarExtra.Item
            title="Pin a Switch in Tuya Smart"
            icon={Icon.Pin}
            onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="Pinned Switches">
          {pinned.map(({ device, status }) => (
            <MenuBarExtra.Item
              key={switchKey(device.id, status.code)}
              title={cachedNameFor(device.id, status.code) ?? status.name ?? status.code}
              subtitle={device.name}
              icon={{ source: Icon.Circle, tintColor: status.value ? Color.Green : Color.Red }}
              onAction={async () => {
                try {
                  await sendCommand({
                    device_id: device.id,
                    commands: [{ code: status.code, value: !status.value }],
                  });
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
