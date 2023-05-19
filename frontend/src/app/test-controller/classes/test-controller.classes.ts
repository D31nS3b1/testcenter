/* eslint-disable max-classes-per-file */

import { MaxTimerDataType, NavigationLeaveRestrictionValue } from '../interfaces/test-controller.interfaces';

export class TestletContentElement {
  readonly sequenceId: number;
  readonly id: string;
  readonly title: string;
  children: TestletContentElement[];

  constructor(sequenceId: number, id: string, title: string) {
    this.sequenceId = sequenceId;
    this.id = id;
    this.title = title;
    this.children = [];
  }

  getMaxSequenceId(tmpId = 0): number {
    let maxSequenceId = tmpId;
    if (this.sequenceId >= maxSequenceId) {
      maxSequenceId = this.sequenceId + 1;
    }
    this.children.forEach(tce => {
      maxSequenceId = tce.getMaxSequenceId(maxSequenceId);
    });
    return maxSequenceId;
  }
}

export class UnitDef extends TestletContentElement {
  readonly alias: string;
  readonly naviButtonLabel: string;
  playerId: string;
  lockedByTime = false;
  readonly navigationLeaveRestrictions: NavigationLeaveRestrictions;

  constructor(
    sequenceId: number,
    id: string,
    title: string,
    alias: string,
    naviButtonLabel: string,
    navigationLeaveRestrictions: NavigationLeaveRestrictions
  ) {
    super(sequenceId, id, title);
    this.alias = alias;
    this.naviButtonLabel = naviButtonLabel;
    this.navigationLeaveRestrictions = navigationLeaveRestrictions;
  }
}

export class UnitWithContext {
  unitDef: UnitDef = null;
  codeRequiringTestlets: Testlet[] = [];
  maxTimerRequiringTestlet: Testlet = null;
  testletLabel = '';
  constructor(unitDef: UnitDef) {
    this.unitDef = unitDef;
  }
}

export class NavigationLeaveRestrictions {
  readonly presentationComplete: NavigationLeaveRestrictionValue = 'OFF';
  readonly responseComplete: NavigationLeaveRestrictionValue = 'OFF';

  constructor(presentationComplete: NavigationLeaveRestrictionValue,
              responseComplete: NavigationLeaveRestrictionValue) {
    this.presentationComplete = presentationComplete;
    this.responseComplete = responseComplete;
  }
}

export class Testlet extends TestletContentElement {
  codeToEnter = '';
  codePrompt = '';
  maxTimeLeft = -1;

  addTestlet(id: string, title: string): Testlet {
    const newChild = new Testlet(0, id, title);
    this.children.push(newChild);
    return newChild;
  }

  addUnit(
    sequenceId: number,
    id: string,
    title: string,
    alias: string,
    naviButtonLabel: string,
    navigationLeaveRestrictions: NavigationLeaveRestrictions
  ): UnitDef {
    const newChild = new UnitDef(sequenceId, id, title, alias, naviButtonLabel, navigationLeaveRestrictions);
    this.children.push(newChild);
    return newChild;
  }

  // first looking for the unit, then on the way back adding restrictions
  // TODO this very ineffective function is called quite often, so ...
  // ...instead of enrich the unit with the parental data, collect it beforehand
  getUnitAt(sequenceId: number, isEntryPoint = true): UnitWithContext | null {
    let myreturn: UnitWithContext = null;
    for (let i = 0; i < this.children.length; i++) {
      const tce = this.children[i];
      if (tce instanceof Testlet) {
        const localTestlet = tce as Testlet;
        myreturn = localTestlet.getUnitAt(sequenceId, false);
        if (myreturn !== null) {
          break;
        }
      } else if (tce instanceof UnitDef) {
        if (tce.sequenceId === sequenceId) {
          myreturn = new UnitWithContext(tce);
          break;
        }
      }
    }
    if (myreturn !== null) {
      if (this.codeToEnter.length > 0) {
        myreturn.codeRequiringTestlets.push(this);
      }
      if (this.maxTimeLeft > 0) {
        myreturn.maxTimerRequiringTestlet = this;
      }
      if (!isEntryPoint) {
        const label = this.title.trim();
        if (label) {
          myreturn.testletLabel = label;
        }
      }
    }
    return myreturn;
  }

