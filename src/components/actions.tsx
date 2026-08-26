import type { JSX } from "react";
import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { sendCommand } from "../utils/tuyaConnector";
import { ShowToastError } from "../utils/functions";
import { Device, FunctionItem } from "../utils/interfaces";
import { parseRange, percentToRaw, rawToPercent } from "../utils/lightFunctions";

export type CommandResult = { result: boolean; command: FunctionItem };

export function DevicePinAction(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const isPinned = props.device.pinned;
  return (
    <Action
      title={isPinned ? "Unpin Device" : "Pin Device"}
      icon={Icon.Pin}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={() => {
        props.onAction({ ...props.device, pinned: !isPinned });
        showToast(Toast.Style.Success, isPinned ? "Unpinned Device" : "Pinned Device", props.device.name);
      }}
    />
  );
}

export function SwitchPinAction(props: {
  deviceId: string;
  commandCode: string;
  isPinned: boolean;
  onTogglePin: (deviceId: string, commandCode: string) => void;
}): JSX.Element {
  const { isPinned, onTogglePin, deviceId, commandCode } = props;
  return (
    <Action
      title={isPinned ? "Unpin Switch" : "Pin Switch"}
      icon={Icon.Pin}
      shortcut={{ modifiers: ["opt", "shift"], key: "p" }}
      onAction={() => {
        onTogglePin(deviceId, commandCode);
        showToast(Toast.Style.Success, isPinned ? "Unpinned Switch" : "Pinned Switch");
      }}
    />
  );
}

export function BooleanCommand(props: {
  deviceId: string;
  command: FunctionItem;
  onAction: (props: CommandResult) => void;
}): JSX.Element {
  const isOn = props.command.value === true;
  const label = props.command.name ?? props.command.code;

  return (
    <Action
      title={isOn ? "Set off" : "Set on"}
      icon={isOn ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={async () => {
        props.onAction(await toggleCommand(props.deviceId, props.command, !isOn, label));
      }}
    />
  );
}

export function TextCommand(props: {
  deviceId: string;
  command: FunctionItem;
  value: string;
  onAction: (props: CommandResult) => void;
}): JSX.Element {
  const label = props.command.name ?? props.command.code;
  return (
    <Action
      title={`Set ${props.value}`}
      icon={Icon.Gear}
      onAction={async () => {
        props.onAction(await applyCommand(props.deviceId, { ...props.command, value: props.value }, label));
      }}
    />
  );
}

/** Sends a boolean data point and reports the direction actually requested. */
async function toggleCommand(
  deviceId: string,
  command: FunctionItem,
  nextValue: boolean,
  label: string,
): Promise<CommandResult> {
  const direction = nextValue ? "On" : "Off";
  showToast(Toast.Style.Animated, `Turning ${direction}`, label);

  try {
    await sendCommand({ device_id: deviceId, commands: [{ code: command.code, value: nextValue }] });
    showToast(Toast.Style.Success, `Turned ${direction}`, label);
    return { result: true, command: { ...command, value: nextValue } };
  } catch (error) {
    ShowToastError(error);
    return { result: false, command };
  }
}

async function applyCommand(deviceId: string, command: FunctionItem, label: string): Promise<CommandResult> {
  showToast(Toast.Style.Animated, `Setting ${String(command.value)}`, label);

  try {
    await sendCommand({ device_id: deviceId, commands: [{ code: command.code, value: command.value }] });
    showToast(Toast.Style.Success, `Set ${String(command.value)}`, label);
    return { result: true, command };
  } catch (error) {
    ShowToastError(error);
    return { result: false, command };
  }
}

const LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/**
 * Integer data points such as brightness and colour temperature are exposed as
 * percentages; the raw bounds are read from the device because they differ per product.
 */
export function LightLevelSubmenu(props: {
  deviceId: string;
  command: FunctionItem;
  title: string;
  icon: Icon;
  onAction: (props: CommandResult) => void;
}): JSX.Element {
  const range = parseRange(props.command.values);
  const currentRaw = typeof props.command.value === "number" ? props.command.value : range.min;
  const currentPercent = rawToPercent(currentRaw, range);

  return (
    <ActionPanel.Submenu title={props.title} icon={props.icon}>
      {LEVELS.map((percent) => (
        <Action
          key={percent}
          title={percent === currentPercent ? `${percent}% (Current)` : `${percent}%`}
          icon={percent === currentPercent ? Icon.Check : undefined}
          onAction={async () => {
            const raw = percentToRaw(percent, range);
            props.onAction(
              await applyCommand(props.deviceId, { ...props.command, value: raw }, `${props.title} ${percent}%`),
            );
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
