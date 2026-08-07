import bunker from './maps/bunker';
import camp from './maps/campYard';
import sofia from './maps/sofia';
import nacht from './maps/nacht';
import campHub from './maps/campHub';
import farm from './maps/farm';
import house from './maps/house';

export const MAPS = {
  bunker,
  camp,
  sofia,
  nacht,
  campHub,
  farm,
  house,
};

/** Combat deploy maps only — hub excluded */
export const MAP_LIST = [camp, nacht, bunker, sofia, farm, house];
/** Default combat deploy (Pie Yard) — never the hub */
export const DEFAULT_MAP_ID = 'camp';
export const HUB_MAP_ID = 'campHub';

const MAP_KEY = 'kfp_selected_map';

/** Boot on Safehouse so Camp never flashes Pie Yard / factory */
let active = campHub;

export function getMap(id) {
  return MAPS[id] || bunker;
}

export function getActiveMap() {
  return active;
}

export function setActiveMap(id) {
  active = getMap(id);
  // Don't persist hub as combat selection
  if (active.id !== HUB_MAP_ID) {
    try {
      localStorage.setItem(MAP_KEY, active.id);
    } catch {
      /* ignore */
    }
  }
  return active;
}

export function loadSavedMapId() {
  try {
    const id = localStorage.getItem(MAP_KEY);
    if (id && MAPS[id] && id !== HUB_MAP_ID) return id;
  } catch {
    /* ignore */
  }
  return DEFAULT_MAP_ID;
}

/** Apply last combat map (for deploy / PlaySetup). Does not touch hub. */
export function initActiveMapFromStorage() {
  return setActiveMap(loadSavedMapId());
}

export function enterHubMap() {
  return setActiveMap(HUB_MAP_ID);
}
