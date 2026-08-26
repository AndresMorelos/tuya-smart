import { Color, Icon, List } from "@raycast/api";
import type { JSX } from "react";
import { formatActiveTime } from "../utils/functions";
import { Device, FunctionItem } from "../utils/interfaces";
import { CommandActionPanel, DeviceActionPanel } from "./actionPanels";
import { DeviceOnlineFilterType, deviceKey, extractSwitches, switchKey } from "../utils/filters";

export interface DeviceListProps {
  isLoading: boolean;
  devices: Device[];
  searchBarPlaceholder?: string;
  searchBarAccessory?: JSX.Element;
  onSearchTextChange?: (q: string) => void;
  onAction: (device: Device) => void;
  filter: DeviceOnlineFilterType;
  pinnedSwitches: string[];
  onTogglePinSwitch: (deviceId: string, commandCode: string) => void;
}

export interface CommandListProps {
  device: Device;
  commands: FunctionItem[];
  onAction: (device: Device) => void;
}

/** Replaces one status entry without mutating the device held in state. */
function withUpdatedStatus(device: Device, command: FunctionItem): Device {
  return {
    ...device,
    status: (device.status ?? []).map((status) => (status.code === command.code ? command : status)),
  };
}

export function DeviceList(props: DeviceListProps): JSX.Element {
  const devices = props.devices ?? [];
  const pinnedDevices = devices.filter((device) => device.pinned);
  const unpinnedDevices = devices.filter((device) => !device.pinned);

  const switches = extractSwitches(devices).filter(({ status }) => {
    if (props.filter === DeviceOnlineFilterType.On) return status.value === true;
    if (props.filter === DeviceOnlineFilterType.Off) return status.value === false;
    return true;
  });

  const isSwitchPinned = ({ device, status }: { device: Device; status: FunctionItem }) =>
    props.pinnedSwitches.includes(switchKey(device.id, status.code));

  const pinnedSwitches = switches.filter(isSwitchPinned);
  const unpinnedSwitches = switches.filter((entry) => !isSwitchPinned(entry));

  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      searchBarAccessory={props.searchBarAccessory}
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
      isShowingDetail
    >
      {(pinnedSwitches.length > 0 || pinnedDevices.length > 0) && (
        <List.Section title="Pinned">
          {pinnedSwitches.map(({ device, status }) => (
            <SwitchListItem
              key={switchKey(device.id, status.code)}
              device={device}
              command={status}
              onAction={props.onAction}
              isPinned={true}
              onTogglePin={props.onTogglePinSwitch}
            />
          ))}
          {pinnedDevices.map((device) => (
            <DeviceListItem key={deviceKey(device)} device={device} onAction={props.onAction} />
          ))}
        </List.Section>
      )}
      <List.Section title="Devices">
        {unpinnedDevices.map((device) => (
          <DeviceListItem key={deviceKey(device)} device={device} onAction={props.onAction} />
        ))}
      </List.Section>
      <List.Section title="Switches">
        {unpinnedSwitches.map(({ device, status }) => (
          <SwitchListItem
            key={switchKey(device.id, status.code)}
            device={device}
            command={status}
            onAction={props.onAction}
            isPinned={false}
            onTogglePin={props.onTogglePinSwitch}
          />
        ))}
      </List.Section>
    </List>
  );
}

export function SwitchListItem(props: {
  command: FunctionItem;
  device: Device;
  onAction: (device: Device) => void;
  isPinned: boolean;
  onTogglePin: (deviceId: string, commandCode: string) => void;
}): JSX.Element {
  const { command, device } = props;

  return (
    <List.Item
      title={command.name ?? command.code}
      accessories={[{ text: device.name }]}
      icon={{ source: Icon.Circle, tintColor: command.value ? Color.Green : Color.Red }}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Device Information" />
              <List.Item.Detail.Metadata.Label title="Name" text={device.name} />
              <List.Item.Detail.Metadata.Label title="Category" text={device.category} />
              <List.Item.Detail.Metadata.Label title="Id" text={device.id} />
              <List.Item.Detail.Metadata.Label title="Status" text={device.online ? "Online" : "Offline"} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Switch Information" />
              <List.Item.Detail.Metadata.Label title="Code" text={command.code} />
              <List.Item.Detail.Metadata.Label title="Value" text={command.value?.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <CommandActionPanel
          command={command}
          device={device}
          onTogglePinSwitch={props.onTogglePin}
          isPinned={props.isPinned}
          onAction={({ command: updated }) => props.onAction(withUpdatedStatus(device, updated))}
        />
      }
    />
  );
}

export function DeviceListItem(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  const tintColor = device.online ? Color.Green : Color.Red;
  const tooltip = device.online ? "Online" : "Offline";

  return (
    <List.Item
      title={device.name}
      accessories={[{ text: device.category }]}
      icon={{ value: { source: Icon.Desktop, tintColor }, tooltip }}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="General Information" />
              <List.Item.Detail.Metadata.Label title="Id" text={device.id} />
              <List.Item.Detail.Metadata.Label title="Status" text={device.online ? "Online" : "Offline"} />
              <List.Item.Detail.Metadata.Label title="Product Name" text={device.product_name} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Time Information" />
              <List.Item.Detail.Metadata.Label title="Active Time" text={formatActiveTime(device.active_time)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Statuses" />
              {(device.status ?? []).map((status) => (
                <List.Item.Detail.Metadata.Label
                  key={status.code}
                  title={status.name ?? status.code}
                  text={status.value?.toString()}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<DeviceActionPanel device={device} showDetails={true} onAction={props.onAction} />}
    />
  );
}

export function CommandList(props: CommandListProps): JSX.Element {
  return (
    <List>
      {props.commands.map((command) => (
        <CommandListItem
          key={`${command.code}-${String(command.value)}`}
          command={command}
          device={props.device}
          onAction={props.onAction}
        />
      ))}
    </List>
  );
}

export function CommandListItem(props: {
  command: FunctionItem;
  device: Device;
  onAction: (device: Device) => void;
}): JSX.Element {
  const { command, device } = props;

  return (
    <List.Item
      title={command.name ?? command.code}
      icon={{ source: Icon.Circle, tintColor: command.value ? Color.Green : Color.Red }}
      actions={
        <CommandActionPanel
          command={command}
          device={device}
          onAction={({ command: updated }) => props.onAction(withUpdatedStatus(device, updated))}
        />
      }
    />
  );
}
