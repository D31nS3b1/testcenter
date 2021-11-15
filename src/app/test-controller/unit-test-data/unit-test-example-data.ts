import { NavigationLeaveRestrictions } from '../classes/test-controller.classes';
import { TestStateKey, UnitData } from '../interfaces/test-controller.interfaces';
// eslint-disable-next-line import/extensions
import { BookletConfig } from '../../config/booklet-config';
import { WatcherLogEntry } from './watcher';
import { perSequenceId } from './unit-test.util';
import { testlet, unit } from './test-data-constructors';

export const TestBookletXML = `<Booklet>
  <Metadata>
    <Id>BookletId</Id>
    <Label>Label</Label>
  </Metadata>

  <BookletConfig>
    <Config key="force_presentation_complete">ON</Config>
    <Config key="force_response_complete">OFF</Config>
    <Config key="loading_mode">LAZY</Config>
  </BookletConfig>

  <Units>
    <Restrictions>
      <DenyNavigationOnIncomplete presentation="OFF" response="ON"/>
      <TimeMax minutes="10" />
    </Restrictions>
    <Unit id="u1" label="l" />
    <Testlet id="t1">
     <Restrictions>
       <CodeToEnter code="d" />
       <TimeMax minutes="5" />
     </Restrictions>
     <Unit id="u2" label="l" />
     <Testlet id="t2">
       <Restrictions>
         <CodeToEnter code="d" />
         <TimeMax minutes="3" />
         <DenyNavigationOnIncomplete presentation="ON" response="OFF"/>
       </Restrictions>
       <Unit id="u3" label="l" />
     </Testlet>
     <Unit id="u4" label="l" />
    </Testlet>
    <Unit id="u5" label="l" />
  </Units>
</Booklet>`;

export const TestBookletXmlVariants = {
  withLoadingModeLazy: TestBookletXML,
  withLoadingModeEager: TestBookletXML.replace('key="loading_mode">LAZY', 'key="loading_mode">EAGER')
};

export const TestUnits: { [unitId: string]: UnitData } = {
  u1: {
    data: '{"all": "data from a previous session"}',
    state: {},
    playerId: 'a-player',
    definition: 'the unit (1) definition itself'
  },
  u2: {
    data: '{"all": "data from a previous session"}',
    state: {
      PRESENTATION_PROGRESS: 'some',
      CURRENT_PAGE_ID: '1',
      CURRENT_PAGE_NR: '1'
    },
    playerId: 'another-player',
    definitionRef: 'test-unit-content-u2'
  },
  u3: {
    data: '{"all": "data from a previous session"}',
    state: {
      RESPONSE_PROGRESS: 'complete'
    },
    playerId: 'a-player-but-version-2',
    definitionRef: 'test-unit-content-u3'
  },
  u4: {
    data: '{"all": "data from a previous session"}',
    state: {
      CURRENT_PAGE_ID: '2'
    },
    playerId: 'a-player',
    definition: 'the unit (4) definition itself'
  },
  u5: {
    data: '{"all": "data from a previous session"}',
    state: {},
    playerId: 'a-player',
    definition: 'the unit (5) definition itself'
  }
};

export const TestPlayers = {
  'A-PLAYER.HTML': 'a player',
  'ANOTHER-PLAYER.HTML': 'another player',
  'A-PLAYER-BUT-VERSION-2.HTML': 'a player, but version 2'
};

export const TestExternalUnitContents = {
  'test-unit-content-u2': 'the unit (2) definition',
  'test-unit-content-u3': 'the unit (3) definition'
};

export const TestResources = {
  ...TestPlayers,
  ...TestExternalUnitContents
};

export const TestUnitDefinitionsPerSequenceId = Object.values(TestUnits)
  .map(unitDef => (unitDef.definitionRef ? TestExternalUnitContents[unitDef.definitionRef] : unitDef.definition))
  .reduce(perSequenceId, {});

export const TestUnitStateDataParts = Object.values(TestUnits)
  .map(unitDef => JSON.parse(unitDef.data))
  .reduce(perSequenceId, {});

export const TestUnitPresentationProgressStates = Object.values(TestUnits)
  .map(unitDef => unitDef.state.PRESENTATION_PROGRESS)
  .reduce(perSequenceId, {});

export const TestUnitResponseProgressStates = Object.values(TestUnits)
  .map(unitDef => unitDef.state.RESPONSE_PROGRESS)
  .reduce(perSequenceId, {});

export const TestUnitStateCurrentPages = Object.values(TestUnits)
  .map(unitDef => unitDef.state.CURRENT_PAGE_ID)
  .reduce(perSequenceId, {});

