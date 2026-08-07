import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../GameContext';
import { useCoop } from '../net/CoopContext';
import { coopSendFire, coopSendInteract } from '../net/CoopSync';
import { PLAYER, INTERACT_RANGE, BARRICADE, REVIVE } from '../constants';
import { collidePlayer, buildFrameColliders } from '../systems/collision';
import { stepVertical, moveSpeedScale, tryStartSlide, stepSlide } from '../systems/movement';
import { getClosedDoorColliders, tryBuyDoor } from '../systems/DoorSystem';
import {
  getBoardedWindowColliders,
  tryRepairBoard,
} from '../systems/WindowSystem';
import {
  usePlayerControls,
  consumeLook,
  consumeFlags,
  inputState,
} from './PlayerControls';
import { spend } from '../systems/PointsSystem';
import { WEAPONS, createWeaponLoadout } from '../weapons/weaponDefs';
import { getActiveMap } from '../map/activeMap';
import { unlockAudio, play } from '../audio/sound';
import { getLookSensitivity } from '../settings';
import { requestGamePointerLock } from '../display';
import { tickHealthRegen } from '../systems/HealthRegen';
import {
  tickMysteryBox,
  trySpinMysteryBox,
  tryTakeMysteryWeapon,
  mysteryBoxPrompt,
} from '../systems/MysteryBoxSystem';
import { spawnPieProjectile } from '../weapons/PieProjectiles';
import {
  isSpectating,
  updateSpectateCamera,
} from './SpectatorCamera';

const tmp = new THREE.Vector3();

