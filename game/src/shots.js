// shots.js — screenshot staging via ?shot= params (used by the maker only).
// ?shot=start  title screen over the neon night city
// ?shot=drive  driving across a bridge with traffic
// ?shot=police 4-star chase with helicopter, wanted stars and minimap visible
// ?shot=mission bank-heist escape with mission HUD

import { makeCar, enterCar } from './vehicles.js';
import { startMission } from './missions.js';

export function applyShot(G, name) {
  if (!name) return;
  if (name === 'start') {
    G.state = 'title';
    G.clock = 21.5; // neon night
    G.player.x = 1200; G.player.y = 700;
    return;
  }
  G.state = 'play';
  if (name === 'drive') {
    G.clock = 18.5;
    const car = makeCar(1860, 1240, Math.PI / 2, 2, '#e63946', { driver: 'player' });
    G.parked.push(car);
    G.player.x = car.x; G.player.y = car.y;
    enterCar(G, car);
    car.speed = 150;
    // Traffic on the bridge.
    const t1 = makeCar(1860, 1050, Math.PI / 2, 1, '#f4d35e', { driver: 'traffic' });
    const t2 = makeCar(1860, 1450, -Math.PI / 2, 0, '#2a9d8f', { driver: 'traffic' });
    G.traffic.push(t1, t2);
    G.log('开车穿过海湾大桥，霓虹湾的夜才刚刚开始');
  } else if (name === 'police') {
    G.clock = 22.0;
    G.setWanted(4);
    const car = makeCar(1400, 1240, 0, 3, '#4361ee', { driver: 'player' });
    G.parked.push(car);
    G.player.x = car.x; G.player.y = car.y;
    enterCar(G, car);
    car.speed = 200;
    const p1 = makeCar(1150, 1240, 0, 5, '#e8e8e8', { police: true, driver: 'police' });
    const p2 = makeCar(1650, 1300, Math.PI, 5, '#e8e8e8', { police: true, driver: 'police' });
    G.police.push(p1, p2);
    G.heli = { x: G.player.x - 200, y: G.player.y - 260, angle: 0, orbit: 0.6, shootT: 1 };
    G.log('四星通缉！警车和直升机都在追你！');
  } else if (name === 'mission') {
    G.clock = 20.0;
    G.player.hasGun = true;
    G.player.ammo = 48;
    startMission(G, 2); // bank heist
    G.mission.step = 2; // escape stage
    G.setWanted(3);
    const car = makeCar(1214, 600, Math.PI / 2, 3, '#f72585', { driver: 'player' });
    G.parked.push(car);
    G.player.x = car.x; G.player.y = car.y;
    enterCar(G, car);
    car.speed = 170;
    const p1 = makeCar(1014, 600, 0, 5, '#e8e8e8', { police: true, driver: 'police' });
    G.police.push(p1);
    G.log('银行得手了！甩掉警察，逃到安全屋！');
  }
}
