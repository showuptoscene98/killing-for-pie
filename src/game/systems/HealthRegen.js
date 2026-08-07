import { PLAYER } from '../constants';

/** Call when the entity takes damage — pauses regen */
export function onDamaged(entity) {
  if (!entity) return;
  entity.regenCooldown = PLAYER.regenDelay;
}

/**
 * After regenDelay with no hits, refill HP at regenRate / sec.
 * Works on game state or coop player objects.
 */
export function tickHealthRegen(entity, dt, alive = true) {
  if (!entity || !alive) return;
  if (entity.regenCooldown == null) entity.regenCooldown = 0;
  if (entity.regenCooldown > 0) {
    entity.regenCooldown = Math.max(0, entity.regenCooldown - dt);
    return;
  }
  const max = entity.maxHp || PLAYER.maxHp;
  if (entity.hp >= max) {
    entity.hp = max;
    return;
  }
  entity.hp = Math.min(max, entity.hp + PLAYER.regenRate * dt);
}
