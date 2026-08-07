import { HUB_NPCS } from './npcData';
import { getActiveMap } from '../map/activeMap';
import { INTERACT_RANGE } from '../constants';

const NPC_RANGE = 2.2;

/**
 * @returns {{ type: 'npc'|'deploy'|null, id?: string, label: string|null, npcId?: string }}
 */
export function findHubInteract(px, pz) {
  const map = getActiveMap();
  let best = null;
  let bestDist = Infinity;

  for (const npc of HUB_NPCS) {
    const dx = px - npc.position[0];
    const dz = pz - npc.position[2];
    const d = Math.hypot(dx, dz);
    const range = npc.interactRange ?? NPC_RANGE;
    if (d < range && d < bestDist) {
      bestDist = d;
      best = {
        type: 'npc',
        id: npc.id,
        npcId: npc.id,
        label: `Hold [F] Talk · ${npc.name}`,
      };
    }
  }

  const pad = map.DEPLOY_PAD;
  if (pad) {
    const d = Math.hypot(px - pad.x, pz - pad.z);
    if (d < (pad.r || 2.2) && d < bestDist) {
      best = {
        type: 'deploy',
        id: 'deploy',
        label: 'Hold [F] · DEPLOY',
      };
    }
  }

  return best || { type: null, label: null };
}

export function dist2(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export { INTERACT_RANGE };