export default function Player({ onShoot }) {
  const { stateRef, zombiesRef, remotesRef } = useGame();
  const { sessionRef } = useCoop();
  const { camera, gl } = useThree();
  usePlayerControls(true);

  // Register lock target once — actual lock must fire from mousedown gesture
  useEffect(() => {
    inputState.lockTarget = gl.domElement;
    inputState.wantsLock = true;
    const canvas = gl.domElement;
    const onContextMenu = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', onContextMenu);

    // Direct canvas listener so lock is tied to this element
    const onDown = (e) => {
      if (e.button !== 0) return;
      if (inputState.altFreeCursor) return;
      if (!inputState.wantsLock) return;
      if (stateRef.current?.status !== 'playing') return;
      if (stateRef.current?.coopSpectating) return;
      unlockAudio();
      requestGamePointerLock(canvas);
    };
    canvas.addEventListener('mousedown', onDown);

    return () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('mousedown', onDown);
      if (inputState.lockTarget === canvas) {
        inputState.lockTarget = null;
        inputState.wantsLock = false;
      }
    };
  }, [gl, stateRef]);

  useFrame((_, dt) => {
    const state = stateRef.current;
    const clampedDt = Math.min(dt, 0.05);

    // Mid-join / downed: 3rd-person follow cam
    if (isSpectating(state)) {
      inputState.wantsLock = false;
      updateSpectateCamera(state, remotesRef, camera, clampedDt);
      return;
    }

    // Must clear wantsLock while paused or UI clicks re-lock and eat the click
    if (state.status !== 'playing') {
      inputState.wantsLock = false;
      state.adsAmount = 0;
      if (camera.isPerspectiveCamera && Math.abs(camera.fov - 72) > 0.5) {
        camera.fov = 72;
        camera.updateProjectionMatrix();
      }
      return;
    }
    // Hold Left Alt = free cursor — don't fight it every frame
    if (!inputState.altFreeCursor) inputState.wantsLock = true;

    const coopClient = !!state.coop && !state.isHost;

    // Do NOT call requestPointerLock here — browsers reject non-gesture calls
    // and the cursor escapes to other monitors when lock never engages.

    const look = consumeLook();
    const slot = state.weapons[state.activeWeapon];
    const heldDef = slot ? WEAPONS[slot.id] : null;
    // RMB scopes even if pointer-lock blips (Electron sometimes drops lock on RMB)
    const wantAds =
      !!inputState.mouseRight &&
      !!heldDef?.adsFov &&
      !state.reloading &&
      state.status === 'playing';
    const adsTarget = wantAds ? 1 : 0;
    state.adsAmount = THREE.MathUtils.lerp(
      state.adsAmount || 0,
      adsTarget,
      1 - Math.exp(-clampedDt * 18)
    );
    if (state.adsAmount < 0.001) state.adsAmount = 0;
    if (state.adsAmount > 0.999) state.adsAmount = 1;

    const adsT = state.adsAmount;
    const adsSens = heldDef?.adsSens ?? 0.4;
    const sens = getLookSensitivity() * (1 - adsT * (1 - adsSens));
    state.yaw -= look.dx * sens;
    state.pitch -= look.dy * sens;
    state.pitch = THREE.MathUtils.clamp(state.pitch, -1.2, 1.2);

    camera.up.set(0, 1, 0);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(state.pitch, state.yaw, 0);
    if (camera.isPerspectiveCamera) {
      const hipFov = 72;
      const adsFov = heldDef?.adsFov || hipFov;
      const targetFov = THREE.MathUtils.lerp(hipFov, adsFov, adsT);
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }
    }

    const { keys } = inputState;
    let inputX = 0;
    let inputF = 0;
    if (keys.w) inputF += 1;
    if (keys.s) inputF -= 1;
    if (keys.a) inputX -= 1;
    if (keys.d) inputX += 1;

    const crouchEdge = inputState.crouchPressed;
    if (crouchEdge) inputState.crouchPressed = false;
    const startedSlide = tryStartSlide(state, {
      sprinting: !!keys.shift,
      crouchPressed: crouchEdge,
      movingForward: inputF > 0,
    });
    if (startedSlide) {
      // Drop ADS while sliding
      state.adsAmount = 0;
    }

    const doors = getClosedDoorColliders(state);
    const boarded = getBoardedWindowColliders(state);
    const feetY = state.position.y - PLAYER.height;
    const colliders = buildFrameColliders(doors, boarded);

    const slideMove = stepSlide(state, clampedDt);
    if (slideMove) {
      const next = collidePlayer(
        state.position.x + slideMove.dx,
        state.position.z + slideMove.dz,
        colliders,
        feetY
      );
      state.position.x = next.x;
      state.position.z = next.z;
    } else if (inputX !== 0 || inputF !== 0) {
      const len = Math.hypot(inputX, inputF);
      inputX /= len;
      inputF /= len;
      const speed = moveSpeedScale(state, keys.shift) * clampedDt;

      const forwardX = -Math.sin(state.yaw);
      const forwardZ = -Math.cos(state.yaw);
      const rightX = Math.cos(state.yaw);
      const rightZ = -Math.sin(state.yaw);

      const dx = (forwardX * inputF + rightX * inputX) * speed;
      const dz = (forwardZ * inputF + rightZ * inputX) * speed;
      state.velocityX = dx / Math.max(clampedDt, 0.001);
      state.velocityZ = dz / Math.max(clampedDt, 0.001);

      const next = collidePlayer(
        state.position.x + dx,
        state.position.z + dz,
        colliders,
        feetY
      );
      state.position.x = next.x;
      state.position.z = next.z;
    } else {
      state.velocityX = 0;
      state.velocityZ = 0;
    }

    const jumpEdge = inputState.jumpPressed;
    if (jumpEdge) inputState.jumpPressed = false;
    stepVertical(state, clampedDt, {
      jumpPressed: jumpEdge,
      jumpHeld: !!keys.space,
    });
    const eyeDrop = state.slideEyeDrop || 0;
    camera.position.set(
      state.position.x,
      state.position.y - eyeDrop,
      state.position.z
    );

    if (state.recoilKick > 0) {
      camera.rotation.x = state.pitch - state.recoilKick;
      state.recoilKick *= 0.85;
      if (state.recoilKick < 0.001) state.recoilKick = 0;
    }

    if (state.damageCooldown > 0) state.damageCooldown -= clampedDt;
    if (state.fireCooldown > 0) state.fireCooldown -= clampedDt;
    if (state.muzzleFlash > 0) state.muzzleFlash -= clampedDt;

    if (state.status === 'playing' && !coopClient) {
      tickHealthRegen(state, clampedDt, true);
    }

    if (!coopClient) tickMysteryBox(state.mysteryBox, clampedDt);

    const flags = consumeFlags();
    handleWeaponActions(state, flags, clampedDt);
    updateInteract(state, camera, remotesRef);
    tickReviveHold(state);
    if (flags.interact) {
      if (coopClient) {
        coopSendInteract(sessionRef?.current, state.interactPrompt);
      } else {
        handleInteract(state);
      }
    }

    if (coopClient) {
      tickBarricadeRepairCoop(state, clampedDt, sessionRef?.current);
    } else {
      tickBarricadeRepair(state, clampedDt);
    }

    if (inputState.locked) {
      tryFire(state, camera, zombiesRef, onShoot, clampedDt, {
        coopClient,
        session: sessionRef?.current,
      });
    }
  });

  return null;
}

