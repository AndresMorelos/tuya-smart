import { Device, FunctionItem } from "./interfaces";
import { isSwitchStatus } from "./filters";

export type DeviceKind = "control" | "sensor" | "lock";

/** Data points that carry encoded blobs or internal bookkeeping, never shown to a user. */
const NOISE_CODES = new Set([
  "unlock_method_create",
  "unlock_method_delete",
  "unlock_method_modify",
  "lock_record",
  "synch_method",
  "remote_no_dp_key",
  "record",
  "check_code_set",
  "ble_unlock_check",
  "remote_pd_setkey_check",
  "temporary_password_creat",
  "password",
  "rtc_lock",
]);

const LOCK_INDICATORS = ["alarm_lock", "lock_motor_state", "manual_lock", "unlock_fingerprint", "reverse_lock"];
const LOCK_CATEGORIES = new Set([
  "ms",
  "jtmspro",
  "videolock",
  "photolock",
  "bxx",
  "gyms",
  "hotelms",
  "mk",
  "small_lock",
]);

const BATTERY_CODES = ["battery_percentage", "residual_electricity", "battery_percentage_1"];

export function isNoiseStatus(status: FunctionItem): boolean {
  if (NOISE_CODES.has(status.code)) return true;
  // Countdown timers sit at zero on every socket; they are only meaningful when running.
  if (/^countdown(_\d+)?$/.test(status.code) && status.value === 0) return true;
  // Base64-ish payloads are never human readable, whatever their code.
  return typeof status.value === "string" && /^[A-Za-z0-9+/]{12,}={0,2}$/.test(status.value);
}

export function classifyDevice(device: Device): DeviceKind {
  const status = device.status ?? [];
  if (status.some(isSwitchStatus)) return "control";

  const category = String(device.category ?? "").toLowerCase();
  const looksLikeLock =
    LOCK_CATEGORIES.has(category) ||
    category.includes("lock") ||
    status.some((item) => LOCK_INDICATORS.includes(item.code));

  return looksLikeLock ? "lock" : "sensor";
}

export function batteryOf(device: Device): number | undefined {
  for (const code of BATTERY_CODES) {
    const hit = (device.status ?? []).find((status) => status.code === code);
    if (hit && typeof hit.value === "number" && hit.value > 0) return hit.value;
  }
  const state = (device.status ?? []).find((status) => status.code === "battery_state");
  if (state?.value === "high") return 100;
  if (state?.value === "middle") return 50;
  if (state?.value === "low") return 10;
  return undefined;
}

const ALARM_LABELS: Record<string, string> = {
  low_battery: "Low battery",
  wrong_finger: "Wrong fingerprint",
  wrong_password: "Wrong password",
  wrong_card: "Wrong card",
  hijack: "Duress alarm",
  doorbell: "Doorbell pressed",
  door_unclosed: "Door not closed",
  sos: "SOS",
};

/**
 * Only ongoing conditions earn a badge. `alarm_lock` also reports one-off events such as
 * a mistyped code, and flagging those forever would be exactly the noise this removes.
 */
const PERSISTENT_ALARMS = new Set(["low_battery", "door_unclosed", "sos"]);

export const LOW_BATTERY_THRESHOLD = 20;

/** Conditions worth putting in front of the user rather than burying in a list. */
export function alarmsOf(device: Device): string[] {
  const alarms: string[] = [];
  for (const status of device.status ?? []) {
    if (status.code === "alarm_lock" && typeof status.value === "string" && PERSISTENT_ALARMS.has(status.value)) {
      alarms.push(ALARM_LABELS[status.value] ?? status.value);
    }
    if (status.code === "hijack" && status.value === true) alarms.push(ALARM_LABELS.hijack);
  }
  const battery = batteryOf(device);

  // `alarm_lock` keeps the last alarm, not the current state. A healthy battery reading
  // contradicts a stale low-battery alarm, so trust the reading.
  const stale = battery !== undefined && battery > LOW_BATTERY_THRESHOLD;
  const withoutStaleBattery = stale ? alarms.filter((alarm) => alarm !== ALARM_LABELS.low_battery) : alarms;

  if (
    battery !== undefined &&
    battery <= LOW_BATTERY_THRESHOLD &&
    !withoutStaleBattery.includes(ALARM_LABELS.low_battery)
  ) {
    withoutStaleBattery.push(ALARM_LABELS.low_battery);
  }
  return withoutStaleBattery;
}

const ENUM_LABELS: Record<string, Record<string, string>> = {
  relay_status: {
    power_off: "Off after outage",
    power_on: "On after outage",
    last: "Restore last state",
    memory: "Restore last state",
  },
  battery_state: { high: "High", middle: "Medium", low: "Low" },
  beep_volume: { mute: "Muted", low: "Low", normal: "Normal", high: "High" },
  temp_unit_convert: { c: "Celsius", f: "Fahrenheit" },
  alarm_lock: ALARM_LABELS,
};

