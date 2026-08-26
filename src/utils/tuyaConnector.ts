import { TuyaContext } from "@tuya/tuya-connector-nodejs";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, DevicesReponse, DeviceCategory, Device, DeviceFunctionsResult, Status } from "./interfaces";
import { TuyaApiError } from "./errors";

let cachedContext: TuyaContext | undefined;

/**
 * Built lazily rather than at import time: reading preferences on module load puts
 * the failure outside every try/catch in the app, which surfaces as a hard crash
 * instead of a toast.
 */
const getContext = (): TuyaContext => {
  if (!cachedContext) {
    const { accessId, accessSecret, region } = getPreferenceValues<Preferences>();
    cachedContext = new TuyaContext({
      accessKey: accessId,
      secretKey: accessSecret,
      baseUrl: region,
    });
  }
  return cachedContext;
};

interface TuyaEnvelope<T> {
  success: boolean;
  code?: number;
  msg?: string | null;
  result: T;
}

/**
 * Tuya replies with HTTP 200 on failure and reports the outcome in `success`, so the
 * connector never rejects for an application-level error. Without this check a lapsed
 * IoT Core subscription reads as "no devices" instead of an error.
 */
const unwrap = <T>(envelope: TuyaEnvelope<T>): T => {
  if (!envelope || envelope.success !== true) {
    throw new TuyaApiError(envelope?.code ?? -1, envelope?.msg ?? "Unknown Tuya API error");
  }
  return envelope.result;
};

const request = async <T>(options: Parameters<TuyaContext["request"]>[0]): Promise<T> => {
  const envelope = await getContext().request<T>(options);
  return unwrap(envelope as TuyaEnvelope<T>);
};

export const getDevices = async (last_row_key?: string, allDevices: Device[] = []): Promise<Device[]> => {
  const page = await request<DevicesReponse>({
    path: "/v1.0/iot-01/associated-users/devices",
    method: "GET",
    query: { last_row_key },
  });

  allDevices.push(...(page.devices ?? []));

  if (page.has_more && page.last_row_key) {
    return getDevices(page.last_row_key, allDevices);
  }

  return allDevices;
};

export const getCategories = async (): Promise<DeviceCategory[]> =>
  request<DeviceCategory[]>({
    path: "/v1.0/iot-03/device-categories",
    method: "GET",
  });

export const sendCommand = async (props: { device_id: string; commands: Status[] }): Promise<boolean> => {
  await request<boolean>({
    path: `/v1.0/iot-03/devices/${props.device_id}/commands`,
    method: "POST",
    body: { commands: props.commands },
  });
  return true;
};

export const getDeviceFunctionsInfo = async (device_id: string) => {
  const result = await request<DeviceFunctionsResult>({
    path: `/v1.0/devices/${device_id}/functions`,
    method: "GET",
  });

  return result?.functions ?? [];
};

export { TuyaApiError };