  getSequenceIdByUnitAlias(alias: string): number {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child instanceof UnitDef) {
        if (child.alias === alias) {
          return child.sequenceId;
        }
      }
      if (child instanceof Testlet) {
        const sequenceId = child.getSequenceIdByUnitAlias(alias);
        if (sequenceId) {
          return sequenceId;
        }
      }
    }
    return 0;
  }

  getTestlet(testletId: string): Testlet {
    let myreturn = null;
    if (this.id === testletId) {
      myreturn = this;
    } else {
      for (let i = 0; i < this.children.length; i++) {
        const tce = this.children[i];
        if (tce instanceof Testlet) {
          const localTestlet = tce as Testlet;
          myreturn = localTestlet.getTestlet(testletId);
          if (myreturn !== null) {
            break;
          }
        }
      }
    }
    return myreturn;
  }

  getAllUnitSequenceIds(testletId = ''): number[] {
    let myreturn = [];

    if (testletId) {
      // find testlet
      const myTestlet = this.getTestlet(testletId);
      if (myTestlet) {
        myreturn = myTestlet.getAllUnitSequenceIds();
      }
    } else {
      for (let i = 0; i < this.children.length; i++) {
        const tce = this.children[i];
        if (tce instanceof Testlet) {
          const localTestlet = tce as Testlet;
          localTestlet.getAllUnitSequenceIds().forEach(u => myreturn.push(u));
        } else {
          const localUnit = tce as UnitDef;
          myreturn.push(localUnit.sequenceId);
        }
      }
    }
    return myreturn;
  }

  // TODO make this function obsolete. maxTimeLeft should never be changed, use tcs.maxTimeTimers instead
  setTimeLeft(testletId: string, maxTimeLeft: number): void {
    // attention, it's absurd: if you want to setTime of this use testlet.setTime(testelt.id, time)...
    if (testletId) {
      // find testlet
      const testlet = this.getTestlet(testletId);
      if (testlet) {
        testlet.setTimeLeft('', maxTimeLeft);
        if (maxTimeLeft === 0) {
          testlet.lockAllChildren();
        }
      }
    } else {
      this.maxTimeLeft = maxTimeLeft;
      for (let i = 0; i < this.children.length; i++) {
        const tce = this.children[i];
        if (tce instanceof Testlet) {
          tce.setTimeLeft('', maxTimeLeft);
        }
      }
    }
  }

  lockAllChildren(testletId = ''): void {
    if (testletId) {
      const testlet = this.getTestlet(testletId);
      if (testlet) {
        testlet.lockAllChildren();
      }
    } else {
      for (let i = 0; i < this.children.length; i++) {
        const tce = this.children[i];
        if (tce instanceof Testlet) {
          const localTestlet = tce as Testlet;
          localTestlet.lockAllChildren();
        } else {
          const localUnit = tce as UnitDef;
          localUnit.lockedByTime = true;
        }
      }
    }
  }

  lockUnitsIfTimeLeftNull(lock = false): void {
    // eslint-disable-next-line no-param-reassign
    lock = lock || this.maxTimeLeft === 0;
    for (let i = 0; i < this.children.length; i++) {
      const tce = this.children[i];
      if (tce instanceof Testlet) {
        const localTestlet = tce as Testlet;
        localTestlet.lockUnitsIfTimeLeftNull(lock);
      } else if (lock) {
        const localUnit = tce as UnitDef;
        localUnit.lockedByTime = true;
      }
    }
  }
}

export class EnvironmentData {
  browserVersion = '';
  browserName = '';
  get browserTxt(): string {
    return `${this.browserName} Version ${this.browserVersion}`;
  }

  osName = '';
  device = '';

  screenSizeWidth = 0;
  screenSizeHeight = 0;
  loadTime: number = 0;
  get screenSizeTxt(): string {
    return `Bildschirmgröße ist ${this.screenSizeWidth} x ${this.screenSizeWidth}`;
  }

  constructor() {
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const UAParser = window['UAParser']();

    this.browserVersion = UAParser.browser.version;
    this.browserName = UAParser.browser.name;
    this.osName = `${UAParser.os.name} ${UAParser.os.version}`;
    this.device = Object.values(UAParser.device)
      .filter(elem => elem)
      .join(' ');

    this.screenSizeHeight = window.screen.height;
    this.screenSizeWidth = window.screen.width;
  }
}

export class MaxTimerData {
  timeLeftSeconds: number; // seconds
  testletId: string;
  type: MaxTimerDataType;

  get timeLeftString(): string {
    const afterDecimal = Math.round(this.timeLeftSeconds % 60);
    const a = (Math.round(this.timeLeftSeconds - afterDecimal) / 60).toString();
    const b = afterDecimal < 10 ? '0' : '';
    const c = afterDecimal.toString();
    return `${a}:${b}${c}`;
  }

  get timeLeftMinString(): string {
    return `${Math.round(this.timeLeftSeconds / 60).toString()} min`;
  }

  constructor(timeMinutes: number, tId: string, type: MaxTimerDataType) {
    this.timeLeftSeconds = timeMinutes * 60;
    this.testletId = tId;
    this.type = type;
  }
}
