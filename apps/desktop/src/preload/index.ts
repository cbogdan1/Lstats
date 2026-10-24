import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { GameflowPhase } from '@lol/shared';

const api = {
  getPhase: (): Promise<GameflowPhase> => ipcRenderer.invoke('lcu:getPhase'),
  /** Returns an unsubscribe function. */
  onPhase: (cb: (phase: GameflowPhase) => void) => {
    const handler = (_: IpcRendererEvent, phase: GameflowPhase) => cb(phase);
    ipcRenderer.on('lcu:phase', handler);
    return () => void ipcRenderer.off('lcu:phase', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
