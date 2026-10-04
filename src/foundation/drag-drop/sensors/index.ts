import { PointerSensor } from './pointer.js';
import { KeyboardSensor } from './keyboard.js';
import type { SensorFactory } from '../types.js';
export * from './activation.js';
export * from './pointer.js';
export * from './keyboard.js';
export const defaultSensors: readonly SensorFactory[] = [
  PointerSensor.configure(),
  KeyboardSensor.configure(),
];