export const TestTestState: { [k in TestStateKey]?: string } = {
  CURRENT_UNIT_ID: 'u3'
};

export const TestBooklet = testlet({
  sequenceId: 0,
  id: 'BookletId',
  title: 'Label',
  codeToEnter: '',
  codePrompt: '',
  maxTimeLeft: 10,
  children: [
    unit({
      sequenceId: 1,
      id: 'u1',
      title: 'l',
      children: [],
      locked: false,
      alias: 'u1',
      naviButtonLabel: null,
      navigationLeaveRestrictions: new NavigationLeaveRestrictions('OFF', 'ON'),
      playerId: 'a-player'
    }),
    testlet({
      sequenceId: 0,
      id: 't1',
      title: '',
      codeToEnter: 'D',
      codePrompt: '',
      maxTimeLeft: 5,
      children: [
        unit({
          sequenceId: 2,
          id: 'u2',
          title: 'l',
          children: [],
          locked: false,
          alias: 'u2',
          naviButtonLabel: null,
          navigationLeaveRestrictions: new NavigationLeaveRestrictions('OFF', 'ON'),
          playerId: 'another-player'
        }),
        testlet({
          sequenceId: 0,
          id: 't2',
          title: '',
          codeToEnter: 'D',
          codePrompt: '',
          maxTimeLeft: 3,
          children: [
            unit({
              sequenceId: 3,
              id: 'u3',
              title: 'l',
              children: [],
              locked: false,
              alias: 'u3',
              naviButtonLabel: null,
              navigationLeaveRestrictions: new NavigationLeaveRestrictions('ON', 'OFF'),
              playerId: 'a-player-but-version-2'
            })
          ]
        }),
        unit({
          sequenceId: 4,
          id: 'u4',
          title: 'l',
          children: [],
          locked: false,
          alias: 'u4',
          naviButtonLabel: null,
          navigationLeaveRestrictions: new NavigationLeaveRestrictions('OFF', 'ON'),
          playerId: 'a-player'
        })
      ]
    }),
    unit({
      sequenceId: 5,
      id: 'u5',
      title: 'l',
      children: [],
      locked: false,
      alias: 'u5',
      naviButtonLabel: null,
      navigationLeaveRestrictions: new NavigationLeaveRestrictions('OFF', 'ON'),
      playerId: 'a-player'
    })
  ]
});

export const TestBookletConfig = new BookletConfig();
TestBookletConfig.force_presentation_complete = 'ON';
TestBookletConfig.force_response_complete = 'OFF';
TestBookletConfig.loading_mode = 'EAGER';

