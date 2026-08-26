import { Color, Icon, List } from "@raycast/api";
import type { JSX } from "react";
import { formatActiveTime } from "../utils/functions";
import { Device, FunctionItem } from "../utils/interfaces";
import { DeviceActionPanel } from "./actionPanels";
import { DeviceOnlineFilterType, deviceKey, isSwitchStatus } from "../utils/filters";
import {
  alarmsOf,
  batteryOf,
  classifyDevice,
  cleanName,
  formatStatusValue,
  meaningfulStatuses,
  statusLabel,
  summaryOf,
  temperatureUnitOf,
} from "../utils/deviceSemantics";

export interface DeviceListProps {
  isLoading: boolean;
  devices: Device[];
  searchBarPlaceholder?: string;
  searchBarAccessory?: JSX.Element;
  onSearchTextChange?: (q: string) => void;
  onAction: (device: Device) => void;
  filter: DeviceOnlineFilterType;
}

function batteryIcon(level: number) {
  if (level <= 20) return { source: Icon.BatteryDisabled, tintColor: Color.Red };
  if (level <= 50) return { source: Icon.Battery, tintColor: Color.Yellow };
  return { source: Icon.Battery, tintColor: Color.SecondaryText };
}

function rowIcon(device: Device) {
  const kind = classifyDevice(device);
  const dim = !device.online;

  if (kind === "lock") {
    const unlocked = (device.status ?? []).find((s) => s.code === "lock_motor_state")?.value === true;
    return {
      source: unlocked ? Icon.LockUnlocked : Icon.Lock,
      tintColor: dim ? Color.SecondaryText : unlocked ? Color.Orange : Color.Green,
    };
  }

  if (kind === "sensor") {
    const open = (device.status ?? []).find((s) => s.code === "doorcontact_state")?.value === true;
    if (open) return { source: Icon.ExclamationMark, tintColor: dim ? Color.SecondaryText : Color.Orange };
    return { source: Icon.Eye, tintColor: dim ? Color.SecondaryText : Color.Blue };
  }

  const on = (device.status ?? []).some((s) => isSwitchStatus(s) && s.value === true);
  return {
    source: on ? Icon.CircleFilled : Icon.Circle,
    tintColor: dim ? Color.SecondaryText : on ? Color.Green : Color.Red,
  };
}

function accessoriesFor(device: Device): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  for (const alarm of alarmsOf(device)) {
    accessories.push({ tag: { value: alarm, color: Color.Red }, icon: Icon.Warning, tooltip: "Needs attention" });
  }

  const summary = summaryOf(device);
  if (summary) accessories.push({ text: summary });

  const battery = batteryOf(device);
  if (battery !== undefined) {
    accessories.push({ icon: batteryIcon(battery), text: `${battery}%`, tooltip: "Battery" });
  }

  if (!device.online) {
    accessories.push({ tag: { value: "Offline", color: Color.SecondaryText }, tooltip: "Not reachable right now" });
  }

  return accessories;
}

function DeviceDetail(props: { device: Device }): JSX.Element {
  const device = props.device;
  const unit = temperatureUnitOf(device);
  const alarms = alarmsOf(device);
  const statuses = meaningfulStatuses(device).filter((s) => s.code !== "temp_unit_convert");

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {alarms.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Needs Attention">
              {alarms.map((alarm) => (
                <List.Item.Detail.Metadata.TagList.Item key={alarm} text={alarm} color={Color.Red} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label title="State" text={summaryOf(device) || "—"} icon={rowIcon(device)} />
          <List.Item.Detail.Metadata.Label
            title="Connection"
            text={device.online ? "Online" : "Offline"}
            icon={{
              source: device.online ? Icon.Wifi : Icon.WifiDisabled,
              tintColor: device.online ? Color.Green : Color.SecondaryText,
            }}
          />
          <List.Item.Detail.Metadata.Separator />
          {statuses.length > 0 && <List.Item.Detail.Metadata.Label title="Readings" />}
          {statuses.map((status: FunctionItem) => (
            <List.Item.Detail.Metadata.Label
              key={status.code}
              title={statusLabel(status)}
              text={formatStatusValue(status, unit)}
            />
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Device" text={device.product_name || "—"} />
          <List.Item.Detail.Metadata.Label title="Category" text={String(device.category ?? "—")} />
          <List.Item.Detail.Metadata.Label title="Added" text={formatActiveTime(device.active_time)} />
          <List.Item.Detail.Metadata.Label title="Id" text={device.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function DeviceRow(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  return (
    <List.Item
      title={cleanName(device.name)}
      keywords={[String(device.category ?? ""), device.product_name ?? ""]}
      icon={rowIcon(device)}
      accessories={accessoriesFor(device)}
      detail={<DeviceDetail device={device} />}
      actions={<DeviceActionPanel device={device} onAction={props.onAction} />}
    />
  );
}

export function DeviceList(props: DeviceListProps): JSX.Element {
  const devices = props.devices ?? [];

  const pinned = devices.filter((device) => device.pinned);
  const rest = devices.filter((device) => !device.pinned);

  const controls = rest.filter((device) => classifyDevice(device) === "control");
  const sensors = rest.filter((device) => classifyDevice(device) === "sensor");
  const locks = rest.filter((device) => classifyDevice(device) === "lock");

  const isEmpty = devices.length === 0;

  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      searchBarAccessory={props.searchBarAccessory}
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
      isShowingDetail={!isEmpty}
    >
      {isEmpty && !props.isLoading && (
        <List.EmptyView
          icon={Icon.Plug}
          title="No Devices"
          description={
            props.filter === DeviceOnlineFilterType.all
              ? "Nothing came back from Tuya. Check that your app account is linked under Devices in the Tuya IoT Platform."
              : "No device matches this filter."
          }
        />
      )}
      {pinned.length > 0 && (
        <List.Section title="Pinned" subtitle={String(pinned.length)}>
          {pinned.map((device) => (
            <DeviceRow key={deviceKey(device)} device={device} onAction={props.onAction} />
          ))}
        </List.Section>
      )}
      {controls.length > 0 && (
        <List.Section title="Controls" subtitle={String(controls.length)}>
          {controls.map((device) => (
            <DeviceRow key={deviceKey(device)} device={device} onAction={props.onAction} />
          ))}
        </List.Section>
      )}
      {sensors.length > 0 && (
        <List.Section title="Sensors" subtitle={String(sensors.length)}>
          {sensors.map((device) => (
            <DeviceRow key={deviceKey(device)} device={device} onAction={props.onAction} />
          ))}
        </List.Section>
      )}
      {locks.length > 0 && (
        <List.Section title="Locks" subtitle={String(locks.length)}>
          {locks.map((device) => (
            <DeviceRow key={deviceKey(device)} device={device} onAction={props.onAction} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