function startReload(state, slot, def) {
  if (state.reloading) return false;
  if (!slot || !def) return false;
  if (def.melee) return false;
  if (slot.mag >= def.magSize || slot.reserve <= 0) return false;
  state.reloading = true;
  state.reloadTimer = def.reloadTime * (state.reloadMult || 1);
  if (state.coop && !state.isHost) state._coopReloadReq = true;
  play(def.projectile === 'pie' ? 'pieReload' : 'gunReload');
  return true;
}

function handleWeaponActions(state, flags, dt) {
  const weaponCount = state.weapons.length;
  if (weaponCount > 1) {
    if (flags.swapNext) {
      state.activeWeapon = (state.activeWeapon + 1) % weaponCount;
    } else if (flags.swapPrev) {
      state.activeWeapon = (state.activeWeapon - 1 + weaponCount) % weaponCount;
    }
  }

  if (flags.swap1 && state.weapons[0]) state.activeWeapon = 0;
  if (flags.swap2 && state.weapons[1]) state.activeWeapon = 1;
  if (flags.swap3 && state.weapons[2]) state.activeWeapon = 2;

  const slot = state.weapons[state.activeWeapon];
  if (!slot) return;
  const def = WEAPONS[slot.id];

  if (state.reloading) {
    state.reloadTimer -= dt;
    if (state.reloadTimer <= 0) {
      const need = def.magSize - slot.mag;
      const take = Math.min(need, slot.reserve);
      slot.mag += take;
      slot.reserve -= take;
      state.reloading = false;
    }
    return;
  }

  if (flags.reload) {
    startReload(state, slot, def);
  }
}