export const loadingProtocols: { [testId in keyof typeof TestBookletXmlVariants]: WatcherLogEntry[] } = {
  withLoadingModeLazy: [
    { name: 'tcs.testStatus$', value: 'INIT' },
    { name: 'tcs.totalLoadingProgress', value: 0 },
    // eslint-disable-next-line max-len,object-curly-newline
    { name: 'tcs.testStatus$', value: 'LOADING' },

    // unit 1
    // 5 units, so each triplet of unit-player-content is worth 6.6% in the total progress
    // total progress gets updated first , dont' be confused
    { name: 'tcs.totalLoadingProgress', value: 6.666666666666667 }, // unit 1
    { name: 'tcs.setUnitLoadProgress$', value: [1] },
    { name: 'tcs.unitContentLoadProgress$[1]', value: { progress: 100 } },
    { name: 'tcs.totalLoadingProgress', value: 13.333333333333334 }, // unit 1 content (was embedded)
    { name: 'tcs.totalLoadingProgress', value: 13.333333333333334 }, // 0% of a-player
    { name: 'tcs.totalLoadingProgress', value: 16.666666666666664 }, // 50% of a-player
    { name: 'tcs.totalLoadingProgress', value: 18.333333333333332 }, // 75% of a-player
    { name: 'tcs.totalLoadingProgress', value: 20 }, // 100% of a-player
    { name: 'tcs.totalLoadingProgress', value: 20 }, // 100% of a-player (again)
    { name: 'tcs.addPlayer', value: ['a-player'] },

    // unit 2
    { name: 'tcs.totalLoadingProgress', value: 26.666666666666668 }, // unit 2
    { name: 'tcs.totalLoadingProgress', value: 26.666666666666668 }, // 0% of another player
    { name: 'tcs.totalLoadingProgress', value: 30 }, // 50% of another player
    { name: 'tcs.totalLoadingProgress', value: 31.666666666666664 }, // 75% of another-player
    { name: 'tcs.totalLoadingProgress', value: 33.33333333333333 }, // 100% of another-player
    { name: 'tcs.totalLoadingProgress', value: 33.33333333333333 }, // 100% of another-player (again)
    { name: 'tcs.addPlayer', value: ['another-player'] },

    // unit 3
    { name: 'tcs.totalLoadingProgress', value: 40 }, // unit 3
    { name: 'tcs.totalLoadingProgress', value: 40 }, // 0% of a-player-but-version-2
    { name: 'tcs.totalLoadingProgress', value: 43.333333333333336 }, // 50% of a-player-but-version-2
    { name: 'tcs.totalLoadingProgress', value: 45 }, // 75% of a-player-but-version-2
    { name: 'tcs.totalLoadingProgress', value: 46.666666666666664 }, // 100% of a-player-but-version-2
    { name: 'tcs.totalLoadingProgress', value: 46.666666666666664 }, // 100% of a-player-but-version-2 (again)
    { name: 'tcs.addPlayer', value: ['a-player-but-version-2'] },

    // unit 4
    { name: 'tcs.totalLoadingProgress', value: 53.333333333333336 }, // unit 4
    { name: 'tcs.setUnitLoadProgress$', value: [4] },
    { name: 'tcs.unitContentLoadProgress$[4]', value: { progress: 100 } },
    { name: 'tcs.totalLoadingProgress', value: 60 }, // unit 4 content (was embedded)
    { name: 'tcs.totalLoadingProgress', value: 66.66666666666666 }, // unit 4 player (already loaded)

    // unit 5
    { name: 'tcs.totalLoadingProgress', value: 73.33333333333333 }, // unit 5
    { name: 'tcs.setUnitLoadProgress$', value: [5] },
    { name: 'tcs.unitContentLoadProgress$[5]', value: { progress: 100 } },
    { name: 'tcs.totalLoadingProgress', value: 80 }, // unit 5 content (was embedded)
    { name: 'tcs.totalLoadingProgress', value: 86.66666666666667 }, // unit 5 player (already loaded)

    // queue external unit contents
    { name: 'tcs.setUnitLoadProgress$', value: [3] },
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 'PENDING' } },
    { name: 'tcs.setUnitLoadProgress$', value: [2] },
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 'PENDING' } },

    // start here because loading is lazy
    { name: 'tcs.testStatus$', value: 'RUNNING' },
    { name: 'tls.loadTest', value: undefined },

    // load external unit contents - start with unit 3, because it's the current unit
    { name: 'tcs.totalLoadingProgress', value: 86.66666666666667 }, // 0% of unit 3 content
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 0 } },
    { name: 'tcs.totalLoadingProgress', value: 90 }, // 50% of unit 3 content
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 50 } },
    { name: 'tcs.totalLoadingProgress', value: 91.66666666666666 }, // 75% of unit 3 content
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 75 } },
    { name: 'tcs.totalLoadingProgress', value: 93.33333333333333 }, // 100% of unit 3 content
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 100 } },
    { name: 'tcs.totalLoadingProgress', value: 93.33333333333333 }, // 0% of unit 2 content
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 0 } },
    { name: 'tcs.totalLoadingProgress', value: 96.66666666666667 }, // 50% of unit 2 content
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 50 } },
    { name: 'tcs.totalLoadingProgress', value: 98.33333333333333 }, // 75% of unit 2 content
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 75 } },
    { name: 'tcs.totalLoadingProgress', value: 100 }, // 100% of unit 2 content
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 100 } },

    // finish
    { name: 'bs.addTestLog', value: ['LOADCOMPLETE'] },
    { name: 'tcs.totalLoadingProgress', value: 100 }
  ],

  withLoadingModeEager: [
    { name: 'tcs.testStatus$', value: 'INIT' },
    { name: 'tcs.totalLoadingProgress', value: 0 },
    // eslint-disable-next-line max-len,object-curly-newline
    { name: 'tcs.testStatus$', value: 'LOADING' },

    // unit 1
    // 5 units, so each triplet of unit-player-content is worth 6.6% in the total progress
    // total progress gets updated first , dont' be confused
    { name: 'tcs.totalLoadingProgress', value: 6.666666666666667 }, // unit 1
    { name: 'tcs.setUnitLoadProgress$', value: [1] },
    { name: 'tcs.unitContentLoadProgress$[1]', value: { progress: 100 } },
    { name: 'tcs.totalLoadingProgress', value: 13.333333333333334 }, // unit 1 content (was embedded)
    { name: 'tcs.totalLoadingProgress', value: 13.333333333333334 }, // 0% of a-player
    { name: 'tcs.totalLoadingProgress', value: 16.666666666666664 }, // 50% of a-player
    { name: 'tcs.totalLoadingProgress', value: 18.333333333333332 }, // 75% of a-player
    { name: 'tcs.totalLoadingProgress', value: 20 }, // 100% of a-player
    { name: 'tcs.totalLoadingProgress', value: 20 }, // 100% of a-player (again)
    { name: 'tcs.addPlayer', value: ['a-player'] },

    // unit 2
    { name: 'tcs.totalLoadingProgress', value: 26.666666666666668 }, // unit 2
    { name: 'tcs.totalLoadingProgress', value: 26.666666666666668 }, // 0% of another player
    { name: 'tcs.totalLoadingProgress', value: 30 }, // 50% of another player
    { name: 'tcs.totalLoadingProgress', value: 31.666666666666664 }, // 75% of another-player
    { name: 'tcs.totalLoadingProgress', value: 33.33333333333333 }, // 100% of another-player
    { name: 'tcs.totalLoadingProgress', value: 33.33333333333333 }, // 100% of another-player (again)
    { name: 'tcs.addPlayer', value: ['another-player'] },

    // unit 3
    { name: 'tcs.totalLoadingProgress', value: 40 }, // unit 3
    { name: 'tcs.totalLoadingProgress', value: 40 }, // 0% of a-player-but-version-2
    { name: 'tcs.totalLoadingProgress', value: 43.333333333333336 }, // 50% of a-player-but-version-2
    { name: 'tcs.totalLoadingProgress', value: 45 }, // 75% of a-player-but-version-2
    { name: 'tcs.totalLoadingProgress', value: 46.666666666666664 }, // 100% of a-player-but-version-2
    { name: 'tcs.totalLoadingProgress', value: 46.666666666666664 }, // 100% of a-player-but-version-2 (again)
    { name: 'tcs.addPlayer', value: ['a-player-but-version-2'] },

    // unit 4
    { name: 'tcs.totalLoadingProgress', value: 53.333333333333336 }, // unit 4
    { name: 'tcs.setUnitLoadProgress$', value: [4] },
    { name: 'tcs.unitContentLoadProgress$[4]', value: { progress: 100 } },
    { name: 'tcs.totalLoadingProgress', value: 60 }, // unit 4 content (was embedded)
    { name: 'tcs.totalLoadingProgress', value: 66.66666666666666 }, // unit 4 player (already loaded)

    // unit 5
    { name: 'tcs.totalLoadingProgress', value: 73.33333333333333 }, // unit 5
    { name: 'tcs.setUnitLoadProgress$', value: [5] },
    { name: 'tcs.unitContentLoadProgress$[5]', value: { progress: 100 } },
    { name: 'tcs.totalLoadingProgress', value: 80 }, // unit 5 content (was embedded)
    { name: 'tcs.totalLoadingProgress', value: 86.66666666666667 }, // unit 5 player (already loaded)

    // external unit contents - start with unit 3, because it's the current unit
    { name: 'tcs.setUnitLoadProgress$', value: [3] },
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 'PENDING' } },
    { name: 'tcs.setUnitLoadProgress$', value: [2] },
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 'PENDING' } },
    { name: 'tcs.totalLoadingProgress', value: 86.66666666666667 }, // 0% of unit 3 content
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 0 } },
    { name: 'tcs.totalLoadingProgress', value: 90 }, // 50% of unit 3 content
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 50 } },
    { name: 'tcs.totalLoadingProgress', value: 91.66666666666666 }, // 75% of unit 3 content
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 75 } },
    { name: 'tcs.totalLoadingProgress', value: 93.33333333333333 }, // 100% of unit 3 content
    { name: 'tcs.unitContentLoadProgress$[3]', value: { progress: 100 } },
    { name: 'tcs.totalLoadingProgress', value: 93.33333333333333 }, // 0% of unit 2 content
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 0 } },
    { name: 'tcs.totalLoadingProgress', value: 96.66666666666667 }, // 50% of unit 2 content
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 50 } },
    { name: 'tcs.totalLoadingProgress', value: 98.33333333333333 }, // 75% of unit 2 content
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 75 } },
    { name: 'tcs.totalLoadingProgress', value: 100 }, // 100% of unit 2 content
    { name: 'tcs.unitContentLoadProgress$[2]', value: { progress: 100 } },

    // don't start until now because loadingMode is EAGER
    { name: 'bs.addTestLog', value: ['LOADCOMPLETE'] },
    { name: 'tcs.totalLoadingProgress', value: 100 },
    { name: 'tcs.testStatus$', value: 'RUNNING' },
    { name: 'tls.loadTest', value: undefined }
  ]
};
