import {
  Booklet,
  BookletError, isBooklet,
  isUnit,
  Testlet,
  TestSession,
  TestSessionData,
  TestSessionSuperState,
  UnitContext
} from '../group-monitor.interfaces';

export class TestSessionUtil {
  static hasState(state: Record<string, unknown>, key: string, value = null): boolean {
    return ((typeof state[key] !== 'undefined') && ((value !== null) ? (state[key] === value) : true));
  }

  static isPaused(session: TestSession): boolean {
    return TestSessionUtil.hasState(session.data.testState, 'CONTROLLER', 'PAUSED');
  }

  static isLocked(session: TestSession): boolean {
    return TestSessionUtil.hasState(session.data.testState, 'status', 'locked');
  }

  static analyzeTestSession(session: TestSessionData, booklet: Booklet | BookletError): TestSession {
    const current = isBooklet(booklet) ? TestSessionUtil.getCurrent(booklet.units, session.unitName) : null;
    return {
      data: session,
      state: TestSessionUtil.getSuperState(session),
      current: current && current.unit ? current : null,
      booklet,
      timeLeft: TestSessionUtil.parseJsonState(session.testState, 'TESTLETS_TIMELEFT'),
      clearedCodes: TestSessionUtil.parseJsonState(session.testState, 'TESTLETS_CLEARED_CODE')
    };
  }

  static stateString(state: Record<string, string>, keys: string[], glue = ''): string {
    return keys
      .map((key: string) => (TestSessionUtil.hasState(state, key) ? state[key] : null))
      .filter((value: string) => value !== null)
      .join(glue);
  }

  private static getSuperState(session: TestSessionData): TestSessionSuperState {
    const state = session.testState;

    if (this.hasState(state, 'status', 'pending')) {
      return 'pending';
    }
    if (this.hasState(state, 'status', 'locked')) {
      return 'locked';
    }
    if (this.hasState(state, 'CONTROLLER', 'ERROR')) {
      return 'error';
    }
    if (this.hasState(state, 'CONTROLLER', 'TERMINATED')) {
      return 'controller_terminated';
    }
    if (this.hasState(state, 'CONTROLLER', 'TERMINATED_PAUSED')) {
      return 'controller_terminated';
    }
    if (this.hasState(state, 'CONNECTION', 'LOST')) {
      return 'connection_lost';
    }
    if (this.hasState(state, 'CONTROLLER', 'PAUSED')) {
      return 'paused';
    }
    if (this.hasState(state, 'FOCUS', 'HAS_NOT')) {
      return 'focus_lost';
    }
    if (TestSessionUtil.idleSinceMinutes(session) > 5) {
      return 'idle';
    }
    if (this.hasState(state, 'CONNECTION', 'WEBSOCKET')) {
      return 'connection_websocket';
    }
    if (this.hasState(state, 'CONNECTION', 'POLLING')) {
      return 'connection_polling';
    }
    return 'ok';
  }

  private static idleSinceMinutes(testSession: TestSessionData): number {
    return (Date.now() - testSession.timestamp * 1000) / (1000 * 60);
  }

  private static parseJsonState(testStateObject: Record<string, string>, key: string): Record<string, string> | null {
    if (typeof testStateObject[key] === 'undefined') {
      return null;
    }

    const stateValueString = testStateObject[key];

    try {
      return JSON.parse(stateValueString);
    } catch (error) {
      // console.warn(`state ${key} is no valid JSON`, stateValueString, error);
      return null;
    }
  }

  private static getCurrent(
    testlet: Testlet,
    searchUnitId: string,
    level = 0,
    context: UnitContext = null
  ): UnitContext {
    const result: UnitContext = context || {
      unit: null,
      parent: testlet,
      ancestor: testlet,
      indexGlobal: -1,
      indexLocal: -1,
      indexAncestor: -1
    };

    for (let i = 0; i < testlet.children.length; i++) {
      const child = testlet.children[i];
      if (isUnit(child)) {
        result.indexLocal += 1;
        result.indexAncestor += 1;
        result.indexGlobal += 1;

        if (child.id === searchUnitId) {
          result.unit = child;
          return result;
        }
      } else {
        const subResult = TestSessionUtil.getCurrent(child, searchUnitId, level + 1, {
          unit: null,
          parent: child,
          ancestor: level < 1 ? child : result.ancestor,
          indexGlobal: result.indexGlobal,
          indexLocal: -1,
          indexAncestor: level < 1 ? -1 : result.indexAncestor
        });
        if (subResult.unit) {
          return subResult;
        }
        result.indexGlobal = subResult.indexGlobal;
        result.indexAncestor = level < 1 ? result.indexAncestor : subResult.indexAncestor;
      }
    }

    return result;
  }
}