function updateInteract(state, camera, remotesRef) {
  const { DOORS, WALLBUYS, MYSTERY_BOX, WINDOWS } = getActiveMap();
  camera.getWorldDirection(tmp);
  const origin = camera.position;
  let best = null;
  let bestDist = INTERACT_RANGE;

  // Revive downed teammates (prefer over world interacts when in range)
  if (state.coop && remotesRef?.current) {
    const list = remotesRef.current;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r || r.status !== 'downed') continue;
      const dist = Math.hypot(r.x - origin.x, r.z - origin.z);
      if (dist > REVIVE.range || dist > bestDist) continue;
      const to = new THREE.Vector3(r.x - origin.x, 0, r.z - origin.z);
      if (to.lengthSq() < 0.0001) {
        bestDist = dist;
        best = {
          type: 'revive',
          id: r.id,
          label: `Hold [F] to revive ${r.name || 'teammate'}`,
        };
        continue;
      }
      to.normalize();
      const flat = tmp.clone();
      flat.y = 0;
      if (flat.lengthSq() > 0.0001) flat.normalize();
      if (flat.dot(to) < 0.35) continue;
      bestDist = dist;
      const pct = Math.round((r.reviveProgress || 0) * 100);
      best = {
        type: 'revive',
        id: r.id,
        label:
          pct > 0
            ? `Hold [F] to revive ${r.name || 'teammate'} (${pct}%)`
            : `Hold [F] to revive ${r.name || 'teammate'}`,
      };
    }
  }

  DOORS.forEach((door) => {
    if (state.doors[door.id]?.open) return;
    const pos = new THREE.Vector3(...door.position);
    const to = pos.clone().sub(origin);
    const dist = to.length();
    if (dist > bestDist) return;
    to.normalize();
    if (tmp.dot(to) < 0.75) return;
    bestDist = dist;
    best = {
      type: 'door',
      id: door.id,
      label: `Hold [F] to open door [${door.cost}]`,
    };
  });

  WALLBUYS.forEach((wb) => {
    if (!state.rooms[wb.room]?.open) return;
    const def = WEAPONS[wb.weaponId];
    const pos = new THREE.Vector3(...wb.position);
    const to = pos.clone().sub(origin);
    const dist = to.length();
    if (dist > bestDist) return;
    to.normalize();
    if (tmp.dot(to) < 0.7) return;
    const owned = state.weapons.find((w) => w.id === wb.weaponId);
    const cost = owned ? def.ammoCost : def.wallCost;
    const label = owned
      ? `Hold [F] for ammo [${cost}]`
      : `Hold [F] to buy ${def.name} [${cost}]`;
    bestDist = dist;
    best = { type: 'wallbuy', id: wb.id, weaponId: wb.weaponId, label, cost };
  });

  WINDOWS.forEach((win) => {
    if (!state.rooms[win.room]?.open) return;
    const boards = state.windows[win.id]?.boards ?? 0;
    if (boards >= BARRICADE.maxBoards) return;
    const pos = new THREE.Vector3(win.inside.x, win.position[1], win.inside.z);
    const framePos = new THREE.Vector3(...win.position);
    const candidates = [pos, framePos];
    for (let c = 0; c < candidates.length; c++) {
      const to = candidates[c].clone().sub(origin);
      const dist = to.length();
      if (dist > bestDist) continue;
      to.normalize();
      if (tmp.dot(to) < 0.55) continue;
      bestDist = dist;
      best = {
        type: 'window',
        id: win.id,
        label: `Hold [F] to rebuild barricade [${boards}/${BARRICADE.maxBoards}]`,
      };
    }
  });

  // Mystery box — mid hall
  {
    const boxPos = new THREE.Vector3(
      MYSTERY_BOX.position[0],
      (MYSTERY_BOX.position[1] || 0) + 1.0,
      MYSTERY_BOX.position[2]
    );
    const to = boxPos.clone().sub(origin);
    const dist = to.length();
    if (dist <= bestDist) {
      to.normalize();
      if (tmp.dot(to) >= 0.55) {
        const prompt = mysteryBoxPrompt(state);
        if (prompt) {
          bestDist = dist;
          best = prompt;
        }
      }
    }
  }

  state.interactPrompt = best;
}

/** While holding F on a revive prompt, tell host who we're reviving. */
function tickReviveHold(state) {
  if (!state.coop || state.status !== 'playing') {
    state.reviveTargetId = null;
    return;
  }
  const holding = !!inputState.keys.f;
  const prompt = state.interactPrompt;
  if (holding && prompt?.type === 'revive' && prompt.id) {
    state.reviveTargetId = prompt.id;
  } else {
    state.reviveTargetId = null;
  }
}