const BOOLEAN_LABELS: Record<string, [string, string]> = {
  doorcontact_state: ["Open", "Closed"],
  lock_motor_state: ["Unlocked", "Locked"],
  reverse_lock: ["Engaged", "Released"],
  anti_lock_outside: ["Engaged", "Released"],
  manual_lock: ["Engaged", "Released"],
  hijack: ["Triggered", "Normal"],
};

/**
 * Tuya reports scaled integers, so a temperature of 29.4 degrees arrives as 294.
 * The scale lives in the data point spec, which the cloud does not return here, so the
 * well-known scales are applied by code.
 */
const SCALED_UNITS: Record<string, { scale: number; unit: string }> = {
  va_temperature: { scale: 10, unit: "°C" },
  temp_current: { scale: 10, unit: "°C" },
  va_humidity: { scale: 1, unit: "%" },
  humidity_value: { scale: 1, unit: "%" },
  battery_percentage: { scale: 1, unit: "%" },
  residual_electricity: { scale: 1, unit: "%" },
  cur_power: { scale: 10, unit: "W" },
  cur_voltage: { scale: 10, unit: "V" },
  cur_current: { scale: 1, unit: "mA" },
};

export function formatStatusValue(status: FunctionItem, unit?: "c" | "f"): string {
  const { code, value } = status;

  if (typeof value === "boolean") {
    const labels = BOOLEAN_LABELS[code];
    if (labels) return value ? labels[0] : labels[1];
    return value ? "On" : "Off";
  }

  if (typeof value === "number") {
    const scaled = SCALED_UNITS[code];
    if (scaled) {
      const amount = value / scaled.scale;
      const shown = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
      if (scaled.unit === "°C" && unit === "f") {
        return `${((amount * 9) / 5 + 32).toFixed(1)}°F`;
      }
      return `${shown}${scaled.unit}`;
    }
    return String(value);
  }

  if (typeof value === "string") {
    return ENUM_LABELS[code]?.[value] ?? value;
  }

  return "";
}

/** Turns a data point code into a readable label when the cloud gave us no name. */
export function humanizeCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\bva\b/gi, "")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Readable names for the codes this extension shows most often. */
const CODE_LABELS: Record<string, string> = {
  residual_electricity: "Battery",
  battery_percentage: "Battery",
  battery_state: "Battery",
  va_temperature: "Temperature",
  temp_current: "Temperature",
  humidity_value: "Humidity",
  va_humidity: "Humidity",
  doorcontact_state: "Contact",
  lock_motor_state: "Lock",
  alarm_lock: "Last Alarm",
  relay_status: "After Power Outage",
  anti_lock_outside: "Anti-Lock",
  unlock_fingerprint: "Fingerprint Unlocks",
  unlock_password: "Password Unlocks",
  unlock_card: "Card Unlocks",
  unlock_ble: "Bluetooth Unlocks",
  unlock_app: "App Unlocks",
  unlock_phone_remote: "Remote Unlocks",
  unlock_temporary: "Temporary Unlocks",
  unlock_dynamic: "Dynamic Unlocks",
  unlock_request: "Unlock Requests",
  hijack: "Duress",
  beep_volume: "Beep Volume",
  manual_lock: "Manual Lock",
  reverse_lock: "Reverse Lock",
};

export function statusLabel(status: FunctionItem): string {
  if (status.name && status.name !== status.code) return status.name;
  return CODE_LABELS[status.code] ?? humanizeCode(status.code);
}

/** The data points worth showing in the detail panel, noise removed. */
export function meaningfulStatuses(device: Device): FunctionItem[] {
  return (device.status ?? []).filter((status) => !isNoiseStatus(status));
}

export function temperatureUnitOf(device: Device): "c" | "f" {
  const unit = (device.status ?? []).find((status) => status.code === "temp_unit_convert")?.value;
  return unit === "f" ? "f" : "c";
}

/** The one-line state shown next to the device name in the list. */
export function summaryOf(device: Device): string {
  const kind = classifyDevice(device);
  const unit = temperatureUnitOf(device);

  if (kind === "control") {
    const switches = (device.status ?? []).filter(isSwitchStatus);
    const on = switches.filter((status) => status.value === true).length;
    if (switches.length === 1) return switches[0].value ? "On" : "Off";
    return `${on}/${switches.length} on`;
  }

  if (kind === "lock") {
    const motor = (device.status ?? []).find((status) => status.code === "lock_motor_state");
    if (motor) return formatStatusValue(motor, unit);
    return "Locked";
  }

  const highlights = ["doorcontact_state", "va_temperature", "temp_current", "humidity_value", "va_humidity"];
  const parts = highlights
    .map((code) => (device.status ?? []).find((status) => status.code === code))
    .filter((status): status is FunctionItem => Boolean(status))
    .map((status) => formatStatusValue(status, unit));

  return parts.join(" · ");
}

/** Device names come from the Tuya app and often carry stray whitespace. */
export function cleanName(name: string): string {
  return (name ?? "").replace(/\s+/g, " ").trim();
}
