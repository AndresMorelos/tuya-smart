import type { JSX } from "react";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { Device, FunctionItem } from "../utils/interfaces";
import { findBrightness, findColorTemp } from "../utils/lightFunctions";

import { DeviceCommands } from "./deviceCommands";

import * as Actions from "./actions";
import RenameFunctionForm from "./renameFunction";

export function DeviceActionPanel(props: {
  device: Device;
  showDetails: boolean;
  onAction: (device: Device) => void;
}): JSX.Element {
  const device = props.device;
  const brightness = findBrightness(device);
  const colorTemp = findColorTemp(device);

  const applyCommandResult = ({ command }: Actions.CommandResult) =>
    props.onAction({
      ...device,
      status: (device.status ?? []).map((status) => (status.code === command.code ? command : status)),
    });

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {props.showDetails && (
          <Action.Push
            title="Show Details"
            icon={Icon.Document}
            target={<DeviceCommands device={device} onAction={props.onAction} />}
          />
        )}
        <Actions.DevicePinAction device={device} onAction={props.onAction} />
      </ActionPanel.Section>
      {(brightness || colorTemp) && (
        <ActionPanel.Section title="Light">
          {brightness && (
            <Actions.LightLevelSubmenu
              deviceId={device.id}
              command={brightness}
              title="Brightness"
              icon={Icon.Sun}
              onAction={applyCommandResult}
            />
          )}
          {colorTemp && (
            <Actions.LightLevelSubmenu
              deviceId={device.id}
              command={colorTemp}
              title="Colour Temperature"
              icon={Icon.Temperature}
              onAction={applyCommandResult}
            />
          )}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

export function CommandActionPanel(props: {
  device: Device;
  command: FunctionItem;
  newName?: string;
  onAction: (props: Actions.CommandResult) => void;
  onTogglePinSwitch?: (deviceId: string, commandCode: string) => void;
  isPinned?: boolean;
}): JSX.Element {
  const deviceId = props.device.id;
  const commandValue = props.command.value;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {typeof commandValue === "boolean" && (
          <Actions.BooleanCommand deviceId={deviceId} command={props.command} onAction={props.onAction} />
        )}
        {typeof commandValue === "string" && (
          <Actions.TextCommand
            deviceId={deviceId}
            command={props.command}
            value={commandValue}
            onAction={props.onAction}
          />
        )}
        {typeof commandValue === "number" && (
          <Actions.LightLevelSubmenu
            deviceId={deviceId}
            command={props.command}
            title={props.command.name ?? props.command.code}
            icon={Icon.Gauge}
            onAction={props.onAction}
          />
        )}
        {props.onTogglePinSwitch && props.isPinned !== undefined && (
          <Actions.SwitchPinAction
            deviceId={deviceId}
            commandCode={props.command.code}
            isPinned={props.isPinned}
            onTogglePin={props.onTogglePinSwitch}
          />
        )}
        <Action.Push
          title="Rename"
          icon={Icon.Pencil}
          target={<RenameFunctionForm deviceId={deviceId} command={props.command} onAction={props.onAction} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
