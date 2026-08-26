import type { JSX } from "react";
import { Action, Icon, showToast, Toast } from "@raycast/api";
import { sendCommand } from "../utils/tuyaConnector";
import { ShowToastError } from "../utils/functions";
import { Device, FunctionItem } from "../utils/interfaces";

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
