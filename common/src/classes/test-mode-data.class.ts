// this file is automatically generated. do not change anything here directly!
export class TestModeData {
  alwaysNewSession: boolean = false;
  canReview: boolean = false;
  saveResponses: boolean = false;
  forceTimeRestrictions: boolean = false;
  forceNaviRestrictions: boolean = false;
  monitorable: boolean = false;
  presetCode: boolean = true;
  showTimeLeft: boolean = false;
  showUnitMenu: boolean = false;
  receiveRemoteCommands: boolean = false;

  static modes = {
    'RUN-DEMO': {
      alwaysNewSession: false,
      monitorable: false,
      canReview: false,
      saveResponses: false,
      forceTimeRestrictions: false,
      forceNaviRestrictions: false,
      presetCode: true,
      showTimeLeft: false,
      showUnitMenu: false,
      receiveRemoteCommands: false
    },
    'MONITOR-GROUP': {
      alwaysNewSession: false,
      monitorable: false,
      canReview: false,
      saveResponses: false,
      forceTimeRestrictions: false,
      forceNaviRestrictions: false,
      presetCode: true,
      showTimeLeft: false,
      showUnitMenu: false,
      receiveRemoteCommands: false
    },
    'MONITOR-STUDY': {
      alwaysNewSession: false,
      monitorable: false,
      canReview: false,
      saveResponses: false,
      forceTimeRestrictions: false,
      forceNaviRestrictions: false,
      presetCode: true,
      showTimeLeft: false,
      showUnitMenu: false,
      receiveRemoteCommands: false
    },
    'RUN-HOT-RETURN': {
      alwaysNewSession: false,
      monitorable: true,
      canReview: false,
      saveResponses: true,
      forceTimeRestrictions: true,
      forceNaviRestrictions: true,
      presetCode: false,
      showTimeLeft: false,
      showUnitMenu: false,
      receiveRemoteCommands: true
    },
    'RUN-HOT-RESTART': {
      alwaysNewSession: true,
      monitorable: true,
      canReview: false,
      saveResponses: true,
      forceTimeRestrictions: true,
      forceNaviRestrictions: true,
      presetCode: false,
      showTimeLeft: false,
      showUnitMenu: false,
      receiveRemoteCommands: true
    },
    'RUN-REVIEW': {
      alwaysNewSession: false,
      monitorable: false,
      canReview: true,
      saveResponses: false,
      forceTimeRestrictions: false,
      forceNaviRestrictions: false,
      presetCode: true,
      showTimeLeft: true,
      showUnitMenu: true,
      receiveRemoteCommands: false
    },
    'RUN-TRIAL': {
      alwaysNewSession: false,
      monitorable: true,
      canReview: true,
      saveResponses: true,
      forceTimeRestrictions: false,
      forceNaviRestrictions: false,
      presetCode: true,
      showTimeLeft: true,
      showUnitMenu: true,
      receiveRemoteCommands: false
    },
    'RUN-SIMULATION': {
      alwaysNewSession: false,
      monitorable: false,
      canReview: false,
      saveResponses: false,
      forceTimeRestrictions: true,
      forceNaviRestrictions: true,
      presetCode: false,
      showTimeLeft: false,
      showUnitMenu: false,
      receiveRemoteCommands: false
    },
    'SYS-CHECK-LOGIN': {
      alwaysNewSession: false,
      monitorable: false,
      canReview: false,
      saveResponses: false,
      forceTimeRestrictions: false,
      forceNaviRestrictions: false,
      presetCode: false,
      showTimeLeft: false,
      showUnitMenu: false,
      receiveRemoteCommands: false
    }
  };

  static labels = {
    'RUN-DEMO': 'Nur Ansicht (Demo)',
    'MONITOR-GROUP': 'Testgruppen-Monitor (Demo)',
    'MONITOR-STUDY': 'Studien-Monitor (Demo)',
    'RUN-HOT-RETURN': 'Durchführung Test/Befragung',
    'RUN-HOT-RESTART': 'Durchführung Test/Befragung',
    'RUN-REVIEW': 'Prüfdurchgang ohne Speichern',
    'RUN-TRIAL': 'Prüfdurchgang mit Speichern und Reviewfunktionalität',
    'RUN-SIMULATION': 'Prüfdurchgang ohne Speichern, ohne Reviewfunktionalität aber mit Beschränkungen',
    'SYS-CHECK-LOGIN': 'Dieser Modus versteckt für alle anderen Logins den System Check. Der Check kann dann nur noch von Logins durchgeführt werden mit diesem Mode'
  };
}