function handleInteract(state) {
  const prompt = state.interactPrompt;
  if (!prompt) return;

  if (prompt.type === 'door') {
    tryBuyDoor(state, prompt.id);
    return;
  }

  if (prompt.type === 'window') {
    if (tryRepairBoard(state, prompt.id)) {
      play('boardRepair');
      state.repairAcc = 0;
    }
    return;
  }

  if (prompt.type === 'wallbuy') {
    const def = WEAPONS[prompt.weaponId];
    const ownedIdx = state.weapons.findIndex((w) => w.id === prompt.weaponId);
    if (ownedIdx >= 0) {
      if (!spend(state, def.ammoCost)) return;
      const slot = state.weapons[ownedIdx];
      slot.reserve = def.reserve;
      slot.mag = def.magSize;
      state.activeWeapon = ownedIdx;
    } else {
      if (!spend(state, def.wallCost)) return;
      const loadout = createWeaponLoadout(prompt.weaponId);
      if (state.weapons.length < 2) {
        state.weapons.push(loadout);
        state.activeWeapon = state.weapons.length - 1;
      } else {
        const replaceIdx = state.activeWeapon === 0 ? 1 : 0;
        if (state.weapons.length === 1) {
          state.weapons.push(loadout);
          state.activeWeapon = 1;
        } else {
          state.weapons[replaceIdx] = loadout;
          state.activeWeapon = replaceIdx;
        }
      }
    }
    return;
  }

  if (prompt.type === 'mystery') {
    if (prompt.action === 'spin') trySpinMysteryBox(state);
    else if (prompt.action === 'take') tryTakeMysteryWeapon(state);
  }
}

function tickBarricadeRepair(state, dt) {
  if (!inputState.keys.f) {
    state.repairAcc = 0;
    return;
  }
  const prompt = state.interactPrompt;
  if (!prompt || prompt.type !== 'window') {
    state.repairAcc = 0;
    return;
  }
  state.repairAcc += dt;
  if (state.repairAcc >= BARRICADE.repairInterval) {
    state.repairAcc = 0;
    if (tryRepairBoard(state, prompt.id)) {
      play('boardRepair');
    }
  }
}

function tickBarricadeRepairCoop(state, dt, session) {
  if (!inputState.keys.f) {
    state.repairAcc = 0;
    return;
  }
  const prompt = state.interactPrompt;
  if (!prompt || prompt.type !== 'window') {
    state.repairAcc = 0;
    return;
  }
  state.repairAcc += dt;
  if (state.repairAcc >= BARRICADE.repairInterval) {
    state.repairAcc = 0;
    coopSendInteract(session, prompt);
  }
}

function tryFire(state, camera, zombiesRef, onShoot, dt, { coopClient, session }) {
  if (state.reloading || state.fireCooldown > 0) return;
  const slot = state.weapons[state.activeWeapon];
  if (!slot) return;
  const def = WEAPONS[slot.id];

  const shouldFire = def.automatic
    ? inputState.mouseDown
    : inputState.mouseDown && !state._semiLocked;

  if (!def.automatic) {
    if (!inputState.mouseDown) state._semiLocked = false;
  }

  if (!shouldFire) return;
  if (!def.melee && slot.mag <= 0) {
    startReload(state, slot, def);
    return;
  }

  if (!def.melee) slot.mag -= 1;
  state.fireCooldown = def.fireRate;
  state.muzzleFlash = def.melee ? 0.12 : 0.07;
  state.recoilKick = def.recoil * (state.adsAmount > 0.5 ? 0.55 : 1);
  if (!def.automatic) state._semiLocked = true;
  if (def.melee) play('meleeSwing');
  else if (def.projectile === 'pie') play('pieThrow');
  else if (def.pellets) play('gunFireShotgun');
  else if (def.id === 'sniper') play('gunFireSniper');
  else if (def.id === 'ak47') play('gunFireAk');
  else if (def.automatic) play('gunFireAuto');
  else play('gunFire');

  // Auto-reload the instant the mag empties (no extra click needed)
  if (!def.melee && slot.mag <= 0) {
    startReload(state, slot, def);
  }

  const ads = (state.adsAmount || 0) > 0.55 && def.adsFov != null;
  const fireDef =
    ads && def.adsSpread != null ? { ...def, spread: def.adsSpread } : def;

  if (def.projectile === 'pie') {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    if (coopClient) {
      coopSendFire(session, camera, fireDef, ads);
    } else {
      spawnPieProjectile(state, camera.position, dir, fireDef);
    }
    return;
  }

  if (coopClient) {
    coopSendFire(session, camera, fireDef, ads);
  } else {
    onShoot?.(camera, fireDef, zombiesRef);
  }
}
